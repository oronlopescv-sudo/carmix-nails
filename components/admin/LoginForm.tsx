"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Loader2, LogIn } from "lucide-react";
import { loginAction } from "@/lib/actions/auth";
import { cx } from "@/lib/utils";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const form = useForm<{ email: string; password: string }>({
    defaultValues: { email: "", password: "" },
  });

  return (
    <form
      className="rounded-2xl bg-creme p-6 shadow-sm ring-1 ring-nude"
      noValidate
      onSubmit={form.handleSubmit(async (v) => {
        setError(null);
        setBusy(true);
        const res = await loginAction(v);
        if (!res.ok) {
          setBusy(false);
          setError(res.error);
          return;
        }
        router.replace("/admin");
        router.refresh();
      })}
    >
      <label className="label" htmlFor="ad-email">E-mail</label>
      <input
        id="ad-email"
        type="email"
        inputMode="email"
        autoComplete="username"
        className={cx("field", form.formState.errors.email && "field-error")}
        {...form.register("email", {
          required: "Indique o e-mail",
          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "E-mail inválido" },
        })}
      />
      {form.formState.errors.email && <p className="mt-1 text-[12.5px] text-rose-600">{form.formState.errors.email.message}</p>}

      <label className="label mt-4" htmlFor="ad-pass">Palavra-passe</label>
      <input
        id="ad-pass"
        type="password"
        autoComplete="current-password"
        className={cx("field", form.formState.errors.password && "field-error")}
        {...form.register("password", { required: "Indique a palavra-passe" })}
      />
      {form.formState.errors.password && <p className="mt-1 text-[12.5px] text-rose-600">{form.formState.errors.password.message}</p>}

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-bordo px-6 py-3 text-[15px] font-medium text-creme transition hover:bg-bordo-dark disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        Entrar
      </button>
      <p className="mt-3 text-[12px] text-tinta-soft">
        Tentativas excessivas ficam bloqueadas por alguns minutos (proteção automática).
      </p>
    </form>
  );
}