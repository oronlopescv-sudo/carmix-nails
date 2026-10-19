"use client";

// Ficha de cliente: edição, notas e anonimização (RGPD).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, ShieldQuestion, X } from "lucide-react";
import { cx } from "@/lib/utils";
import { formatPhone } from "@/lib/utils";
import { updateCustomerAction, anonymizeCustomerAction } from "@/lib/actions/customers";

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  count: number;
  lastVisitISO: string | null;
};

export default function CustomersManager({ customers }: { customers: Array<CustomerRow> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>): Promise<boolean> {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Não foi possível.");
      return false;
    }
    router.refresh();
    return true;
  }

  function startEdit(c: CustomerRow) {
    setEditing(c.id);
    setForm({ name: c.name, phone: c.phone, email: c.email ?? "", notes: c.notes ?? "" });
  }

  return (
    <div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-[13.5px] text-rose-700 ring-1 ring-rose-200">{error}</p>}

      <div className="space-y-3">
        {customers.length === 0 && (
          <p className="rounded-2xl bg-creme p-5 text-[14px] text-tinta-soft ring-1 ring-nude">Sem clientes. Aparecem aqui automaticamente com a primeira marcação (ou marcação manual).</p>
        )}
        {customers.map((c) => (
          <article key={c.id} className="rounded-2xl bg-creme p-5 ring-1 ring-nude">
            {editing === c.id ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor={`cn-${c.id}`}>Nome *</label>
                  <input id={`cn-${c.id}`} className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor={`cp-${c.id}`}>Telefone *</label>
                  <input id={`cp-${c.id}`} className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor={`ce-${c.id}`}>E-mail</label>
                  <input id={`ce-${c.id}`} type="email" className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor={`co-${c.id}`}>Notas (preferências, alergias…)</label>
                  <textarea id={`co-${c.id}`} rows={2} className="field resize-y" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="flex gap-3 sm:col-span-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const res = await updateCustomerAction({ id: c.id, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), notes: form.notes.trim() });
                        if (res.ok) setEditing(null);
                        return res;
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-full bg-bordo px-5 py-2.5 text-[13.5px] font-medium text-creme transition hover:bg-bordo-dark disabled:opacity-50"
                  >
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
                  </button>
                  <button type="button" onClick={() => setEditing(null)} className="inline-flex items-center gap-1.5 text-[13.5px] text-tinta-soft hover:text-tinta">
                    <X className="h-3.5 w-3.5" /> Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-tinta">{c.name}</p>
                  <p className="text-[13.5px] text-tinta-soft">
                    {formatPhone(c.phone)}
                    {c.email ? ` · ${c.email}` : ""}
                    {" · "}{c.count} marcação{c.count === 1 ? "" : "ões"}
                    {c.lastVisitISO ? ` · última em ${fmtDate(c.lastVisitISO)}` : ""}
                  </p>
                  {c.notes && <p className="mt-1 truncate text-[12.5px] text-tinta-soft">Notas: {c.notes}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  <a
                    href={`/admin/agendamentos?q=${encodeURIComponent(c.phone)}`}
                    className="rounded-full px-3 py-1.5 text-[12.5px] text-malva ring-1 ring-nude transition hover:ring-malva-soft"
                  >
                    Ver marcações
                  </a>
                  <button type="button" onClick={() => startEdit(c)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] text-malva ring-1 ring-nude transition hover:ring-malva-soft">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm(`Remover os dados pessoais de “${c.name}”? As marcações ficam no histórico; o nome e o contacto são apagados (RGPD).`)) return;
                      void run(() => anonymizeCustomerAction(c.id));
                    }}
                    title="Anonimizar (RGPD)"
                    className={cx("grid h-8 w-8 place-items-center rounded-full text-tinta-soft transition hover:bg-rose-50 hover:text-rose-600")}
                  >
                    <ShieldQuestion className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}