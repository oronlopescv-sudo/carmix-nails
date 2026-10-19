"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import {
  bookingCreateSchema,
  customerCancelSchema,
  customerRescheduleSchema,
  parseForm,
} from "@/lib/validators";
import {
  createBooking,
  cancelBookingAsCustomer,
  rescheduleBookingAsCustomer,
  findAppointmentByReference,
  BookingError,
} from "@/lib/booking";
import { clientIp, rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import type { ActionResult } from "@/types/actions";

// Criação da marcação pelo cliente (fluxo /agendar)
export async function createBookingAction(input: {
  serviceId: string;
  professionalId: string;
  dateISO: string;
  minutes: number;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  consent: boolean;
  website?: string;
}): Promise<ActionResult<{ reference: string; status: string; emailSent: boolean }>> {
  const h = await headers();
  const ip = clientIp(h);

  // honeypot precisa de estar vazio
  if (input.website && input.website.length > 0) {
    return { ok: false, error: "Pedido inválido." };
  }
  const rl = rateLimit(`booking:${ip}`, RATE_LIMITS.booking.limit, RATE_LIMITS.booking.windowMs);
  if (!rl.ok) {
    return {
      ok: false,
      error: "Está a criar marcações demasiado depressa. Tente dentro de alguns minutos.",
      retryAfterSeconds: rl.retryAfterSeconds,
    };
  }

  const parsed = parseForm(bookingCreateSchema, input);
  if (!parsed.ok) {
    return { ok: false, error: "Verifique os dados do formulário.", fieldErrors: parsed.fieldErrors };
  }

  try {
    const result = await createBooking({ ...parsed.data, context: "CUSTOMER" });
    return {
      ok: true,
      reference: result.appointment.reference,
      status: result.appointment.status,
      emailSent: result.emails.sent,
    };
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, error: err.message };
    return { ok: false, error: "Houve um problema. Tente novamente." };
  }
}

// Cancelamento pelo cliente (página /reserva/[reference])
export async function cancelBookingAction(input: {
  reference: string;
  email: string;
  reason?: string;
}): Promise<ActionResult<{ cancelled: true }>> {
  const h = await headers();
  const rl = rateLimit(`cancel:${clientIp(h)}`, 10, 5 * 60_000);
  if (!rl.ok) return { ok: false, error: "Demasiadas tentativas. Tente daqui a minutos." };

  const parsed = parseForm(customerCancelSchema, input);
  if (!parsed.ok) return { ok: false, error: "Verifique os dados.", fieldErrors: parsed.fieldErrors };

  try {
    await cancelBookingAsCustomer({
      reference: parsed.data.reference,
      email: parsed.data.email,
      reason: parsed.data.reason ?? null,
    });
    return { ok: true, cancelled: true };
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, error: err.message };
    return { ok: false, error: "Houve um problema. Tente novamente." };
  }
}

// Remarcação pelo cliente
export async function rescheduleBookingAction(input: {
  reference: string;
  email: string;
  dateISO: string;
  minutes: number;
}): Promise<ActionResult<{ rescheduled: true }>> {
  const h = await headers();
  const rl = rateLimit(`reschedule:${clientIp(h)}`, 10, 5 * 60_000);
  if (!rl.ok) return { ok: false, error: "Demasiadas tentativas. Tente daqui a minutos." };

  const parsed = parseForm(customerRescheduleSchema, input);
  if (!parsed.ok) return { ok: false, error: "Verifique os dados.", fieldErrors: parsed.fieldErrors };

  try {
    await rescheduleBookingAsCustomer({
      reference: parsed.data.reference,
      email: parsed.data.email,
      dateISO: parsed.data.dateISO,
      minutes: parsed.data.minutes,
    });
    return { ok: true, rescheduled: true };
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, error: err.message };
    return { ok: false, error: "Houve um problema. Tente novamente." };
  }
}
// ── Consultas do fluxo de marcação (públicas, com verificação) ─────────────

import { getDaySlots, getDaysWithSlots } from "@/lib/availability";
import { parseDayISO, wallNow, addDaysParts, dayISO } from "@/lib/tz";
import type { SlotDTO } from "@/types/actions";

