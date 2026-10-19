"use client";

// Testemunhos reais: entram ocultos e só aparecem no site quando ativados.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { cx } from "@/lib/utils";
import { saveReviewAction, toggleReviewPublishedAction, deleteReviewAction } from "@/lib/actions/content";

export type ReviewRow = {
  id: string;
  customerName: string;
  rating: number;
  text: string;
  isPublished: boolean;
  reviewedAtISO: string | null;
};

export default function ReviewsManager({ reviews }: { reviews: Array<ReviewRow> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ customerName: "", rating: "5", text: "", isPublished: false });

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

  return (
    <div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-[13.5px] text-rose-700 ring-1 ring-rose-200">{error}</p>}

      <section className="rounded-2xl bg-creme p-5 ring-1 ring-nude">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-bordo">Adicionar testemunho</h2>
            <p className="text-[12.5px] text-tinta-soft">Só testemunhos verdadeiros, recebidos da cliente. Entra oculto — publique depois de confirmar.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="rv-name">Nome da cliente *</label>
            <input id="rv-name" className="field" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Ex.: Adriana S." />
          </div>
          <div>
            <label className="label" htmlFor="rv-rating">Avaliação</label>
            <select id="rv-rating" className="field" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n} estrela{n === 1 ? "" : "s"}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className="label" htmlFor="rv-text">Testemunho *</label>
            <textarea id="rv-text" rows={3} className="field resize-y" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Escreva o testemunho tal como a cliente o enviou…" />
          </div>
          <label className="flex items-center gap-2 text-[13.5px] text-tinta">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="h-4 w-4 accent-[#850B36]" />
            Publicar de imediato
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const res = await saveReviewAction({
                customerName: form.customerName.trim(),
                rating: Number(form.rating),
                text: form.text.trim(),
                isPublished: form.isPublished,
              });
              if (res.ok) setForm({ customerName: "", rating: "5", text: "", isPublished: false });
              return res;
            })
          }
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-bordo px-5 py-2.5 text-[13.5px] font-medium text-creme transition hover:bg-bordo-dark disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </section>

      <div className="mt-6 space-y-3">
        {reviews.length === 0 && (
          <p className="rounded-2xl bg-creme p-5 text-[14px] text-tinta-soft ring-1 ring-nude">Ainda não há testemunhos guardados.</p>
        )}
        {reviews.map((r) => (
          <article key={r.id} className={cx("rounded-2xl bg-creme p-5 ring-1 ring-nude", !r.isPublished && "opacity-80")}>
            {editing === r.id ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor={`rvn-${r.id}`}>Nome</label>
                  <input id={`rvn-${r.id}`} className="field" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor={`rvr-${r.id}`}>Avaliação</label>
                  <select id={`rvr-${r.id}`} className="field" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="label" htmlFor={`rvt-${r.id}`}>Testemunho</label>
                  <textarea id={`rvt-${r.id}`} rows={3} className="field resize-y" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
                </div>
                <div className="sm:col-span-3 flex gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const res = await saveReviewAction({
                          id: r.id,
                          customerName: form.customerName.trim(),
                          rating: Number(form.rating),
                          text: form.text.trim(),
                          isPublished: form.isPublished,
                        });
                        if (res.ok) setEditing(null);
                        return res;
                      })
                    }
                    className="rounded-full bg-bordo px-5 py-2.5 text-[13.5px] font-medium text-creme transition hover:bg-bordo-dark disabled:opacity-50"
                  >
                    Guardar
                  </button>
                  <button type="button" onClick={() => setEditing(null)} className="text-[13.5px] text-tinta-soft hover:text-tinta">Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-medium text-tinta">
                      {r.customerName}
                      <span className="ml-2 text-dourado" aria-label={`${r.rating} de 5`}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                    </p>
                    {r.reviewedAtISO && <p className="text-[12px] text-tinta-soft">em {fmtDate(r.reviewedAtISO)}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cx("rounded-full px-2.5 py-0.5 text-[11.5px] font-medium", r.isPublished ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200")}>
                      {r.isPublished ? "publicado" : "oculto"}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void run(() => toggleReviewPublishedAction(r.id, !r.isPublished))}
                      title={r.isPublished ? "Retirar do site" : "Publicar no site"}
                      className="grid h-8 w-8 place-items-center rounded-full text-tinta-soft transition hover:bg-casca hover:text-bordo"
                    >
                      {r.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(r.id);
                        setForm({ customerName: r.customerName, rating: String(r.rating), text: r.text, isPublished: r.isPublished });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] text-malva ring-1 ring-nude transition hover:ring-malva-soft"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Eliminar o testemunho de ${r.customerName}?`)) {
                          void run(() => deleteReviewAction(r.id));
                        }
                      }}
                      title="Eliminar"
                      className="grid h-8 w-8 place-items-center rounded-full text-tinta-soft transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-tinta">“{r.text}”</p>
              </>
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