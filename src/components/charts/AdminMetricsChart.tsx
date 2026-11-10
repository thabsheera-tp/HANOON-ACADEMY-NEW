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

interface CourseMetric {
  course: string;
  attendanceRate: number;
  completionRate: number;
}

const DEFAULT_METRICS: CourseMetric[] = [
  { course: "Adaviyya", attendanceRate: 95, completionRate: 88 },
  { course: "Home Tuition", attendanceRate: 92, completionRate: 84 },
  { course: "Fashion Design", attendanceRate: 89, completionRate: 91 },
];

export default function AdminMetricsChart({
  data = DEFAULT_METRICS,
}: {
  data?: CourseMetric[];
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-44 w-full flex items-center justify-center bg-slate-100/60 rounded-2xl animate-pulse" />
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-800 tracking-tight">Class Performance & Completion</span>
        <div className="flex items-center gap-3 text-[10px] font-semibold">
          <span className="flex items-center gap-1 text-purple-700">
            <span className="w-2 h-2 rounded-full bg-purple-600" />
            Avg Attendance
          </span>
          <span className="flex items-center gap-1 text-violet-500">
            <span className="w-2 h-2 rounded-full bg-violet-400" />
            Completion Rate
          </span>
        </div>
      </div>

      <div className="w-full h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
          >
            <XAxis
              dataKey="course"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
            />
            <YAxis
              domain={[60, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: "#94a3b8" }}
              ticks={[60, 80, 100]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white/95 backdrop-blur-sm p-2 rounded-xl border border-slate-200/80 shadow-md text-[11px] font-semibold space-y-0.5">
                      <p className="text-slate-900 font-bold">{payload[0].payload.course}</p>
                      <p className="text-purple-600">
                        Attendance: {payload[0].value}%
                      </p>
                      {payload[1] && (
                        <p className="text-violet-500">
                          Completion: {payload[1].value}%
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ fill: "rgba(241, 245, 249, 0.5)" }}
            />
            <Bar dataKey="attendanceRate" fill="#9333ea" radius={[6, 6, 0, 0]} maxBarSize={22} />
            <Bar dataKey="completionRate" fill="#c084fc" radius={[6, 6, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
