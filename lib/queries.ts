// Consultas Server Component reutilizadas pelas páginas públicas.

import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { weekdayOfDay, type DayParts, addDaysParts } from "@/lib/tz";
import type { Review, BusinessSettings } from "@prisma/client";

export type { BusinessSettings };

export type DaySchedule = {
  weekday: number;
  windows: Array<[number, number]>;
};

export type FeaturedService = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceMin: number;
  priceMax: number | null;
  imageUrl: string | null;
  categoryName: string | null;
  durationMin: number;
};

export async function getFeaturedServices(limit = 6): Promise<FeaturedService[]> {
  const rows = await db.service.findMany({
    where: { isActive: true, isFeatured: true },
    orderBy: [{ sortOrder: "asc" }],
    take: limit,
    include: { category: { select: { name: true } } },
  });
  return rows.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    description: s.description,
    priceMin: s.priceMin,
    priceMax: s.priceMax,
    imageUrl: s.imageUrl,
    categoryName: s.category?.name ?? null,
    durationMin: s.durationMin,
  }));
}

// Serviços em destaque que têm de existir para o calendário funcionar
export async function getBookableServices() {
  return db.service.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }],
    include: { category: { select: { name: true, slug: true, sortOrder: true } } },
  });
}

export async function getActiveProfessionals() {
  return db.professional.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getVisibleGallery(limit?: number) {
  return db.galleryImage.findMany({
    where: { isVisible: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    ...(limit ? { take: limit } : {}),
  });
}

export async function getPublishedReviews(limit?: number): Promise<Review[]> {
  return db.review.findMany({
    where: { isPublished: true },
    orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
    ...(limit ? { take: limit } : {}),
  });
}

/** Agregado do horário de funcionamento (janelas de todos os profissionais ativos). */
export async function getScheduleSummary(today?: DayParts): Promise<DaySchedule[]> {
  const rows = await db.availability.findMany({
    where: { isActive: true, professional: { isActive: true } },
    select: { weekday: true, startMinute: true, endMinute: true },
  });
  const byDay = new Map<number, Array<[number, number]>>();
  for (const r of rows) {
    const list = byDay.get(r.weekday) ?? [];
    list.push([r.startMinute, r.endMinute]);
    byDay.set(r.weekday, list);
  }
  const out: DaySchedule[] = [];
  for (const wd of [1, 2, 3, 4, 5, 6, 0]) {
    out.push({ weekday: wd, windows: (byDay.get(wd) ?? []).sort((a, b) => a[0] - b[0]) });
  }
  return out;
}

/** Próxima data de funcionamento a partir de um dia (inclusive), ISO. */
export function nextOpening(schedule: DaySchedule[], from: DayParts): DayParts {
  let d = from;
  for (let i = 0; i < 8; i++) {
    const wd = weekdayOfDay(d);
    if ((schedule.find((s) => s.weekday === wd)?.windows.length ?? 0) > 0) return d;
    d = addDaysParts(d, 1);
  }
  return from;
}

export async function getSettingsCached() {
  return getSettings();
}