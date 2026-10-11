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
  const config = {
    u0: { label: "Units", color: "#5f6e47" },
  };

  return (
    <ChartContainer config={config} className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="typeName" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis allowDecimals={false} />
          <Tooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" fill="var(--primary)" radius={2} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
