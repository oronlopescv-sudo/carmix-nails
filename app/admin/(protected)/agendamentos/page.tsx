// Gestão de agendamentos: filtros + vista dia/semana/mês e ações no servidor.

import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { wallNow, wallToUtc, dayISO, addDaysParts, utcToWall, weekdayOfDay } from "@/lib/tz";
import { STATUS_LABELS, STATUS_COLORS, WEEKDAY_SHORT_MON } from "@/lib/constants";
import { formatPrice } from "@/lib/pricing";
import { AppointmentActions } from "@/components/admin/AppointmentActions";
import NewBookingDialog from "@/components/admin/NewBookingDialog";
import { cx } from "@/lib/utils";
import type { AppointmentRowData } from "@/types/admin";

type Params = { searchParams: Promise<{ view?: string; date?: string; status?: string; q?: string }> };

export default async function AgendamentosPage({ searchParams }: Params) {
  const sp = await searchParams;
  const s = await getSettings();
  const view = ["day", "week", "month"].includes(sp.view ?? "day") ? (sp.view ?? "day") : "day";
  const statusFilter = sp.status && ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].includes(sp.status) ? sp.status : null;
  const q = (sp.q ?? "").trim();

  const today = wallNow(s.timezone);
  const anchor =
    sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date)
      ? ({ year: +sp.date.slice(0, 4), month: +sp.date.slice(5, 7), day: +sp.date.slice(8, 10) } as { year: number; month: number; day: number })
      : today;

  let rangeStartDay = anchor;
  let rangeEndDay = anchor;
  if (view === "week") {
    const wd = weekdayOfDay(anchor);
    rangeStartDay = addDaysParts(anchor, wd === 0 ? -6 : -(wd - 1));
    rangeEndDay = addDaysParts(rangeStartDay, 6);
  } else if (view === "month") {
    rangeStartDay = { year: anchor.year, month: anchor.month, day: 1 };
    rangeEndDay = { year: anchor.year, month: anchor.month, day: new Date(Date.UTC(anchor.year, anchor.month, 0)).getUTCDate() };
  }

  const gte = wallToUtc(rangeStartDay, 0, 0, s.timezone);
  const lt = wallToUtc(addDaysParts(rangeEndDay, 1), 0, 0, s.timezone);

  const where: Record<string, unknown> = { startAt: { gte, lt } };
  if (statusFilter) where.status = statusFilter;
  const allForCounts = true;

  const appointments = await db.appointment.findMany({
    where,
    orderBy: [{ startAt: "asc" }],
    include: {
      service: { select: { name: true, durationMin: true } },
      professional: { select: { name: true } },
      customer: { select: { name: true, phone: true, email: true } },
    },
  });

  // pesquisa por nome/telefone/e-mail (aplicada depois da janela — conjunto pequeno)
  const filtered = q
    ? appointments.filter((a) =>
        [a.customer.name, a.customer.phone, a.customer.email ?? ""].some((f) => f.toLowerCase().includes(q.toLowerCase())),
      )
    : appointments;

  const statusCounts = await db.appointment.groupBy({ by: ["status"], where: { startAt: { gte, lt } }, _count: { _all: true } });
  void allForCounts;
  const countOf = (st: string) => statusCounts.find((r) => r.status === st)?._count._all ?? 0;

  // dados para a marcação manual (serviços ativos + profissionais ativos com links)
  const [dialogServices, dialogPros, dialogLinks] = await Promise.all([
    db.service.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, description: true, priceMin: true, priceMax: true, durationMin: true },
    }),
    db.professional.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, title: true },
    }),
    db.professionalService.findMany({ select: { professionalId: true, serviceId: true } }),
  ]);
  const serviceIdsByPro = new Map<string, string[]>();
  for (const l of dialogLinks) {
    const list = serviceIdsByPro.get(l.professionalId) ?? [];
    list.push(l.serviceId);
    serviceIdsByPro.set(l.professionalId, list);
  }
  const dialogProfessionals = dialogPros.map((p) => ({ ...p, serviceIds: serviceIdsByPro.get(p.id) ?? [], isActive: true }));

  const baseLink = (over: Record<string, string>) => {
    const params = new URLSearchParams({ view, date: dayISO(anchor) });
    if (statusFilter) params.set("status", statusFilter);
    if (q) params.set("q", q);
    for (const [k, v] of Object.entries(over)) params.set(k, v);
    return `/admin/agendamentos?${params.toString()}`;
  };

  const rows: Array<AppointmentRowData & { customerEmail: string | null }> = filtered.map((a) => ({
    id: a.id,
    reference: a.reference,
    customerName: a.customer.name,
    customerPhone: a.customer.phone,
    customerEmail: a.customer.email,
    service: a.service.name,
    professional: a.professional.name,
    serviceId: a.serviceId,
    professionalId: a.professionalId,
    startAtISO: a.startAt.toISOString(),
    endAtISO: a.endAt.toISOString(),
    status: a.status,
    priceAtBooking: a.priceAtBooking,
    notes: a.notes,
    cancelReason: a.cancelReason,
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-bordo">Agendamentos</h1>
          <p className="mt-1 text-[14px] text-tinta-soft">
            {viewLabel(view)} · {dayLabel(rangeStartDay, rangeEndDay)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={baseLink({ date: shiftISO(dayISO(anchor), view === "week" ? -7 : view === "day" ? -1 : -31) })} className="rounded-xl bg-creme px-3.5 py-2 text-[13.5px] ring-1 ring-nude transition hover:ring-malva-soft">← Anterior</Link>
          <Link href={baseLink({ date: dayISO(today) })} className="rounded-xl bg-creme px-3.5 py-2 text-[13.5px] ring-1 ring-nude transition hover:ring-malva-soft">Hoje</Link>
          <Link href={baseLink({ date: shiftISO(dayISO(anchor), view === "week" ? 7 : view === "day" ? 1 : 31) })} className="rounded-xl bg-creme px-3.5 py-2 text-[13.5px] ring-1 ring-nude transition hover:ring-malva-soft">Seguinte →</Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(["day", "week", "month"] as const).map((v) => (
          <Link
            key={v}
            href={baseLink({ view: v })}
            className={cx(
              "rounded-full px-4 py-2 text-[13.5px] transition",
              view === v ? "bg-bordo font-medium text-creme" : "bg-creme text-tinta-soft ring-1 ring-nude hover:text-bordo",
            )}
          >
            {viewLabel(v)}
          </Link>
        ))}
        <span className="mx-2 h-5 w-px bg-nude" />
        {(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const).map((st) => (
          <Link
            key={st}
            href={statusFilter === st ? baseLink({ status: "" }) : baseLink({ status: st })}
            className={cx(
              "rounded-full px-3.5 py-1.5 text-[12.5px] transition",
              statusFilter === st ? "bg-malva font-medium text-creme" : `bg-creme ring-1 ${STATUS_COLORS[st]} hover:opacity-80`,
            )}
          >
            {STATUS_LABELS[st]} {countOf(st) ? `(${countOf(st)})` : ""}
          </Link>
        ))}
      </div>

      <form className="mt-4 flex max-w-md gap-2" action="/admin/agendamentos" method="get">
        <input type="hidden" name="view" value={view} />
        <input type="search" name="q" defaultValue={q} placeholder="Nome, telefone ou e-mail…" className="field" />
        <button type="submit" className="shrink-0 rounded-xl bg-malva px-5 text-[14px] font-medium text-creme transition hover:opacity-90">Procurar</button>
      </form>

      <div className="mt-6">
        {q && filtered.length === 0 && (
          <p className="rounded-xl bg-creme p-4 text-[14px] text-tinta-soft ring-1 ring-nude">Sem resultados para “{q}” neste intervalo.</p>
        )}

        {view !== "month" && (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-2xl bg-creme p-5 ring-1 ring-nude">
                <AppointmentActions appt={r} timezone={s.timezone} currency={s.currency} brandName={s.brandName} />
              </div>
            ))}
            {filtered.length === 0 && !q && (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-creme p-5 ring-1 ring-nude">
                <p className="text-[14px] text-tinta-soft">
                  Nenhuma marcação neste período{statusFilter ? ` (${STATUS_LABELS[statusFilter]})` : ""}.
                </p>
                <NewBookingDialog services={dialogServices} professionals={dialogProfessionals} todayISO={dayISO(today)} />
              </div>
            )}
            {filtered.length > 0 && (
              <div className="flex justify-end">
                <NewBookingDialog services={dialogServices} professionals={dialogProfessionals} todayISO={dayISO(today)} />
              </div>
            )}
          </div>
        )}

        {view === "month" && (
          <div className="rounded-2xl bg-creme p-4 ring-1 ring-nude">
            <div className="grid grid-cols-7 gap-1 text-center text-[11.5px] font-medium text-tinta-soft">
              {WEEKDAY_SHORT_MON.map((d) => <span key={d}>{d}</span>)}
            </div>
            <MonthGrid
              anchorYear={rangeStartDay.year}
              anchorMonth={rangeStartDay.month}
              todayISO={dayISO(today)}
              appointments={filtered.map((a) => ({ id: a.id, iso: dayISO(utcToWall(a.startAt, s.timezone)), status: a.status }))}
              linkFor={(iso) => baseLink({ view: "day", date: iso })}
            />
            <div className="mt-4 flex justify-end">
              <NewBookingDialog services={dialogServices} professionals={dialogProfessionals} todayISO={dayISO(today)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── vista mensal ──────────────────────────────────────────────────────────── */
function MonthGrid({
  anchorYear,
  anchorMonth,
  todayISO,
  appointments,
  linkFor,
}: {
  anchorYear: number;
  anchorMonth: number;
  todayISO: string;
  appointments: Array<{ id: string; iso: string; status: string }>;
  linkFor: (iso: string) => string;
}) {
  const startWeekday = (new Date(Date.UTC(anchorYear, anchorMonth - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(anchorYear, anchorMonth, 0)).getUTCDate();
  const cells: Array<{ iso: string; day: number } | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ iso: `${anchorYear}-${String(anchorMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d });
  }
  const byISO = new Map<string, Array<{ id: string; status: string }>>();
  for (const a of appointments) {
    const list = byISO.get(a.iso) ?? [];
    list.push({ id: a.id, status: a.status });
    byISO.set(a.iso, list);
  }
  const dot = (st: string) =>
    st === "PENDING" ? "bg-amber-400" : st === "CONFIRMED" ? "bg-emerald-500" : st === "COMPLETED" ? "bg-sky-500" : st === "CANCELLED" ? "bg-rose-400" : "bg-stone-400";

  return (
    <div className="mt-2 grid grid-cols-7 gap-1">
      {cells.map((c, i) => {
        if (!c) return <span key={`e${i}`} />;
        const list = byISO.get(c.iso) ?? [];
        const isToday = c.iso === todayISO;
        return (
          <Link
            key={c.iso}
            href={linkFor(c.iso)}
            className={cx(
              "flex min-h-20 flex-col items-start gap-1 rounded-xl border p-2 transition hover:border-malva-soft",
              isToday ? "border-malva bg-nude" : "border-nude",
            )}
          >
            <span className={cx("text-[13px]", isToday && "font-bold text-bordo")}>{c.day}</span>
            <span className="flex h-2 w-full items-center gap-1">
              {list.slice(0, 6).map((l) => (
                <span key={l.id} className={cx("h-2 w-2 shrink-0 rounded-full", dot(l.status))} />
              ))}
            </span>
            {list.length > 0 && <span className="text-[10.5px] text-tinta-soft">{list.length} marcaç.</span>}
          </Link>
        );
      })}
    </div>
  );
}

/* ── utilitários ───────────────────────────────────────────────────────────── */
function viewLabel(v: string): string {
  return v === "day" ? "Vista diária" : v === "week" ? "Vista semanal" : "Vista mensal";
}

function dayLabel(a: { year: number; month: number; day: number }, b: { year: number; month: number; day: number }): string {
  const f = (d: { year: number; month: number; day: number }) => `${String(d.day).padStart(2, "0")}/${String(d.month).padStart(2, "0")}/${d.year}`;
  return f(a) === f(b) ? f(a) : `${f(a)} – ${f(b)}`;
}

function shiftISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}