// Grelha de horas (vista dia/semana) com blocos coloridos por estado.
// Componente de servidor: só posiciona os blocos; as ações continuam na lista abaixo.

import { utcToWall, dayISO, weekdayOfDay, type DayParts } from "@/lib/tz";
import { STATUS_LABELS, WEEKDAY_SHORT_MON } from "@/lib/constants";
import { cx } from "@/lib/utils";

export type GridAppt = {
  id: string;
  startAt: Date;
  endAt: Date;
  status: string;
  serviceName: string;
  customerName: string;
  professionalName: string;
};

const START_H = 8;
const END_H = 20;
const HOUR_PX = 60;

const BLOCK_STYLE: Record<string, string> = {
  CONFIRMED: "bg-malva text-creme",
  PENDING: "bg-amber-200 text-amber-950 ring-1 ring-amber-400/60",
  COMPLETED: "bg-sky-500 text-white",
  CANCELLED: "bg-stone-200 text-stone-500 line-through",
  NO_SHOW: "bg-stone-500 text-white",
};

const pad = (n: number) => String(n).padStart(2, "0");
const hm = (h: number, m: number) => `${pad(h)}:${pad(m)}`;

export function AgendaGrid({
  days,
  appts,
  timezone,
  todayISO,
}: {
  days: DayParts[];
  appts: GridAppt[];
  timezone: string;
  todayISO: string;
}) {
  const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
  const totalPx = hours.length * HOUR_PX;
  const gridCols = `56px repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className="rounded-2xl bg-creme ring-1 ring-nude">
      <div className="overflow-x-auto">
        <div className="grid min-w-[560px]" style={{ gridTemplateColumns: gridCols }}>
          <div className="border-b border-nude" />
          {days.map((d) => {
            const iso = dayISO(d);
            const wdMon = (weekdayOfDay(d) + 6) % 7;
            return (
              <div
                key={iso}
                className={cx("border-b border-l border-nude px-2 py-2.5 text-center", iso === todayISO && "bg-nude")}
              >
                <span className="block text-[12.5px] text-tinta-soft">{WEEKDAY_SHORT_MON[wdMon]}</span>
                <span className={cx("text-[13.5px] font-medium", iso === todayISO ? "text-bordo" : "text-tinta")}>
                  {pad(d.day)}/{pad(d.month)}
                </span>
              </div>
            );
          })}

          <div className="relative" style={{ height: totalPx }}>
            {hours.map((h) => (
              <span
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[11.5px] tabular-nums text-tinta-soft"
                style={{ top: (h - START_H) * HOUR_PX }}
              >
                {hm(h, 0)}
              </span>
            ))}
          </div>

          {days.map((d) => {
            const iso = dayISO(d);
            const items = appts.filter((a) => dayISO(utcToWall(a.startAt, timezone)) === iso);
            return (
              <div
                key={iso}
                className={cx("relative border-l border-nude", iso === todayISO && "bg-nude/40")}
                style={{ height: totalPx }}
              >
                {hours.map((h) => (
                  <div key={h} className="absolute inset-x-0 border-t border-nude" style={{ top: (h - START_H) * HOUR_PX }} />
                ))}
                {items.map((a) => {
                  const s = utcToWall(a.startAt, timezone);
                  const e = utcToWall(a.endAt, timezone);
                  const startMin = s.hour * 60 + s.minute;
                  const endMin = e.hour * 60 + e.minute;
                  const top = Math.max(0, startMin - START_H * 60) / 60 * HOUR_PX;
                  const bottom = Math.min(END_H * 60, endMin) - START_H * 60;
                  const height = Math.max(bottom - Math.max(0, startMin - START_H * 60), 30) / 60 * HOUR_PX;
                  return (
                    <div
                      key={a.id}
                      className={cx(
                        "absolute inset-x-1 overflow-hidden rounded-lg px-2 py-1.5 text-[12px] leading-tight shadow-sm",
                        BLOCK_STYLE[a.status] ?? BLOCK_STYLE.PENDING,
                      )}
                      style={{ top, height: height - 3 }}
                      title={`${a.customerName} · ${a.serviceName} · ${a.professionalName}`}
                    >
                      <p className="truncate font-semibold">{a.customerName}</p>
                      <p className="truncate opacity-90">{a.serviceName}</p>
                      <p className="tabular-nums opacity-80">
                        {hm(s.hour, s.minute)} – {hm(e.hour, e.minute)}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 border-t border-nude px-4 py-3 text-[12.5px] text-tinta-soft">
        {(["CONFIRMED", "PENDING", "COMPLETED", "CANCELLED", "NO_SHOW"] as const).map((st) => (
          <span key={st} className="inline-flex items-center gap-2">
            <span className={cx("h-3 w-3 rounded-sm", BLOCK_STYLE[st])} /> {STATUS_LABELS[st]}
          </span>
        ))}
      </div>
    </div>
  );
}
