// Núcleo das marcações — criação, cancelamento e remarcação.
//
// Prevenção de conflitos:
//  1. lock transacional PostgreSQL (pg_advisory_xact_lock) por profissional,
//     garantindo que duas marcações em concorrência são calculadas em série;
//  2. reconfirmação dos horários disponíveis DENTRO da transação
//     (recalcula os slots com o estado da base de dados actual);
//  3. verificação extra de sobreposição directa no SQL.

import { db } from "@/lib/db";
import { getDaySlots } from "@/lib/availability";
import type { SettingsLike } from "@/lib/availability";
import {
  parseDayISO,
  wallToUtc,
  wallNow,
  compareDay,
  addDaysParts,
  dayISO,
} from "@/lib/tz";
import { getSettings } from "@/lib/settings";
import { generateReference, normalizePhone } from "@/lib/utils";
import type { Appointment, AppointmentStatus, EventActor } from "@prisma/client";
import {
  sendEmail,
  mailBookingCreated,
  mailBookingAdminNotice,
  mailBookingConfirmed,
  mailBookingCancelled,
  mailBookingRescheduled,
} from "@/lib/mail";

export class BookingError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

type ApptFull = Appointment & {
  service: { name: string; gapAfterMinutes: number };
  professional: { name: string };
  customer: { name: string; email: string | null; phone: string };
};

const apptFullInclude = {
  service: { select: { name: true, gapAfterMinutes: true } },
  professional: { select: { name: true } },
  customer: { select: { name: true, email: true, phone: true } },
} as const;

async function lockForProfessional(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  professionalId: string,
): Promise<void> {
  const key = `carmix-appt-${professionalId}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key})::bigint)`;
}

// ── Criação ──────────────────────────────────────────────────────────────────

export type CreateBookingInput = {
  serviceId: string;
  professionalId: string | null;
  dateISO: string;
  minutes: number;
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  consent?: boolean;
  context: "CUSTOMER" | "ADMIN";
};

