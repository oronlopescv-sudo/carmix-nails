"use client";

// Painel da reserva do cliente: verificar e-mail → detalhes → cancelar/remarcar.
// Os detalhes NUNCA chegam como props da página (o payload RSC seria legível
// por quem só tem a referência): chegam do servidor, após verificação do
// e-mail, via reservationMetadataAction. Todas as operações revalidam no servidor.

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { cx } from "@/lib/utils";
import { STATUS_LABELS, STATUS_COLORS, MONTH_LABELS } from "@/lib/constants";
import { utcToWall, dayISO, todayISOInTz, dateISOFromIso } from "@/lib/tz";
import {
  verifyReservationAction,
  cancelBookingAction,
  rescheduleBookingAction,
  getSlotsAction,
  getOpenDaysAction,
  reservationMetadataAction,
} from "@/lib/actions/booking";
import type { SlotDTO } from "@/types/actions";

type ReservationDetails = {
  serviceId: string;
  professionalId: string;
  serviceName: string;
  professionalName: string;
  status: string;
  startAtISO: string;
};

export function ReservationPanel({
  reference,
  timezone,
  allowReschedule,
  minCancelHours,
}: {
  reference: string;
  timezone: string;
  allowReschedule: boolean;
  minCancelHours: number;
}) {
  const [email, setEmail] = useState<string | null>(null);
  const [details, setDetails] = useState<ReservationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function verify(v: { email: string }) {
    setError(null);
    setChecking(true);
    const res = await verifyReservationAction({ reference, email: v.email });
    if (!res.ok) {
      setChecking(false);
      setError(res.error);
      return;
    }
    const meta = await reservationMetadataAction(reference, v.email);
    setChecking(false);
    if (!meta.ok) {
      setError(meta.error);
      return;
    }
    setEmail(v.email);
    setDetails(meta);
  }

  if (!details) {
    return (
      <div className="mt-8">
        <VerifyForm reference={reference} onVerify={verify} error={error} checking={checking} />
      </div>
    );
  }

  const startAt = new Date(details.startAtISO);
  const wall = utcToWall(startAt, timezone);
  const wallISO = dayISO({ year: wall.year, month: wall.month, day: wall.day });
  const weekdayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const weekdayName = weekdayNames[new Date(`${wallISO}T12:00:00Z`).getUTCDay()];

  return (
    <Panel
      reference={reference}
      email={email!}
      serviceId={details.serviceId}
      professionalId={details.professionalId}
      serviceName={details.serviceName}
      professionalName={details.professionalName}
      status={details.status}
      timezone={timezone}
      weekdayName={weekdayName}
      dateLabel={`${wall.day} de ${MONTH_LABELS[wall.month - 1].toLowerCase()} de ${wall.year}`}
      timeLabel={`${String(wall.hour).padStart(2, "0")}:${String(wall.minute).padStart(2, "0")}`}
      allowReschedule={allowReschedule}
      minCancelHours={minCancelHours}
    />
  );
}

/* ── Verificação inicial ───────────────────────────────────────────────────── */
function VerifyForm({
  reference,
  onVerify,
  error,
  checking,
}: {
  reference: string;
  onVerify: (v: { email: string }) => void;
  error: string | null;
  checking: boolean;
}) {
  const form = useForm<{ email: string }>({ defaultValues: { email: "" } });
  return (
    <form
      onSubmit={form.handleSubmit((v) => onVerify(v))}
      noValidate
      className="rounded-[1.5rem] bg-creme p-6 shadow-sm ring-1 ring-nude"
    >
      <p className="text-[14px] text-tinta-soft">
        Confirme o e-mail usado na marcação para ver os detalhes e efetuar alterações.
      </p>
      <label className="label mt-4" htmlFor="rv-email">
        E-mail da marcação
      </label>
      <input
        id="rv-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        className={cx("field", form.formState.errors.email && "field-error")}
        placeholder="o.seu@email.com"
        {...form.register("email", {
          required: "Indique o e-mail da marcação",
          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "E-mail inválido" },
        })}
      />
      {form.formState.errors.email && <p className="mt-1 text-[12.5px] text-rose-600">{form.formState.errors.email.message}</p>}
      {error && <p role="alert" className="mt-2 text-[13.5px] text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={checking}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-bordo px-6 py-3 text-[14.5px] font-medium text-creme transition hover:bg-bordo-dark disabled:opacity-60"
      >
        {checking && <Loader2 className="h-4 w-4 animate-spin" />} Ver a minha reserva
      </button>
      <p className="mt-3 text-[12.5px] text-tinta-soft">
        Reserva <span className="font-mono">{reference}</span> — os detalhes só aparecem ao dono da reserva.
      </p>
    </form>
  );
}

