// Prepara uma base de dados nova (produção) num só passo, sem terminal interativo:
// migrações → seed (serviços/horários reais) → conta de administração → verificação.
// Uso:  DATABASE_URL=postgresql://... npx tsx scripts/bootstrap-remote.ts
// A ligação lê-se do ambiente; nunca se imprime na consola.

import { execSync } from "node:child_process";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw || !/^postgres/.test(raw)) {
    console.error("Falta DATABASE_URL no ambiente (postgresql://...).");
    process.exit(1);
  }
  // Hospedeiros geridos (ex.: Supabase) exigem TLS: acrescentamos `sslmode=require`
  // a ligações remotas que não o tragam já. Locais (localhost/127.*) continuam sem TLS.
  const host = (raw.split("@")[1] ?? "").split(/[:/?]/)[0];
  const remote = !/^(localhost|127\.)/.test(host);
  if (remote && !raw.includes("?")) {
    process.env.DATABASE_URL = `${raw}?sslmode=require`;
  }

  console.log("1/4  Migrações…");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });

  console.log("2/4  Seed (categorias, 22 serviços, horários)…");
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });

  const db = new PrismaClient();
  try {
    console.log("3/4  Conta de administração…");
    const existing = await db.user.findUnique({ where: { email: "12345" } });
    if (existing) {
      console.log(`     Já existe (${existing.email}) — password inalterada.`);
    } else {
      const passwordHash = await bcrypt.hash("12345", 12);
      await db.user.create({
        data: { name: "Carmix Nails", email: "12345", passwordHash, role: "ADMIN", isActive: true },
      });
      console.log("     Criada: utilizador 12345 / password 12345 (mudar em Configurações → Utilizadores).");
    }

    console.log("4/4  Verificação…");
    const [services, settings, users] = await Promise.all([
      db.service.count(),
      db.businessSettings.count(),
      db.user.count(),
    ]);
    console.log(`     Serviços: ${services} · Configurações: ${settings ? "ok" : "FALTA"} · Utilizadores: ${users}`);
    console.log("\nPronto. Inicia a aplicação e entra em /admin/login (utilizador 12345).");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});