export async function createBooking(input: CreateBookingInput): Promise<{
  appointment: ApptFull;
  emails: { sent: boolean };
}> {
  const settings = await getSettings();
  if (input.context === "CUSTOMER" && !settings.bookingEnabled) {
    throw new BookingError("BOOKING_CLOSED", "As marcações online estão temporariamente encerradas.");
  }

  const service = await db.service.findUnique({ where: { id: input.serviceId } });
  if (!service || !service.isActive) {
    throw new BookingError("SERVICE_UNAVAILABLE", "O serviço escolhido não está disponível.");
  }

  // Profissional: explícito ou o primeiro ativo com o serviço associado
  let professionalId = input.professionalId;
  if (professionalId) {
    const [pro, ps] = await Promise.all([
      db.professional.findUnique({ where: { id: professionalId } }),
      db.professionalService.findUnique({
        where: { professionalId_serviceId: { professionalId, serviceId: service.id } },
      }),
    ]);
    if (!pro || !pro.isActive || !ps) {
      throw new BookingError("PROFESSIONAL_UNAVAILABLE", "O profissional escolhido não está disponível para este serviço.");
    }
  } else {
    const ps = await db.professionalService.findFirst({
      where: { serviceId: service.id, professional: { isActive: true } },
      orderBy: { professionalId: "asc" },
    });
    if (!ps) {
      throw new BookingError("PROFESSIONAL_UNAVAILABLE", "Não há profissional disponível para este serviço.");
    }
    professionalId = ps.professionalId;
  }

  const day = parseDayISO(input.dateISO);
  if (!day) {
    throw new BookingError("INVALID_INPUT", "Data inválida.");
  }
  const today = wallNow(settings.timezone);
  if (compareDay(day, today) < 0) {
    throw new BookingError("OUT_OF_RANGE", "Escolha uma data futura.");
  }
  if (input.minutes < 0 || input.minutes > 1439) {
    throw new BookingError("INVALID_INPUT", "Hora inválida.");
  }

  const startAt = wallToUtc(day, Math.floor(input.minutes / 60), input.minutes % 60, settings.timezone);
  const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);

  const finalStatus: AppointmentStatus =
    input.context === "CUSTOMER" && settings.autoConfirm ? "CONFIRMED" : input.context === "ADMIN" ? "CONFIRMED" : "PENDING";

  // Cliente: localizar por telefone (variantes) ou criar
  const phoneNorm = normalizePhone(input.phone);
  const phoneVariants = [...new Set([input.phone.trim(), phoneNorm, phoneNorm.replace(/\D/g, "")])];

  let created: ApptFull | null = null;

  try {
    created = await db.$transaction(async (tx) => {
      await lockForProfessional(tx, professionalId!);

      // Recalcula os slots dentro da transação (estado real da base de dados)
      const slots = await getDaySlots(tx, professionalId!, service, day, settings as SettingsLike, {
        ignoreLeadTime: input.context === "ADMIN",
      });
      const ok = slots.some((s) => s.minutes === input.minutes);
      if (!ok) {
        throw new BookingError("SLOT_UNAVAILABLE", "O horário escolhido já não está disponível. Escolha outro, por favor.");
      }

      // Defesa extra: sobreposição directa (com intervalos de tratamento aplicados)
      const candStart = startAt.getTime();
      const candEnd = endAt.getTime() + service.gapAfterMinutes * 60_000;
      const conflicts = await tx.appointment.findMany({
        where: {
          professionalId,
          status: { in: ["PENDING", "CONFIRMED"] },
          startAt: { lt: new Date(candEnd) },
          // margem à esquerda: apanhar também o gapAfter de marcações cujo fim
          // cru já passou mas cujo intervalo invade o candidato (getDaySlots é
          // a fonte de verdade; isto é só defesa redundante mais honesta)
          endAt: { gt: new Date(candStart - 6 * 60 * 60_000) },
        },
        select: { id: true, startAt: true, endAt: true, service: { select: { gapAfterMinutes: true } } },
      });
      const hardConflict = conflicts.some((c) => {
        const busyStart = c.startAt.getTime();
        const busyEnd = c.endAt.getTime() + c.service.gapAfterMinutes * 60_000;
        return candStart < busyEnd && busyStart < candEnd;
      });
      if (hardConflict) {
        throw new BookingError("SLOT_UNAVAILABLE", "O horário escolhido já não está disponível. Escolha outro, por favor.");
      }

      // Antecedência mínima para clientes
      if (input.context === "CUSTOMER" && startAt.getTime() < Date.now() + settings.minLeadMinutes * 60_000) {
        throw new BookingError("TOO_LATE", "Só é possível marcar com a antecedência mínima configurada pelo estúdio.");
      }

      let customer = await tx.customer.findFirst({
        where: { phone: { in: phoneVariants } },
      });
      if (customer) {
        // o e-mail de um cliente existente NUNCA é substituído por uma marcação
        // nova (quem só conhece o telefone não pode tomar o controlo das marcações
        // anteriores, que são validadas pelo e-mail). Só preenche se estiver vazio.
        const fillEmail = !customer.email && input.email ? input.email : undefined;
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            email: fillEmail,
            consentAt: input.consent ? new Date() : undefined,
          },
        });
      } else {
        customer = await tx.customer.create({
          data: {
            name: input.name.trim(),
            phone: phoneNorm || input.phone.trim(),
            email: input.email ?? null,
            notes: null,
            consentAt: input.consent ? new Date() : null,
          },
        });
      }

      let appointment: Appointment | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          appointment = await tx.appointment.create({
            data: {
              reference: generateReference(),
              customerId: customer.id,
              serviceId: service.id,
              professionalId: professionalId!,
              startAt,
              endAt,
              status: finalStatus,
              priceAtBooking: service.priceMin,
              notes: input.notes ?? null,
            },
          });
          break;
        } catch (err) {
          const e = err as { code?: string };
          if (e.code === "P2002") continue; // colisão de código de reserva — tentar outro
          throw err;
        }
      }
      if (!appointment) {
        throw new BookingError("INTERNAL", "Não foi possível gerar o código de reserva. Tente de novo.");
      }

      const events: Array<{ type: "CREATED" | "CONFIRMED" }> = [{ type: "CREATED" }];
      if (finalStatus === "CONFIRMED") events.push({ type: "CONFIRMED" });
      await tx.appointmentEvent.createMany({
        data: events.map((ev) => ({
          appointmentId: appointment!.id,
          type: ev.type,
          actor: input.context === "ADMIN" ? "ADMIN" as EventActor : "CUSTOMER" as EventActor,
          description:
            ev.type === "CREATED"
              ? input.context === "ADMIN"
                ? "Criada manualmente no painel"
                : "Criada pelo cliente no site"
              : "Confirmação automática",
        })),
      });

      return tx.appointment.findUniqueOrThrow({
        where: { id: appointment.id },
        include: apptFullInclude,
      });
    });
  } catch (err) {
    if (err instanceof BookingError) throw err;
    console.error("[carmix] erro ao criar marcação:", err);
    throw new BookingError("INTERNAL", "Houve um problema ao registar a marcação. Tente novamente.");
  }

  // E-mails após o commit — falhas de e-mail não invalidam a marcação
  const createdMail = await mailBookingCreated(created);
  await mailBookingAdminNotice(created);
  const emailsOk = createdMail.sent;

  return { appointment: created, emails: { sent: emailsOk } };
}

