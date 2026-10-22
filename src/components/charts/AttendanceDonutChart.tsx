"use client";

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface AttendanceDonutChartProps {
  presentCount?: number;
  leaveCount?: number;
  absentCount?: number;
  compact?: boolean;
}

export default function AttendanceDonutChart({
  presentCount = 0,
  leaveCount = 0,
  absentCount = 0,
  compact = false,
}: AttendanceDonutChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const total = presentCount + leaveCount + absentCount;
  const isZeroState = total === 0;
  const presentPct = isZeroState ? 100 : Math.round((presentCount / total) * 100);

  const data = isZeroState
    ? [{ name: "Good Standing", value: 1, color: "#9333ea" }]
    : [
        { name: "Present", value: presentCount, color: "#9333ea" }, // purple-600
        { name: "Leave / Excused", value: leaveCount, color: "#c084fc" }, // violet-400
        { name: "Absent", value: absentCount, color: "#f3e8ff" }, // purple-100
      ];

  if (!isMounted) {
    return (
      <div
        className={`${
          compact ? "h-28" : "h-36"
        } w-full flex items-center justify-center bg-purple-50/40 rounded-2xl animate-pulse`}
      />
    );
  }

  const innerR = compact ? 26 : 34;
  const outerR = compact ? 38 : 48;
  const chartHeight = compact ? "h-28" : "h-32";

  return (
    <div className="w-full flex flex-col items-center">
      {/* Donut Chart with Centered Metric */}
      <div className={`relative w-full ${chartHeight} flex items-center justify-center`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0];
                  return (
                    <div className="bg-white px-2.5 py-1.5 rounded-xl border border-purple-100 shadow-md text-[11px] font-bold text-slate-800">
                      <span className="text-purple-600">{item.name}: </span>
                      <span>
                        {isZeroState
                          ? "100% (No absences)"
                          : `${item.value} classes (${Math.round(
                              ((item.value as number) / total) * 100
                            )}%)`}
                      </span>
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
              innerRadius={innerR}
              outerRadius={outerR}
              paddingAngle={isZeroState ? 0 : 3}
              dataKey="value"
              stroke="#ffffff"
              strokeWidth={1.5}
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
          <span
            className={`${
              compact ? "text-sm" : "text-base"
            } font-black text-slate-900 leading-none`}
          >
            {presentPct}%
          </span>
          <span
            className={`${
              compact ? "text-[8px]" : "text-[9px]"
            } font-bold text-purple-600 uppercase tracking-wider mt-0.5`}
          >
            {isZeroState ? "Standby" : "Present"}
          </span>
        </div>
      </div>

      {/* Legend Dots */}
      <div
        className={`flex items-center justify-center gap-2.5 pt-1 text-[10px] font-bold text-slate-600 flex-wrap ${
          compact ? "text-[9px] gap-2" : ""
        }`}
      >
        {isZeroState ? (
          <div className="flex items-center gap-1 text-purple-700 font-extrabold text-[9.5px]">
            <span className="w-2 h-2 rounded-full bg-purple-600" />
            <span>100% Standing • 0 Absences</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              <span>Present ({presentCount})</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Leave ({leaveCount})</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-200 border border-purple-300" />
              <span>Absent ({absentCount})</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
