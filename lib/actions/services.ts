"use server";

import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { parseForm, serviceSchema, categorySchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/types/actions";

async function uniqueSlug(base: string, table: "service" | "category", excludeId?: string): Promise<string> {
  const root = slugify(base) || "servico";
  let candidate = root;
  for (let i = 2; i < 60; i++) {
    const exists =
      table === "service"
        ? await db.service.findUnique({ where: { slug: candidate } })
        : await db.category.findUnique({ where: { slug: candidate } });
    if (!exists || exists.id === excludeId) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function saveServiceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const parsed = parseForm(serviceSchema, input);
  if (!parsed.ok) return { ok: false, error: "Verifique os dados do serviço.", fieldErrors: parsed.fieldErrors };
  const data = parsed.data;

  // slug: se veio vazio, gerar a partir do nome
  const slug = data.slug ?? (await uniqueSlug(data.name, "service", data.id));

  try {
    if (data.id) {
      const existing = await db.service.findUnique({ where: { id: data.id } });
      if (!existing) return { ok: false, error: "Serviço inexistente." };
      const finalSlug = data.slug ? slug : existing.slug;
      const updated = await db.service.update({
        where: { id: data.id },
        data: {
          name: data.name,
          slug: finalSlug,
          description: data.description,
          categoryId: data.categoryId,
          priceMin: data.priceMin,
          priceMax: data.priceMax,
          durationMin: data.durationMin,
          gapAfterMinutes: data.gapAfterMinutes,
          isActive: data.isActive,
          isFeatured: data.isFeatured,
          imageUrl: data.imageUrl,
          sortOrder: data.sortOrder,
        },
      });
      await logAudit({ userId: user.id, action: "service.update", entity: "service", entityId: updated.id });
      return { ok: true, id: updated.id };
    }
    const created = await db.service.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        categoryId: data.categoryId,
        priceMin: data.priceMin,
        priceMax: data.priceMax,
        durationMin: data.durationMin,
        gapAfterMinutes: data.gapAfterMinutes,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        imageUrl: data.imageUrl,
        sortOrder: data.sortOrder,
      },
    });
    await logAudit({ userId: user.id, action: "service.create", entity: "service", entityId: created.id });
    return { ok: true, id: created.id };
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "P2002") return { ok: false, error: "Já existe outro serviço com esse slug." };
    console.error("[carmix] saveService:", err);
    return { ok: false, error: "Não foi possível guardar o serviço." };
  }
}

export async function deleteServiceAction(id: string): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const count = await db.appointment.count({ where: { serviceId: id } });
  if (count > 0) {
    return {
      ok: false,
      error: `Este serviço tem ${count} marcação(ões) registadas — não pode ser eliminado. Desative-o para o retirar do site.`,
    };
  }
  await db.service.delete({ where: { id } });
  await logAudit({ userId: user.id, action: "service.delete", entity: "service", entityId: id });
  return { ok: true };
}

export async function toggleServiceActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  await db.service.update({ where: { id }, data: { isActive } });
  await logAudit({ userId: user.id, action: `service.${isActive ? "activate" : "deactivate"}`, entity: "service", entityId: id });
  return { ok: true };
}

// ── Categorias ───────────────────────────────────────────────────────────────

export async function saveCategoryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const parsed = parseForm(categorySchema, input);
  if (!parsed.ok) return { ok: false, error: "Verifique os dados da categoria.", fieldErrors: parsed.fieldErrors };
  const data = parsed.data;
  try {
    if (data.id) {
      const updated = await db.category.update({
        where: { id: data.id },
        data: {
          name: data.name,
          description: data.description,
          sortOrder: data.sortOrder,
          isActive: data.isActive,
        },
      });
      await logAudit({ userId: user.id, action: "category.update", entity: "category", entityId: updated.id });
      return { ok: true, id: updated.id };
    }
    const slug = await uniqueSlug(data.name, "category");
    const created = await db.category.create({
      data: { name: data.name, slug, description: data.description, sortOrder: data.sortOrder, isActive: data.isActive },
    });
    await logAudit({ userId: user.id, action: "category.create", entity: "category", entityId: created.id });
    return { ok: true, id: created.id };
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "P2002") return { ok: false, error: "Já existe uma categoria com esse nome/slug." };
    return { ok: false, error: "Não foi possível guardar a categoria." };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const count = await db.service.count({ where: { categoryId: id } });
  if (count > 0) {
    return { ok: false, error: `A categoria tem ${count} serviço(s). Mova-os primeiro para outra categoria.` };
  }
  await db.category.delete({ where: { id } });
  await logAudit({ userId: user.id, action: "category.delete", entity: "category", entityId: id });
  return { ok: true };
}