// ── Consulta pública por código de reserva ───────────────────────────────────

export async function findAppointmentByReference(reference: string) {
  const ref = reference.trim().toUpperCase();
  if (!ref) return null;
  try {
    return await db.appointment.findUnique({
      where: { reference: ref },
      include: apptFullInclude,
    });
  } catch {
    return null;
  }
}

// ── Cancelamento (cliente) ───────────────────────────────────────────────────

export async function cancelBookingAsCustomer(input: {
  reference: string;
  email: string;
  reason?: string | null;
}): Promise<{ ok: true }> {
  const appt = await findAppointmentByReference(input.reference);
  if (!appt || appt.reference !== input.reference.trim().toUpperCase()) {
    throw new BookingError("NOT_FOUND", "Não encontrámos uma marcação com esse número e e-mail.");
  }
  if (!appt.customer?.email || appt.customer.email.toLowerCase() !== input.email.trim().toLowerCase()) {
    throw new BookingError("EMAIL_MISMATCH", "O e-mail não corresponde ao da marcação.");
  }
  if (appt.status !== "PENDING" && appt.status !== "CONFIRMED") {
    throw new BookingError("INVALID_STATUS", "Esta marcação já não pode ser cancelada online.");
  }

  const settings = await getSettings();
  const hoursUntil = (appt.startAt.getTime() - Date.now()) / 3_600_000;
  if (hoursUntil < settings.minCancelHours) {
    throw new BookingError(
      "POLICY_TOO_LATE",
      `Por política do estúdio, só é possível cancelar online até ${settings.minCancelHours} h antes. Contacte-nos, por favor.`,
    );
  }

  await db.$transaction(async (tx) => {
    await lockForProfessional(tx, appt.professionalId);
    const current = await tx.appointment.findUnique({ where: { id: appt.id } });
    if (!current || (current.status !== "PENDING" && current.status !== "CONFIRMED")) {
      throw new BookingError("INVALID_STATUS", "Esta marcação já não pode ser cancelada online.");
    }
    await tx.appointment.update({
      where: { id: appt.id },
      data: { status: "CANCELLED", cancelReason: input.reason?.trim() || "Cancelada pelo cliente" },
    });
    await tx.appointmentEvent.create({
      data: {
        appointmentId: appt.id,
        type: "CANCELLED",
        actor: "CUSTOMER",
        description: input.reason?.trim() || "Cancelada pelo cliente no site",
      },
    });
  });

  await mailBookingCancelled(appt as ApptFull, input.reason?.trim() || "Cancelada pelo cliente");
  return { ok: true };
}

// ── Remarcação (cliente) ─────────────────────────────────────────────────────

