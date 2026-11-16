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
          <CartesianGrid stroke="#f1e4f4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10.5, fill: "#6e5f75" }}
            interval={monthly ? 0 : Math.max(0, Math.floor(data.length / 10) - 1)}
            tickLine={false}
            axisLine={{ stroke: "#f1e4f4" }}
          />
          <YAxis tick={{ fontSize: 10.5, fill: "#6e5f75" }} allowDecimals={false} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "#faf4fb" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #f1e4f4", fontSize: 12.5 }}
          />
          <Bar dataKey="total" name="Marcações" fill="#b0489b" radius={[5, 5, 0, 0]} maxBarSize={28} />
          {hasCancel && <Bar dataKey="cancelled" name="Canceladas" fill="#ddb3da" radius={[5, 5, 0, 0]} maxBarSize={28} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}