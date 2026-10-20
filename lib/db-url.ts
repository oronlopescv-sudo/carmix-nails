// Normaliza o DATABASE_URL para bases de dados remotas.
// Hospedeiros geridos (Supabase, Neon, etc.) exigem TLS: acrescenta
// `sslmode=require` a ligações remotas que não indiquem já um sslmode.
// Ligações locais (localhost/127.*) ficam como estão.
// Partilhado pelo runtime (lib/db.ts) e pelo script de build (db-prepare).

export function normalizeDatabaseUrl(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const url = raw.trim().replace(/^["']|["']$/g, "");
  if (!/^postgres(ql)?:\/\//.test(url)) return url;
  const afterAt = url.split("@").pop() ?? "";
  const host = afterAt.split(/[:/?]/)[0] ?? "";
  const isLocal = /^(localhost|127\.|0\.0\.0\.0|::1|\[::1\])/.test(host);
  if (isLocal || /[?&]sslmode=/.test(url)) return url;
  return url + (url.includes("?") ? "&" : "?") + "sslmode=require";
}
