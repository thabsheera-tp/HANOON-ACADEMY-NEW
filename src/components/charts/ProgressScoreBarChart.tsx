"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";

interface ProgressScoreBarChartProps {
  data?: { module: string; score: number }[];
  initialMode?: "bar" | "line";
  title?: string;
}

export default function ProgressScoreBarChart({
  data,
  initialMode = "bar",
  title = "Course Progress & Scores",
}: ProgressScoreBarChartProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [chartMode, setChartMode] = useState<"bar" | "line">(initialMode);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-40 w-full flex items-center justify-center bg-purple-50/40 rounded-2xl animate-pulse" />
    );
  }

  // Clean empty state if database has no assessment records for student
  if (!data || data.length === 0) {
    return (
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-800">{title}</span>
          <span className="text-[10px] font-bold text-slate-400 bg-purple-50/50 px-2 py-0.5 rounded-full border border-purple-100">
            No evaluations yet
          </span>
        </div>
        <div className="h-32 w-full flex flex-col items-center justify-center bg-purple-50/20 rounded-2xl border border-dashed border-purple-200 p-4 text-center space-y-1.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-400 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-xs font-bold text-slate-700">No assessment records yet</p>
          <p className="text-[10.5px] text-slate-400 max-w-[260px] leading-snug">
            Unit test scores, oral recitations, and progress evaluations will be plotted here once graded by faculty.
          </p>
        </div>
      </div>
    );
  }

  const activeData = data;
  const averageScore = Math.round(
    activeData.reduce((acc, curr) => acc + curr.score, 0) / activeData.length
  );

  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-slate-800">{title}</span>
          <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
            Avg: {averageScore}%
          </span>
        </div>

        {/* Minimalist Bar / Line Switcher */}
        <div className="flex items-center p-0.5 rounded-lg bg-purple-50 border border-purple-100 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setChartMode("bar")}
            className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
              chartMode === "bar"
                ? "bg-purple-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-purple-700"
            }`}
            title="Bar Chart"
          >
            <BarChart3 className="w-3 h-3" />
            <span>Bar</span>
          </button>
          <button
            type="button"
            onClick={() => setChartMode("line")}
            className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
              chartMode === "line"
                ? "bg-purple-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-purple-700"
            }`}
            title="Line Graph"
          >
            <TrendingUp className="w-3 h-3" />
            <span>Line</span>
          </button>
        </div>
      </div>

      <div className="w-full h-36">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === "bar" ? (
            <BarChart
              data={activeData}
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
                {activeData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.score >= 90 ? "#9333ea" : "#c084fc"}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <AreaChart
              data={activeData}
              margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
            >
              <defs>
                <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#9333ea" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="module"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
              />
              <YAxis
                domain={[50, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                ticks={[50, 75, 100]}
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
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#9333ea"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#scoreAreaGradient)"
                dot={{ r: 3, fill: "#9333ea", strokeWidth: 1, stroke: "#ffffff" }}
                activeDot={{ r: 5, fill: "#9333ea", stroke: "#ffffff", strokeWidth: 2 }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
