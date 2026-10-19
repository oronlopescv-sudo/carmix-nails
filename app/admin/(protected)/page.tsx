// Dashboard: indicadores reais do negócio.

import Link from "next/link";
import {
  CalendarDays,
  UserRoundCheck,
  CircleDollarSign,
  TrendingDown,
  TriangleAlert,
  Scissors,
} from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { wallNow, wallToUtc, dayISO, addDaysParts, minutesToHM, utcToWall } from "@/lib/tz";
import { formatPrice } from "@/lib/pricing";
import { STATUS_LABELS, STATUS_COLORS, WEEKDAY_SHORT } from "@/lib/constants";
import { BookingsBar } from "@/components/admin/Charts";

function Stat({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: React.ElementType }) {
  return (
    <div className="rounded-2xl bg-creme p-5 shadow-sm ring-1 ring-nude">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] font-medium uppercase tracking-wide text-tinta-soft">{label}</p>
        <Icon className="h-4.5 w-4.5 text-malva-soft" />
      </div>
      <p className="mt-2 font-display text-2xl text-bordo">{value}</p>
      {sub && <p className="mt-0.5 text-[12.5px] text-tinta-soft">{sub}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const s = await getSettings();
  const now = new Date();
  const today = wallNow(s.timezone);
  const fromUTC = wallToUtc(today, 0, 0, s.timezone);
  const toUTC = wallToUtc(addDaysParts(today, 1), 0, 0, s.timezone);
  const next14UTC = wallToUtc(addDaysParts(today, 15), 0, 0, s.timezone);
  const start30 = wallToUtc(addDaysParts(today, -30), 0, 0, s.timezone);
  const start90 = wallToUtc(addDaysParts(today, -90), 0, 0, s.timezone);

  const [todayAppts, upcoming, pendingCount, customersTotal, topServices, cancel30, total30, revenueRows, range30, range6m] = await Promise.all([
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
      take: 8,
      include: { service: { select: { name: true } }, customer: { select: { name: true } } },
    }),
    db.appointment.count({ where: { status: "PENDING", startAt: { gte: now } } }),
    db.customer.count(),
    db.appointment.groupBy({
      by: ["serviceId"],
      where: { startAt: { gte: start90 } },
      _count: { _all: true },
    }).then((rows) =>
      Promise.all(
        rows.map(async (r) => {
          const svc = await db.service.findUnique({ where: { id: r.serviceId }, select: { name: true } });
          const anyDate = await db.appointment.findFirst({
            where: { serviceId: r.serviceId, startAt: { gte: start90 } },
            select: { priceAtBooking: true },
          });
          return { name: svc?.name ?? "(serviço removido)", count: r._count._all, price: anyDate?.priceAtBooking ?? 0 };
        }),
      ).then((rows) => rows.sort((a, b) => b.count - a.count).slice(0, 5)),
    ),
    db.appointment.count({ where: { status: "CANCELLED", startAt: { gte: start30, lt: toUTC } } }),
    db.appointment.count({ where: { startAt: { gte: start30, lt: toUTC } } }),
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
    const now2 = new Date();
    const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now2.getUTCFullYear(), now2.getUTCMonth() - i, 1));
      const key = d.toISOString().slice(0, 7);
      perMonthData.push({ label: MONTHS[d.getUTCMonth()], total: perMonth.get(key)?.total ?? 0, cancelled: perMonth.get(key)?.cancelled ?? 0 });
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-bordo">Dashboard</h1>
      <p className="mt-1 text-[14px] text-tinta-soft">
        Hoje: {String(today.day).padStart(2, "0")}/{String(today.month).padStart(2, "0")}/{today.year} · fuso {s.timezone}
      </p>

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

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Hoje" value={String(todayAppts.length)} sub={todayAppts.length ? "marcações agendadas" : "sem marcações"} icon={CalendarDays} />
        <Stat label="Clientes" value={String(customersTotal)} sub="registados automaticamente" icon={UserRoundCheck} />
        <Stat label="Receita registada" value={formatPrice(revenue90, s.currency)} sub="concluídos, últimos 90 dias (estimativa)" icon={CircleDollarSign} />
        <Stat label="Taxa de cancelamento" value={`${cancelRate}%`} sub="últimos 30 dias" icon={TrendingDown} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
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

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl bg-creme p-5 shadow-sm ring-1 ring-nude lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-bordo">Próximas marcações</h2>
            <Link href="/admin/agendamentos" className="text-[13px] font-medium text-malva hover:text-bordo">ver todas →</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-4 text-[14px] text-tinta-soft">Sem marcações nos próximos 14 dias.</p>
          ) : (
            <ul className="mt-4 divide-y divide-nude">
              {upcoming.map((a) => {
                const w = utcToWall(a.startAt, s.timezone);
                const iso = dayISO(w);
                const local = new Date(`${iso}T12:00:00Z`);
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-[14px]">
                    <span className="w-24 shrink-0 tabular-nums text-tinta-soft">
                      {WEEKDAY_SHORT[(local.getUTCDay() + 6) % 7]} {String(w.day).padStart(2, "0")}/{String(w.month).padStart(2, "0")} · {String(w.hour).padStart(2, "0")}:{String(w.minute).padStart(2, "0")}
                    </span>
                    <span className="font-medium text-tinta">{a.customer.name}</span>
                    <span className="text-tinta-soft">{a.service.name}</span>
                    <span className={`ml-auto rounded-full border px-2.5 py-0.5 text-[11.5px] ${STATUS_COLORS[a.status]}`}>{STATUS_LABELS[a.status]}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-creme p-5 shadow-sm ring-1 ring-nude">
          <h2 className="flex items-center gap-2 font-display text-xl text-bordo"><Scissors className="h-4.5 w-4.5 text-malva-soft" /> Serviços populares</h2>
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
        </section>
      </div>

      <section className="mt-8 rounded-2xl bg-creme p-5 shadow-sm ring-1 ring-nude">
        <h2 className="font-display text-xl text-bordo">Marcações de hoje</h2>
        {todayAppts.length === 0 ? (
          <p className="mt-4 text-[14px] text-tinta-soft">Nenhuma marcação para hoje.</p>
        ) : (
          <ul className="mt-4 divide-y divide-nude">
            {todayAppts.map((a) => {
              const w = utcToWall(a.startAt, s.timezone);
              const endTime = minutesToHM(Math.min(1439, w.hour * 60 + w.minute + 90));
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-[14px]">
                  <span className="w-28 shrink-0 tabular-nums font-medium text-tinta">
                    {String(w.hour).padStart(2, "0")}:{String(w.minute).padStart(2, "0")}–{endTime}
                  </span>
                  <span className="font-medium text-tinta">{a.customer.name}</span>
                  <span className="inline-flex items-center gap-2 text-tinta-soft">{a.service.name} · {a.professional.name}</span>
                  <span className={`ml-auto rounded-full border px-2.5 py-0.5 text-[11.5px] ${STATUS_COLORS[a.status]}`}>{STATUS_LABELS[a.status]}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}