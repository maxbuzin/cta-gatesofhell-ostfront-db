"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

export function FactionChart({
  data,
}: {
  data: { typeCode: string; typeName: string; count: number }[];
}) {
  // ChartStyle allowlists /^u[0-9]+$/ — keep config key and dataKey aligned.
  const config = {
    u0: { label: "Units", color: "#5f6e47" },
  };
  const chartData = data.map((d) => ({
    typeName: d.typeName,
    u0: d.count,
  }));

  return (
    <ChartContainer config={config} className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="typeName"
            tick={{ fontSize: 11 }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis allowDecimals={false} />
          <Tooltip content={<ChartTooltipContent />} />
          <Bar dataKey="u0" fill="var(--color-u0)" radius={2} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