/* ── Detalhes + ações ──────────────────────────────────────────────────────── */
type Mode = "cancel" | "resch" | null;

function Panel({ ...props }: {
  reference: string;
  email: string;
  serviceId: string;
  professionalId: string;
  serviceName: string;
  professionalName: string;
  status: string;
  timezone: string;
  weekdayName: string;
  dateLabel: string;
  timeLabel: string;
  allowReschedule: boolean;
  minCancelHours: number;
}) {
  const { reference, email, serviceId, professionalId, timezone, allowReschedule, minCancelHours, ...details } = props;
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [newSlot, setNewSlot] = useState<SlotDTO | null>(null);

  // remarcação
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());
  const [slots, setSlots] = useState<SlotDTO[]>([]);
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const todayISO = todayISOInTz(timezone); // data de parede do estúdio, não UTC

  const form = useForm<{ reason: string }>({ defaultValues: { reason: "" } });

  useEffect(() => {
    if (!allowReschedule) return;
    let alive = true;
    getOpenDaysAction(serviceId, professionalId).then((r) => {
      if (alive) setOpenDays(new Set(r.days));
    });
    return () => {
      alive = false;
    };
  }, [serviceId, professionalId, allowReschedule]);

  useEffect(() => {
    if (!pickedDay) return;
    let alive = true;
    getSlotsAction(serviceId, professionalId, pickedDay).then((r) => {
      if (alive) setSlots(r);
    });
    return () => {
      alive = false;
    };
  }, [pickedDay, serviceId, professionalId]);

  async function doCancel(v: { reason: string }) {
    setBusy(true);
    setError(null);
    const res = await cancelBookingAction({ reference, email, reason: v.reason || undefined });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMode(null);
    setOkMsg("A sua reserva foi cancelada. Esperamos vê-lo noutra marcação.");
    router.refresh(); // novo estado do servidor (status CANCELLED)
  }

  async function doReschedule() {
    if (!newSlot) return;
    setBusy(true);
    setError(null);
    const res = await rescheduleBookingAction({
      reference,
      email,
      dateISO: dateISOFromIso(newSlot.iso, timezone),
      minutes: newSlot.minutes,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      setMode(null);
      setNewSlot(null);
      return;
    }
    setMode(null);
    setNewSlot(null);
    setOkMsg("Marcação remarcada para a nova hora — enviámos-lhe a confirmação.");
    setTimeout(() => router.refresh(), 800);
  }

  return (
    <div className="rounded-[1.75rem] bg-creme p-6 shadow-sm ring-1 ring-nude sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={cx("rounded-full border px-3 py-1 text-[12.5px] font-medium", STATUS_COLORS[details.status])}>
          {STATUS_LABELS[details.status] ?? details.status}
        </span>
        <Link href="/agendar" className="text-[13px] text-malva underline underline-offset-2 hover:text-bordo">
          Nova marcação
        </Link>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-casca p-4">
          <p className="label">Data</p>
          <p className="text-[15px] font-medium text-tinta">
            {details.weekdayName}, {details.dateLabel}
          </p>
          <p className="label mt-3">Hora</p>
          <p className="text-[15px] font-medium tabular-nums text-tinta">{details.timeLabel}</p>
        </div>
        <div className="rounded-2xl bg-casca p-4">
          <p className="label">Serviço</p>
          <p className="text-[15px] font-medium text-tinta">{details.serviceName}</p>
          <p className="label mt-3">Profissional</p>
          <p className="text-[15px] font-medium text-tinta">{details.professionalName}</p>
        </div>
      </div>

      {okMsg && (
        <p className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[14px] text-emerald-700">
          <Check className="mt-0.5 h-4 w-4 shrink-0" /> {okMsg}
        </p>
      )}

      {details.status === "CANCELLED" ? null : details.status === "COMPLETED" || details.status === "NO_SHOW" ? (
        <p className="mt-5 text-[14px] text-tinta-soft">Esta marcação já decorreu.</p>
      ) : (
        <>
          {error && (
            <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13.5px] text-rose-700">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {allowReschedule && (
              <button
                type="button"
                onClick={() => setMode(mode === "resch" ? null : "resch")}
                className="rounded-full border border-malva-soft px-5 py-2.5 text-[14px] font-medium text-malva transition hover:border-malva"
              >
                Remarcar
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode(mode === "cancel" ? null : "cancel")}
              className="rounded-full border border-rose-200 px-5 py-2.5 text-[14px] font-medium text-rose-600 transition hover:border-rose-400"
            >
              Cancelar
            </button>
          </div>
          <p className="mt-3 text-[12.5px] text-tinta-soft">
            Cancelamentos com menos de {minCancelHours} h de antecedência são registados na reserva.
          </p>

          {mode === "resch" && (
            <div className="mt-6 rounded-[1.5rem] bg-casca p-5 ring-1 ring-nude">
              <p className="label">Escolha a nova data</p>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                {daysStrip(todayISO, openDays).map((d) => (
                  <button
                    key={d.iso}
                    type="button"
                    disabled={!openDays.has(d.iso) || d.iso < todayISO}
                    onClick={() => setPickedDay(d.iso)}
                    className={cx(
                      "w-14 shrink-0 rounded-xl bg-creme px-2 py-2.5 text-center transition ring-1",
                      pickedDay === d.iso ? "bg-bordo text-creme ring-bordo" : "ring-nude hover:ring-malva-soft",
                      (!openDays.has(d.iso) || d.iso < todayISO) && "opacity-35",
                    )}
                  >
                    <span className="block text-[10.5px] uppercase">{d.wdLabel}</span>
                    <span className="block text-[16px] font-medium tabular-nums">{d.day}</span>
                  </button>
                ))}
              </div>
              {openDays.size === 0 && (
                <p className="mt-2 text-[13px] text-tinta-soft">Sem dias alternativos disponíveis nos próximos meses.</p>
              )}
              {pickedDay && (
                <div className="mt-4">
                  <p className="label">Nova hora</p>
                  {slots.length === 0 ? (
                    <p className="text-[13px] text-tinta-soft">A carregar ou sem horas livres nesse dia — escolha outro.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {slots.map((sl) => (
                        <button
                          key={sl.minutes}
                          type="button"
                          onClick={() => setNewSlot(sl)}
                          className={cx(
                            "rounded-full px-4 py-2 text-[14px] tabular-nums transition ring-1",
                            newSlot?.minutes === sl.minutes ? "bg-bordo text-creme ring-bordo" : "bg-creme text-tinta ring-nude hover:ring-malva-soft",
                          )}
                        >
                          {sl.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                disabled={!newSlot || busy}
                onClick={doReschedule}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-malva px-6 py-3 text-[14.5px] font-medium text-creme transition hover:bg-bordo disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar nova hora
              </button>
            </div>
          )}

          {mode === "cancel" && (
            <form onSubmit={form.handleSubmit(doCancel)} noValidate className="mt-6 rounded-[1.5rem] bg-casca p-5 ring-1 ring-nude">
              <p className="label">Motivo (opcional)</p>
              <textarea
                rows={2}
                className="field resize-y"
                placeholder="Se quiser, diga porque está a cancelar"
                {...form.register("reason", { maxLength: { value: 500, message: "Muito longo" } })}
              />
              {form.formState.errors.reason && <p className="mt-1 text-[12.5px] text-rose-600">{form.formState.errors.reason.message}</p>}
              <button
                type="submit"
                disabled={busy}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-[14.5px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar cancelamento
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

/* gera ~28 dias a partir de hoje */
function daysStrip(todayISO: string, openDays: Set<string>) {
  const [ty, tm, td] = todayISO.split("-").map(Number);
  const out: Array<{ iso: string; day: number; wdLabel: string }> = [];
  const base = Date.UTC(ty, tm - 1, td);
  const WD = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  for (let i = 0; i < 28; i++) {
    const d = new Date(base + i * 86_400_000);
    const iso = dayISO({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
    out.push({ iso, day: d.getUTCDate(), wdLabel: WD[(d.getUTCDay() + 6) % 7] });
  }
  return out;
}