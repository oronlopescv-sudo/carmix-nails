// Motor de disponibilidade.
//
// Todos os cálculos são feitos em "horas de parede" (fuso do estúdio):
// janelas e pausas em minutos desde a meia-noite local; as marcações existentes
// são instantes UTC na base de dados e são convertidos apenas nas comparações.
//
// Regras aplicadas:
//  - janelas de horário do profissional (várias por dia, ex.: pausa de almoço)
//  - bloqueios (férias, feriados, encerramentos, pausas, bloqueios manuais)
//    — por profissional ou para todo o estúdio (professionalId nulo)
//  - duração do serviço
//  - intervalo entre tratamentos (gap do serviço novo E dos serviços existentes)
//  - grade de intervalos (slotIntervalMinutes)
//  - antecedência mínima (minLeadMinutes) e máxima (maxLeadDays)

import { db } from "@/lib/db";
import type { Prisma, BusinessSettings, Service } from "@prisma/client";
import {
  type DayParts,
  wallToUtc,
  utcToWall,
  addDaysParts,
  dayISO,
  minutesToHM,
  weekdayOfDay,
  compareDay,
} from "@/lib/tz";

type DbLike = Prisma.TransactionClient | typeof db;

export type Slot = {
  minutes: number; // minutos desde a meia-noite local
  time: string; // "14:30"
  iso: string; // instante UTC "2026-10-20T14:30:00.000Z"
};

export type BookingConflict = {
  startAt: Date;
  endAt: Date;
  gapAfterMinutes: number;
};

export type SettingsLike = Pick<
  BusinessSettings,
  "timezone" | "slotIntervalMinutes" | "minLeadMinutes" | "maxLeadDays"
>;

type Window = [number, number];

/** Subtrai intervalos de corte de um conjunto de janelas e devolve o resultado fundido e ordenado. */
export function subtractRanges(base: Window[], cuts: Window[]): Window[] {
  let ranges = [...base].sort((a, b) => a[0] - b[0]);
  for (const cut of cuts) {
    const next: Window[] = [];
    for (const [ws, we] of ranges) {
      if (cut[1] <= ws || cut[0] >= we) {
        next.push([ws, we]);
        continue;
      }
      if (cut[0] > ws) next.push([ws, Math.min(cut[0], we)]);
      if (cut[1] < we) next.push([Math.max(cut[1], ws), we]);
    }
    ranges = next.filter(([a, b]) => b > a);
  }
  return ranges;
}

export function computeSlotMinutes(args: {
  windows: Window[];
  pauses: Window[];
  busy: Array<{ start: number; end: number }>; // instantes UTC (ms) já com buffer
  service: Pick<Service, "durationMin" | "gapAfterMinutes">;
  slotInterval: number;
  day: DayParts;
  tz: string;
  now: Date;
  minLeadMinutes: number;
  maxLeadDays: number;
  ignoreLeadTime?: boolean;
}): number[] {
  const { windows, pauses, busy, service, slotInterval, day, tz, now } = args;
  if (slotInterval <= 0) return [];

  const free = subtractRanges(windows, pauses);
  const dur = service.durationMin;
  const gap = service.gapAfterMinutes;
  // o admin ignora a antecedência mínima, mas nunca marca no passado
  const minStart = args.ignoreLeadTime
    ? now.getTime()
    : now.getTime() + args.minLeadMinutes * 60_000;
  // a marcação manual do admin ignora também o horizonte máximo
  const maxStart = args.ignoreLeadTime
    ? Infinity
    : now.getTime() + args.maxLeadDays * 24 * 60 * 60_000;

  const out = new Set<number>();
  for (const [ws, we] of free) {
    for (let t = ws; t + dur <= we; t += slotInterval) {
      let startUtcMs: number;
      try {
        startUtcMs = wallToUtc(day, Math.floor(t / 60), t % 60, tz).getTime();
      } catch {
        continue;
      }
      // conflito em UNIDADES IGUAIS (epoch UTC ms): t é minuto local de parede e
      // busy é epoch ms — antes o compare misturava escalas e nunca casava
      const candStartUtc = startUtcMs;
      const candEndUtc = startUtcMs + (dur + gap) * 60_000; // o intervalo pós-tratamento também bloqueia
      let conflict = false;
      for (const b of busy) {
        if (!(candEndUtc <= b.start || candStartUtc >= b.end)) {
          conflict = true;
          break;
        }
      }
      if (conflict) continue;
      if (startUtcMs < minStart || startUtcMs > maxStart) continue;
      out.add(t);
    }
  }
  return [...out].sort((a, b) => a - b);
}

function slotsFrom(minutes: number[], day: DayParts, tz: string): Slot[] {
  return minutes.map((m) => ({
    minutes: m,
    time: minutesToHM(m),
    iso: wallToUtc(day, Math.floor(m / 60), m % 60, tz).toISOString(),
  }));
}

