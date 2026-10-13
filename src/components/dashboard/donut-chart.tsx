"use client";

import { Pie, PieChart, ResponsiveContainer, Cell } from "recharts";

export interface DonutDatum {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  /** Optional content rendered in the center (e.g. total + label). */
  centerLabel?: React.ReactNode;
  /** Outer diameter in px. */
  size?: number;
  /** Inner radius as percentage 0..1 of outer radius (default 0.7). */
  innerRatio?: number;
}

/**
 * Reusable donut chart (PieChart with innerRadius).
 * Uses recharts. Data items drive color via `color` field.
 */
export function DonutChart({
  data,
  centerLabel,
  size = 168,
  innerRatio = 0.72,
}: DonutChartProps) {
  const outer = size / 2;
  const inner = outer * innerRatio;

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label="Donut chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={inner}
            outerRadius={outer}
            startAngle={90}
            endAngle={-270}
            padding={0}
            stroke="none"
            isAnimationActive
          >
            {data.map((d, i) => (
              <Cell key={`cell-${i}`} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerLabel}
        </div>
      )}
    </div>
  );
}
