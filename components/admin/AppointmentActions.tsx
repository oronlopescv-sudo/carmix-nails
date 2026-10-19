"use client";

// Cartão de marcação no painel: dados + ações + remarcação + histórico.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, History, CalendarClock, XCircle, CheckCircle2, MessageCircle } from "lucide-react";
import { cx } from "@/lib/utils";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { formatPrice } from "@/lib/pricing";
import {
  adminConfirmAppointmentAction,
  adminCancelAppointmentAction,
  adminCompleteAppointmentAction,
  adminRescheduleAppointmentAction,
  adminSlotsAction,
  appointmentHistoryAction,
} from "@/lib/actions/bookings-admin";
import type { AppointmentRowData } from "@/types/admin";

type Slot = { minutes: number; time: string; iso: string };

export function AppointmentActions({ appt, timezone, currency, brandName }: { appt: AppointmentRowData; timezone: string; currency: string; brandName: string }) {
  const router = useRouter();
  const cancelReasonRef = useRef<HTMLTextAreaElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<null | "reschedule" | "history" | "cancel">(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [dayISO, setDayISO] = useState<string>(() => appt.startAtISO.slice(0, 10));
  const [slot, setSlot] = useState<Slot | null>(null);
  const [history, setHistory] = useState<Array<{ type: string; actor: string; description: string | null; createdAtISO: string }> | null>(null);

  const startWall = isoOf(appt.startAtISO, timezone);
  const endWall = isoOf(appt.endAtISO, timezone);
  const startMinute = startWall.hour * 60 + startWall.minute;
  const endMinute = endWall.hour * 60 + endWall.minute;

  const active = appt.status === "PENDING";
  const upcoming = new Date(appt.startAtISO).getTime() > Date.now() && appt.status !== "CANCELLED";

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

  async function loadHistory() {
    if (history) {
      setMode(mode === "history" ? null : "history");
      return;
    }
    setBusy(true);
    const h = await appointmentHistoryAction(appt.id);
    setBusy(false);
    setHistory(h);
    setMode("history");
  }

  async function pickDay(iso: string) {
    setDayISO(iso);
    setSlot(null);
    setSlots([]);
    setBusy(true);
    const r = await adminSlotsAction(appt.serviceId, appt.professionalId, iso);
    setBusy(false);
    setSlots(r);
  }

  return (
    <article>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <time className="font-display text-xl text-bordo">
              {String(startWall.day).padStart(2, "0")}/{String(startWall.month).padStart(2, "0")} · {fmtHM(startMinute)}
            </time>
            <span className={cx("rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium", STATUS_COLORS[appt.status])}>
              {STATUS_LABELS[appt.status] ?? appt.status}
            </span>
            <span className="font-mono text-[12px] text-tinta-soft">{appt.reference}</span>
          </div>
          <p className="mt-1.5 text-[14.5px]">
            <span className="font-medium text-tinta">{appt.customerName}</span>
            <span className="text-tinta-soft"> · {appt.customerPhone}</span>
            <span className="text-tinta-soft"> · {appt.service}</span>
            <span className="text-tinta-soft"> · {appt.professional}</span>
          </p>
          <p className="text-[13px] text-tinta-soft">
            ~{fmtHM(endMinute)} · {formatPrice(appt.priceAtBooking, currency)}
            {appt.notes ? ` · obs: “${appt.notes}”` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {active && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => adminConfirmAppointmentAction(appt.id))}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-[13.5px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Confirmar
            </button>
          )}
          {["PENDING", "CONFIRMED"].includes(appt.status) && appt.customerPhone && (
            <a
              href={waLink(appt.customerPhone, whatsappMessage(appt, startWall, brandName))}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir o WhatsApp com a mensagem da marcação pronta a enviar"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2 text-[13.5px] font-medium text-emerald-700 ring-1 ring-emerald-200 transition hover:opacity-85"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          )}
          {active && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode(mode === "reschedule" ? null : "reschedule")}
              className="inline-flex items-center gap-1.5 rounded-full border border-malva-soft px-4 py-2 text-[13.5px] font-medium text-malva transition hover:border-malva"
            >
              <CalendarClock className="h-4 w-4" /> Remarcar
            </button>
          )}
          {active && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode(mode === "cancel" ? null : "cancel")}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-4 py-2 text-[13.5px] font-medium text-rose-600 transition hover:border-rose-400"
            >
              <XCircle className="h-4 w-4" /> Cancelar
            </button>
          )}
          {upcoming && ["CONFIRMED", "PENDING"].includes(appt.status) && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => adminCompleteAppointmentAction(appt.id, "COMPLETED"))}
                className="rounded-full bg-sky-50 px-4 py-2 text-[13.5px] text-sky-700 ring-1 ring-sky-200 transition hover:opacity-85"
              >
                Concluído
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => adminCompleteAppointmentAction(appt.id, "NO_SHOW"))}
                className="rounded-full bg-stone-50 px-4 py-2 text-[13.5px] text-stone-600 ring-1 ring-stone-200 transition hover:opacity-85"
              >
                Falta
              </button>
            </>
          )}
          <button
            type="button"
            onClick={loadHistory}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] transition",
              mode === "history" ? "bg-nude font-medium text-bordo" : "text-tinta-soft hover:text-bordo",
            )}
          >
            <History className="h-3.5 w-3.5" /> Histórico
          </button>
        </div>
      </div>

      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700 ring-1 ring-rose-200">{error}</p>}

      {/* cancelamento com motivo */}
      {mode === "cancel" && (
        <div className="mt-4 rounded-xl bg-casca p-4">
          <label className="label" htmlFor={`creason-${appt.id}`}>Motivo do cancelamento (opcional)</label>
          <textarea
            id={`creason-${appt.id}`}
            rows={2}
            className="field resize-y"
            placeholder="Cliente pediu, indisponibilidade, falta…"
            defaultValue=""
            ref={cancelReasonRef}
          />
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => adminCancelAppointmentAction(appt.id, cancelReasonRef.current?.value ?? undefined))}
              className="rounded-full bg-rose-600 px-5 py-2.5 text-[13.5px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {busy && <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />} Confirmar cancelamento
            </button>
            <button type="button" onClick={() => setMode(null)} className="text-[13.5px] text-tinta-soft hover:text-tinta">Fechar</button>
          </div>
        </div>
      )}

      {/* remarcação */}
      {mode === "reschedule" && (
        <div className="mt-4 rounded-xl bg-casca p-4">
          <p className="label">Nova data (marcação atual: {String(startWall.day).padStart(2, "0")}/{String(startWall.month).padStart(2, "0")})</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {dayStripOptions(dayISO).map((d) => (
              <button
                key={d.iso}
                type="button"
                onClick={() => pickDay(d.iso)}
                className={cx(
                  "w-14 shrink-0 rounded-xl bg-creme px-2 py-2.5 text-center ring-1 transition",
                  dayISO === d.iso ? "bg-bordo text-creme ring-bordo" : "ring-nude hover:ring-malva-soft",
                )}
              >
                <span className="block text-[10.5px] uppercase">{d.wd}</span>
                <span className="block text-[16px] font-medium tabular-nums">{d.day}</span>
              </button>
            ))}
          </div>
          <p className="label mt-4">Nova hora</p>
          {slots.length === 0 ? (
            <p className="text-[13px] text-tinta-soft">
              {dayISO ? "A carregar ou sem horas livres nesse dia (incluindo a própria marcação)." : "Escolha um dia."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((sl) => (
                <button
                  key={sl.minutes}
                  type="button"
                  onClick={() => setSlot(sl)}
                  className={cx(
                    "rounded-full px-3.5 py-2 text-[13.5px] tabular-nums transition ring-1",
                    slot?.minutes === sl.minutes ? "bg-bordo text-creme ring-bordo" : "bg-creme text-tinta ring-nude hover:ring-malva-soft",
                  )}
                >
                  {sl.time}
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              disabled={!slot || busy}
              onClick={() =>
                run(async () => {
                  const res = await adminRescheduleAppointmentAction({ id: appt.id, dateISO: dayISO, minutes: slot!.minutes, reason: "Remarcada no painel" });
                  if (res.ok) {
                    setMode(null);
                    setSlot(null);
                  }
                  return res;
                })
              }
              className="rounded-full bg-malva px-5 py-2.5 text-[13.5px] font-medium text-creme transition hover:opacity-90 disabled:opacity-50"
            >
              {busy && <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />} Guardar
            </button>
            <button type="button" onClick={() => setMode(null)} className="text-[13.5px] text-tinta-soft hover:text-tinta">Fechar</button>
          </div>
          <p className="mt-2 text-[12px] text-tinta-soft">A hora da própria marcação não aparece nas opções livres.</p>
        </div>
      )}

      {/* histórico */}
      {mode === "history" && history && (
        <ol className="mt-4 space-y-2 rounded-xl bg-casca p-4 text-[13.5px]">
          {history.length === 0 && <li className="text-tinta-soft">Sem eventos registados.</li>}
          {history.map((e, i) => (
            <li key={i} className="flex flex-wrap gap-x-3 gap-y-0.5">
              <time className="tabular-nums text-tinta-soft">{fmtWhen(e.createdAtISO)}</time>
              <span className="font-medium text-tinta">{e.type}</span>
              {e.description && <span className="text-tinta-soft">— {e.description}</span>}
            </li>
          ))}
        </ol>
      )}

      <details className="mt-2">
        <summary className="cursor-pointer text-[12.5px] text-tinta-soft">Detalhes do registo</summary>
        <p className="mt-2 text-[12.5px] leading-relaxed text-tinta-soft">
          Referência: {appt.reference} · Estado: {STATUS_LABELS[appt.status]} · Início (UTC): {appt.startAtISO} ·
          Fim (UTC): {appt.endAtISO} · Preço à data da marcação: {formatPrice(appt.priceAtBooking, currency)}
          {appt.cancelReason ? ` · Motivo do cancelamento: ${appt.cancelReason}` : ""}
        </p>
      </details>
    </article>
  );
}

/* utilitários locais */

function fmtHM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** Mensagem pronta para a cliente, conforme o estado da marcação. */
function whatsappMessage(appt: AppointmentRowData, wall: { day: number; month: number; hour: number; minute: number }, brand: string): string {
  const dia = `${String(wall.day).padStart(2, "0")}/${String(wall.month).padStart(2, "0")}`;
  const hora = fmtHM(wall.hour * 60 + wall.minute);
  if (appt.status === "CONFIRMED") {
    return `Olá ${appt.customerName}! A sua marcação no ${brand} está confirmada: ${appt.service}, ${dia} às ${hora}. Até já! 🌸`;
  }
  return `Olá ${appt.customerName}! Recebemos o seu pedido de marcação no ${brand}: ${appt.service}, ${dia} às ${hora}. Confirmamos de seguida. 🌸`;
}

/** wa.me usa número internacional. Sem indicativo: assume Cabo Verde (238). */
function waLink(phone: string, message: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9) d = "238" + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(message)}`;
}
function isoOf(isoUTC: string, tz: string): { year: number; month: number; day: number; hour: number; minute: number } {
  const d = new Date(isoUTC);
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const map: Record<string, string> = {};
  for (const p of f.formatToParts(d)) map[p.type] = p.value;
  return {
    year: +map.year,
    month: +map.month,
    day: +map.day,
    hour: +map.hour,
    minute: +map.minute,
  };
}


function dayStripOptions(currentISO: string) {
  const [y, m, d] = currentISO.split("-").map(Number);
  const WD = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const out: Array<{ iso: string; wd: string; day: number }> = [];
  for (let i = -7; i <= 21; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    const iso = dt.toISOString().slice(0, 10);
    out.push({ iso, wd: WD[(dt.getUTCDay() + 6) % 7], day: dt.getUTCDate() });
  }
  return out;
}

function fmtWhen(isoUTC: string): string {
  const d = new Date(isoUTC);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}