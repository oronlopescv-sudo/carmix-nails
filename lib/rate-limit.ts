// Limitador de pedidos em memória (por processo).
// Suficiente para um único processo Next.js; em multi-instância usar Redis.

type Bucket = { count: number; resetAt: number };

const globalForRate = globalThis as unknown as { carmixBuckets?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = globalForRate.carmixBuckets ?? new Map();
globalForRate.carmixBuckets = buckets;

// Limpeza periódica para não crescer sem limite
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    if (b.resetAt < now) buckets.delete(k);
  }
}

export type RateResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  sweep(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  existing.count += 1;
  if (existing.count > limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { ok: true };
}

// Políticas do sistema
export const RATE_LIMITS = {
  login: { limit: 8, windowMs: 15 * 60_000 }, // autenticação: 8 tentativas / 15 min
  booking: { limit: 6, windowMs: 5 * 60_000 }, // criar marcação: 6 / 5 min
  availability: { limit: 60, windowMs: 60_000 }, // consultar horários: 60 / min
  publicApi: { limit: 120, windowMs: 60_000 },
} as const;

export function clientIp(headers: Headers): string {
  // x-forwarded-for: client-controlled, comma-separated. O ÚLTIMO valor é o
  // que a infraestrutura de confiança acrescentou — o primeiro é forjável
  // pelo cliente e podia rodar o IP para contornar o limite.
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1]!;
  }
  const real = headers.get("x-real-ip");
  if (real) return real;
  // sem IP na infraestrutura: separar por user-agent em vez de um único balde
  // global (todos os clientes partilhariam o mesmo limite de 60/min)
  const ua = (headers.get("user-agent") ?? "desconhecido").slice(0, 120);
  return `ua:${ua}`;
}