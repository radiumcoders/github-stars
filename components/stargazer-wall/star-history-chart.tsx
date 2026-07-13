"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import type { Stargazer } from "@/lib/types";
import { buildStarHistoryPoints } from "@/lib/stargazers";

interface StarHistoryChartProps {
  stargazers: Stargazer[];
  totalStars: number;
  className?: string;
}

export function StarHistoryChart({ stargazers, totalStars, className }: StarHistoryChartProps) {
  const data = useMemo(() => {
    const points = buildStarHistoryPoints(stargazers);
    if (points.length === 0) return [];
    return points.map((p) => ({
      ...p,
      label: format(new Date(p.date), "MMM d"),
    }));
  }, [stargazers]);

  if (data.length < 2) return null;

  return (
    <div
      className={`rounded-lg border border-border bg-card p-4 ${className ?? ""}`}
      role="img"
      aria-label={`Star history chart showing growth to ${totalStars} stars`}
    >
      <p className="mb-3 font-mono text-xs tracking-wider text-muted-foreground uppercase">
        Star History
      </p>
      <div className="h-36 w-full sm:h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="starGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "#666", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#666", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: "#0a0a0a",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6,
                fontSize: 12,
                fontFamily: "var(--font-geist-mono)",
              }}
              labelStyle={{ color: "#ededed" }}
              formatter={(value) => [`${value} stars`, "Total"]}
            />
            <Area
              type="monotone"
              dataKey="stars"
              stroke="#ededed"
              strokeWidth={1.5}
              fill="url(#starGradient)"
              dot={false}
              activeDot={{ r: 3, fill: "#fff", stroke: "#666" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}