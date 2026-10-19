// Converte instantes UTC em "horas de parede" (horário local do estúdio) e vice-versa.
// Toda a lógica de disponibilidade trabalha com horas de parede no fuso da marca
// e converte para UTC apenas nos instantes guardados na base de dados.

export type WallParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export type DayParts = {
  year: number;
  month: number;
  day: number;
};

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function dtf(tz: string) {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    dtfCache.set(tz, f);
  }
  return f;
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, hourCycle: "h23" });
    return true;
  } catch {
    return false;
  }
}

// Instante UTC → partes de relógio no fuso tz
export function utcToWall(instant: Date, tz: string): WallParts {
  const p = dtf(tz).formatToParts(instant);
  const get = (t: string) => {
    const v = p.find((x) => x.type === t)?.value;
    return v === undefined ? 0 : Number(v);
  };
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

// Offset do fuso em minutos num instante (hora-de-parede − UTC). Útil em testes.
export function tzOffsetMinutes(instant: Date, tz: string): number {
  const w = utcToWall(instant, tz);
  const utcMin = Date.UTC(
    instant.getUTCFullYear(),
    instant.getUTCMonth(),
    instant.getUTCDate(),
    instant.getUTCHours(),
    instant.getUTCMinutes(),
  );
  const wallMin = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute);
  return (wallMin - utcMin) / 60000;
}

// Data/hora de parede no fuso tz → instante UTC.
// Dois passos: o offset pode mudar entre a estimativa e o instante real (DST).
export function wallToUtc(d: DayParts, hour: number, minute: number, tz: string): Date {
  const baseMs = Date.UTC(d.year, d.month - 1, d.day, hour, minute);
  let guess = baseMs;
  for (let i = 0; i < 2; i++) {
    const offset = tzOffsetMinutes(new Date(guess), tz);
    guess = baseMs - offset * 60000;
  }
  return new Date(guess);
}

// "Agora" em partes de relógio locais
export function wallNow(tz: string, now: Date = new Date()): WallParts {
  return utcToWall(now, tz);
}

// Dia de parede → "YYYY-MM-DD"
export function dayISO(d: DayParts): string {
  const mm = String(d.month).padStart(2, "0");
  const dd = String(d.day).padStart(2, "0");
  return `${d.year}-${mm}-${dd}`;
}

// "YYYY-MM-DD" → partes (null se inválido)
export function parseDayISO(s: string): DayParts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  )
    return null;
  return { year, month, day };
}

export function addDaysParts(d: DayParts, n: number): DayParts {
  const probe = new Date(Date.UTC(d.year, d.month - 1, d.day + n));
  return { year: probe.getUTCFullYear(), month: probe.getUTCMonth() + 1, day: probe.getUTCDate() };
}

export function compareDay(a: DayParts, b: DayParts): number {
  const av = a.year * 10000 + a.month * 100 + a.day;
  const bv = b.year * 10000 + b.month * 100 + b.day;
  return av - bv;
}

export function sameDay(a: DayParts, b: DayParts): boolean {
  return (
    a.year === b.year && a.month === b.month && a.day === b.day
  );
}

// Dia de parede → 0 (domingo) … 6 (sábado)
export function weekdayOfDay(d: DayParts): number {
  return new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay();
}

// Minutos desde a meia-noite ↔ "HH:MM"
export function minutesToHM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hmToMinutes(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}