function toDay(d: Date): DayParts {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

async function loadDayData(
  dbi: DbLike,
  professionalId: string,
  day: DayParts,
  tz: string,
  excludeApptId?: string,
): Promise<{ windows: Window[]; pauses: Window[]; busy: Array<{ start: number; end: number }> }> {
  const weekday = weekdayOfDay(day);
  const todayISO = dayISO(day);
  const dayStart = wallToUtc(day, 0, 0, tz);
  const dayEnd = wallToUtc(addDaysParts(day, 1), 0, 0, tz);
  // Bloqueios: startDate/endDate são @db.Date (meia-noite UTC). Comparar à
  // escala de dias — em fuso UTC−1, wallToUtc(day,0,0) = 01:00 UTC e o
  // `endDate >= dayStart` deixava escapar o encerramento do próprio dia.
  const dayMid = new Date(`${dayISO(day)}T00:00:00.000Z`);
  const nextMid = new Date(`${dayISO(addDaysParts(day, 1))}T00:00:00.000Z`);

  const [availabilityRows, blockedRows, apptRows] = await Promise.all([
    dbi.availability.findMany({
      where: { professionalId, isActive: true, weekday },
      orderBy: { startMinute: "asc" },
    }),
    dbi.blockedPeriod.findMany({
      where: {
        OR: [{ professionalId }, { professionalId: null }],
        startDate: { lt: nextMid },
        endDate: { gte: dayMid },
      },
    }),
    dbi.appointment.findMany({
      where: {
        professionalId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { lt: dayEnd },
        // margem à esquerda para apanhar marcações cujo intervalo se estende para dentro do dia
        endAt: { gt: new Date(dayStart.getTime() - 6 * 60 * 60_000) },
        // a marcação que está a ser remarcada não bloqueia o próprio novo horário
        ...(excludeApptId ? { id: { not: excludeApptId } } : {}),
      },
      select: { startAt: true, endAt: true, service: { select: { gapAfterMinutes: true } } },
    }),
  ]);

  const pauses: Window[] = [];
  let wholeDayBlocked = false;
  for (const b of blockedRows) {
    const bStartISO = dayISO(toDay(b.startDate));
    const bEndISO = dayISO(toDay(b.endDate));
    if (bStartISO > todayISO || bEndISO < todayISO) continue;
    if (b.startMinute == null || b.endMinute == null) {
      wholeDayBlocked = true;
      break;
    }
    pauses.push([b.startMinute, b.endMinute]);
  }

  const windows: Window[] = wholeDayBlocked
    ? []
    : availabilityRows.map((a) => [a.startMinute, a.endMinute] as Window);

  const busy = apptRows.map((a) => ({
    start: a.startAt.getTime(),
    end: a.endAt.getTime() + a.service.gapAfterMinutes * 60_000,
  }));

  return { windows, pauses, busy };
}

/** Horários disponíveis para um profissional, serviço e dia (fuso do estúdio). */
export async function getDaySlots(
  dbi: DbLike,
  professionalId: string,
  service: Pick<Service, "durationMin" | "gapAfterMinutes">,
  day: DayParts,
  settings: SettingsLike,
  opts: {
    now?: Date;
    ignoreLeadTime?: boolean;
    extraConflicts?: BookingConflict[];
    excludeApptId?: string;
  } = {},
): Promise<Slot[]> {
  const tz = settings.timezone;
  const { windows, pauses, busy } = await loadDayData(dbi, professionalId, day, tz, opts.excludeApptId);
  const allBusy = busy.concat(
    (opts.extraConflicts ?? []).map((c) => ({
      start: c.startAt.getTime(),
      end: c.endAt.getTime() + c.gapAfterMinutes * 60_000,
    })),
  );
  const minutes = computeSlotMinutes({
    windows,
    pauses,
    busy: allBusy,
    service,
    slotInterval: settings.slotIntervalMinutes,
    day,
    tz,
    now: opts.now ?? new Date(),
    minLeadMinutes: settings.minLeadMinutes,
    maxLeadDays: settings.maxLeadDays,
    ignoreLeadTime: opts.ignoreLeadTime,
  });
  return slotsFrom(minutes, day, tz);
}

// separado para permitir juntar conflitos extra em memória
async function loadDayDataBusyOnly(
  dbi: DbLike,
  professionalId: string,
  day: DayParts,
  tz: string,
): Promise<Array<{ start: number; end: number }> | null> {
  const dayStart = wallToUtc(day, 0, 0, tz);
  const dayEnd = wallToUtc(addDaysParts(day, 1), 0, 0, tz);
  const apptRows = await dbi.appointment.findMany({
    where: {
      professionalId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { lt: dayEnd },
      endAt: { gt: new Date(dayStart.getTime() - 6 * 60 * 60_000) },
    },
    select: { startAt: true, endAt: true, service: { select: { gapAfterMinutes: true } } },
  });
  return apptRows.map((a) => ({
    start: a.startAt.getTime(),
    end: a.endAt.getTime() + a.service.gapAfterMinutes * 60_000,
  }));
}

// ── Vários dias de uma vez (calendário de meses) ─────────────────────────────

/** Dias ISO entre fromDay e toDay (inclusive) com pelo menos 1 horário livre. */
export async function getDaysWithSlots(
  professionalId: string,
  service: Pick<Service, "durationMin" | "gapAfterMinutes">,
  fromDay: DayParts,
  untilDay: DayParts,
  settings: SettingsLike,
  opts: { now?: Date } = {},
): Promise<string[]> {
  if (compareDay(fromDay, untilDay) > 0) return [];
  const tz = settings.timezone;

  const rangeStart = wallToUtc(fromDay, 0, 0, tz);
  const rangeEnd = wallToUtc(addDaysParts(untilDay, 1), 0, 0, tz);
  // Bloqueios à escala de dias (idem loadDayData)
  const rangeMidStart = new Date(`${dayISO(fromDay)}T00:00:00.000Z`);
  const rangeMidEnd = new Date(`${dayISO(addDaysParts(untilDay, 1))}T00:00:00.000Z`);

  const [availabilityRows, blockedRows, apptRows] = await Promise.all([
    db.availability.findMany({
      where: { professionalId, isActive: true },
    }),
    db.blockedPeriod.findMany({
      where: {
        OR: [{ professionalId }, { professionalId: null }],
        startDate: { lt: rangeMidEnd },
        endDate: { gte: rangeMidStart },
      },
    }),
    db.appointment.findMany({
      where: {
        professionalId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { lt: rangeEnd },
        endAt: { gt: new Date(rangeStart.getTime() - 6 * 60 * 60_000) },
      },
      select: { startAt: true, endAt: true, service: { select: { gapAfterMinutes: true } } },
    }),
  ]);

  const windowsByWeekday = new Map<number, Window[]>();
  for (const row of availabilityRows) {
    const list = windowsByWeekday.get(row.weekday) ?? [];
    list.push([row.startMinute, row.endMinute]);
    windowsByWeekday.set(row.weekday, list);
  }

  const blocksByISO = new Map<string, Array<{ s: number | null; e: number | null }>>();
  for (const b of blockedRows) {
    // percorrer os dias cobertos pelo bloqueio (normalmente 1–30 dias)
    const startDay = toDay(b.startDate);
    const endDay = toDay(b.endDate);
    for (let d = startDay; compareDay(d, endDay) <= 0; d = addDaysParts(d, 1)) {
      const list = blocksByISO.get(dayISO(d)) ?? [];
      list.push({ s: b.startMinute, e: b.endMinute });
      blocksByISO.set(dayISO(d), list);
    }
  }

  const busy = apptRows.map((a) => ({
    start: a.startAt.getTime(),
    end: a.endAt.getTime() + a.service.gapAfterMinutes * 60_000,
  }));

  const days: string[] = [];
  const now = opts.now ?? new Date();
  // "hoje" é a data de PAREDE do estúdio (fuso), não a UTC — no fuso UTC−1,
  // entre 23:00 e 24:00 o instante UTC já pertence ao dia seguinte e o
  // toDay(now) saltava o próprio dia de hoje do calendário (auditoria ronda 3)
  const nowWall = utcToWall(now, tz);
  const nowDay: DayParts = { year: nowWall.year, month: nowWall.month, day: nowWall.day };

  for (let d = fromDay; compareDay(d, untilDay) <= 0; d = addDaysParts(d, 1)) {
    if (compareDay(d, nowDay) < 0) continue;
    const windows = windowsByWeekday.get(weekdayOfDay(d)) ?? [];
    if (windows.length === 0) continue;
    const blocks = blocksByISO.get(dayISO(d)) ?? [];
    const pauses: Window[] = [];
    let wholeDay = false;
    for (const b of blocks) {
      if (b.s == null || b.e == null) {
        wholeDay = true;
        break;
      }
      pauses.push([b.s, b.e]);
    }
    if (wholeDay) continue;
    const minutes = computeSlotMinutes({
      windows,
      pauses,
      busy,
      service,
      slotInterval: settings.slotIntervalMinutes,
      day: d,
      tz,
      now,
      minLeadMinutes: settings.minLeadMinutes,
      maxLeadDays: settings.maxLeadDays,
    });
    if (minutes.length > 0) days.push(dayISO(d));
  }

  return days;
}