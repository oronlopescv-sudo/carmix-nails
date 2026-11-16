// Dashboard: indicadores reais do negócio, no layout do desenho.

import Link from "next/link";
import { CalendarDays, Users, CircleDollarSign, TrendingDown, TriangleAlert, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { wallNow, wallToUtc, dayISO, addDaysParts, utcToWall, minutesToHM } from "@/lib/tz";
import { formatPrice } from "@/lib/pricing";
import { STATUS_LABELS, STATUS_COLORS, WEEKDAY_SHORT_MON } from "@/lib/constants";
import { BookingsBar } from "@/components/admin/Charts";
import { AgendaGrid } from "@/components/admin/AgendaGrid";
import { cx } from "@/lib/utils";

const ACTIVE = ["PENDING", "CONFIRMED", "COMPLETED"];

function Trend({ cur, prev }: { cur: number; prev: number }) {
  if (prev === 0 && cur === 0) return <span className="text-[12px] text-tinta-soft">sem dados</span>;
  if (prev === 0) return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[12px] font-medium text-emerald-700">↑ novo</span>;
  const pct = Math.round(((cur - prev) / prev) * 100);
  const up = pct >= 0;
  return (
    <span className={cx("rounded-full px-2 py-0.5 text-[12px] font-medium", up ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600")}>
      {up ? "↑" : "↓"} {Math.abs(pct)}%
    </span>
  );
}

function StatCard({ label, value, cur, prev, icon: Icon }: { label: string; value: string; cur?: number; prev?: number; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-creme p-5 shadow-sm ring-1 ring-nude">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-bordo text-creme shadow-md">
        <Icon className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13.5px] text-tinta-soft">{label}</p>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <p className="font-display text-2xl text-tinta">{value}</p>
          {cur !== undefined && prev !== undefined && <Trend cur={cur} prev={prev} />}
        </div>
      </div>
    </div>
  );
}

function MiniMonth({
  year,
  month,
  todayISO,
  counts,
}: {
  year: number;
  month: number;
  todayISO: string;
  counts: Map<string, number>;
}) {
  const startWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<number | null> = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  return (
    <div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[11.5px] text-tinta-soft">
        {WEEKDAY_SHORT_MON.map((d) => (
          <span key={d} className="py-1">{d.charAt(0)}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[13px]">
        {cells.map((d, i) => {
          if (d === null) return <span key={i} />;
          const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const isToday = iso === todayISO;
          const has = (counts.get(iso) ?? 0) > 0;
          return (
            <span key={i} className="flex flex-col items-center">
              <span
                className={cx(
                  "grid h-8 w-8 place-items-center rounded-full",
                  isToday ? "bg-malva font-semibold text-creme" : "text-tinta",
                )}
              >
                {d}
              </span>
              <span className={cx("mt-0.5 h-1 w-1 rounded-full", has ? "bg-malva" : "bg-transparent")} />
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const s = await getSettings();
  const now = new Date();
  const today = wallNow(s.timezone);
  const todayISO = dayISO(today);
  const fromUTC = wallToUtc(today, 0, 0, s.timezone);
  const toUTC = wallToUtc(addDaysParts(today, 1), 0, 0, s.timezone);
  const next14UTC = wallToUtc(addDaysParts(today, 15), 0, 0, s.timezone);
  const start30 = wallToUtc(addDaysParts(today, -30), 0, 0, s.timezone);
  const start60 = wallToUtc(addDaysParts(today, -60), 0, 0, s.timezone);
  const start90 = wallToUtc(addDaysParts(today, -90), 0, 0, s.timezone);
  const monthStart = wallToUtc({ year: today.year, month: today.month, day: 1 }, 0, 0, s.timezone);
  const monthEnd = wallToUtc(
    addDaysParts({ year: today.year, month: today.month, day: new Date(Date.UTC(today.year, today.month, 0)).getUTCDate() }, 1),
    0,
    0,
    s.timezone,
  );

  const [
    todayAppts,
    upcoming,
    pendingCount,
    customersTotal,
    topServices,
    cancel30,
    total30,
    total30Prev,
    completed30,
    completed30Prev,
    revenueRows,
    range30,
    range6m,
    monthAppts,
    professionals,
    proCounts,
  ] = await Promise.all([
    db.appointment.findMany({
      where: { startAt: { gte: fromUTC, lt: toUTC } },
      orderBy: { startAt: "asc" },
      include: {
        service: { select: { name: true } },
        professional: { select: { name: true } },
        customer: { select: { name: true, phone: true } },
      },
    }),
    db.appointment.findMany({
      where: { startAt: { gte: toUTC, lt: next14UTC }, status: { in: ["PENDING", "CONFIRMED"] } },
      orderBy: { startAt: "asc" },
      take: 6,
      include: { service: { select: { name: true } }, customer: { select: { name: true } } },
    }),
    db.appointment.count({ where: { status: "PENDING", startAt: { gte: now } } }),
    db.customer.count(),
    db.appointment.groupBy({
      by: ["serviceId"],
      where: { startAt: { gte: start90 }, status: { in: ACTIVE as never } },
      _count: { _all: true },
    }).then((rows) =>
      Promise.all(
        rows.map(async (r) => {
          const svc = await db.service.findUnique({ where: { id: r.serviceId }, select: { name: true } });
          return { name: svc?.name ?? "(serviço removido)", count: r._count._all };
        }),
      ).then((list) => list.sort((a, b) => b.count - a.count).slice(0, 5)),
    ),
    db.appointment.count({ where: { status: "CANCELLED", startAt: { gte: start30, lt: toUTC } } }),
    db.appointment.count({ where: { startAt: { gte: start30, lt: toUTC } } }),
    db.appointment.count({ where: { startAt: { gte: start60, lt: start30 } } }),
    db.appointment.count({ where: { status: "COMPLETED", startAt: { gte: start30, lt: toUTC } } }),
    db.appointment.count({ where: { status: "COMPLETED", startAt: { gte: start60, lt: start30 } } }),
    db.appointment.findMany({
      where: { status: "COMPLETED", startAt: { gte: start90, lt: toUTC } },
      select: { priceAtBooking: true, startAt: true },
    }),
    db.appointment.findMany({
      where: { startAt: { gte: start30, lt: toUTC } },
      select: { startAt: true, status: true },
      orderBy: { startAt: "asc" },
    }),
    db.appointment.findMany({
      where: { startAt: { gte: wallToUtc(addDaysParts(today, -6 * 31), 0, 0, s.timezone), lt: toUTC } },
      select: { startAt: true, status: true },
    }),
    db.appointment.findMany({
      where: { startAt: { gte: monthStart, lt: monthEnd } },
      select: { startAt: true },
    }),
    db.professional.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      take: 4,
      select: { id: true, name: true, title: true },
    }),
    db.appointment.groupBy({
      by: ["professionalId"],
      where: { startAt: { gte: start30, lt: toUTC }, status: { in: ACTIVE as never } },
      _count: { _all: true },
    }),
  ]);

  const revenue90 = revenueRows.reduce((sum, a) => sum + a.priceAtBooking, 0);
  const cancelRate = total30 > 0 ? Math.round((cancel30 / total30) * 100) : 0;

  // gráfico por dia (30 dias)
  const perDay = new Map<string, { total: number; cancelled: number }>();
  for (const a of range30) {
    const iso = dayISO(utcToWall(a.startAt, s.timezone));
    const cur = perDay.get(iso) ?? { total: 0, cancelled: 0 };
    cur.total += 1;
    if (a.status === "CANCELLED") cur.cancelled += 1;
    perDay.set(iso, cur);
  }
  const perDayData = [];
  for (let i = 30; i >= 1; i--) {
    const d = addDaysParts(today, -i);
    const v = perDay.get(dayISO(d)) ?? { total: 0, cancelled: 0 };
    perDayData.push({ label: `${d.day}/${d.month}`, total: v.total, cancelled: v.cancelled });
  }

  // por mês (6 meses)
  const perMonth = new Map<string, { total: number; cancelled: number }>();
  for (const a of range6m) {
    const key = a.startAt.toISOString().slice(0, 7);
    const cur = perMonth.get(key) ?? { total: 0, cancelled: 0 };
    cur.total += 1;
    if (a.status === "CANCELLED") cur.cancelled += 1;
    perMonth.set(key, cur);
  }
  const perMonthData: Array<{ label: string; total: number; cancelled: number }> = [];
  {
    const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = d.toISOString().slice(0, 7);
      perMonthData.push({ label: MONTHS[d.getUTCMonth()], total: perMonth.get(key)?.total ?? 0, cancelled: perMonth.get(key)?.cancelled ?? 0 });
    }
  }

  // mini calendário: nº de marcações por dia do mês atual
  const monthCounts = new Map<string, number>();
  for (const a of monthAppts) {
    const iso = dayISO(utcToWall(a.startAt, s.timezone));
    monthCounts.set(iso, (monthCounts.get(iso) ?? 0) + 1);
  }

  const proCountMap = new Map<string, number>(proCounts.map((r) => [r.professionalId, Number(r._count._all)]));
  const maxPro = Math.max(1, ...proCounts.map((r) => Number(r._count._all)));

  const gridAppts = todayAppts.map((a) => ({
    id: a.id,
    startAt: a.startAt,
    endAt: a.endAt,
    status: a.status,
    serviceName: a.service.name,
    customerName: a.customer.name,
    professionalName: a.professional.name,
  }));

  const MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-bordo">Dashboard</h1>
          <p className="mt-1 text-[14px] text-tinta-soft">
            {String(today.day).padStart(2, "0")}/{String(today.month).padStart(2, "0")}/{today.year} · fuso {s.timezone}
          </p>
        </div>
        <Link
          href="/admin/agendamentos"
          className="inline-flex items-center gap-2 rounded-full bg-malva px-5 py-2.5 text-[14px] font-medium text-creme shadow-sm transition hover:bg-bordo"
        >
          Ver agenda <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {s.bookingEnabled === false && (
        <p className="mt-5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-800">
          <TriangleAlert className="h-4 w-4" /> O agendamento online está desativado nas configurações.
        </p>
      )}

      {pendingCount > 0 && (
        <Link
          href="/admin/agendamentos?status=PENDING"
          className="mt-5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] font-medium text-amber-800 transition hover:bg-amber-100"
        >
          <TriangleAlert className="h-4 w-4" />
          {pendingCount} pedido(s) pendente(s) à espera de confirmação →
        </Link>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total de clientes" value={String(customersTotal)} icon={Users} />
        <StatCard label="Marcações (30 dias)" value={String(total30)} cur={total30} prev={total30Prev} icon={CalendarDays} />
        <StatCard label="Atendimentos concluídos (30 dias)" value={String(completed30)} cur={completed30} prev={completed30Prev} icon={CircleDollarSign} />
        <StatCard label="Taxa de cancelamento (30 dias)" value={`${cancelRate}%`} icon={TrendingDown} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        {/* esquerda: agenda do dia + gráficos */}
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl text-bordo">Agenda de hoje</h2>
              <span className="text-[12.5px] text-tinta-soft">{todayAppts.length} marcação(ões)</span>
            </div>
            <AgendaGrid days={[today]} appts={gridAppts} timezone={s.timezone} todayISO={todayISO} />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl bg-creme p-5 shadow-sm ring-1 ring-nude">
              <h2 className="font-display text-xl text-bordo">Marcações por dia</h2>
              <p className="text-[12.5px] text-tinta-soft">últimas 4 semanas</p>
              <div className="mt-4">
                <BookingsBar data={perDayData} />
              </div>
            </section>
            <section className="rounded-2xl bg-creme p-5 shadow-sm ring-1 ring-nude">
              <h2 className="font-display text-xl text-bordo">Marcações por mês</h2>
              <p className="text-[12.5px] text-tinta-soft">últimos 6 meses</p>
              <div className="mt-4">
                <BookingsBar data={perMonthData} monthly />
              </div>
            </section>
          </div>
        </div>

        {/* direita: calendário, próximas marcações, estilistas, serviços */}
        <div className="space-y-6">
          <section className="rounded-2xl bg-creme p-5 shadow-sm ring-1 ring-nude">
            <h2 className="font-display text-xl text-bordo">
              Calendário
            </h2>
            <p className="text-[12.5px] text-tinta-soft">
              {MONTHS_PT[today.month - 1]} {today.year}
            </p>
            <div className="mt-4">
              <MiniMonth year={today.year} month={today.month} todayISO={todayISO} counts={monthCounts} />
            </div>
          </section>

          <section className="rounded-2xl bg-creme p-5 shadow-sm ring-1 ring-nude">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-bordo">Próximas marcações</h2>
              <Link href="/admin/agendamentos" className="text-[13px] font-medium text-malva hover:text-bordo">ver todas →</Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="mt-4 text-[14px] text-tinta-soft">Sem marcações nos próximos 14 dias.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {upcoming.map((a) => {
                  const w = utcToWall(a.startAt, s.timezone);
                  const local = new Date(`${dayISO(w)}T12:00:00Z`);
                  const initials = a.customer.name.split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
                  return (
                    <li key={a.id} className="flex items-center gap-3 rounded-xl bg-casca p-3 ring-1 ring-nude">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-malva-soft text-[13px] font-semibold text-bordo">{initials}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-tinta">{a.customer.name}</p>
                        <p className="truncate text-[12.5px] text-tinta-soft">
                          {a.service.name} · {WEEKDAY_SHORT_MON[(local.getUTCDay() + 6) % 7]} {String(w.hour).padStart(2, "0")}:{String(w.minute).padStart(2, "0")}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${STATUS_COLORS[a.status]}`}>{STATUS_LABELS[a.status]}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-2xl bg-creme p-5 shadow-sm ring-1 ring-nude">
            <h2 className="font-display text-xl text-bordo">Profissionais (30 dias)</h2>
            {professionals.length === 0 ? (
              <p className="mt-4 text-[14px] text-tinta-soft">Sem profissionais ativas.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {professionals.map((p) => {
                  const n = proCountMap.get(p.id) ?? 0;
                  return (
                    <li key={p.id}>
                      <div className="flex items-baseline justify-between text-[14px]">
                        <span className="font-medium text-tinta">{p.name}</span>
                        <span className="text-bordo">{n}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-nude">
                        <div className="h-full rounded-full bg-malva" style={{ width: `${Math.round((n / maxPro) * 100)}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-2xl bg-creme p-5 shadow-sm ring-1 ring-nude">
            <h2 className="font-display text-xl text-bordo">Serviços populares</h2>
            <p className="text-[12.5px] text-tinta-soft">últimos 90 dias</p>
            {topServices.length === 0 ? (
              <p className="mt-4 text-[14px] text-tinta-soft">Sem dados ainda.</p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {topServices.map((r) => (
                  <li key={r.name} className="flex items-baseline justify-between gap-3 text-[14px]">
                    <span className="truncate text-tinta">{r.name}</span>
                    <span className="font-medium text-bordo">{r.count}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-5 text-[12.5px] text-tinta-soft">
              Receita registada (concluídos, 90 dias, estimativa): <span className="font-medium text-tinta">{formatPrice(revenue90, s.currency)}</span>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
