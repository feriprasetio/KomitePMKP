"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TrendDatum {
  month: string; // "Jan"
  done: number;
  created: number;
}

interface TrendAreaChartProps {
  data: TrendDatum[];
  className?: string;
}

/**
 * Stacked area chart showing monthly document creation vs completion trend.
 * Useful for spotting whether the team is keeping up with the workload.
 */
export function TrendAreaChart({ data, className }: TrendAreaChartProps) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 16, left: -16, bottom: 0 }}
        >
          <defs>
            <linearGradient id="g-created" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="g-done" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.55} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e8eaf3"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#6b7390" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7390" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #e8eaf3",
              borderRadius: 12,
              fontSize: 12,
              boxShadow: "0 8px 24px -8px rgba(16,24,40,0.12)",
            }}
            labelStyle={{ fontWeight: 700, color: "#1a1f3a" }}
            formatter={(value: any, name: string) => [
              `${value} dok`,
              name === "created" ? "Dibuat" : "Selesai",
            ]}
          />
          <Area
            type="monotone"
            dataKey="created"
            stroke="#38bdf8"
            strokeWidth={2}
            fill="url(#g-created)"
            name="created"
          />
          <Area
            type="monotone"
            dataKey="done"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#g-done)"
            name="done"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
