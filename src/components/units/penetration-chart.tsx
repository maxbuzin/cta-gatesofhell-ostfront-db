"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { EmptyState } from "@/components/units/empty-state";

export type PenPoint = {
  rangeM: number;
} & Record<string, number | undefined>;

export function PenetrationChart({
  data,
  series,
}: {
  data: PenPoint[];
  series: { key: string; label: string; color: string }[];
}) {
  if (data.length === 0 || series.length === 0) {
    return (
      <EmptyState
        title="No penetration data yet"
        description="Penetration vs distance will appear after ammo data is imported."
      />
    );
  }

  const config = Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: s.color }]),
  );

  return (
    <ChartContainer config={config} className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="rangeM"
            tick={{ fontSize: 12 }}
            label={{ value: "Distance (m)", position: "insideBottom", offset: -4 }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            label={{ value: "Penetration (mm)", angle: -90, position: "insideLeft" }}
          />
          <Tooltip content={<ChartTooltipContent />} />
          <Legend />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              name={s.label}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
