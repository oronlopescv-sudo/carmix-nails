"use client";

// Marcação manual pelo administrador (cliente que liga/apercebe-se no local).

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { CheckCircle2, Loader2, Plus, X } from "lucide-react";
import { cx } from "@/lib/utils";
import { WEEKDAY_SHORT_MON, MONTH_LABELS } from "@/lib/constants";
import { adminCreateManualAppointmentAction, adminSlotsAction } from "@/lib/actions/bookings-admin";
import type { ServiceOption, ProOption } from "@/components/booking/BookingFlow";

type Slot = { minutes: number; time: string; iso: string };
type ProWithLinks = ProOption & { serviceIds: string[]; isActive: boolean };

export default function NewBookingDialog({
  services,
  professionals,
  todayISO,
}: {
  services: Array<ServiceOption>;
  professionals: Array<ProWithLinks>;
  todayISO: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRef, setCreatedRef] = useState<string | null>(null);

  const [svcId, setSvcId] = useState("");
  const [proId, setProId] = useState("");
  const [dayISO, setDayISO] = useState(todayISO);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);

  const form = useForm<{ name: string; phone: string; email: string; notes: string }>({
    defaultValues: { name: "", phone: "", email: "", notes: "" },
  });

  // profissional efetivo: o escolhido, senão o primeiro ativo que realize o serviço
  const effProId = useMemo(() => {
    if (proId) return proId;
    return professionals.find((p) => p.isActive && p.serviceIds.includes(svcId))?.id
      ?? professionals.find((p) => p.serviceIds.includes(svcId))?.id
      ?? "";
  }, [proId, professionals, svcId]);

  function close() {
    setOpen(false);
    setSlot(null);
    setSlots([]);
    setError(null);
  }

  function resetChoices() {
    setSvcId("");
    setProId("");
    setDayISO(todayISO);
    setSlots([]);
    setSlot(null);
  }

  useEffect(() => {
    if (!open || !svcId || !effProId) {
      setSlots([]);
      return;
    }
    let alive = true;
    setLoadingSlots(true);
    adminSlotsAction(svcId, effProId, dayISO).then((r) => {
      if (alive) {
        setSlots(r);
        setLoadingSlots(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [open, svcId, effProId, dayISO]);

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => {
          setCreatedRef(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-full bg-bordo px-5 py-2.5 text-[14px] font-medium text-creme shadow-sm transition hover:bg-bordo-dark"
      >
        <Plus className="h-4 w-4" /> Marcação manual
      </button>

      {createdRef && (
        <p className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Marcação <span className="font-mono">{createdRef}</span> criada
        </p>
      )}

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-tinta/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Nova marcação manual">
          <div className="mx-auto my-8 w-[94%] max-w-xl rounded-[1.5rem] bg-creme p-6 shadow-xl sm:my-12">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-bordo">Nova marcação</h2>
              <button type="button" onClick={close} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-full text-tinta-soft transition hover:bg-casca">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="nb-service">Serviço *</label>
                  <select id="nb-service" className="field" value={svcId} onChange={(e) => { setSvcId(e.target.value); setSlot(null); }}>
                    <option value="">— escolha —</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="nb-pro">Profissional</label>
                  <select id="nb-pro" className="field" value={proId} onChange={(e) => { setProId(e.target.value); setSlot(null); }}>
                    <option value="">— primeiro disponível —</option>
                    {professionals.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}{p.isActive ? "" : " (inativo)"}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="nb-day">Dia</label>
                <input
                  id="nb-day"
                  type="date"
                  className="field"
                  value={dayISO}
                  min={todayISO}
                  onChange={(e) => { setDayISO(e.target.value || todayISO); setSlot(null); }}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {loadingSlots ? (
                    <span className="inline-flex items-center gap-2 text-[13px] text-tinta-soft"><Loader2 className="h-3.5 w-3.5 animate-spin" /> a ver horas…</span>
                  ) : !svcId ? (
                    <span className="text-[13px] text-tinta-soft">Escolha o serviço para ver as horas livres.</span>
                  ) : slots.length === 0 ? (
                    <span className="text-[13px] text-tinta-soft">Sem horas livres neste dia.</span>
                  ) : (
                    slots.map((sl) => (
                      <button
                        key={sl.minutes}
                        type="button"
                        onClick={() => setSlot(sl)}
                        className={cx(
                          "rounded-full px-3.5 py-2 text-[13.5px] tabular-nums ring-1 transition",
                          slot?.minutes === sl.minutes ? "bg-bordo text-creme ring-bordo" : "ring-nude hover:ring-malva-soft",
                        )}
                      >
                        {sl.time}
                      </button>
                    ))
                  )}
                </div>
                <p className="mt-1.5 text-[12px] text-tinta-soft">A grade do painel ignora a antecedência mínima — pode marcar para já.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="nb-name">Nome da cliente *</label>
                  <input id="nb-name" className={cx("field", form.formState.errors.name && "field-error")} placeholder="Nome completo" {...form.register("name", { required: "Indique o nome", minLength: { value: 2, message: "Indique o nome" } })} />
                  {form.formState.errors.name && <p className="mt-1 text-[12.5px] text-rose-600">{form.formState.errors.name.message}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="nb-phone">Telefone *</label>
                  <input id="nb-phone" className={cx("field", form.formState.errors.phone && "field-error")} placeholder="+238 9..." {...form.register("phone", { required: "Indique o telefone", pattern: { value: /^[+()0-9\s.-]{7,20}$/, message: "Telefone inválido" } })} />
                  {form.formState.errors.phone && <p className="mt-1 text-[12.5px] text-rose-600">{form.formState.errors.phone.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="nb-email">E-mail (para notificações)</label>
                  <input id="nb-email" className={cx("field", form.formState.errors.email && "field-error")} placeholder="opcional" {...form.register("email", { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "E-mail inválido" } })} />
                  {form.formState.errors.email && <p className="mt-1 text-[12.5px] text-rose-600">{form.formState.errors.email.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="nb-notes">Observações</label>
                  <textarea id="nb-notes" rows={2} className="field resize-y" placeholder="Pedido especial…" {...form.register("notes", { maxLength: { value: 1000, message: "Demasiado longo" } })} />
                  {form.formState.errors.notes && <p className="mt-1 text-[12.5px] text-rose-600">{form.formState.errors.notes.message}</p>}
                </div>
              </div>

              {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700 ring-1 ring-rose-200">{error}</p>}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={busy || !slot || !svcId}
                  onClick={form.handleSubmit(async (v) => {
                    setBusy(true);
                    setError(null);
                    const res = await adminCreateManualAppointmentAction({
                      serviceId: svcId,
                      professionalId: effProId || undefined,
                      dateISO: dayISO,
                      minutes: slot!.minutes,
                      name: v.name.trim(),
                      phone: v.phone.trim(),
                      email: v.email.trim() || undefined,
                      notes: v.notes.trim() || undefined,
                    });
                    setBusy(false);
                    if (!res.ok) {
                      setError(res.error ?? "Não foi possível criar a marcação.");
                      return;
                    }
                    setCreatedRef(res.reference);
                    close();
                    form.reset({ name: "", phone: "", email: "", notes: "" });
                    resetChoices();
                    router.refresh();
                  })}
                  className="inline-flex items-center gap-2 rounded-full bg-bordo px-6 py-3 text-[14.5px] font-medium text-creme transition hover:bg-bordo-dark disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Criar marcação
                </button>
                <span className="text-[12.5px] text-tinta-soft">{dayLabel(dayISO)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAY_SHORT_MON[(dt.getUTCDay() + 6) % 7]} ${d} ${MONTH_LABELS[m - 1]}`;
}