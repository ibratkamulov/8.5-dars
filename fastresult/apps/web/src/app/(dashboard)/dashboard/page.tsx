"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, CalendarCheck, TrendingUp, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/lang-context";
import { api, type DashboardData, type MembershipItem } from "@/lib/api";
import { attendanceTrend } from "@/lib/mock-data";

const FADE = (i: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.05 } });

export default function DashboardPage() {
  const { user } = useAuth();
  const { copy } = useLang();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMembership, setActiveMembership] = useState<MembershipItem | null>(null);

  const canViewAnalytics = user?.role === "SUPER_ADMIN" || user?.role === "GYM_OWNER";

  useEffect(() => {
    if (!canViewAnalytics) { setLoading(false); return; }
    api.analytics.dashboard()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : copy("error")))
      .finally(() => setLoading(false));
  }, [canViewAnalytics, copy]);

  // Load active membership for expiry banner (MEMBER only)
  useEffect(() => {
    if (!user || user.role !== "MEMBER") return;
    api.memberships.list(user.id)
      .then((list) => {
        const now = new Date();
        const active = list.find((m) => new Date(m.expiresAt) >= now);
        setActiveMembership(active ?? null);
      })
      .catch(() => {});
  }, [user]);

  const metrics = canViewAnalytics && data
    ? [
        { label: copy("totalMembers"), value: data.totalMembers.toLocaleString(), icon: <Users size={20} />, delta: "+12%" },
        { label: copy("activeMembers"), value: data.activeMembers.toLocaleString(), icon: <Activity size={20} />, delta: "+8%" },
        { label: copy("todayCheckIns"), value: data.todayAttendance.toLocaleString(), icon: <CalendarCheck size={20} />, delta: "+5%" },
        { label: copy("monthlyRevenue"), value: `$${Number(data.revenue).toLocaleString()}`, icon: <TrendingUp size={20} />, delta: `${data.goalCompletionRate}%` },
      ]
    : [
        { label: copy("totalVisits"), value: "—", icon: <CalendarCheck size={20} />, delta: "" },
        { label: copy("weeklyVisits"), value: "—", icon: <Activity size={20} />, delta: "" },
      ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
          {copy("overview")}
        </h1>
        <p className="mt-1 text-sm text-black/55 dark:text-white/55">
          {user ? `${user.fullName} · ${copy(user.role === "SUPER_ADMIN" ? "superAdmin" : user.role === "GYM_OWNER" ? "owner" : user.role === "TRAINER" ? "trainer" : "member")}` : ""}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* Membership expiry banner */}
      {activeMembership && activeMembership.remainingDays <= 7 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center justify-between gap-4 rounded-xl px-4 py-3 text-sm ${
            activeMembership.remainingDays <= 3
              ? "bg-red-500/12 border border-red-500/25 text-red-700 dark:text-red-400"
              : "bg-amber-500/12 border border-amber-500/25 text-amber-700 dark:text-amber-400"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={16} className="shrink-0" />
            <span>
              <span className="font-black">{copy("membershipExpiryTitle")}: </span>
              {activeMembership.planName} — {activeMembership.remainingDays} {copy("expiresInDays")}
            </span>
          </div>
          <Link
            href="/dashboard/memberships"
            className="shrink-0 rounded-lg bg-current/10 px-3 py-1.5 text-xs font-black hover:bg-current/20 transition"
          >
            {copy("renewNow")}
          </Link>
        </motion.div>
      )}

      {/* Metric cards */}
      {!loading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((m, i) => (
            <motion.div key={m.label} {...FADE(i)} className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-black/55 dark:text-white/55">{m.label}</p>
                <span className="text-brand-600 dark:text-brand-400">{m.icon}</span>
              </div>
              <p className="mt-3 text-3xl font-black">{m.value}</p>
              {m.delta && (
                <span className="mt-2 inline-block rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-black text-brand-600 dark:text-brand-400">
                  {m.delta}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5" />
          ))}
        </div>
      )}

      {/* Attendance chart */}
      {canViewAnalytics && (
        <motion.div {...FADE(4)} className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
          <div className="mb-4 flex items-center gap-2">
            <CalendarCheck size={18} className="text-brand-600 dark:text-brand-400" />
            <h2 className="font-black">{copy("attendanceChart")}</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrend}>
                <defs>
                  <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#13cf5f" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#13cf5f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,.18)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="visits" stroke="#13cf5f" fill="url(#gr)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Member role: quick links */}
      {user?.role === "MEMBER" && (
        <motion.div {...FADE(1)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/dashboard/attendance",  label: copy("attendance"),  icon: <CalendarCheck size={20} /> },
            { href: "/dashboard/goals",        label: copy("goals"),       icon: <TrendingUp size={20} /> },
            { href: "/dashboard/workout",      label: copy("workout"),     icon: <Activity size={20} /> },
            { href: "/dashboard/memberships",  label: copy("memberships"), icon: <Users size={20} /> },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl border border-black/10 bg-white/80 p-4 shadow-sm hover:border-brand-500/40 hover:bg-brand-500/5 transition dark:border-white/10 dark:bg-white/[0.06]"
            >
              <span className="text-brand-600 dark:text-brand-400">{item.icon}</span>
              <span className="font-semibold text-sm">{item.label}</span>
            </Link>
          ))}
        </motion.div>
      )}

      {/* Trainer role: quick links */}
      {user?.role === "TRAINER" && (
        <motion.div {...FADE(1)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/dashboard/members",   label: copy("members"),   icon: <Users size={20} /> },
            { href: "/dashboard/attendance",label: copy("attendance"),icon: <CalendarCheck size={20} /> },
            { href: "/dashboard/workout",   label: copy("workout"),   icon: <Activity size={20} /> },
            { href: "/dashboard/goals",     label: copy("goals"),     icon: <TrendingUp size={20} /> },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl border border-black/10 bg-white/80 p-4 shadow-sm hover:border-brand-500/40 hover:bg-brand-500/5 transition dark:border-white/10 dark:bg-white/[0.06]"
            >
              <span className="text-brand-600 dark:text-brand-400">{item.icon}</span>
              <span className="font-semibold text-sm">{item.label}</span>
            </Link>
          ))}
        </motion.div>
      )}
    </div>
  );
}
