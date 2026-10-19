"use server";

import { z } from "zod";
import { attemptLogin, destroySession, getAuthUser } from "@/lib/auth";
import { parseForm, type FieldErrors } from "@/lib/validators";
import { logAudit } from "@/lib/audit";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types/actions";

const loginSchema = z.object({
  // utilizador (o dono escolheu "12345") ou e-mail — validação só de comprimento
  email: z.string().trim().min(3, "Utilizador demasiado curto").max(120),
  password: z.string().min(1, "Indique a palavra-passe").max(100),
});

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<ActionResult<{ name: string }>> {
  const parsed = parseForm(loginSchema, input);
  if (!parsed.ok) {
    return { ok: false, error: "Verifique os dados.", fieldErrors: parsed.fieldErrors as FieldErrors };
  }
  const res = await attemptLogin(parsed.data.email, parsed.data.password);
  if (res.ok) {
    await logAudit({
      userId: res.user.id,
      action: "login",
      entity: "user",
      entityId: res.user.id,
      meta: { email: res.user.email },
    });
    return { ok: true, name: res.user.name };
  }
  if (res.reason === "rate-limited") {
    return {
      ok: false,
      error: `Demasiadas tentativas. Tente novamente dentro de ${Math.ceil((res.retryAfter ?? 60) / 60)} min.`,
      retryAfterSeconds: res.retryAfter,
    };
  }
  if (res.reason === "inactive") {
    return { ok: false, error: "Conta desativada. Fale com quem gere o painel." };
  }
  await logAudit({ action: "login-failed", entity: "user", meta: { email: parsed.data.email } });
  return { ok: false, error: "Utilizador ou palavra-passe incorretos." };
}

export async function logoutAction(): Promise<void> {
  const user = await getAuthUser();
  if (user) {
    await logAudit({ userId: user.id, action: "logout", entity: "user", entityId: user.id });
  }
  await destroySession();
  redirect("/admin/login");
}

export async function requireAuth(): Promise<{ id: string; name: string; email: string } | null> {
  return getAuthUser();
}