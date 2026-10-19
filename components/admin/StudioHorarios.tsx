"use client";

// Encerramentos e feriados de todo o estúdio (bloqueios sem profissional).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { cx } from "@/lib/utils";
import { BLOCK_TYPE_LABELS } from "@/lib/constants";
import { saveBlockedPeriodAction, deleteBlockedPeriodAction } from "@/lib/actions/professionals";
import type { ProFull } from "@/components/admin/ProfissionaisManager";

export default function StudioHorarios({
  blocked,
  professionals,
}: {
  blocked: Array<ProFull["blocked"][number]>;
  professionals: Array<{ name: string; windows: ProFull["windows"] }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "HOLIDAY", startDate: "", endDate: "", allDay: true, startMinute: "", endMinute: "", reason: "" });

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

  const toMin = (v: string): number | null => {
    const [h, m] = v.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };

  const WD = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const hm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

  return (
    <div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-[13.5px] text-rose-700 ring-1 ring-rose-200">{error}</p>}

      <section className="rounded-2xl bg-creme p-5 ring-1 ring-nude">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-bordo">Encerramentos e feriados</h2>
            <p className="text-[12.5px] text-tinta-soft">Fecham o agendamento para toda a equipa (ex.: feriados, férias gerais, obras).</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className={cx("inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition", showForm ? "bg-tinta-soft text-creme" : "bg-malva text-creme hover:opacity-90")}
          >
            <Plus className="h-4 w-4" /> Novo encerramento
          </button>
        </div>

        {showForm && (
          <div className="mt-4 rounded-xl bg-casca p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="label" htmlFor="st-type">Tipo</label>
                <select id="st-type" className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {Object.entries(BLOCK_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="st-start">De</label>
                <input id="st-start" type="date" className="field" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="st-end">Até</label>
                <input id="st-end" type="date" className="field" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="st-reason">Motivo (opcional)</label>
                <input id="st-reason" className="field" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>
            </div>
            <div className="mt-3">
              <label className="flex items-center gap-2 text-[13.5px] text-tinta">
                <input type="checkbox" checked={form.allDay} onChange={(e) => setForm({ ...form, allDay: e.target.checked })} className="h-4 w-4 accent-[#850B36]" />
                Dia completo (desmarque para fechar só uma parte do dia)
              </label>
              {!form.allDay && (
                <div className="mt-2 flex items-center gap-2 text-[13.5px]">
                  <input type="time" className="field w-28" value={form.startMinute} onChange={(e) => setForm({ ...form, startMinute: e.target.value })} />
                  <span>até</span>
                  <input type="time" className="field w-28" value={form.endMinute} onChange={(e) => setForm({ ...form, endMinute: e.target.value })} />
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!form.startDate || !form.endDate) {
                  setError("Indique a data de início e de fim.");
                  return;
                }
                const startM = toMin(form.startMinute);
                const endM = toMin(form.endMinute);
                void run(async () => {
                  const res = await saveBlockedPeriodAction({
                    type: form.type,
                    startDate: form.startDate,
                    endDate: form.endDate,
                    startMinute: form.allDay || startM == null ? "" : startM,
                    endMinute: form.allDay || endM == null ? "" : endM,
                    reason: form.reason.trim(),
                  });
                  if (res.ok) {
                    setShowForm(false);
                    setForm({ type: "HOLIDAY", startDate: "", endDate: "", allDay: true, startMinute: "", endMinute: "", reason: "" });
                  }
                  return res;
                });
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-bordo px-5 py-2.5 text-[13.5px] font-medium text-creme transition hover:bg-bordo-dark disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Criar
            </button>
          </div>
        )}

        <ul className="mt-4 space-y-2">
          {blocked.length === 0 && <li className="text-[13.5px] text-tinta-soft">Sem encerramentos registados.</li>}
          {blocked.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-casca px-4 py-2.5 text-[13.5px]">
              <span className="font-medium text-tinta">{BLOCK_TYPE_LABELS[b.type] ?? b.type}</span>
              <span className="tabular-nums text-tinta-soft">
                {b.startDateISO} a {b.endDateISO}
                {b.startMinute != null ? ` · ${hm(b.startMinute)}–${hm(b.endMinute ?? 1439)}` : " · dia completo"}
              </span>
              {b.reason && <span className="text-tinta-soft">— {b.reason}</span>}
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(() => deleteBlockedPeriodAction(b.id))}
                aria-label="Remover"
                className="ml-auto grid h-7 w-7 place-items-center rounded-full text-tinta-soft transition hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl bg-creme p-5 ring-1 ring-nude">
        <h2 className="font-display text-xl text-bordo">Horário semanal da equipa</h2>
        <p className="text-[12.5px] text-tinta-soft">Editável em cada profissional (abaixo só consultado).</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13.5px]">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-wide text-tinta-soft">
                <th className="pb-2 pr-4">Profissional</th>
                <th className="pb-2 pr-4">Seg–Sex</th>
                <th className="pb-2 pr-4">Sábado</th>
                <th className="pb-2">Domingo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nude">
              {professionals.map((p) => {
                const fmt = (wd: number) => {
                  const ws = p.windows.filter((w) => w.weekday === wd && w.isActive);
                  return ws.length ? ws.map((w) => `${hm(w.startMinute)}–${hm(w.endMinute)}`).join(", ") : "—";
                };
                const segsex = [1, 2, 3, 4, 5].map(fmt).filter((v) => v !== "—");
                return (
                  <tr key={p.name}>
                    <td className="py-2.5 pr-4 font-medium text-tinta">{p.name}</td>
                    <td className="py-2.5 pr-4 tabular-nums text-tinta-soft">{segsex.length ? [...new Set(Array.from(new Set(segsex)))].join(" / ") : "—"}</td>
                    <td className="py-2.5 pr-4 tabular-nums text-tinta-soft">{fmt(6)}</td>
                    <td className="py-2.5 tabular-nums text-tinta-soft">{fmt(0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}