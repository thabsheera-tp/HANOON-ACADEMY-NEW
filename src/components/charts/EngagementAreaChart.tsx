"use client";

import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface EngagementDataPoint {
  day: string;
  attendance: number;
  participation: number;
}

const DEFAULT_ENGAGEMENT: EngagementDataPoint[] = [
  { day: "Mon", attendance: 88, participation: 82 },
  { day: "Tue", attendance: 92, participation: 85 },
  { day: "Wed", attendance: 96, participation: 90 },
  { day: "Thu", attendance: 94, participation: 88 },
  { day: "Fri", attendance: 98, participation: 94 },
  { day: "Sat", attendance: 91, participation: 86 },
  { day: "Sun", attendance: 95, participation: 92 },
];

export default function EngagementAreaChart({
  data = DEFAULT_ENGAGEMENT,
}: {
  data?: EngagementDataPoint[];
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
        <span className="font-bold text-slate-800 tracking-tight">Class Attendance & Engagement</span>
        <div className="flex items-center gap-3 text-[10px] font-semibold">
          <span className="flex items-center gap-1 text-purple-700">
            <span className="w-2 h-2 rounded-full bg-purple-600" />
            Attendance (94%)
          </span>
          <span className="flex items-center gap-1 text-violet-500">
            <span className="w-2 h-2 rounded-full bg-violet-400" />
            Q&A Activity (88%)
          </span>
        </div>
      </div>

      <div className="w-full h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
          >
            <defs>
              <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9333ea" stopOpacity={0.16} />
                <stop offset="95%" stopColor="#9333ea" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c084fc" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#c084fc" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
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
                      <p className="text-slate-900 font-bold">{payload[0].payload.day}</p>
                      <p className="text-purple-600">
                        Attendance: {payload[0].value}%
                      </p>
                      {payload[1] && (
                        <p className="text-violet-500">
                          Participation: {payload[1].value}%
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="attendance"
              stroke="#9333ea"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#purpleGradient)"
            />
            <Area
              type="monotone"
              dataKey="participation"
              stroke="#c084fc"
              strokeWidth={1.75}
              fillOpacity={1}
              fill="url(#violetGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