export async function rescheduleBookingAsCustomer(input: {
  reference: string;
  email: string;
  dateISO: string;
  minutes: number;
}): Promise<{ ok: true }> {
  const appt = await findAppointmentByReference(input.reference);
  if (!appt || appt.reference !== input.reference.trim().toUpperCase()) {
    throw new BookingError("NOT_FOUND", "Não encontrámos uma marcação com esse número e e-mail.");
  }
  if (!appt.customer?.email || appt.customer.email.toLowerCase() !== input.email.trim().toLowerCase()) {
    throw new BookingError("EMAIL_MISMATCH", "O e-mail não corresponde ao da marcação.");
  }
  if (appt.status !== "PENDING" && appt.status !== "CONFIRMED") {
    throw new BookingError("INVALID_STATUS", "Esta marcação já não pode ser remarcada online.");
  }

  const settings = await getSettings();
  if (!settings.allowReschedule) {
    throw new BookingError("RESCHEDULE_OFF", "O estúdio não permite remarcação online. Contacte-nos, por favor.");
  }
  const hoursUntil = (appt.startAt.getTime() - Date.now()) / 3_600_000;
  if (hoursUntil < settings.minCancelHours) {
    throw new BookingError(
      "POLICY_TOO_LATE",
      `Por política do estúdio, só é possível remarcar online até ${settings.minCancelHours} h antes. Contacte-nos, por favor.`,
    );
  }

  const day = parseDayISO(input.dateISO);
  if (!day) throw new BookingError("INVALID_INPUT", "Data inválida.");
  const service = await db.service.findUnique({ where: { id: appt.serviceId } });
  if (!service) throw new BookingError("INTERNAL", "Serviço indisponível.");

  const oldStart = appt.startAt;
  const startAt = wallToUtc(day, Math.floor(input.minutes / 60), input.minutes % 60, settings.timezone);
  const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);

  try {
    await db.$transaction(async (tx) => {
      await lockForProfessional(tx, appt.professionalId);
      // releitura dentro da transação: o estado pode ter mudado desde o check
      const current = await tx.appointment.findUnique({
        where: { id: appt.id },
        select: { status: true, startAt: true },
      });
      if (!current || (current.status !== "PENDING" && current.status !== "CONFIRMED")) {
        throw new BookingError("INVALID_STATUS", "Esta marcação já não pode ser remarcada online.");
      }
      const hoursUntilTx = (current.startAt.getTime() - Date.now()) / 3_600_000;
      if (hoursUntilTx < settings.minCancelHours) {
        throw new BookingError(
          "POLICY_TOO_LATE",
          `Por política do estúdio, só é possível remarcar online até ${settings.minCancelHours} h antes. Contacte-nos, por favor.`,
        );
      }
      const slots = await getDaySlots(tx, appt.professionalId, service, day, settings as SettingsLike, {
        excludeApptId: appt.id,
      });
      if (!slots.some((s) => s.minutes === input.minutes)) {
        throw new BookingError("SLOT_UNAVAILABLE", "O novo horário não está disponível. Escolha outro, por favor.");
      }
      await tx.appointment.update({
        where: { id: appt.id },
        data: { startAt, endAt },
      });
      await tx.appointmentEvent.create({
        data: {
          appointmentId: appt.id,
          type: "RESCHEDULED",
          actor: "CUSTOMER",
          description: "Remarcada pelo cliente no site",
        },
      });
    });
  } catch (err) {
    if (err instanceof BookingError) throw err;
    console.error("[carmix] erro ao remarcar:", err);
    throw new BookingError("INTERNAL", "Houve um problema ao remarcar. Tente novamente.");
  }

  const updated = await db.appointment.findUnique({
    where: { id: appt.id },
    include: apptFullInclude,
  });
  if (updated) await mailBookingRescheduled(updated as ApptFull, oldStart);
  return { ok: true };
}

// ── Operações administrativas ────────────────────────────────────────────────

export async function appointmentStatusUpdate(
  id: string,
  next: { status: AppointmentStatus; cancelReason?: string | null; note?: string },
): Promise<{ ok: true; appointment: ApptFull } | { ok: false; reason: string }> {
  const current = await db.appointment.findUnique({ where: { id }, include: apptFullInclude });
  if (!current) return { ok: false, reason: "Marcação inexistente." };
  if (current.status === next.status) return { ok: true, appointment: current as ApptFull };

  const result = await db.$transaction(async (tx) => {
    await lockForProfessional(tx, current.professionalId);
    const fresh = await tx.appointment.findUnique({ where: { id } });
    if (!fresh || fresh.status !== current.status) {
      return null; // mudou entretanto — o chamador recarrega
    }
    await tx.appointment.update({
      where: { id },
      data: {
        status: next.status,
        cancelReason: next.cancelReason ?? null,
      },
    });
    await tx.appointmentEvent.create({
      data: {
        appointmentId: id,
        type:
          next.status === "CANCELLED"
            ? "CANCELLED"
            : next.status === "NO_SHOW"
              ? "NO_SHOW"
              : next.status === "COMPLETED"
                ? "COMPLETED"
                : "CONFIRMED",
        actor: "ADMIN",
        description: next.note!,
      },
    });
    return tx.appointment.findUniqueOrThrow({ where: { id }, include: apptFullInclude });
  });

  if (!result) return { ok: false, reason: "A marcação acabou de mudar de estado. Recarregue a página." };
  return { ok: true, appointment: result as ApptFull };
}

