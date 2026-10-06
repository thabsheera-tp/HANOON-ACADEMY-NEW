"use client";

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface AttendanceDonutChartProps {
  presentCount?: number;
  leaveCount?: number;
  absentCount?: number;
}

export default function AttendanceDonutChart({
  presentCount = 22,
  leaveCount = 2,
  absentCount = 1,
}: AttendanceDonutChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const total = presentCount + leaveCount + absentCount;
  const presentPct = Math.round((presentCount / total) * 100);

  const data = [
    { name: "Present", value: presentCount, color: "#9333ea" }, // purple-600
    { name: "Leave", value: leaveCount, color: "#c084fc" },     // purple-400
    { name: "Absent", value: absentCount, color: "#e9d5ff" },   // purple-200
  ];

  if (!isMounted) {
    return (
      <div className="h-36 w-full flex items-center justify-center bg-purple-50/40 rounded-2xl animate-pulse" />
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      {/* Donut Chart with Centered Metric */}
      <div className="relative w-full h-32 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0];
                  return (
                    <div className="bg-white px-2.5 py-1.5 rounded-xl border border-purple-100 shadow-md text-[11px] font-bold text-slate-800">
                      <span className="text-purple-600">{item.name}: </span>
                      <span>{item.value} classes ({Math.round(((item.value as number) / total) * 100)}%)</span>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={34}
              outerRadius={48}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Percentage Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <span className="text-base font-black text-slate-900 leading-none">
            {presentPct}%
          </span>
          <span className="text-[9px] font-bold text-purple-600 uppercase tracking-wider mt-0.5">
            Present
          </span>
        </div>
      </div>

      {/* Legend Dots */}
      <div className="flex items-center justify-center gap-3 pt-1 text-[10px] font-bold text-slate-600">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-purple-600" />
          <span>Present ({presentCount})</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-purple-400" />
          <span>Leave ({leaveCount})</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-purple-200" />
          <span>Absent ({absentCount})</span>
        </div>
      </div>
    </div>
  );
}
