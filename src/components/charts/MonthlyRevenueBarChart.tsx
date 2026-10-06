"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface MonthlyData {
  month: string;
  revenue: number; // in thousands (₹K)
  enrollments: number;
}

const DEFAULT_MONTHLY_DATA: MonthlyData[] = [
  { month: "Nov", revenue: 145, enrollments: 58 },
  { month: "Dec", revenue: 190, enrollments: 76 },
  { month: "Jan", revenue: 230, enrollments: 92 },
  { month: "Feb", revenue: 260, enrollments: 104 },
  { month: "Mar", revenue: 310, enrollments: 124 },
  { month: "Apr", revenue: 345, enrollments: 138 },
];

export default function MonthlyRevenueBarChart({
  data = DEFAULT_MONTHLY_DATA,
}: {
  data?: MonthlyData[];
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-64 w-full flex items-center justify-center bg-purple-50/50 rounded-2xl animate-pulse" />
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">
            Monthly Revenue & Student Enrollments
          </h3>
          <p className="text-xs text-slate-500">
            Gross admission tuition fee intake over the past 6 academic months
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="flex items-center gap-1.5 text-purple-700">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-600" />
            Revenue (₹ in Thousands)
          </span>
          <span className="flex items-center gap-1.5 text-violet-500">
            <span className="w-2.5 h-2.5 rounded-sm bg-violet-400" />
            Enrollments
          </span>
        </div>
      </div>

      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
          >
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-md text-xs font-bold space-y-1">
                      <p className="text-slate-900 font-extrabold border-b border-purple-50 pb-1">
                        {payload[0].payload.month} 2026
                      </p>
                      <p className="text-purple-600">
                        Revenue: ₹{((payload[0].value as number) * 1000).toLocaleString("en-IN")}
                      </p>
                      {payload[1] && (
                        <p className="text-violet-500">
                          New Enrollments: {payload[1].value} Students
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ fill: "rgba(243, 232, 255, 0.4)" }}
            />
            <Bar
              dataKey="revenue"
              name="Revenue (₹K)"
              fill="#9333ea"
              radius={[6, 6, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="enrollments"
              name="Enrollments"
              fill="#c084fc"
              radius={[6, 6, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
