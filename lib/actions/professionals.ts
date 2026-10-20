"use server";

import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { parseForm, professionalSchema, availabilityUpdateSchema, blockedPeriodSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/types/actions";

export async function saveProfessionalAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const parsed = parseForm(professionalSchema, input);
  if (!parsed.ok) return { ok: false, error: "Verifique os dados.", fieldErrors: parsed.fieldErrors };
  const data = parsed.data;

  try {
    if (data.id) {
      const existing = await db.professional.findUnique({ where: { id: data.id } });
      if (!existing) return { ok: false, error: "Profissional inexistente." };
      const now = new Date();
      const futureActive = { professionalId: data.id, status: { in: ["PENDING", "CONFIRMED"] as Array<"PENDING" | "CONFIRMED"> }, startAt: { gte: now } };
      // desativar ou retirar serviços com marcações futuras deixaria essas marcações
      // órfãs de disponibilidade/serviço: exige tratá-las primeiro
      if (!data.isActive && existing.isActive) {
        const n = await db.appointment.count({ where: futureActive });
        if (n > 0) {
          return { ok: false, error: `Este profissional tem ${n} marcação(ões) futura(s). Remarque-as ou cancele-as antes de o desativar.` };
        }
      }
      const keptServices = new Set(data.serviceIds);
      const current = await db.professionalService.findMany({ where: { professionalId: data.id }, select: { serviceId: true } });
      const removed = current.map((c: { serviceId: string }) => c.serviceId).filter((sid: string) => !keptServices.has(sid));
      if (removed.length > 0) {
        const n = await db.appointment.count({ where: { ...futureActive, serviceId: { in: removed } } });
        if (n > 0) {
          return { ok: false, error: `Há ${n} marcação(ões) futura(s) com um serviço que está a retirar deste profissional. Trate-as primeiro.` };
        }
      }
      const updated = await db.professional.update({
        where: { id: data.id },
        data: {
          name: data.name,
          title: data.title,
          description: data.description,
          imageUrl: data.imageUrl,
          isActive: data.isActive,
        },
      });
      await db.$transaction(async (tx) => {
        await tx.professionalService.deleteMany({ where: { professionalId: updated.id } });
        if (data.serviceIds.length > 0) {
          await tx.professionalService.createMany({
            data: data.serviceIds.map((serviceId) => ({ professionalId: updated.id, serviceId })),
          });
        }
      });
      await logAudit({ userId: user.id, action: "professional.update", entity: "professional", entityId: updated.id });
      return { ok: true, id: updated.id };
    }
    const root = slugify(data.name) || `pro-${Date.now().toString(36)}`;
    let slug = root;
    for (let i = 2; i < 60; i++) {
      if (!(await db.professional.findUnique({ where: { slug } }))) break;
      slug = `${root}-${i}`;
    }
    const created = await db.professional.create({
      data: {
        name: data.name,
        slug,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        isActive: data.isActive,
      },
    });
    if (data.serviceIds.length > 0) {
      await db.professionalService.createMany({
        data: data.serviceIds.map((serviceId) => ({ professionalId: created.id, serviceId })),
      });
    }
    // horário padrão (igual ao seed): sem janelas o calendário de marcação
    // fica sem dias abertos para este profissional. Editável em Horários.
    // Seg–Sex 08:30–17:30, Sáb 08:30–13:00, Dom fechado.
    const defaultRows = [1, 2, 3, 4, 5].map((weekday) => ({
      professionalId: created.id,
      weekday,
      startMinute: 510,
      endMinute: 1050,
      isActive: true,
    }));
    defaultRows.push({ professionalId: created.id, weekday: 6, startMinute: 510, endMinute: 780, isActive: true });
    await db.availability.createMany({ data: defaultRows });
    await logAudit({ userId: user.id, action: "professional.create", entity: "professional", entityId: created.id });
    return { ok: true, id: created.id };
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "P2002") return { ok: false, error: "Já existe um profissional com esse slug." };
    console.error("[carmix] saveProfessional:", err);
    return { ok: false, error: "Não foi possível guardar o profissional." };
  }
}

export async function deleteProfessionalAction(id: string): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const count = await db.appointment.count({ where: { professionalId: id } });
  if (count > 0) {
    return {
      ok: false,
      error: `Este profissional tem ${count} marcação(ões) — não pode ser eliminado. Desative-o em vez disso.`,
    };
  }
  await db.professional.delete({ where: { id } });
  await logAudit({ userId: user.id, action: "professional.delete", entity: "professional", entityId: id });
  return { ok: true };
}

// ── Horário individual (janelas por dia da semana) ───────────────────────────

export async function updateAvailabilityAction(input: unknown): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const parsed = parseForm(availabilityUpdateSchema, input);
  if (!parsed.ok) return { ok: false, error: "Verifique os horários.", fieldErrors: parsed.fieldErrors };
  const { professionalId, rows } = parsed.data;

  const pro = await db.professional.findUnique({ where: { id: professionalId } });
  if (!pro) return { ok: false, error: "Profissional inexistente." };

  await db.$transaction(async (tx) => {
    await tx.availability.deleteMany({ where: { professionalId } });
    if (rows.length > 0) {
      await tx.availability.createMany({
        data: rows.map((r) => ({
          professionalId,
          weekday: r.weekday,
          startMinute: r.startMinute,
          endMinute: r.endMinute,
          isActive: r.isActive,
        })),
      });
    }
  });
  await logAudit({
    userId: user.id,
    action: "availability.update",
    entity: "professional",
    entityId: professionalId,
    meta: { janelas: rows.length },
  });
  return { ok: true };
}

// ── Bloqueios (férias, pausas, feriados, encerramentos, bloqueios manuais) ───

export async function saveBlockedPeriodAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const parsed = parseForm(blockedPeriodSchema, input);
  if (!parsed.ok) return { ok: false, error: "Verifique os dados do bloqueio.", fieldErrors: parsed.fieldErrors };
  const data = parsed.data;

  const startDate = new Date(`${data.startDate}T00:00:00.000Z`);
  const endDate = new Date(`${data.endDate}T00:00:00.000Z`);

  try {
    if (data.id) {
      await db.blockedPeriod.update({
        where: { id: data.id },
        data: {
          professionalId: data.professionalId,
          type: data.type,
          startDate,
          endDate,
          startMinute: data.startMinute,
          endMinute: data.endMinute,
          reason: data.reason,
        },
      });
      await logAudit({ userId: user.id, action: "blocked.update", entity: "blockedPeriod", entityId: data.id });
      return { ok: true, id: data.id };
    }
    const created = await db.blockedPeriod.create({
      data: {
        professionalId: data.professionalId,
        type: data.type,
        startDate,
        endDate,
        startMinute: data.startMinute,
        endMinute: data.endMinute,
        reason: data.reason,
      },
    });
    await logAudit({ userId: user.id, action: "blocked.create", entity: "blockedPeriod", entityId: created.id });
    return { ok: true, id: created.id };
  } catch (err) {
    console.error("[carmix] saveBlockedPeriod:", err);
    return { ok: false, error: "Não foi possível guardar o bloqueio." };
  }
}

export async function deleteBlockedPeriodAction(id: string): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  await db.blockedPeriod.delete({ where: { id } });
  await logAudit({ userId: user.id, action: "blocked.delete", entity: "blockedPeriod", entityId: id });
  return { ok: true };
}