"use client";

// Ficha do profissional: dados, serviços que realiza, horários semanais e bloqueios.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { cx } from "@/lib/utils";
import { WEEKDAY_LABELS, BLOCK_TYPE_LABELS } from "@/lib/constants";
import UploadField from "@/components/admin/UploadField";
import { saveProfessionalAction, deleteProfessionalAction, updateAvailabilityAction, saveBlockedPeriodAction, deleteBlockedPeriodAction } from "@/lib/actions/professionals";

export type ProFull = {
  id: string;
  name: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  serviceIds: string[];
  windows: Array<{ weekday: number; startMinute: number; endMinute: number; isActive: boolean }>;
  blocked: Array<{ id: string; type: string; startDateISO: string; endDateISO: string; startMinute: number | null; endMinute: number | null; reason: string | null }>;
};

type Window = { key: string; weekday: number; startMinute: number; endMinute: number; isActive: boolean };

const hm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const toMin = (v: string) => {
  const [h, m] = v.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

export default function ProfissionaisManager({
  services,
  professionals,
}: {
  services: Array<{ id: string; name: string }>;
  professionals: Array<ProFull>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoForm, setInfoForm] = useState<null | { id?: string; name: string; title: string; description: string; imageUrl: string | null; isActive: boolean; serviceIds: string[] }>(null);
  const [editingWindowsFor, setEditingWindowsFor] = useState<string | null>(null);
  const [windows, setWindows] = useState<Window[]>([]);
  const [blockFormFor, setBlockFormFor] = useState<string | null>(null);
  const [blockForm, setBlockForm] = useState({ type: "VACATION", startDate: "", endDate: "", allDay: true, startMinute: "", endMinute: "", reason: "" });

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

  function editInfo(p: ProFull) {
    setInfoForm({ id: p.id, name: p.name, title: p.title ?? "", description: p.description ?? "", imageUrl: p.imageUrl, isActive: p.isActive, serviceIds: [...p.serviceIds] });
  }

  function editWindows(p: ProFull) {
    setEditingWindowsFor(p.id);
    setWindows(p.windows.map((w, i) => ({ key: `${w.weekday}-${i}`, ...w })));
  }

  async function saveWindows(proId: string) {
    const rows = windows.map((w) => ({ weekday: w.weekday, startMinute: w.startMinute, endMinute: w.endMinute, isActive: true }));
    const bad = rows.find((r) => r.endMinute <= r.startMinute);
    if (bad) {
      setError("Todas as janelas precisam de hora de fim posterior à de início.");
      return;
    }
    const ok = await run(() => updateAvailabilityAction({ professionalId: proId, rows }));
    if (ok) setEditingWindowsFor(null);
  }

  async function submitBlock(proId: string | null) {
    if (!blockForm.startDate || !blockForm.endDate) {
      setError("Indique a data de início e de fim.");
      return;
    }
    const startM = toMin(blockForm.startMinute);
    const endM = toMin(blockForm.endMinute);
    const payload = {
      professionalId: proId ?? "",
      type: blockForm.type,
      startDate: blockForm.startDate,
      endDate: blockForm.endDate,
      startMinute: blockForm.allDay || startM == null ? "" : startM,
      endMinute: blockForm.allDay || endM == null ? "" : endM,
      reason: blockForm.reason.trim(),
    };
    const ok = await run(() => saveBlockedPeriodAction(payload));
    if (ok) {
      setBlockFormFor(null);
      setBlockForm({ type: "VACATION", startDate: "", endDate: "", allDay: true, startMinute: "", endMinute: "", reason: "" });
    }
  }

  return (
    <div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-[13.5px] text-rose-700 ring-1 ring-rose-200">{error}</p>}

      {/* formulario de dados */}
      {infoForm && (
        <div className="mb-6 rounded-2xl bg-creme p-5 ring-1 ring-nude">
          <h2 className="font-display text-xl text-bordo">{infoForm.id ? "Editar profissional" : "Novo profissional"}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="pro-name">Nome *</label>
              <input id="pro-name" className="field" value={infoForm.name} onChange={(e) => setInfoForm({ ...infoForm, name: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="pro-title">Cargo/título</label>
              <input id="pro-title" className="field" value={infoForm.title} onChange={(e) => setInfoForm({ ...infoForm, title: e.target.value })} placeholder="Ex.: Nail artist" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="pro-desc">Apresentação (página /sobre)</label>
              <textarea id="pro-desc" rows={3} className="field resize-y" value={infoForm.description} onChange={(e) => setInfoForm({ ...infoForm, description: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <UploadField label="Fotografia" value={infoForm.imageUrl} onChange={(url) => setInfoForm({ ...infoForm, imageUrl: url })} />
            </div>
            <div className="sm:col-span-2">
              <p className="label">Serviços que realiza</p>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((s) => {
                  const checked = infoForm.serviceIds.includes(s.id);
                  return (
                    <label key={s.id} className="flex items-center gap-2 text-[13.5px] text-tinta">
                      <input
                        type="checkbox"
                        checked={checked}
                        className="h-4 w-4 accent-[#850B36]"
                        onChange={(e) =>
                          setInfoForm({ ...infoForm, serviceIds: e.target.checked ? [...infoForm.serviceIds, s.id] : infoForm.serviceIds.filter((x) => x !== s.id) })
                        }
                      />
                      {s.name}
                    </label>
                  );
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 text-[13.5px] text-tinta">
              <input type="checkbox" checked={infoForm.isActive} onChange={(e) => setInfoForm({ ...infoForm, isActive: e.target.checked })} className="h-4 w-4 accent-[#850B36]" />
              Ativo (aceita marcações)
            </label>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const res = await saveProfessionalAction({
                    id: infoForm.id,
                    name: infoForm.name.trim(),
                    title: infoForm.title.trim(),
                    description: infoForm.description.trim(),
                    imageUrl: infoForm.imageUrl ?? "",
                    isActive: infoForm.isActive,
                    serviceIds: infoForm.serviceIds,
                  });
                  if (res.ok) setInfoForm(null);
                  return res;
                })
              }
              className="inline-flex items-center gap-2 rounded-full bg-bordo px-6 py-3 text-[14px] font-medium text-creme transition hover:bg-bordo-dark disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
            </button>
            <button type="button" onClick={() => setInfoForm(null)} className="text-[13.5px] text-tinta-soft hover:text-tinta">Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl text-bordo">Equipa</h2>
        <button
          type="button"
          onClick={() => setInfoForm({ name: "", title: "", description: "", imageUrl: null, isActive: true, serviceIds: [] })}
          className="inline-flex items-center gap-1.5 rounded-full bg-malva px-4 py-2 text-[13px] font-medium text-creme transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Novo profissional
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {professionals.length === 0 && (
          <p className="rounded-2xl bg-creme p-5 text-[14px] text-tinta-soft ring-1 ring-nude">Sem profissionais. Adicione a primeira pessoa da equipa.</p>
        )}
        {professionals.map((p) => (
          <section key={p.id} className={cx("rounded-2xl bg-creme p-5 ring-1 ring-nude", !p.isActive && "opacity-70")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-4">
                {p.imageUrl ? (
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-1 ring-nude">
                    <Image src={p.imageUrl} alt="" fill sizes="56px" className="object-cover" unoptimized />
                  </span>
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-nude font-display text-lg text-bordo">{p.name.slice(0, 1)}</span>
                )}
                <div>
                  <h3 className="font-display text-lg text-bordo">{p.name}</h3>
                  {p.title && <p className="text-[13px] text-tinta-soft">{p.title}</p>}
                  <p className="mt-1 text-[12.5px] text-tinta-soft">
                    {p.serviceIds.length} serviço(s) · {p.windows.length} janela(s) de horário{p.isActive ? "" : " · inativo"}
                  </p>
                  {p.windows.length === 0 && p.isActive && (
                    <p className="mt-1 text-[12.5px] font-medium text-amber-700">
                      Sem horário definido — o calendário de marcação não mostra dias para esta pessoa. Defina as janelas abaixo.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => editInfo(p)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] text-malva ring-1 ring-nude transition hover:ring-malva-soft">
                  <Pencil className="h-3.5 w-3.5" /> Dados
                </button>
                <button type="button" onClick={() => (editingWindowsFor === p.id ? setEditingWindowsFor(null) : editWindows(p))} className={cx("rounded-full px-3 py-1.5 text-[12.5px] ring-1 transition", editingWindowsFor === p.id ? "bg-malva font-medium text-creme ring-malva" : "text-malva ring-nude hover:ring-malva-soft")}>
                  Horários
                </button>
                <button type="button" onClick={() => setBlockFormFor(blockFormFor === p.id ? null : p.id)} className={cx("rounded-full px-3 py-1.5 text-[12.5px] ring-1 transition", blockFormFor === p.id ? "bg-malva font-medium text-creme ring-malva" : "text-malva ring-nude hover:ring-malva-soft")}>
                  Bloqueios
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Eliminar “${p.name}”? Só é possível se não tiver marcações.`)) {
                      void run(() => deleteProfessionalAction(p.id));
                    }
                  }}
                  title="Eliminar"
                  className="grid h-8 w-8 place-items-center rounded-full text-tinta-soft transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {p.description && <p className="mt-3 max-w-3xl text-[13.5px] text-tinta-soft">{p.description}</p>}

            {/* janelas de horário */}
            {editingWindowsFor === p.id && (
              <div className="mt-4 rounded-xl bg-casca p-4">
                <p className="text-[13.5px] font-medium text-tinta">Horário semanal — janelas de atendimento</p>
                <div className="mt-3 space-y-2">
                  {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
                    const dayWindows = windows.filter((w) => w.weekday === wd);
                    return (
                      <div key={wd} className="flex flex-wrap items-center gap-2 text-[13.5px]">
                        <span className="w-10 font-medium text-tinta">{WEEKDAY_LABELS[wd].slice(0, 3)}</span>
                        {dayWindows.map((w) => (
                          <span key={w.key} className="inline-flex items-center gap-1 rounded-full bg-creme py-1 pl-2 pr-1 ring-1 ring-nude">
                            <input
                              type="time"
                              value={hm(w.startMinute)}
                              onChange={(e) => setWindows(windows.map((x) => (x.key === w.key ? { ...x, startMinute: toMin(e.target.value) ?? x.startMinute } : x)))}
                              className="w-[4.4rem] bg-transparent text-[13px] tabular-nums outline-none"
                            />
                            –
                            <input
                              type="time"
                              value={hm(w.endMinute)}
                              onChange={(e) => setWindows(windows.map((x) => (x.key === w.key ? { ...x, endMinute: toMin(e.target.value) ?? x.endMinute } : x)))}
                              className="w-[4.4rem] bg-transparent text-[13px] tabular-nums outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setWindows(windows.filter((x) => x.key !== w.key))}
                              aria-label="Remover janela"
                              className="grid h-5 w-5 place-items-center rounded-full text-tinta-soft hover:text-rose-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <button
                          type="button"
                          onClick={() => setWindows([...windows, { key: `n${Date.now()}-${Math.random()}`, weekday: wd, startMinute: 510, endMinute: 1050, isActive: true }])}
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12.5px] text-malva hover:text-bordo"
                        >
                          <Plus className="h-3 w-3" /> janela
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex gap-3">
                  <button type="button" disabled={busy} onClick={() => saveWindows(p.id)} className="inline-flex items-center gap-2 rounded-full bg-bordo px-5 py-2.5 text-[13.5px] font-medium text-creme transition hover:bg-bordo-dark disabled:opacity-50">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />} Guardar horários
                  </button>
                  <button type="button" onClick={() => setEditingWindowsFor(null)} className="text-[13.5px] text-tinta-soft hover:text-tinta">Fechar</button>
                </div>
              </div>
            )}

            {/* bloqueios deste profissional */}
            {blockFormFor === p.id && (
              <div className="mt-4 rounded-xl bg-casca p-4">
                <p className="text-[13.5px] font-medium text-tinta">Bloqueios (férias, folgas, ausências)</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="label" htmlFor={`bt-${p.id}`}>Tipo</label>
                    <select id={`bt-${p.id}`} className="field" value={blockForm.type} onChange={(e) => setBlockForm({ ...blockForm, type: e.target.value })}>
                      {Object.entries(BLOCK_TYPE_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor={`bs-${p.id}`}>De</label>
                    <input id={`bs-${p.id}`} type="date" className="field" value={blockForm.startDate} onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor={`be-${p.id}`}>Até</label>
                    <input id={`be-${p.id}`} type="date" className="field" value={blockForm.endDate} onChange={(e) => setBlockForm({ ...blockForm, endDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor={`br-${p.id}`}>Motivo (opcional)</label>
                    <input id={`br-${p.id}`} className="field" value={blockForm.reason} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="flex items-center gap-2 text-[13.5px] text-tinta">
                    <input type="checkbox" checked={blockForm.allDay} onChange={(e) => setBlockForm({ ...blockForm, allDay: e.target.checked })} className="h-4 w-4 accent-[#850B36]" />
                    Dia completo (desmarque para bloquear só uma parte do dia)
                  </label>
                  {!blockForm.allDay && (
                    <div className="mt-2 flex items-center gap-2 text-[13.5px]">
                      <input type="time" className={cx("field w-28")} value={blockForm.startMinute} onChange={(e) => setBlockForm({ ...blockForm, startMinute: e.target.value })} />
                      <span>até</span>
                      <input type="time" className="field w-28" value={blockForm.endMinute} onChange={(e) => setBlockForm({ ...blockForm, endMinute: e.target.value })} />
                    </div>
                  )}
                </div>
                <button type="button" disabled={busy} onClick={() => submitBlock(p.id)} className="mt-4 inline-flex items-center gap-2 rounded-full bg-bordo px-5 py-2.5 text-[13.5px] font-medium text-creme transition hover:bg-bordo-dark disabled:opacity-50">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Criar bloqueio
                </button>

                {p.blocked.length > 0 && (
                  <ul className="mt-4 space-y-1.5 text-[13.5px]">
                    {p.blocked.map((b) => (
                      <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-creme px-3 py-2 ring-1 ring-nude">
                        <span className="font-medium text-tinta">{BLOCK_TYPE_LABELS[b.type] ?? b.type}</span>
                        <span className="tabular-nums text-tinta-soft">
                          {b.startDateISO} a {b.endDateISO}
                          {b.startMinute != null ? ` · ${hm(b.startMinute)}–${hm(b.endMinute ?? 1439)}` : " · dia completo"}
                        </span>
                        {b.reason && <span className="text-tinta-soft">— {b.reason}</span>}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm("Remover este bloqueio?")) void run(() => deleteBlockedPeriodAction(b.id));
                          }}
                          aria-label="Remover bloqueio"
                          className="ml-auto grid h-7 w-7 place-items-center rounded-full text-tinta-soft transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}