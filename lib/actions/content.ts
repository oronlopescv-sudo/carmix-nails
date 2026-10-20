"use server";

import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import bcrypt from "bcryptjs";
import {
  parseForm,
  reviewSchema,
  galleryRowSchema,
  galleryCreateSchema,
  settingsSchema,
  userCreateSchema,
} from "@/lib/validators";
import { isValidTimezone } from "@/lib/tz";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/types/actions";

// ── Galeria ──────────────────────────────────────────────────────────────────

export async function createGalleryImageAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const parsed = parseForm(galleryCreateSchema, input);
  if (!parsed.ok) return { ok: false, error: "Verifique os dados.", fieldErrors: parsed.fieldErrors };
  const max = await db.galleryImage.aggregate({ _max: { sortOrder: true } });
  const created = await db.galleryImage.create({
    data: {
      imageUrl: parsed.data.imageUrl,
      title: parsed.data.title,
      alt: parsed.data.alt,
      isVisible: parsed.data.isVisible,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
  await logAudit({ userId: user.id, action: "gallery.create", entity: "galleryImage", entityId: created.id });
  return { ok: true, id: created.id };
}

export async function updateGalleryImageAction(input: unknown): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const parsed = parseForm(galleryRowSchema, input);
  if (!parsed.ok) return { ok: false, error: "Dados inválidos.", fieldErrors: parsed.fieldErrors };
  await db.galleryImage.update({
    where: { id: parsed.data.id },
    data: {
      title: parsed.data.title,
      alt: parsed.data.alt,
      isVisible: parsed.data.isVisible,
    },
  });
  await logAudit({ userId: user.id, action: "gallery.update", entity: "galleryImage", entityId: parsed.data.id });
  return { ok: true };
}

export async function deleteGalleryImageAction(id: string): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  await db.galleryImage.delete({ where: { id } });
  await logAudit({ userId: user.id, action: "gallery.delete", entity: "galleryImage", entityId: id });
  return { ok: true };
}

// Mover para cima/baixo: troca sortOrder com o vizinho
export async function moveGalleryImageAction(id: string, direction: "up" | "down"): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const images = await db.galleryImage.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, sortOrder: true },
  });
  const index = images.findIndex((i) => i.id === id);
  if (index === -1) return { ok: false, error: "Imagem inexistente." };
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= images.length) return { ok: true };
  // normaliza as posições (0..n-1) antes de trocar: posições repetidas
  // faziam a troca não ter efeito visível
  const reordered = [...images];
  [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];
  await db.$transaction(
    reordered.map((img, pos) => db.galleryImage.update({ where: { id: img.id }, data: { sortOrder: pos } })),
  );
  await logAudit({ userId: user.id, action: "gallery.move", entity: "galleryImage", entityId: id, meta: { direction } });
  return { ok: true };
}

// ── Testemunhos ──────────────────────────────────────────────────────────────
// Os testemunhos são reais: só são publicados quando o administrador os ativa.

export async function saveReviewAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const parsed = parseForm(reviewSchema, input);
  if (!parsed.ok) return { ok: false, error: "Verifique o testemunho.", fieldErrors: parsed.fieldErrors };
  const data = parsed.data;
  if (data.id) {
    await db.review.update({
      where: { id: data.id },
      data: {
        customerName: data.customerName,
        rating: data.rating,
        text: data.text,
        isPublished: data.isPublished,
      },
    });
    await logAudit({ userId: user.id, action: "review.update", entity: "review", entityId: data.id });
    return { ok: true, id: data.id };
  }
  const created = await db.review.create({
    data: {
      customerName: data.customerName,
      rating: data.rating,
      text: data.text,
      isPublished: data.isPublished,
      reviewedAt: new Date(),
    },
  });
  await logAudit({ userId: user.id, action: "review.create", entity: "review", entityId: created.id });
  return { ok: true, id: created.id };
}

export async function toggleReviewPublishedAction(id: string, isPublished: boolean): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  await db.review.update({ where: { id }, data: { isPublished, reviewedAt: new Date() } });
  await logAudit({ userId: user.id, action: `review.${isPublished ? "publish" : "unpublish"}`, entity: "review", entityId: id });
  return { ok: true };
}

export async function deleteReviewAction(id: string): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  await db.review.delete({ where: { id } });
  await logAudit({ userId: user.id, action: "review.delete", entity: "review", entityId: id });
  return { ok: true };
}

// ── Configurações gerais ─────────────────────────────────────────────────────

export async function updateSettingsAction(input: unknown): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const parsed = parseForm(settingsSchema, input);
  if (!parsed.ok) return { ok: false, error: "Verifique os campos.", fieldErrors: parsed.fieldErrors };
  const data = parsed.data;
  if (!isValidTimezone(data.timezone)) {
    return { ok: false, error: "Fuso horário inválido.", fieldErrors: { timezone: "Fuso horário inválido" } };
  }
  await db.businessSettings.update({
    where: { id: 1 },
    data: {
      ...data,
    },
  });
  await logAudit({ userId: user.id, action: "settings.update", entity: "settings", entityId: "1" });
  return { ok: true };
}

// ── Acesso administrativo ────────────────────────────────────────────────────

export async function createUserAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const parsed = parseForm(userCreateSchema, input);
  if (!parsed.ok) return { ok: false, error: "Verifique os dados.", fieldErrors: parsed.fieldErrors };
  const existing = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) return { ok: false, error: "Já existe uma conta com esse e-mail.", fieldErrors: { email: "E-mail em uso" } };
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const created = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });
  await logAudit({ userId: user.id, action: "user.create", entity: "user", entityId: created.id, meta: { email: created.email } });
  return { ok: true, id: created.id };
}

export async function toggleUserActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  if (id === user.id && !isActive) {
    return { ok: false, error: "Não pode desativar a sua própria conta." };
  }
  await db.user.update({ where: { id }, data: { isActive } });
  if (!isActive) {
    await db.session.deleteMany({ where: { userId: id } });
  }
  await logAudit({ userId: user.id, action: `user.${isActive ? "activate" : "deactivate"}`, entity: "user", entityId: id });
  return { ok: true };
}

export async function changeUserPasswordAction(
  id: string,
  newPassword: string,
  currentPassword?: string,
): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  if (newPassword.length < 8) return { ok: false, error: "Pelo menos 8 caracteres." };
  if (id === user.id) {
    // na própria conta, a passe atual é sempre exigida (evita tomar conta alheia)
    if (!currentPassword) return { ok: false, error: "Indique a palavra-passe atual." };
    const target = await db.user.findUnique({ where: { id }, select: { passwordHash: true } });
    if (!target) return { ok: false, error: "Utilizador não encontrado." };
    const ok = await bcrypt.compare(currentPassword, target.passwordHash);
    if (!ok) return { ok: false, error: "Palavra-passe atual incorreta." };
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.user.update({ where: { id }, data: { passwordHash } });
  await db.session.deleteMany({ where: { userId: id } });
  await logAudit({ userId: user.id, action: "user.password-change", entity: "user", entityId: id });
  return { ok: true };
}