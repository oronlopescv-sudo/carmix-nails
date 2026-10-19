import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import LoginForm from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Entrar no painel",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  // já autenticado → direto ao painel
  const user = await getAuthUser();
  if (user) redirect("/admin");
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
        <LoginForm />
        <p className="mt-6 text-center text-[12.5px] text-tinta-soft">
          <a href="/" className="hover:text-malva">← Voltar ao site</a>
        </p>
      </div>
    </div>
  );
}