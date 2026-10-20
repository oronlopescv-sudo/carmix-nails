// Preparação automática da base de dados, corrida em cada `npm run build`.
//
//  1. aplica as migrações em falta (prisma migrate deploy)
//  2. corre o seed só se ainda não houver serviços (base de dados nova)
//  3. cria a primeira conta de administração a partir de ADMIN_USER e
//     ADMIN_PASSWORD (variáveis do painel do Hostinger) se ainda não houver contas
//
// Nunca interrompe o build: se algo falhar, mostra a causa e continua, para o
// site publicar na mesma (as páginas públicas aguentam a base de dados em falta).
// A ligação (DATABASE_URL) e as palavras-passe nunca são impressas.

import { execSync } from "node:child_process";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { normalizeDatabaseUrl } from "../lib/db-url";

function log(msg: string) {
  console.log(`[db-prepare] ${msg}`);
}

async function main() {
  const url = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!url) {
    log("AVISO: DATABASE_URL não está definida — o site vai publicar sem base de dados.");
    log("Defina DATABASE_URL nas variáveis de ambiente do Hostinger e volte a publicar.");
    return;
  }
  process.env.DATABASE_URL = url; // os subprocessos (migrate/seed) herdam o TLS

  try {
    log("1/3 Migrações…");
    execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env, timeout: 180_000 });
  } catch {
    log("ERRO nas migrações — verifique se DATABASE_URL está correta e a base de dados acessível.");
    return;
  }

  const db = new PrismaClient({ datasourceUrl: url });
  try {
    const services = await db.service.count();
    if (services === 0) {
      log("2/3 Base de dados nova: a carregar serviços, categorias e horários (seed)…");
      try {
        execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env: process.env, timeout: 300_000 });
      } catch {
        log("ERRO no seed — os serviços podem ser criados à mão no painel.");
      }
    } else {
      log(`2/3 Seed não necessário (${services} serviço(s) já existem).`);
    }

    const users = await db.user.count();
    if (users > 0) {
      log(`3/3 Contas de administração: ${users} — nada a criar.`);
    } else {
      const login = (process.env.ADMIN_USER ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
      const password = process.env.ADMIN_PASSWORD ?? "";
      if (login.length >= 3 && !/\s/.test(login) && password.length >= 8) {
        const passwordHash = await bcrypt.hash(password, 12);
        await db.user.create({
          data: {
            name: (process.env.ADMIN_NAME ?? "Administração").trim() || "Administração",
            email: login,
            passwordHash,
            role: "ADMIN",
            isActive: true,
          },
        });
        log(`3/3 Conta de administração criada: utilizador "${login}". Entre em /admin.`);
      } else {
        log("3/3 AVISO: ainda não há conta de administração.");
        log("     Defina ADMIN_USER (mín. 3 caracteres) e ADMIN_PASSWORD (mín. 8) no Hostinger e volte a publicar.");
      }
    }

    const [svcActive, pros, windows] = await Promise.all([
      db.service.count({ where: { isActive: true } }),
      db.professional.count({ where: { isActive: true } }),
      db.availability.count({ where: { isActive: true } }),
    ]);
    log(`Estado: ${svcActive} serviço(s) ativo(s) · ${pros} profissional(is) ativo(s) · ${windows} janela(s) de horário.`);
  } catch (e) {
    const code = (e as { code?: string }).code;
    log(`ERRO a ler a base de dados${code ? ` (${code})` : ""} — o build continua.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  log(`ERRO inesperado: ${e instanceof Error ? e.message.split("\n")[0] : String(e)} — o build continua.`);
});
