"use client";

// Fluxo de marcação em passos: serviço → profissional → data/hora → dados → feito.
// Todas as validações de negocio (conflitos, antecedência, bloqueios) são
// revalidadas no servidor em createBookingAction.

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { ArrowLeft, Check, Scissors, CalendarHeart, Loader2 } from "lucide-react";
import { cx } from "@/lib/utils";
import { MONTH_LABELS, WEEKDAY_SHORT_MON } from "@/lib/constants";
import { formatPriceRange } from "@/lib/pricing";
import { createBookingAction, getSlotsAction, getOpenDaysAction } from "@/lib/actions/booking";
import type { SlotDTO } from "@/types/actions";
import { minutesToHM, todayISOInTz } from "@/lib/tz";

export type ServiceOption = {
  id: string;
  name: string;
  description: string | null;
  priceMin: number;
  priceMax: number | null;
  durationMin: number;
};
export type ProOption = { id: string; name: string; title: string | null };

type FormValues = {
  name: string;
  phone: string;
  email: string;
  notes: string;
  consent: boolean;
  website: string;
};

const STEPS = ["Serviço", "Profissional", "Data e hora", "Seus dados"];

/* ── Calendário de um mês ──────────────────────────────────────────────────── */
function MonthGrid({
  year,
  month,
  todayISO,
  maxDay,
  openDays,
  selectedDay,
  onSelect,
}: {
  year: number;
  month: number;
  todayISO: string;
  maxDay: string;
  openDays: Set<string>;
  selectedDay: string | null;
  onSelect: (iso: string) => void;
}) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startWeekday = (first.getUTCDay() + 6) % 7; // segunda = 0
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: Array<{ iso: string; day: number; state: "past" | "off" | "open" | "sel" } | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const state =
      iso < todayISO || iso > maxDay ? "past" : iso === selectedDay ? "sel" : openDays.has(iso) ? "open" : "off";
    cells.push({ iso, day: d, state });
  }

  return (
    <div>
      <p className="mb-3 text-center text-[14px] font-medium text-bordo">
        {MONTH_LABELS[month - 1]} {year}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[11.5px] text-tinta-soft">
        {WEEKDAY_SHORT_MON.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <span key={`e${i}`} />;
          return (
            <button
              key={c.iso}
              type="button"
              disabled={c.state === "past" || c.state === "off"}
              onClick={() => onSelect(c.iso)}
              aria-label={`${c.day}: ${c.state === "off" ? "sem disponibilidade" : "disponível"}`}
              className={cx(
                "relative mx-auto grid h-10 w-10 place-items-center rounded-full text-[14px] transition",
                c.state === "sel" && "bg-bordo font-semibold text-creme",
                c.state === "open" && "text-tinta hover:bg-nude hover:text-bordo",
                (c.state === "off" || c.state === "past") && "text-tinta-soft/40",
              )}
            >
              {c.day}
              {c.state === "open" && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-malva" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Fluxo ─────────────────────────────────────────────────────────────────── */
export default function BookingFlow({
  groups,
  professionals,
  currency,
  emailConfigured,
  timezone,
  whatsApp,
  brandName,
}: {
  groups: Array<{ name: string; services: ServiceOption[] }>;
  professionals: (ProOption & { serviceIds: string[] })[];
  currency: string;
  emailConfigured: boolean;
  timezone: string;
  whatsApp?: string | null;
  brandName?: string;
}) {
  // passo 0=serviço, 1=profissional, 2=data/hora, 3=dados, 4=feito
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [proId, setProId] = useState<string | null>(null);
  const [dateISO, setDateISO] = useState<string | null>(null);
  const [slot, setSlot] = useState<SlotDTO | null>(null);

  const [openDays, setOpenDays] = useState<Set<string>>(new Set());
  const [maxDay, setMaxDay] = useState<string>("");
  const [openDaysError, setOpenDaysError] = useState<string | null>(null);
  const [openDaysLoading, setOpenDaysLoading] = useState(false);
  const [slots, setSlots] = useState<SlotDTO[]>([]);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [reloadOpenDays, setReloadOpenDays] = useState(0);
  const [reloadSlots, setReloadSlots] = useState(0);
  const [monthsToShow, setMonthsToShow] = useState(1);

  const [topError, setTopError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ reference: string; status: string; emailSent: boolean } | null>(null);
  const openDaysLoadedFor = useRef<string | null>(null);

  const todayISO = useMemo(() => todayISOInTz(timezone), [timezone]); // data de parede, não UTC

  const service = useMemo(
    () => groups.flatMap((g) => g.services).find((s) => s.id === serviceId) ?? null,
    [groups, serviceId],
  );

  // profissionais que oferecem o serviço escolhido
  const pros = useMemo(
    () => professionals.filter((p) => serviceId && p.serviceIds.includes(serviceId)),
    [professionals, serviceId],
  );

  const form = useForm<FormValues>({
    defaultValues: { name: "", phone: "", email: "", notes: "", consent: false, website: "" },
    mode: "onBlur",
  });

  // ao entrar no passo profissional: saltar se só há um candidato
  useEffect(() => {
    if (step === 1 && pros.length === 1) {
      setProId(pros[0].id);
      setDateISO(null);
      setSlot(null);
      setStep(2);
    }
  }, [step, pros]);

  // ao entrar no passo 2 (ou trocar serviço/profissional): carregar dias abertos
  useEffect(() => {
    if (step !== 2 || !serviceId || !proId) return;
    // chave composta: a disponibilidade depende de serviço E profissional —
    // trocar só um deles tem de recarregar
    const key = `${serviceId}:${proId}`;
    if (openDaysLoadedFor.current === key) return;
    openDaysLoadedFor.current = key;
    let alive = true;
    setOpenDays(new Set());
    setMaxDay("");
    setOpenDaysError(null);
    setOpenDaysLoading(true);
    getOpenDaysAction(serviceId, proId)
      .then((r) => {
        if (!alive) return;
        if (r.ok) {
          setOpenDays(new Set(r.days));
          setMaxDay(r.maxDay);
        } else {
          setOpenDaysError(r.error);
        }
      })
      .catch(() => {
        if (alive) setErrorDaysGeneric();
      })
      .finally(() => {
        if (alive) setOpenDaysLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [step, serviceId, proId, reloadOpenDays]);

  function setErrorDaysGeneric() {
    setOpenDaysError("Não foi possível carregar a disponibilidade. Verifique a ligação e tente de novo.");
  }

  function retryOpenDays() {
    openDaysLoadedFor.current = null;
    setReloadOpenDays((n) => n + 1);
  }

  function retrySlots() {
    setReloadSlots((n) => n + 1);
  }

  // ao escolher dia: carregar slots
  useEffect(() => {
    if (!dateISO || !serviceId || !proId) return;
    let alive = true;
    setLoadingSlots(true);
    setSlots([]);
    setSlotsError(null);
    getSlotsAction(serviceId, proId, dateISO)
      .then((r) => {
        if (!alive) return;
        if (r.ok) setSlots(r.slots);
        else setSlotsError(r.error);
      })
      .catch(() => {
        if (alive) setSlotsError("Não foi possível carregar as horas. Tente de novo.");
      })
      .finally(() => {
        if (alive) setLoadingSlots(false);
      });
    return () => {
      alive = false;
    };
  }, [dateISO, serviceId, proId, reloadSlots]);

  async function onSubmit(values: FormValues) {
    setTopError(null);
    setSubmitting(true);
    const res = await createBookingAction({
      serviceId: serviceId!,
      professionalId: proId!,
      dateISO: dateISO!,
      minutes: slot!.minutes,
      name: values.name,
      phone: values.phone,
      email: values.email || undefined,
      notes: values.notes || undefined,
      consent: values.consent,
      website: values.website,
    });
    setSubmitting(false);
    if (!res.ok) {
      if (res.fieldErrors) {
        for (const [k, msg] of Object.entries(res.fieldErrors)) {
          form.setError(k as keyof FormValues, { type: "manual", message: msg });
        }
      }
      setTopError(res.error ?? "Não foi possível criar a marcação.");
      // código do servidor manda a recuperação — era texto a casar com texto,
      // que nunca casava ("disponível" ≠ "indisponi"/"reservado")
      if (res.code === "SLOT_UNAVAILABLE") {
        // horário foi reservado por outra pessoa → voltar a escolher hora
        // e RECARREGAR os chips: sem isto o chip tomado continuava visível e
        // o cliente caía num loop de "escolhe outra" sem ver a realidade
        setStep(2);
        setSlot(null);
        setSlots([]);
        retrySlots();
      }
      return;
    }
    setDone({ reference: res.reference, status: res.status, emailSent: res.emailSent });
    setStep(4);
  }

  // O calendário começa no mês de parede do estúdio (todayISO), não no mês UTC:
  // no fuso UTC−1, junto à viragem de mês a versão UTC esconderia as horas de
  // "hoje" (o próprio dia).
  const months = useMemo(() => buildMonths(todayISO, maxDay, monthsToShow), [todayISO, maxDay, monthsToShow]);
  // "Ver mais meses" só faz sentido enquanto há mês seguinte e dentro do limite
  // (antes aparecia mesmo já terminado no máximo do calendário)
  const lastShown = months[months.length - 1];
  const atMaxMonth = !!maxDay && !!lastShown && lastShown.year === Number(maxDay.slice(0, 4)) && lastShown.month === Number(maxDay.slice(5, 7));
  // tecto de meses DERIVADO do horizonte da BD (maxDay) — o tecto fixo de 3
  // escondia meses inteiros dentro da janela de marcação (ex.: maxLeadDays=120)
  const monthsHorizon = maxDay
    ? Number(maxDay.slice(0, 4)) * 12 + Number(maxDay.slice(5, 7)) -
      (Number(todayISO.slice(0, 4)) * 12 + Number(todayISO.slice(5, 7)) + 1) +
      1
    : 1;
  const canShowMoreMonths = !!maxDay && !atMaxMonth && months.length < monthsHorizon;

  // ── Ecrã final ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="mx-auto max-w-lg rounded-[1.75rem] bg-creme p-8 text-center shadow-sm ring-1 ring-nude">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <Check className="h-7 w-7" />
        </div>
        <h2 className="mt-4 font-display text-3xl text-bordo">Marcação registada!</h2>
        <p className="mt-2 text-[15px] text-tinta-soft">
          {done.status === "CONFIRMED"
            ? "A sua marcação foi automaticamente confirmada."
            : "O estúdio vai confirmar o seu pedido em breve."}
        </p>
        <div className="mt-5 rounded-2xl bg-casca px-5 py-4 ring-1 ring-nude">
          <p className="text-[12px] uppercase tracking-[0.2em] text-tinta-soft">Referência da reserva</p>
          <p className="mt-1 font-display text-2xl tracking-wider text-bordo select-all">{done.reference}</p>
        </div>
        <p className="mt-4 text-[13.5px] text-tinta-soft">
          {done.emailSent
            ? "Enviámos o resumo para o seu e-mail (se o indicou)."
            : emailConfigured
              ? "Não foi possível enviar o e-mail de confirmação — guarde a referência acima."
              : "E-mail de confirmação não disponível de momento — guarde a referência acima."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={`/reserva/${done.reference}`}
            className="rounded-full bg-bordo px-6 py-3 text-[14.5px] font-medium text-creme transition hover:bg-bordo-dark"
          >
            Ver a minha reserva
          </Link>
          <Link
            href="/"
            className="rounded-full border border-malva-soft px-6 py-3 text-[14.5px] font-medium text-malva transition hover:border-malva"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* progresso */}
      <ol className="mb-8 flex items-center gap-2 text-[12px]" aria-label="Passos da marcação">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cx(
                "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                i < step && "bg-malva text-creme",
                i === step && "bg-bordo text-creme",
                i > step && "bg-nude text-tinta-soft",
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cx("hidden sm:inline", i === step ? "font-semibold text-bordo" : "text-tinta-soft")}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-nude sm:block" />}
          </li>
        ))}
      </ol>

      {topError && (
        <p role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">
          {topError}
        </p>
      )}

      {/* passo 0 — serviço */}
      {step === 0 && (
        <div>
          <h2 className="font-display text-2xl text-bordo">Que serviço quer marcar?</h2>
          {groups.length === 0 && (
            // sem serviços (nenhum ativo, ou base de dados indisponível): nunca ecrã vazio
            <div className="mt-5 rounded-2xl bg-casca px-5 py-5 text-[14.5px] text-tinta-soft ring-1 ring-nude">
              <p>De momento não há serviços disponíveis para marcação online.</p>
              {whatsApp && (
                <a
                  href={`https://wa.me/${whatsApp.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Olá${brandName ? ` ${brandName}` : ""}! Gostaria de marcar um serviço. Que dias e horas têm disponíveis?`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-[15px] font-medium text-white shadow-sm transition hover:opacity-90"
                >
                  Marcar pelo WhatsApp
                </a>
              )}
              <p className="mt-3">
                Pode{" "}
                <Link href="/contactos" className="font-medium text-malva underline underline-offset-2">
                  contactar o estúdio
                </Link>{" "}
                ou{" "}
                <Link href="/servicos" className="font-medium text-malva underline underline-offset-2">
                  ver os serviços e preços
                </Link>
                .
              </p>
            </div>
          )}
          {groups.map((g) => (
            <div key={g.name} className="mt-5 first:mt-0">
              <p className="label">{g.name}</p>
              <div className="mt-2 grid gap-2.5">
                {g.services.map((s) => (
                <button
                key={s.id}
                type="button"
                onClick={() => {
                  setServiceId(s.id);
                  setProId(null);
                  setDateISO(null);
                  setSlot(null);
                  // a disponibilidade é por serviço+profissional — tudo reinicia
                  openDaysLoadedFor.current = null;
                  setOpenDays(new Set());
                  setMaxDay("");
                  setOpenDaysError(null);
                  setStep(1);
                }}
                className="group flex items-center justify-between gap-3 rounded-2xl bg-creme px-5 py-4 text-left ring-1 ring-nude transition hover:ring-malva-soft"
              >
                <span className="min-w-0">
                  <span className="block flex items-center gap-2 text-[15px] font-medium text-tinta group-hover:text-bordo">
                    <Scissors className="h-4 w-4 shrink-0 text-malva-soft" /> {s.name}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] text-tinta-soft">
                    {s.description ?? ""}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[14.5px] font-medium text-bordo">
                    {formatPriceRange(s.priceMin, s.priceMax, currency)}
                  </span>
                  <span className="text-[12px] text-tinta-soft">~{s.durationMin} min</span>
                </span>
              </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* passo 1 — profissional (oculto se só 1) */}
      {step === 1 && (
        <div>
          <h2 className="font-display text-2xl text-bordo">Com quem prefere marcar?</h2>
          {pros.length > 0 ? (
          <div className="mt-5 grid gap-2.5">
            {pros.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setProId(p.id);
                  setDateISO(null);
                  setSlot(null);
                  setStep(2);
                }}
                className="group flex items-center gap-4 rounded-2xl bg-creme px-5 py-4 text-left ring-1 ring-nude transition hover:ring-malva-soft"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-nude font-display text-[14px] text-bordo">
                  {p.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <span>
                  <span className="block text-[15px] font-medium text-tinta group-hover:text-bordo">{p.name}</span>
                  {p.title && <span className="block text-[12.5px] text-tinta-soft">{p.title}</span>}
                </span>
              </button>
            ))}
          </div>
          ) : (
            <p className="mt-5 rounded-2xl bg-casca px-5 py-4 text-[14px] text-tinta-soft ring-1 ring-nude">
              Este serviço ainda não tem profissional associado no painel — escolha outro serviço por favor.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              openDaysLoadedFor.current = null;
              setStep(0);
            }}
            className="mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-malva hover:text-bordo"
          >
            <ArrowLeft className="h-4 w-4" /> Escolher outro serviço
          </button>
        </div>
      )}

      {/* passo 2 — data e hora */}
      {step === 2 && (
        <div>
          <h2 className="font-display text-2xl text-bordo">Escolha a data e a hora</h2>
          <div className="mt-5 rounded-[1.5rem] bg-creme p-5 ring-1 ring-nude sm:p-6">
            <div className="grid gap-6 sm:grid-cols-2">
              {months.map((m) => (
                <MonthGrid
                  key={`${m.year}-${m.month}`}
                  year={m.year}
                  month={m.month}
                  todayISO={todayISO}
                  maxDay={maxDay}
                  openDays={openDays}
                  selectedDay={dateISO}
                  onSelect={(iso) => {
                    setDateISO(iso);
                    setSlot(null);
                  }}
                />
              ))}
            </div>
            {canShowMoreMonths && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setMonthsToShow((m) => m + 1)}
                  className="text-[13px] font-medium text-malva hover:text-bordo"
                >
                  Ver mais meses
                </button>
              </div>
            )}
            {openDaysLoading && (
              <p className="mt-4 flex items-center gap-2 text-[13px] text-tinta-soft">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> A carregar os dias com disponibilidade…
              </p>
            )}
            {openDaysError && (
              <p
                role="alert"
                className="mt-4 flex flex-wrap items-center gap-x-2 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700 ring-1 ring-rose-200"
              >
                {openDaysError}
                <button
                  type="button"
                  onClick={retryOpenDays}
                  className="font-medium underline underline-offset-2"
                >
                  Tentar novamente
                </button>
              </p>
            )}
            {!openDaysLoading && !openDaysError && maxDay && openDays.size === 0 && (
              <p className="mt-4 rounded-lg bg-nude px-3 py-2 text-[13px] text-tinta-soft">
                Não há dias abertos na janela de marcação para este serviço — ligue ao estúdio por favor.
              </p>
            )}
          </div>

          {dateISO && (
            <div className="mt-5 rounded-[1.5rem] bg-creme p-5 ring-1 ring-nude">
              {loadingSlots ? (
                <p className="flex items-center gap-2 py-2 text-[14px] text-tinta-soft">
                  <Loader2 className="h-4 w-4 animate-spin" /> A ver horários disponíveis…
                </p>
              ) : slotsError ? (
                <div className="py-2">
                  <p role="alert" className="text-[14px] text-rose-700">
                    {slotsError}
                  </p>
                  <button
                    type="button"
                    onClick={retrySlots}
                    className="mt-2 text-[13.5px] font-medium text-malva underline underline-offset-2 hover:text-bordo"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : slots.length === 0 ? (
                <p className="py-2 text-[14px] text-tinta-soft">
                  Este dia já não tem horas livres. Escolha outro dia (dias com ponto têm disponibilidade).
                </p>
              ) : (
                <div>
                  <p className="label">Horas disponíveis</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {slots.map((sl) => (
                      <button
                        key={sl.minutes}
                        type="button"
                        onClick={() => {
                          setSlot(sl);
                          setStep(3);
                        }}
                        className={cx(
                          "rounded-full px-4 py-2.5 text-[14.5px] tabular-nums transition",
                          slot?.minutes === sl.minutes
                            ? "bg-bordo font-medium text-creme"
                            : "bg-casca text-tinta hover:bg-nude hover:text-bordo ring-1 ring-nude",
                        )}
                      >
                        {sl.time}
                      </button>
                    ))}
                  </div>
                  {!emailConfigured && (
                    <p className="mt-4 rounded-lg bg-nude px-3 py-2 text-[12.5px] text-tinta-soft">
                      Os e-mails automáticos estão temporariamente indisponíveis. Receberá
                      a confirmação na página da reserva.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => {
                // voltar atrás não pode reutilizar dias carregados antes
                openDaysLoadedFor.current = null;
                setStep(pros.length === 1 ? 0 : 1);
              }}
              className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-malva hover:text-bordo"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            {service && (
              <p className="flex items-center gap-2 text-[13.5px] text-tinta-soft">
                <CalendarHeart className="h-4 w-4 text-malva-soft" />
                {service.name} · {formatPriceRange(service.priceMin, service.priceMax, currency)} · ~{service.durationMin} min
              </p>
            )}
          </div>
        </div>
      )}

      {/* passo 3 — dados */}
      {step === 3 && slot && dateISO && (
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <h2 className="font-display text-2xl text-bordo">Os seus dados</h2>

          <div className="mt-4 rounded-2xl bg-nude px-4 py-3 text-[14px]">
            <p className="font-medium text-bordo">
              {slot.time} · {humanDate(dateISO)}
            </p>
            <p className="text-tinta-soft">
              {service?.name} · ~{service?.durationMin} min ·{" "}
              {service ? formatPriceRange(service.priceMin, service.priceMax, currency) : ""}
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="bk-name">Nome *</label>
              <input
                id="bk-name"
                type="text"
                autoComplete="name"
                className={cx("field", form.formState.errors.name && "field-error")}
                placeholder="O seu nome completo"
                {...form.register("name", { required: "Indique o seu nome", minLength: { value: 2, message: "Indique o seu nome" } })}
              />
              {form.formState.errors.name && <p className="mt-1 text-[12.5px] text-rose-600">{form.formState.errors.name.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="bk-phone">Telefone * (WhatsApp)</label>
              <input
                id="bk-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className={cx("field", form.formState.errors.phone && "field-error")}
                placeholder="+238 9..."
                {...form.register("phone", {
                  required: "Indique o seu telefone",
                  pattern: { value: /^[+()0-9\s.-]{7,20}$/, message: "Telefone inválido" },
                })}
              />
              {form.formState.errors.phone && <p className="mt-1 text-[12.5px] text-rose-600">{form.formState.errors.phone.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="bk-email">E-mail (opcional)</label>
              <input
                id="bk-email"
                type="email"
                autoComplete="email"
                className={cx("field", form.formState.errors.email && "field-error")}
                placeholder="para receber confirmações"
                {...form.register("email", { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "E-mail inválido" } })}
              />
              {form.formState.errors.email && <p className="mt-1 text-[12.5px] text-rose-600">{form.formState.errors.email.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="bk-notes">Observações (opcional)</label>
              <textarea
                id="bk-notes"
                rows={3}
                className="field resize-y"
                placeholder="Decor que deseja, formato especial, outro pedido…"
                {...form.register("notes", { maxLength: { value: 1000, message: "Observações demasiado longas" } })}
              />
              {form.formState.errors.notes && <p className="mt-1 text-[12.5px] text-rose-600">{form.formState.errors.notes.message}</p>}
            </div>
          </div>

          {/* honeypot anti-spam */}
          <input
            type="text"
            aria-hidden="true"
            tabIndex={-1}
            autoComplete="off"
            className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
            {...form.register("website")}
          />

          <label className="mt-5 flex items-start gap-3 text-[13.5px] text-tinta-soft">
            <input
              type="checkbox"
              className="mt-0.5 h-4.5 w-4.5 shrink-0 rounded accent-malva"
              {...form.register("consent", { required: "É necessário aceitar para continuar" })}
            />
            <span>
              Aceito a{" "}
              <Link href="/politica-de-privacidade" target="_blank" className="text-malva underline underline-offset-2">
                política de privacidade
              </Link>{" "}
              e o uso dos meus dados apenas para esta marcação. *
              {form.formState.errors.consent && <span className="block mt-1 text-[12.5px] text-rose-600">{form.formState.errors.consent.message}</span>}
            </span>
          </label>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-bordo px-8 py-3.5 text-[15px] font-medium text-creme shadow-sm transition hover:bg-bordo-dark disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Check className="h-4.5 w-4.5" />}
              Confirmar pedido
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-malva hover:text-bordo"
            >
              <ArrowLeft className="h-4 w-4" /> Mudar a hora
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ── utilitários ───────────────────────────────────────────────────────────── */
function buildMonths(todayISO: string, maxDay: string, n: number): Array<{ year: number; month: number }> {
  const out: Array<{ year: number; month: number }> = [];
  let y = Number(todayISO.slice(0, 4));
  let m = Number(todayISO.slice(5, 7));
  const maxYear = Number(maxDay.slice(0, 4));
  const maxMonth = Number(maxDay.slice(5, 7));
  for (let i = 0; i < n; i++) {
    out.push({ year: y, month: m });
    if (y === maxYear && m >= maxMonth) break;
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

function humanDate(iso: string): string {
  const [y, mo, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d));
  const wd = (date.getUTCDay() + 6) % 7;
  const labels = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  return `${labels[wd]}, ${d} de ${MONTH_LABELS[mo - 1].toLowerCase()} de ${y}`;
}