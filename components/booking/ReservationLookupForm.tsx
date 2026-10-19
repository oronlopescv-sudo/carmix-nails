"use client";

// Formulário de entrada na gestão da reserva (/reserva)

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Search } from "lucide-react";

export function ReservationLookupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<{ reference: string }>({ defaultValues: { reference: "" } });

  return (
    <form
      className="mx-auto mt-8 max-w-md"
      onSubmit={form.handleSubmit((v) => {
        const ref = v.reference.trim().toUpperCase();
        if (!ref) {
          setError("Indique a referência (CN-XXXXXX).");
          return;
        }
        router.push(`/reserva/${encodeURIComponent(ref)}`);
      })}
      noValidate
    >
      <label className="label" htmlFor="ref">Nº da reserva</label>
      <div className="flex gap-2">
        <input
          id="ref"
          type="text"
          placeholder="CN-XXXXXX"
          autoComplete="off"
          spellCheck={false}
          className="field font-mono uppercase tracking-widest"
          {...form.register("reference")}
        />
        <button
          type="submit"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-bordo px-5 text-[14.5px] font-medium text-creme transition hover:bg-bordo-dark"
        >
          <Search className="h-4 w-4" /> Ver
        </button>
      </div>
      {error && <p className="mt-2 text-[12.5px] text-rose-600">{error}</p>}

      <p className="mt-6 rounded-xl bg-casca px-4 py-3 text-[13px] text-tinta-soft">
        Não tem a referência agora? Encontre-a no e-mail de confirmação da marcação
        (“pedido de marcação registado”), junto ao resumo.
      </p>
    </form>
  );
}