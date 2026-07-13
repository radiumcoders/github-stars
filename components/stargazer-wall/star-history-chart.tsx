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
      className={`rounded-2xl border border-white/8 bg-white/3 p-4 backdrop-blur-xl ${className ?? ""}`}
      role="img"
      aria-label={`Star history chart showing growth to ${totalStars} stars`}
    >
      <p className="mb-3 text-sm font-medium text-muted-foreground">Star History</p>
      <div className="h-36 w-full sm:h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="starGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "#a1a1aa", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#a1a1aa", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(24,24,27,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#e4e4e7" }}
              formatter={(value) => [`${value} stars`, "Total"]}
            />
            <Area
              type="monotone"
              dataKey="stars"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#starGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "#a78bfa", stroke: "#6366f1" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}