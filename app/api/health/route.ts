// Diagnóstico do site publicado: diz se a base de dados responde e se tem os
// dados de que o agendamento precisa. Não expõe ligações, nomes nem segredos —
// apenas estados e contagens.
// Abrir no browser: /api/health

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const HINTS: Record<string, string> = {
  NO_URL: "DATABASE_URL não está definida no Hostinger.",
  P1000: "Utilizador ou palavra-passe da base de dados errados no DATABASE_URL.",
  P1001: "A base de dados não responde (endereço/porta errados ou servidor desligado).",
  P1003: "A base de dados indicada no DATABASE_URL não existe.",
  P1011: "Erro de TLS/SSL na ligação à base de dados.",
  P2021: "Tabelas em falta — as migrações não correram (publicar de novo corre-as).",
};

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, database: "sem-configuracao", hint: HINTS.NO_URL }, { status: 503 });
  }
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (e) {
    const code = (e as { code?: string; errorCode?: string }).errorCode ?? (e as { code?: string }).code ?? "DESCONHECIDO";
    return NextResponse.json(
      { ok: false, database: "inacessivel", code, hint: HINTS[code] ?? "Ver o registo do servidor." },
      { status: 503 },
    );
  }
  try {
    const [settings, services, servicesActive, professionals, links, windows, users] = await Promise.all([
      db.businessSettings.count(),
      db.service.count(),
      db.service.count({ where: { isActive: true } }),
      db.professional.count({ where: { isActive: true } }),
      db.professionalService.count(),
      db.availability.count({ where: { isActive: true } }),
      db.user.count({ where: { isActive: true } }),
    ]);
    const problems: string[] = [];
    if (servicesActive === 0) problems.push("Não há serviços ativos — o passo 1 da marcação fica vazio.");
    if (professionals === 0) problems.push("Não há profissionais ativos.");
    if (links === 0) problems.push("Nenhum serviço está associado a um profissional.");
    if (windows === 0) problems.push("Nenhum profissional tem horário — o calendário não mostra dias.");
    if (users === 0) problems.push("Não há conta de administração — defina ADMIN_USER e ADMIN_PASSWORD e publique de novo.");
    return NextResponse.json({
      ok: problems.length === 0,
      database: "ligada",
      counts: { settings, services, servicesActive, professionals, links, windows, adminUsers: users },
      problems,
    });
  } catch (e) {
    const code = (e as { code?: string }).code ?? "DESCONHECIDO";
    return NextResponse.json(
      { ok: false, database: "ligada-sem-tabelas", code, hint: HINTS[code] ?? HINTS.P2021 },
      { status: 503 },
    );
  }
}
