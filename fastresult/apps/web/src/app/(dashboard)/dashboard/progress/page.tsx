"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, TrendingUp, Users } from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/lang-context";
import { api, type BodyMeasurement, type MemberItem } from "@/lib/api";

type Period = "week" | "month" | "year" | "all";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function MiniChart({ data, dataKey, color, label }: {
  data: { date: string; value: number | null }[];
  dataKey: string;
  color: string;
  label: string;
}) {
  const filled = data.filter((d) => d.value !== null);
  if (filled.length < 2) return (
    <div className="flex h-32 items-center justify-center text-xs text-black/40 dark:text-white/40">—</div>
  );
  return (
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={filled} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,.1)" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v: number) => [`${v}`, label]}
          />
          <Area type="monotone" dataKey="value" stroke={color} fill={`url(#grad-${dataKey})`} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ProgressPage() {
  const { user } = useAuth();
  const { copy } = useLang();
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("all");

  // Trainer/owner member selection
  const isStaff = user?.role === "TRAINER" || user?.role === "GYM_OWNER" || user?.role === "SUPER_ADMIN";
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  useEffect(() => {
    if (!isStaff) return;
    api.members.list().then((list) => {
      setMembers(list);
      if (list.length > 0) setSelectedMemberId(list[0].userId);
    }).catch(() => {});
  }, [isStaff]);

  const targetId = isStaff ? selectedMemberId : (user?.id ?? "");

  const load = useCallback(async () => {
    if (!targetId) { setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const d = await api.measurements.list(targetId);
      setMeasurements([...d].reverse());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy("error"));
    } finally {
      setLoading(false);
    }
  }, [targetId, copy]);

  useEffect(() => { load(); }, [load]);

  const filteredMeasurements = useMemo(() => {
    const cutoffMs: Record<Period, number> = {
      week: 7 * 86_400_000,
      month: 30 * 86_400_000,
      year: 365 * 86_400_000,
      all: Infinity,
    };
    const cutoff = cutoffMs[period];
    const now = Date.now();
    return measurements.filter((m) => now - new Date(m.measuredAt).getTime() <= cutoff);
  }, [measurements, period]);

  const chartData = filteredMeasurements.map((m) => ({
    date: fmt(m.measuredAt),
    weight: m.weightKg,
    muscle: m.muscleMass,
    fat: m.bodyFatPct,
    bmi: m.bmi,
  }));

  const latest = measurements[measurements.length - 1];
  const kpis = latest
    ? [
        { label: copy("bodyWeight"), value: latest.weightKg ? `${latest.weightKg} kg` : "—" },
        { label: copy("muscleMass"), value: latest.muscleMass ? `${latest.muscleMass} kg` : "—" },
        { label: copy("bodyFat"), value: latest.bodyFatPct ? `${latest.bodyFatPct}%` : "—" },
        { label: copy("bmi"), value: latest.bmi ? latest.bmi.toFixed(1) : "—" },
      ]
    : [];

  const charts = [
    { key: "weight", dataKey: "weight", color: "#13cf5f", label: copy("weightHistory") },
    { key: "muscle", dataKey: "muscle", color: "#38bdf8", label: copy("muscleHistory") },
    { key: "fat",    dataKey: "fat",    color: "#f59e0b", label: copy("fatHistory") },
    { key: "bmi",    dataKey: "bmi",    color: "#a78bfa", label: copy("bmiHistory") },
  ];

  const selectedMember = members.find((m) => m.userId === selectedMemberId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy("progressCharts")}</h1>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            {isStaff && selectedMember
              ? selectedMember.user.fullName
              : copy("measurements")}
          </p>
        </div>

        {/* Trainer member selector */}
        {isStaff && members.length > 0 && (
          <div className="flex items-center gap-2">
            <Users size={16} className="text-black/40 dark:text-white/40" />
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="rounded-lg border border-black/12 bg-white/80 px-3 py-2 text-sm font-semibold outline-none focus:border-brand-500 dark:border-white/12 dark:bg-white/[0.06]"
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>{m.user.fullName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Period toggles */}
      <div className="flex gap-2">
        {(["week", "month", "year", "all"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg border-2 px-4 py-1.5 text-sm font-bold transition ${
              period === p
                ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-400"
                : "border-black/10 hover:border-brand-500/40 dark:border-white/10"
            }`}
          >
            {p === "week" ? "7D" : p === "month" ? "30D" : p === "year" ? "1Y" : "All"}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-brand-500" />
        </div>
      )}

      {!loading && measurements.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-black/15 py-16 text-center dark:border-white/15">
          <TrendingUp size={32} className="text-black/20 dark:text-white/20" />
          <p className="text-sm font-semibold text-black/45 dark:text-white/45">{copy("noMeasurementsYet")}</p>
        </div>
      )}

      {!loading && measurements.length > 0 && (
        <>
          {/* KPI row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k, i) => (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
              >
                <p className="text-xs text-black/50 dark:text-white/50">{k.label}</p>
                <p className="mt-1.5 text-3xl font-black">{k.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Charts grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {charts.map((c, i) => (
              <motion.div
                key={c.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
              >
                <p className="mb-3 text-sm font-black">{c.label}</p>
                <MiniChart
                  data={chartData.map((d) => ({ date: d.date, value: d[c.dataKey as keyof typeof d] as number | null }))}
                  dataKey={c.dataKey}
                  color={c.color}
                  label={c.label}
                />
              </motion.div>
            ))}
          </div>

          {/* Measurement history table */}
          <div className="overflow-hidden rounded-xl border border-black/10 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
            <div className="border-b border-black/8 px-5 py-3 dark:border-white/8">
              <h2 className="text-sm font-black">{copy("measurements")}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/8 dark:border-white/8">
                    {["Date", copy("bodyWeight"), copy("muscleMass"), copy("bodyFat"), copy("bmi")].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-black uppercase tracking-wide text-black/40 dark:text-white/40">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...measurements].reverse().slice(0, 10).map((m) => (
                    <tr key={m.id} className="border-b border-black/5 last:border-0 hover:bg-black/2 dark:border-white/5 dark:hover:bg-white/2">
                      <td className="px-4 py-2.5 text-xs text-black/60 dark:text-white/60">{fmt(m.measuredAt)}</td>
                      <td className="px-4 py-2.5 font-semibold">{m.weightKg ? `${m.weightKg} kg` : "—"}</td>
                      <td className="px-4 py-2.5">{m.muscleMass ? `${m.muscleMass} kg` : "—"}</td>
                      <td className="px-4 py-2.5">{m.bodyFatPct ? `${m.bodyFatPct}%` : "—"}</td>
                      <td className="px-4 py-2.5">{m.bmi ? m.bmi.toFixed(1) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
