"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Clock, CalendarDays, Calendar, BarChart3 } from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useLang } from "@/lib/lang-context";
import { api, type PaymentItem, type PaymentSummary } from "@/lib/api";
import type { TKey } from "@/lib/i18n";

const STATUS_STYLE: Record<string, string> = {
  PAID:    "bg-brand-500/15 text-brand-700 dark:text-brand-300",
  PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  FAILED:  "bg-red-500/15 text-red-600 dark:text-red-400",
};

export default function PaymentsPage() {
  const { copy } = useLang();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.payments.list(), api.payments.summary()])
      .then(([list, sum]) => { setPayments(list); setSummary(sum); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : copy("error")))
      .finally(() => setLoading(false));
  }, [copy]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy("payments")}</h1>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">{payments.length} {copy("payments").toLowerCase()}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* KPI cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500/15 shrink-0">
              <TrendingUp size={22} className="text-brand-600 dark:text-brand-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-black/55 dark:text-white/55">{copy("totalPaid")}</p>
              <p className="text-xl font-black">${summary.totalPaid.toLocaleString()}</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="flex items-center gap-4 rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-500/15 shrink-0">
              <Clock size={22} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-black/55 dark:text-white/55">{copy("totalPending")}</p>
              <p className="text-xl font-black">${summary.totalPending.toLocaleString()}</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="flex items-center gap-4 rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-500/15 shrink-0">
              <CalendarDays size={22} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-black/55 dark:text-white/55">Today</p>
              <p className="text-xl font-black">${summary.revenueToday.toLocaleString()}</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="flex items-center gap-4 rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-purple-500/15 shrink-0">
              <Calendar size={22} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-black/55 dark:text-white/55">This Month</p>
              <p className="text-xl font-black">${summary.revenueMonth.toLocaleString()}</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="flex items-center gap-4 rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-rose-500/15 shrink-0">
              <BarChart3 size={22} className="text-rose-600 dark:text-rose-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-black/55 dark:text-white/55">This Year</p>
              <p className="text-xl font-black">${summary.revenueYear.toLocaleString()}</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Monthly revenue chart */}
      {summary && summary.monthly.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
        >
          <div className="mb-4 flex items-center gap-2">
            <DollarSign size={18} className="text-brand-600 dark:text-brand-400" />
            <h2 className="font-black">{copy("monthlyRevenue")}</h2>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.monthly}>
                <defs>
                  <linearGradient id="revGr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#13cf5f" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#13cf5f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,.15)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, copy("revenue")]} />
                <Area type="monotone" dataKey="revenue" stroke="#13cf5f" fill="url(#revGr)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Payment list */}
      {!loading && payments.length === 0 && (
        <div className="rounded-xl border border-dashed border-black/20 dark:border-white/15 bg-white/60 dark:bg-white/[0.03] p-14 text-center">
          <DollarSign size={40} className="mx-auto text-brand-500 opacity-40" />
          <p className="mt-3 font-semibold text-black/50 dark:text-white/50">{copy("noPayments")}</p>
        </div>
      )}

      {/* Payments loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[0,1,2,3,4].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />
          ))}
        </div>
      )}

      {!loading && payments.length > 0 && (
        <div className="rounded-xl border border-black/10 bg-white/80 dark:border-white/10 dark:bg-white/[0.06] overflow-x-auto shadow-sm">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-black/8 dark:border-white/8">
                {["member", "planName", "amount", "provider", "paymentStatus", "paidAt"].map((k) => (
                  <th key={k} className="px-4 py-3 text-left text-xs font-black text-black/40 dark:text-white/40 uppercase tracking-wide">
                    {copy(k as TKey)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-black/5 dark:border-white/5 hover:bg-black/2 dark:hover:bg-white/2">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{p.membership?.memberName ?? "—"}</p>
                    <p className="text-xs text-black/40 dark:text-white/40">{p.membership?.memberEmail ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-black/60 dark:text-white/60">{p.membership?.planName ?? "—"}</td>
                  <td className="px-4 py-3 font-black">${p.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-black/60 dark:text-white/60">{p.provider}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[p.status] ?? ""}`}>
                      {copy(p.status as TKey)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-black/50 dark:text-white/50">
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
