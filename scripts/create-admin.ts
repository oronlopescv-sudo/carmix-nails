// Cria a primeira conta de administrador do painel.
// Uso: npm run create-admin  (pede nome, e-mail e palavra-passe no terminal)

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const db = new PrismaClient();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function ask(rl: readline.Interface, label: string): Promise<string> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const value = (await rl.question(label)).trim();
    if (value) return value;
    console.error("  → não pode ficar vazio.");
  }
}

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  const existing = await db.user.findFirst();
  if (existing) {
    console.log(`Já existe uma conta de administração: ${existing.email}`);
    const answer = await rl.question("Criar outra? (s/N) ");
    if (!/^s(a|im)?$/i.test(answer.trim())) {
      console.log("Cancelado.");
      rl.close();
      return;
    }
  }

  const name = await ask(rl, "Nome: ");
  const email = (await ask(rl, "Utilizador (e-mail ou nome à parte, ex.: 12345): ")).toLowerCase();
  if (email.length < 3 || /\s/.test(email)) {
    console.error("  → utilizador inválido (mínimo 3 caracteres, sem espaços). Cancelado.");
    rl.close();
    process.exit(1);
  }
  const password = await ask(rl, "Palavra-passe (mínimo 5 caracteres — aparece no ecrã): ");
  if (password.length < 5) {
    console.error("  → pelo menos 5 caracteres. Cancelado.");
    rl.close();
    process.exit(1);
  }

  const dupe = await db.user.findUnique({ where: { email } });
  if (dupe) {
    console.error("  → já existe uma conta com esse e-mail. Cancelado.");
    rl.close();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: { name, email, passwordHash, role: "ADMIN", isActive: true },
  });
  console.log(`\nConta criada: ${user.name} <${user.email}>`);
  console.log(`Entre em /admin com este e-mail e a palavra-passe que escolheu.`);
  rl.close();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());