export async function cancelAppointmentAsAdmin(
  id: string,
  reason: string | null,
): Promise<{ ok: true; appointment: ApptFull } | { ok: false; reason: string }> {
  const res = await appointmentStatusUpdate(id, {
    status: "CANCELLED",
    cancelReason: reason?.trim() || "Cancelada pelo estúdio",
    note: reason?.trim() || "Cancelada pelo estúdio",
  });
  if (res.ok) await mailBookingCancelled(res.appointment, res.appointment.cancelReason);
  return res;
}

export async function rescheduleAppointmentAsAdmin(
  id: string,
  dateISO: string,
  minutes: number,
  reason?: string | null,
): Promise<{ ok: true; appointment: ApptFull } | { ok: false; reason: string }> {
  const current = await db.appointment.findUnique({ where: { id }, include: apptFullInclude });
  if (!current) return { ok: false, reason: "Marcação inexistente." };
  if (current.status === "CANCELLED" || current.status === "NO_SHOW") {
    return { ok: false, reason: "Não é possível remarcar uma marcação cancelada." };
  }
  if (current.status !== "PENDING" && current.status !== "CONFIRMED") {
    return { ok: false, reason: "Não é possível remarcar uma marcação concluída." };
  }
  const settings = await getSettings();
  const day = parseDayISO(dateISO);
  if (!day) return { ok: false, reason: "Data inválida." };
  const service = await db.service.findUnique({ where: { id: current.serviceId } });
  if (!service) return { ok: false, reason: "Serviço indisponível." };

  const startTime = wallToUtc(day, Math.floor(minutes / 60), minutes % 60, settings.timezone);
  const endTime = new Date(startTime.getTime() + service.durationMin * 60_000);
  const oldStart = current.startAt;
  if (startTime.getTime() < Date.now()) {
    return { ok: false, reason: "Não é possível remarcar para um horário que já passou." };
  }

  try {
    const updated = await db.$transaction(async (tx) => {
      await lockForProfessional(tx, current.professionalId);
      // reler DENTRO da transação: outra admin pode ter cancelado/remarcado
      // entre o check inicial e o lock (auditoria ronda 3)
      const fresh = await tx.appointment.findUnique({ where: { id }, select: { status: true } });
      if (!fresh || (fresh.status !== "PENDING" && fresh.status !== "CONFIRMED")) {
        throw new BookingError("INVALID_STATUS", "Esta marcação já não pode ser remarcada.");
      }
      const slots = await getDaySlots(tx, current.professionalId, service, day, settings as SettingsLike, {
        ignoreLeadTime: true,
        excludeApptId: id,
      });
      if (!slots.some((s) => s.minutes === minutes)) {
        throw new BookingError("SLOT_UNAVAILABLE", "O novo horário não está disponível.");
      }
      await tx.appointment.update({
        where: { id },
        data: { startAt: startTime, endAt: endTime },
      });
      await tx.appointmentEvent.create({
        data: {
          appointmentId: id,
          type: "RESCHEDULED",
          actor: "ADMIN",
          description: reason?.trim() || `Remarcada para ${dayISO(day)} às ${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
        },
      });
      return tx.appointment.findUniqueOrThrow({ where: { id }, include: apptFullInclude });
    });

    await mailBookingRescheduled(updated as ApptFull, oldStart);
    return { ok: true, appointment: updated as ApptFull };
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, reason: err.message };
    console.error("[carmix] remarcação admin:", err);
    return { ok: false, reason: "Houve um problema ao remarcar. Tente novamente." };
  }
}

export async function confirmAppointmentAsAdmin(
  id: string,
): Promise<{ ok: true; appointment: ApptFull } | { ok: false; reason: string }> {
  const res = await appointmentStatusUpdate(id, { status: "CONFIRMED", note: "Confirmada pelo estúdio" });
  if (res.ok) await mailBookingConfirmed(res.appointment);
  return res;
}

export async function completeOrNoShowAsAdmin(
  id: string,
  status: "COMPLETED" | "NO_SHOW",
): Promise<{ ok: true; appointment: ApptFull } | { ok: false; reason: string }> {
  return appointmentStatusUpdate(id, {
    status,
    note: status === "COMPLETED" ? "Marcada como concluída" : "Marcação de falta de comparência",
  });
}