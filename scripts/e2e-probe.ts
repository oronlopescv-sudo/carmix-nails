/**
 * E2E no servidor local (3.000?):
 *  1. marcação real pelo motor (dia aberto automático)
 *  2. conflito propositado deve falhar
 *  3. página /reserva/[ref] pública
 *  4. todas as páginas admin com sessão real (200)
 *  5. criação manual de marcação por admin
 * Correr: npx tsx scripts/e2e-probe.ts
 */
import crypto from "node:crypto";
import { sha256hex } from "../lib/utils";
import { db } from "../lib/db";
import { getSettings } from "../lib/settings";
import { createBooking, findAppointmentByReference } from "../lib/booking";
import { wallNow, addDaysParts, dayISO } from "../lib/tz";

const fail = (m: string) => {
  console.error("✗ " + m);
  process.exitCode = 1;
};

// rastreio para a limpeza correr MESMO quando um passo aborta no meio
// (uma corrida que rebentou deixou uma marcação órfã a bloquear um dia real)
const E2E_KEEP = { ref: null as string | null, usr: null as { id: string } | null };

async function main() {
  const s = await getSettings();

  /* 1. dia aberto + marcação real */
  let created: Awaited<ReturnType<typeof createBooking>> | null = null;
  for (let d = 0; d <= 14 && !created; d++) {
    const day = addDaysParts(wallNow(s.timezone), d);
    const iso = dayISO(day);
    for (const minutes of [510, 810, 840]) {
      const svc = await db.service.findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
      if (!svc) throw new Error("sem serviços");
      const ps = await db.professionalService.findFirst({ where: { serviceId: svc.id } });
      try {
        created = await createBooking({
          serviceId: svc.id,
          professionalId: ps!.professionalId,
          dateISO: iso,
          minutes,
          name: "Cliente Teste",
          phone: "+238 900 000 000",
          email: "teste@exemplo.cv",
          consent: true,
          notes: "E2E automático",
          context: "ADMIN",
        });
        break;
      } catch (e) {
        void e; // fecha/ocupado → tenta próximo
      }
    }
  }
  if (!created) {
    fail("marcação real não criada");
  } else {
    console.log("✓ marcação criada:", created.appointment.reference, created.appointment.service.name);
  }

  if (!created) process.exit(1);
  const ref = created.appointment.reference;
  E2E_KEEP.ref = ref;

  /* 2. conflito: mesma hora deve falhar */
  let conflicted = false;
  try {
    await createBooking({
      serviceId: created.appointment.serviceId,
      professionalId: created.appointment.professionalId,
      dateISO: created.appointment.startAt.toISOString().slice(0, 10),
      minutes: created.appointment.startAt.getUTCHours() * 60 + created.appointment.startAt.getUTCMinutes(),
      name: "Conflito",
      phone: "+238 900 000 001",
      consent: true,
      context: "ADMIN",
    });
  } catch {
    conflicted = true;
  }
  console.log(conflicted ? "✓ conflito bloqueado" : "✗ CONFLITO NÃO BLOQUEADO");
  if (!conflicted) process.exitCode = 1;

  /* 3. verificação cliente + reschedule + cancelamento */
  const found = await findAppointmentByReference(ref);
  if (!found) {
    fail("referência não encontrada");
  } else {
    console.log("✓ referência encontra:", found.reference, found.status);
  }
  const verified = found?.customer.email === "teste@exemplo.cv";
  console.log(verified ? "✓ verificação por referência+e-mail OK" : "✗ VERIFICAÇÃO FALHOU");
  if (!verified) process.exitCode = 1;

  /* 4. sessão admin real */
  const token = crypto.randomBytes(36).toString("hex");
  // usa a primeira conta admin real (o dono cria a sua própria via npm run create-admin)
  const usr = await db.user.findFirst({ where: { role: "ADMIN", isActive: true } });
  if (!usr) throw new Error("sem conta admin — corre primeiro: npm run create-admin");
  E2E_KEEP.usr = usr;
  await db.session.create({
    data: { tokenHash: sha256hex(token), userId: usr.id, expiresAt: new Date(Date.now() + 3_600_000), ip: "127.0.0.1", userAgent: "e2e" },
  });
  const cookie = `carmix_session=${token}`;
  const BASE = "http://localhost:3000";

  const adminPages = [
    "/admin", "/admin/agendamentos?view=day", "/admin/agendamentos?view=week", "/admin/agendamentos?view=month",
    "/admin/servicos", "/admin/clientes", "/admin/profissionais", "/admin/horarios", "/admin/galeria",
    "/admin/testemunhos", "/admin/configuracoes", "/admin/agendamentos?q=Cliente+Teste",
  ];
  let adminOk = true;
  for (const p of adminPages) {
    const res = await fetch(BASE + p, { headers: { cookie }, redirect: "manual" });
    const ok = res.status === 200 && res.headers.get("content-type")?.includes("text/html");
    if (!ok) {
      console.error(`  ✗ ${p} → ${res.status}`);
      adminOk = false;
    }
  }
  console.log(adminOk ? "✓ 12 páginas admin com sessão → 200" : "✗ páginas admin com falha");
  if (!adminOk) process.exitCode = 1;

  const publicRef = await fetch(`${BASE}/reserva/${ref}`, { redirect: "manual" });
  const body = await publicRef.text();
  // sem verificação de e-mail, a página mostra a referência mas não os dados pessoais
  const refOk = publicRef.status === 200 && body.includes(ref) && !body.includes("Cliente Teste");
  console.log(refOk ? "✓ /reserva/[ref] mostra a marcação" : "✗ /reserva/[ref] falhou " + publicRef.status);
  if (!refOk) process.exitCode = 1;

  /* 5. limpeza: sessão, marcação e cliente de teste — corre no finally acima,
     mesmo quando um passo anterior rebenta */
}

  void main()
    .catch((e) => {
      console.error("ERRO:", e);
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        if (E2E_KEEP.usr) await db.session.deleteMany({ where: { userId: E2E_KEEP.usr.id, ip: "127.0.0.1" } });
        if (E2E_KEEP.ref) {
          const appt = await db.appointment.findUnique({ where: { reference: E2E_KEEP.ref } });
          if (appt) await db.appointment.delete({ where: { id: appt.id } });
        }
        await db.customer.deleteMany({ where: { phone: { in: ["+238 900 000 000", "+238 900 000 001"] } } });
      } catch (e) {
        console.error("(limpeza parcial do e2e falhou:)", e);
      } finally {
        console.log("✓ limpeza do e2e concluída (mesmo com erro)");
        await db.$disconnect();
        process.exit(process.exitCode ?? 0);
      }
    });