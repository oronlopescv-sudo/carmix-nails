import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import LoginForm from "@/components/admin/LoginForm";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Entrar no painel",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  // já autenticado → direto ao painel
  const user = await getAuthUser();
  if (user) redirect("/admin");
  // estado da instalação: sem base de dados ou sem contas o login nunca funcionaria
  let setup: "ok" | "no-db" | "no-users" = "ok";
  try {
    const n = await db.user.count({ where: { isActive: true } });
    if (n === 0) setup = "no-users";
  } catch {
    setup = "no-db";
  }
  return (
    <div className="grid min-h-dvh place-items-center bg-casca px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-bordo text-creme shadow ring-2 ring-dourado/40">
            <span className="font-display font-semibold">CN</span>
          </span>
          <h1 className="mt-4 font-display text-2xl text-bordo">Painel administrativo</h1>
          <p className="mt-1 text-[13px] text-tinta-soft">Acesso restrito — só com credenciais válidas.</p>
        </div>
        {setup === "no-db" && (
          <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
            O site não consegue ligar à base de dados, por isso não é possível entrar. Confirme o
            DATABASE_URL nas variáveis de ambiente do Hostinger e publique de novo. Diagnóstico em{" "}
            <a href="/api/health" className="underline">/api/health</a>.
          </p>
        )}
        {setup === "no-users" && (
          <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
            Ainda não existe nenhuma conta de administração. No Hostinger, defina as variáveis
            ADMIN_USER e ADMIN_PASSWORD (mínimo 8 caracteres) e publique de novo — a conta é criada
            automaticamente.
          </p>
        )}
        <LoginForm />
        <p className="mt-6 text-center text-[12.5px] text-tinta-soft">
          <a href="/" className="hover:text-malva">← Voltar ao site</a>
        </p>
      </div>
    </div>
  );
}