"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
} from "recharts";
import { cn } from "@/lib/utils";

export interface StandardBarDatum {
  code: string; // "PMKP 1"
  title: string;
  color: string; // hex
  pct: number; // 0..100
  total?: number;
  done?: number;
}

interface StandardBarChartProps {
  data: StandardBarDatum[];
  className?: string;
}

/**
 * Horizontal bar chart for "Progress per Standar PMKP".
 * Each bar is colored with the standard's own accent color.
 * Shows percentage label at the right end of each bar.
 */
export function StandardBarChart({ data, className }: StandardBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-slate-400">
        Tidak ada data standar
      </div>
    );
  }
  const chartHeight = Math.max(360, data.length * 40 + 8);

  return (
    <div className={cn("w-full relative", className)} style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 56, bottom: 4, left: 0 }}
          barCategoryGap={10}
        >
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="code"
            width={80}
            tick={{ fontSize: 12, fontWeight: 600, fill: "#1a1f3a" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.05)" }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const d = payload[0].payload as StandardBarDatum;
              return (
                <div className="bg-white border border-[#e8eaf3] rounded-xl px-3 py-2 shadow-md text-xs">
                  <div className="font-bold">{d.code}</div>
                  <div className="text-slate-500 max-w-[220px] truncate">
                    {d.title}
                  </div>
                  <div className="font-semibold mt-1" style={{ color: d.color }}>
                    {d.pct}% selesai · {d.done ?? 0}/{d.total ?? 0} doks
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="pct" radius={[6, 6, 6, 6]} barSize={22} isAnimationActive={false} >
            {data.map((d, i) => (
              <Cell key={`bar-${i}`} fill={d.color} />
            ))}
            <LabelList
              dataKey="pct"
              position="right"
              formatter={(v: any) => `${v}%`}
              style={{ fontSize: 12, fontWeight: 700, fill: "#1a1f3a" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
