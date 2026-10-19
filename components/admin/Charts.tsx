"use client";

// Gráficos do dashboard (Recharts) — apenas cliente.

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export function BookingsBar({
  data,
  monthly = false,
}: {
  data: Array<{ label: string; total: number; cancelled?: number }>;
  monthly?: boolean;
}) {
  const hasCancel = data.some((d) => (d.cancelled ?? 0) > 0);
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }} barCategoryGap={monthly ? 12 : 4}>
          <CartesianGrid stroke="#f2e5e8" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10.5, fill: "#6b5560" }}
            interval={monthly ? 0 : Math.max(0, Math.floor(data.length / 10) - 1)}
            tickLine={false}
            axisLine={{ stroke: "#f2e5e8" }}
          />
          <YAxis tick={{ fontSize: 10.5, fill: "#6b5560" }} allowDecimals={false} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "#f8f0f3" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #f2e5e8", fontSize: 12.5 }}
          />
          <Bar dataKey="total" name="Marcações" fill="#a94c80" radius={[5, 5, 0, 0]} maxBarSize={28} />
          {hasCancel && <Bar dataKey="cancelled" name="Canceladas" fill="#d9a9c6" radius={[5, 5, 0, 0]} maxBarSize={28} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}