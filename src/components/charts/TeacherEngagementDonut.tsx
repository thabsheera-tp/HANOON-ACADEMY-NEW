"use client";

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface EngagementSegment {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface TeacherEngagementDonutProps {
  presentRate?: number;
  lateRate?: number;
  absentRate?: number;
}

export default function TeacherEngagementDonut({
  presentRate = 84,
  lateRate = 11,
  absentRate = 5,
}: TeacherEngagementDonutProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const total = presentRate + lateRate + absentRate;

  const data: EngagementSegment[] = [
    {
      name: "On-Time Attendance",
      value: presentRate,
      color: "#9333ea", // purple-600
      percentage: Math.round((presentRate / total) * 100),
    },
    {
      name: "Excused / Late",
      value: lateRate,
      color: "#c084fc", // purple-400
      percentage: Math.round((lateRate / total) * 100),
    },
    {
      name: "Unexcused Absence",
      value: absentRate,
      color: "#f3e8ff", // purple-100 / border
      percentage: Math.round((absentRate / total) * 100),
    },
  ];

  if (!isMounted) {
    return (
      <div className="h-48 w-full flex items-center justify-center bg-purple-50/50 rounded-2xl animate-pulse">
        <span className="text-xs text-purple-400 font-bold">Loading engagement data...</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6">
      {/* Donut Chart Container */}
      <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as EngagementSegment;
                  return (
                    <div className="bg-white px-3 py-2 rounded-xl border border-purple-100 shadow-md text-xs font-bold text-slate-800">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-slate-900 font-extrabold">{item.name}</span>
                      </div>
                      <p className="text-purple-700 text-[11px] font-semibold">
                        {item.percentage}% ({item.value} students)
                      </p>
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
              innerRadius={52}
              outerRadius={74}
              paddingAngle={4}
              dataKey="value"
              stroke="#FFFFFF"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Key Metric */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <span className="text-2xl font-black text-slate-900 leading-none tracking-tight">
            {presentRate}%
          </span>
          <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider mt-1">
            Avg Presence
          </span>
        </div>
      </div>

      {/* Legend & Breakdown Stats */}
      <div className="flex-1 w-full space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {data.map((item) => (
            <div
              key={item.name}
              className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] font-bold text-slate-600 truncate">
                  {item.name}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-black text-slate-900">
                  {item.percentage}%
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {item.value} enrolled
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-3 rounded-xl border border-purple-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-slate-700">Course Completion Benchmark</span>
          </div>
          <span className="font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg text-[11px]">
            Top 5% Faculty Tier
          </span>
        </div>
      </div>
    </div>
  );
}
