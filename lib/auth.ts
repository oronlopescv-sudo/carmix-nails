import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { sha256hex } from "@/lib/utils";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";

export const SESSION_COOKIE = "carmix_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN";
};

// Sessões guardadas na base de dados; o cookie contém um token aleatório
// (48 bytes) e é HttpOnly + SameSite=Lax + Secure em produção.
export async function createSession(userId: string): Promise<void> {
  const token = crypto.randomBytes(36).toString("hex");
  const h = headers();
  let ip: string | null = null;
  let userAgent: string | null = null;
  try {
    ip = clientIp(await h);
    userAgent = (await h).get("user-agent");
  } catch {
    // fora de contexto de pedido (ex.: scripts)
  }
  await db.session.create({
    data: {
      tokenHash: sha256hex(token),
      userId,
      ip,
      userAgent,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session
      .delete({ where: { tokenHash: sha256hex(token) } })
      .catch(() => undefined);
  }
  store.delete(SESSION_COOKIE);
}

export async function getAuthUser(): Promise<AdminUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256hex(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (!session.user.isActive || session.user.role !== "ADMIN") return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: "ADMIN",
  };
}

// Hash fixo para uniformizar o tempo de resposta do login (evita enumerar
// e-mails pela diferença bcrypt / resposta imediata).
let dummyHash: string | null = null;

// Verificação de login (com limite de tentativas). Devolve o utilizador ou motivo.
export async function attemptLogin(
  email: string,
  password: string,
): Promise<
  | { ok: true; user: AdminUser }
  | { ok: false; reason: "invalid" | "inactive" | "rate-limited"; retryAfter?: number }
> {
  const h = await headers();
  const ip = clientIp(h);
  const rl = rateLimit(`login:${ip}`, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs);
  if (!rl.ok) {
    return { ok: false, reason: "rate-limited", retryAfter: rl.retryAfterSeconds };
  }
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    // correm bcrypt na mesma para não revelar por timing quais e-mails existem
    const bcrypt2 = await import("bcryptjs");
    dummyHash ??= bcrypt2.hashSync("carmix-dummy", 12);
    await bcrypt2.compare(password, dummyHash);
    return { ok: false, reason: "invalid" };
  }
  const bcrypt = await import("bcryptjs");
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return { ok: false, reason: "invalid" };
  if (!user.isActive) return { ok: false, reason: "inactive" };
  await createSession(user.id);
  return {
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, role: "ADMIN" },
  };
}

import bcrypt from "bcryptjs";
export { bcrypt };