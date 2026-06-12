"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, ComposedChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useLang } from "@/lib/lang-context";
import { api, type DashboardData } from "@/lib/api";
import { attendanceTrend, bodyTrend } from "@/lib/mock-data";

const PERIOD_ORDER = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"];

const COLORS = ["#13cf5f", "#3df07e", "#08a94b", "#f59e0b", "#38bdf8"];

export default function AnalyticsPage() {
  const { copy } = useLang();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.analytics.dashboard()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : copy("error")))
      .finally(() => setLoading(false));
  }, [copy]);

  const pieData = data
    ? [
        { name: copy("activeMembers"), value: data.activeMembers },
        { name: copy("totalMembers"), value: data.totalMembers - data.activeMembers },
      ]
    : [];

  const breakdownData = data?.membershipBreakdown
    ? PERIOD_ORDER
        .map((p) => {
          const found = data.membershipBreakdown.find((b) => b.period === p);
          return { period: p, count: found?.count ?? 0 };
        })
        .filter((d) => d.count > 0)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy("analytics")}</h1>
        <p className="mt-1 text-sm text-black/55 dark:text-white/55">{copy("revenueChart")}</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0,1,2,3].map((i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />)}
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPI row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: copy("totalMembers"), value: data.totalMembers },
              { label: copy("activeMembers"), value: data.activeMembers },
              { label: copy("todayCheckIns"), value: data.todayAttendance },
              { label: copy("goalCompletionRate"), value: `${data.goalCompletionRate}%` },
            ].map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
              >
                <p className="text-sm text-black/55 dark:text-white/55">{m.label}</p>
                <p className="mt-2 text-3xl font-black">{m.value.toLocaleString()}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Attendance trend */}
            <div className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-brand-600 dark:text-brand-400" />
                <h2 className="font-black">{copy("attendanceChart")}</h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceTrend}>
                    <defs>
                      <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#13cf5f" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#13cf5f" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,.15)" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="visits" stroke="#13cf5f" fill="url(#ag)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Body trend */}
            <div className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              <h2 className="mb-4 font-black">{copy("memberGrowth")}</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bodyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,.15)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="weight" fill="#13cf5f" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="muscle" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Member pie */}
            <div className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              <h2 className="mb-4 font-black">{copy("activeMembers")}</h2>
              <div className="flex items-center gap-6">
                <div className="h-48 w-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ background: COLORS[i] }} />
                      <span className="text-sm">{d.name}</span>
                      <span className="ml-auto font-bold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Revenue */}
            <div className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              <h2 className="mb-4 font-black">{copy("revenueChart")}</h2>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black">${Number(data.revenue).toLocaleString()}</span>
                <span className="mb-1 text-sm text-black/55 dark:text-white/55">{copy("total")}</span>
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { label: copy("paid"), value: `$${(Number(data.revenue) * 0.82).toFixed(0)}`, color: "bg-brand-500" },
                  { label: copy("pending"), value: `$${(Number(data.revenue) * 0.12).toFixed(0)}`, color: "bg-amber-500" },
                  { label: copy("overdue"), value: `$${(Number(data.revenue) * 0.06).toFixed(0)}`, color: "bg-red-500" },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between rounded-lg bg-black/5 px-3 py-2 dark:bg-white/5">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${r.color}`} />
                      <span className="text-sm font-semibold">{r.label}</span>
                    </div>
                    <span className="text-sm font-black">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Monthly revenue vs visits (real data) */}
          {data.monthlyRevenue && data.monthlyRevenue.length > 0 && (
            <div className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06] col-span-full lg:col-span-2">
              <h2 className="mb-4 font-black">{copy("revenueVsVisits")}</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,.15)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="revenue" fill="#13cf5f" radius={[4, 4, 0, 0]} name="Revenue ($)" />
                    <Line yAxisId="right" type="monotone" dataKey="visits" stroke="#38bdf8" strokeWidth={2} dot={false} name="Visits" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Membership breakdown by period */}
          {breakdownData.length > 0 && (
            <div className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              <h2 className="mb-4 font-black">{copy("membershipByType")}</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdownData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,.15)" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="period" tick={{ fontSize: 11 }}
                      tickFormatter={(v) => copy(v as import("@/lib/i18n").TKey)} width={80} />
                    <Tooltip formatter={(v) => [v, copy("activeMembers")]} />
                    <Bar dataKey="count" fill="#13cf5f" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top trainers */}
          {data.topTrainers.length > 0 && (
            <div className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              <h2 className="mb-4 font-black">{copy("topTrainers")}</h2>
              <div className="space-y-3">
                {data.topTrainers.map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-black text-black/30 dark:text-white/30 w-4">{i + 1}</span>
                    <span className="flex-1 text-sm font-semibold">{t.name}</span>
                    <span className="text-xs text-black/50 dark:text-white/50">{t.memberCount} members</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
