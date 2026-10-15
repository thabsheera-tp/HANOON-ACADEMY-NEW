"use client";

import React, { useMemo, useState } from "react";
import {
  TrendingUp,
  Users,
  CreditCard,
  Award,
  DollarSign,
  PieChart as PieIcon,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Filter,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { UnifiedStudentRegistration } from "@/services/studentService";

interface StudentAnalyticsSectionProps {
  registrations: UnifiedStudentRegistration[];
}

export default function StudentAnalyticsSection({
  registrations,
}: StudentAnalyticsSectionProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<"ALL" | "THIS_MONTH" | "THIS_WEEK">("ALL");

  // Metrics Calculation
  const totalCount = registrations.length;
  const approvedCount = registrations.filter((r) => r.paymentStatus === "APPROVED").length;
  const pendingCount = registrations.filter((r) => r.paymentStatus === "PENDING").length;
  const rejectedCount = registrations.filter((r) => r.paymentStatus === "REJECTED").length;

  const totalRevenue = useMemo(() => {
    return registrations
      .filter((r) => r.paymentStatus === "APPROVED")
      .reduce((acc, r) => acc + (r.amount || 0), 0);
  }, [registrations]);

  const pipelineRevenue = useMemo(() => {
    return registrations
      .filter((r) => r.paymentStatus === "PENDING")
      .reduce((acc, r) => acc + (r.amount || 0), 0);
  }, [registrations]);

  const approvalRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  const avgFeeRealized = approvedCount > 0 ? Math.round(totalRevenue / approvedCount) : 1500;

  // Course Breakdown Data
  const courseData = useMemo(() => {
    const courseMap: Record<string, { name: string; count: number; revenue: number }> = {
      adaviyya: { name: "Athaviy (അഥവിയ)", count: 0, revenue: 0 },
      "home-tuition": { name: "Home Tuition (ഹോം ട്യൂഷൻ)", count: 0, revenue: 0 },
      "fashion-designing": { name: "Fashion Designing", count: 0, revenue: 0 },
      other: { name: "Specialized Hubs", count: 0, revenue: 0 },
    };

    registrations.forEach((r) => {
      const cId = (r.courseId || "").toLowerCase();
      let targetKey = "other";
      if (cId.includes("adaviyya") || cId.includes("athaviy") || r.courseChoice.toLowerCase().includes("adaviyya") || r.courseChoice.toLowerCase().includes("athaviy")) {
        targetKey = "adaviyya";
      } else if (cId.includes("tuition") || r.courseChoice.toLowerCase().includes("tuition")) {
        targetKey = "home-tuition";
      } else if (cId.includes("fashion") || r.courseChoice.toLowerCase().includes("fashion")) {
        targetKey = "fashion-designing";
      }

      courseMap[targetKey].count += 1;
      if (r.paymentStatus === "APPROVED") {
        courseMap[targetKey].revenue += r.amount || 0;
      }
    });

    return Object.values(courseMap);
  }, [registrations]);

  // District Breakdown
  const districtData = useMemo(() => {
    const dMap: Record<string, number> = {};
    registrations.forEach((r) => {
      const d = (r.district || "Kerala").trim();
      const normalized = d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
      dMap[normalized] = (dMap[normalized] || 0) + 1;
    });

    return Object.entries(dMap)
      .map(([district, count]) => ({
        district,
        count,
        percent: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [registrations, totalCount]);

  // Cumulative Signup Trajectory
  const timelineData = useMemo(() => {
    if (registrations.length === 0) {
      return [
        { date: "Day 1", signups: 1, revenue: 1500 },
        { date: "Day 2", signups: 3, revenue: 4500 },
        { date: "Day 3", signups: 5, revenue: 7500 },
        { date: "Day 4", signups: 8, revenue: 12000 },
      ];
    }

    const sorted = [...registrations].sort(
      (a, b) => new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime()
    );

    let cumulativeSignups = 0;
    let cumulativeRev = 0;
    const points: { date: string; signups: number; revenue: number }[] = [];

    sorted.forEach((r) => {
      cumulativeSignups += 1;
      if (r.paymentStatus === "APPROVED") cumulativeRev += r.amount || 0;
      const formattedDate = new Date(r.registrationDate).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      });
      points.push({
        date: formattedDate,
        signups: cumulativeSignups,
        revenue: cumulativeRev,
      });
    });

    return points.slice(-10); // Show up to last 10 points
  }, [registrations]);

  // Export CSV handler
  const handleExportCsv = () => {
    const headers = [
      "Student ID",
      "Full Name",
      "WhatsApp Number",
      "District",
      "Course Choice",
      "Status",
      "Amount",
      "UPI TxID",
      "Registration Date",
    ];

    const rows = registrations.map((r) => [
      r.studentId,
      `"${r.fullName.replace(/"/g, '""')}"`,
      r.whatsappNum,
      `"${(r.district || "").replace(/"/g, '""')}"`,
      `"${(r.courseChoice || "").replace(/"/g, '""')}"`,
      r.paymentStatus,
      r.amount || 0,
      `"${(r.upiTxId || "").replace(/"/g, '""')}"`,
      r.registrationDate,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hanoon_students_analytics_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Fast Export */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <TrendingUp className="w-5 h-5 text-amber-300" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-purple-200">
              Executive Analytics & Revenue Intelligence
            </span>
          </div>
          <h2 className="text-2xl font-black mt-2 text-white">Student Enrollment & Fee Insights</h2>
          <p className="text-xs text-purple-200 mt-1 max-w-xl">
            Real-time enrollment trends, geographic demographics across Kerala districts, and verified tuition realization.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-purple-50 text-purple-950 font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-purple-700" />
            <span>Export Analytics CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Enrolled */}
        <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Total Applicants
            </span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-slate-900">{totalCount}</h3>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{approvalRate}% Converted</span>
          </div>
        </div>

        {/* Card 2: Verified Tuition Revenue */}
        <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Verified Revenue
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-emerald-700">₹{totalRevenue.toLocaleString("en-IN")}</h3>
          <div className="text-[11px] font-bold text-slate-500">
            Avg fee: ₹{avgFeeRealized.toLocaleString("en-IN")} / student
          </div>
        </div>

        {/* Card 3: Pending in Verification */}
        <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              In Verification Queue
            </span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-amber-600">{pendingCount}</h3>
          <div className="text-[11px] font-bold text-amber-700">
            ₹{pipelineRevenue.toLocaleString("en-IN")} pending approval
          </div>
        </div>

        {/* Card 4: Verified Students */}
        <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Active Admissions
            </span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-purple-700">{approvedCount}</h3>
          <div className="text-[11px] font-bold text-slate-500">
            {rejectedCount} Rejected / Incomplete
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Course Enrollment & Revenue Realization */}
        <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">Enrollment by Course Program</h4>
              <p className="text-[11px] text-slate-500">Distribution of students across flagship curricula</p>
            </div>
            <span className="text-xs font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
              Live Counts
            </span>
          </div>

          <div className="w-full h-56 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#475569", fontWeight: 700 }}
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1">
                          <p className="font-black text-amber-300">{d.name}</p>
                          <p className="text-slate-300 font-bold">Enrolled Students: {d.count}</p>
                          <p className="text-emerald-400 font-extrabold">Revenue: ₹{d.revenue.toLocaleString("en-IN")}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#9333ea" radius={[8, 8, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Cumulative Signup Growth Trajectory */}
        <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">Cumulative Growth Trajectory</h4>
              <p className="text-[11px] text-slate-500">Student admissions progression timeline</p>
            </div>
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              Trajectory
            </span>
          </div>

          <div className="w-full h-56 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#475569", fontWeight: 700 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1">
                          <p className="font-black text-emerald-400">{d.date}</p>
                          <p className="text-slate-200 font-bold">Total Signups: {d.signups}</p>
                          <p className="text-amber-300 font-black">Fee Collected: ₹{d.revenue.toLocaleString("en-IN")}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="signups"
                  stroke="#059669"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSignups)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* District & Regional Demographics Table */}
      <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-600" />
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">Geographic Demographics & District Reach</h4>
              <p className="text-[11px] text-slate-500">Student enrollment distribution across Kerala districts & diaspora</p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {districtData.length} Region(s) Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {districtData.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-slate-400 font-semibold">
              No regional data recorded yet.
            </div>
          ) : (
            districtData.map((d) => (
              <div
                key={d.district}
                className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-slate-800">{d.district}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">{d.percent}% of student body</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 rounded-full bg-purple-200 overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{ width: `${Math.min(100, d.percent)}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-purple-700 w-6 text-right">
                    {d.count}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
