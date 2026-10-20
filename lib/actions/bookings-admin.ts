"use server";

import { getAuthUser } from "@/lib/auth";
import { parseForm, adminRescheduleSchema, adminManualBookingSchema } from "@/lib/validators";
import {
  cancelAppointmentAsAdmin,
  confirmAppointmentAsAdmin,
  completeOrNoShowAsAdmin,
  rescheduleAppointmentAsAdmin,
  createBooking,
  BookingError,
} from "@/lib/booking";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/types/actions";

async function auth() {
  return getAuthUser();
}

export async function adminConfirmAppointmentAction(id: string): Promise<ActionResult> {
  const user = await auth();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const res = await confirmAppointmentAsAdmin(id);
  if (!res.ok) return { ok: false, error: res.reason };
  await logAudit({ userId: user.id, action: "appointment.confirm", entity: "appointment", entityId: id });
  return { ok: true };
}

export async function adminCancelAppointmentAction(
  id: string,
  reason?: string,
): Promise<ActionResult> {
  const user = await auth();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const res = await cancelAppointmentAsAdmin(id, reason ?? null);
  if (!res.ok) return { ok: false, error: res.reason };
  await logAudit({
    userId: user.id,
    action: "appointment.cancel",
    entity: "appointment",
    entityId: id,
    meta: { reason: reason ?? null },
  });
  return { ok: true };
}

export async function adminCompleteAppointmentAction(
  id: string,
  kind: "COMPLETED" | "NO_SHOW",
): Promise<ActionResult> {
  const user = await auth();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const res = await completeOrNoShowAsAdmin(id, kind);
  if (!res.ok) return { ok: false, error: res.reason };
  await logAudit({
    userId: user.id,
    action: kind === "COMPLETED" ? "appointment.complete" : "appointment.no-show",
    entity: "appointment",
    entityId: id,
  });
  return { ok: true };
}

export async function adminRescheduleAppointmentAction(input: {
  id: string;
  dateISO: string;
  minutes: number;
  reason?: string;
}): Promise<ActionResult> {
  const user = await auth();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const parsed = parseForm(adminRescheduleSchema, input);
  if (!parsed.ok) return { ok: false, error: "Verifique a nova data/hora.", fieldErrors: parsed.fieldErrors };
  try {
    const res = await rescheduleAppointmentAsAdmin(
      parsed.data.id,
      parsed.data.dateISO,
      parsed.data.minutes,
      parsed.data.reason ?? null,
    );
    if (!res.ok) return { ok: false, error: res.reason };
    await logAudit({
      userId: user.id,
      action: "appointment.reschedule",
      entity: "appointment",
      entityId: parsed.data.id,
      meta: { dateISO: parsed.data.dateISO, minutes: parsed.data.minutes },
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, error: err.message };
    return { ok: false, error: "Houve um problema ao remarcar." };
  }
}

export async function adminCreateManualAppointmentAction(input: {
  serviceId: string;
  professionalId?: string;
  dateISO: string;
  minutes: number;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}): Promise<ActionResult<{ reference: string }>> {
  const user = await auth();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const parsed = parseForm(adminManualBookingSchema, input);
  if (!parsed.ok) return { ok: false, error: "Verifique os dados.", fieldErrors: parsed.fieldErrors };
  try {
    const result = await createBooking({ ...parsed.data, context: "ADMIN" });
    await logAudit({
      userId: user.id,
      action: "appointment.create-manual",
      entity: "appointment",
      entityId: result.appointment.id,
    });
    return { ok: true, reference: result.appointment.reference };
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, error: err.message };
    return { ok: false, error: "Houve um problema ao criar a marcação." };
  }
}
// Horários livres para o editor de remarcação (ignora antecedência mínima)
export async function adminSlotsAction(
  serviceId: string,
  professionalId: string,
  dateISO: string,
  excludeApptId?: string,
): Promise<Array<{ minutes: number; time: string; iso: string }>> {
  const user = await auth();
  if (!user) return [];
  const { db } = await import("@/lib/db");
  const { getDaySlots } = await import("@/lib/availability");
  const { getSettings } = await import("@/lib/settings");
  const { parseDayISO } = await import("@/lib/tz");
  const service = await db.service.findUnique({ where: { id: serviceId } });
  const pro = await db.professional.findUnique({ where: { id: professionalId } });
  const day = parseDayISO(dateISO);
  if (!service || !pro || !day) return [];
  const settings = await getSettings();
  // a própria marcação (ao remarcar) não pode bloquear as suas opções
  return getDaySlots(db, professionalId, service, day, settings, {
    ignoreLeadTime: true,
    excludeApptId,
  });
}

// Histórico de eventos de uma marcação (histórico no painel)
export async function appointmentHistoryAction(
  id: string,
): Promise<Array<{ type: string; actor: string; description: string | null; createdAtISO: string }>> {
  const user = await auth();
  if (!user) return [];
  const { db } = await import("@/lib/db");
  const { EVENT_TYPE_LABELS, EVENT_ACTOR_LABELS } = await import("@/lib/constants");
  const events = await db.appointmentEvent.findMany({
    where: { appointmentId: id },
    orderBy: [{ createdAt: "asc" }],
    select: { type: true, actor: true, description: true, createdAt: true },
  });
  return events.map((e) => ({
    type: EVENT_TYPE_LABELS[e.type] ?? e.type,
    actor: EVENT_ACTOR_LABELS[e.actor] ?? e.actor,
    description: e.description,
    createdAtISO: e.createdAt.toISOString(),
  }));
}