async function loadServicePro(serviceId: string, professionalId: string) {
  const [service, pro] = await Promise.all([
    db.service.findUnique({ where: { id: serviceId } }),
    db.professional.findUnique({ where: { id: professionalId } }),
  ]);
  if (!service || !service.isActive) throw new Error("Serviço indisponível.");
  if (!pro || !pro.isActive) throw new Error("Profissional indisponível.");
  const linked = await db.professionalService.findUnique({
    where: { professionalId_serviceId: { professionalId, serviceId: service.id } },
  });
  if (!linked) throw new Error("Este profissional não oferece esse serviço.");
  return service;
}

// Horários livres num dia concreto, para o seletor de data/hora
export async function getSlotsAction(
  serviceId: string,
  professionalId: string,
  dateISO: string,
): Promise<SlotDTO[]> {
  const h = await headers();
  const rl = rateLimit(`avail:${clientIp(h)}`, RATE_LIMITS.availability.limit, RATE_LIMITS.availability.windowMs);
  if (!rl.ok) return [];
  try {
    const service = await loadServicePro(serviceId, professionalId);
    const day = parseDayISO(dateISO);
    if (!day || dayISO(day) !== dateISO) return [];
    const settings = await getSettings();
    return await getDaySlots(db, professionalId, service, day, settings);
  } catch {
    return [];
  }
}

// Dias com disponibilidade nos próximos meses (calendário do fluxo)
export async function getOpenDaysAction(
  serviceId: string,
  professionalId: string,
): Promise<{ days: string[]; maxDay: string }> {
  const settings = await getSettings();
  const today = wallNow(settings.timezone);
  const fromDay = addDaysParts(today, 0);
  const toDay = addDaysParts(today, settings.maxLeadDays);
  const h = await headers();
  const rl = rateLimit(`avail:${clientIp(h)}`, RATE_LIMITS.availability.limit, RATE_LIMITS.availability.windowMs);
  if (!rl.ok) return { days: [], maxDay: dayISO(toDay) };
  try {
    const service = await loadServicePro(serviceId, professionalId);
    const days = await getDaysWithSlots(professionalId, service, fromDay, toDay, settings);
    return { days, maxDay: dayISO(toDay) };
  } catch {
    return { days: [], maxDay: dayISO(toDay) };
  }
}

// Verificação de propriedade da reserva (página /reserva/[reference])
export async function verifyReservationAction(input: {
  reference: string;
  email: string;
}): Promise<ActionResult<{ matched: true }>> {
  const h = await headers();
  const rl = rateLimit(`verify:${clientIp(h)}`, 20, 5 * 60_000);
  if (!rl.ok) return { ok: false, error: "Demasiadas tentativas. Tente daqui a minutos." };
  const reference = (input.reference || "").trim().toUpperCase();
  const email = (input.email || "").trim().toLowerCase();
  if (!reference || !email) return { ok: false, error: "Indique a referência e o e-mail." };
  const appt = await findAppointmentByReference(reference);
  if (!appt || appt.customer.email?.toLowerCase() !== email) {
    return { ok: false, error: "Referência ou e-mail não correspondem a esta reserva." };
  }
  return { ok: true, matched: true };
}

// Metadados + detalhes da própria reserva (após e-mail correto). Os detalhes
// só saem daqui — NUNCA como props/RSC da página — para a referência não
// expor data/serviço/profissional a quem não provou ser o dono.
export async function reservationMetadataAction(
  reference: string,
  email: string,
): Promise<
  ActionResult<{
    serviceId: string;
    professionalId: string;
    serviceName: string;
    professionalName: string;
    status: string;
    startAtISO: string;
  }>
> {
  const h = await headers();
  const rl = rateLimit(`meta:${clientIp(h)}`, 30, 5 * 60_000);
  if (!rl.ok) return { ok: false, error: "Demasiadas tentativas." };
  const appt = await findAppointmentByReference((reference || "").trim().toUpperCase());
  if (!appt || appt.customer.email?.toLowerCase() !== (email || "").trim().toLowerCase()) {
    return { ok: false, error: "Reserva não verificada." };
  }
  return {
    ok: true,
    serviceId: appt.serviceId,
    professionalId: appt.professionalId,
    serviceName: appt.service.name,
    professionalName: appt.professional.name,
    status: appt.status as string,
    startAtISO: appt.startAt.toISOString(),
  };
}
