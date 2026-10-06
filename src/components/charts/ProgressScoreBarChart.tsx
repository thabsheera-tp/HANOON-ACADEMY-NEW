"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ProgressScoreBarChartProps {
  data?: { module: string; score: number }[];
}

const DEFAULT_SCORES = [
  { module: "W1 Quiz", score: 78 },
  { module: "W2 Hw", score: 85 },
  { module: "W3 Oral", score: 92 },
  { module: "W4 Exam", score: 88 },
  { module: "W5 Review", score: 95 },
];

export default function ProgressScoreBarChart({
  data = DEFAULT_SCORES,
}: ProgressScoreBarChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-40 w-full flex items-center justify-center bg-purple-50/40 rounded-2xl animate-pulse" />
    );
  }

  const averageScore = Math.round(
    data.reduce((acc, curr) => acc + curr.score, 0) / data.length
  );

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-700">Assessment Scores</span>
        <span className="text-[11px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
          Avg: {averageScore}%
        </span>
      </div>

      <div className="w-full h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
          >
            <XAxis
              dataKey="module"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
            />
            <YAxis
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: "#94a3b8" }}
              ticks={[0, 50, 100]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0];
                  return (
                    <div className="bg-white px-3 py-1.5 rounded-xl border border-purple-100 shadow-md text-[11px] font-bold text-slate-800">
                      <span className="text-purple-600">{item.payload.module}: </span>
                      <span>{item.value}% Score</span>
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ fill: "rgba(243, 232, 255, 0.4)" }}
            />
            <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={28}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.score >= 90 ? "#9333ea" : "#c084fc"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
