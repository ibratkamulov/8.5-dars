"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/lang-context";
import { api, type AttendanceHistory } from "@/lib/api";

function calcStreak(records: AttendanceHistory[]): number {
  if (records.length === 0) return 0;
  const dates = [...new Set(records.map((r) => r.entryAt.slice(0, 10)))].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    prev.setDate(prev.getDate() - 1);
    if (dates[i] === prev.toISOString().slice(0, 10)) streak++;
    else break;
  }
  return streak;
}

function buildHeatmap(records: AttendanceHistory[]) {
  const counts: Record<string, number> = {};
  for (const r of records) {
    const d = r.entryAt.slice(0, 10);
    counts[d] = (counts[d] ?? 0) + 1;
  }
  return counts;
}

function getIntensity(count: number): string {
  if (count === 0) return "bg-black/5 dark:bg-white/5";
  if (count === 1) return "bg-brand-200 dark:bg-brand-900";
  if (count === 2) return "bg-brand-400 dark:bg-brand-700";
  if (count === 3) return "bg-brand-500 dark:bg-brand-500";
  return "bg-brand-600 dark:bg-brand-400";
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function CalendarPage() {
  const { user } = useAuth();
  const { copy } = useLang();
  const [records, setRecords] = useState<AttendanceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    api.attendance.history(user.id)
      .then(setRecords)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : copy("error")))
      .finally(() => setLoading(false));
  }, [user, copy]);

  const heatmap = useMemo(() => buildHeatmap(records), [records]);

  // Build a 52-week grid ending today
  const weeks = useMemo(() => {
    const today = new Date();
    const grid: { date: string; count: number }[][] = [];
    // Go back 52 weeks from start of this week
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay() - 52 * 7);

    for (let w = 0; w < 53; w++) {
      const week: { date: string; count: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        const iso = date.toISOString().slice(0, 10);
        week.push({ date: iso, count: heatmap[iso] ?? 0 });
      }
      grid.push(week);
    }
    return grid;
  }, [heatmap]);

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const m = new Date(week[0].date).getMonth();
      if (m !== lastMonth) {
        labels.push({ label: MONTHS[m], col: wi });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);

  const totalVisits = records.length;
  const thisMonth = records.filter((r) => r.entryAt.slice(0, 7) === new Date().toISOString().slice(0, 7)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy("attendanceCalendar")}</h1>
        <p className="mt-1 text-sm text-black/55 dark:text-white/55">{copy("calendarHeatmap")}</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {loading && (
        <div className="h-40 animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />
      )}

      {!loading && records.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-black/15 py-16 text-center dark:border-white/15">
          <CalendarDays size={32} className="text-black/20 dark:text-white/20" />
          <p className="text-sm font-semibold text-black/45 dark:text-white/45">{copy("noAttendance")}</p>
        </div>
      )}

      {!loading && records.length > 0 && (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: copy("totalVisits"), value: totalVisits },
              { label: copy("monthlyVisits"), value: thisMonth },
              { label: copy("streak"), value: `${calcStreak(records)} ${copy("streak")}` },
            ].map((k, i) => (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
              >
                <p className="text-xs text-black/50 dark:text-white/50">{k.label}</p>
                <p className="mt-1.5 text-3xl font-black">{k.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Heatmap */}
          <div className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06] overflow-x-auto">
            <h2 className="mb-4 font-black">{copy("calendarHeatmap")}</h2>

            {/* Month labels */}
            <div className="relative mb-1" style={{ paddingLeft: 24 }}>
              <div className="flex gap-[3px]">
                {weeks.map((_, wi) => {
                  const label = monthLabels.find((m) => m.col === wi);
                  return (
                    <div key={wi} className="w-[11px] shrink-0 text-[9px] text-black/40 dark:text-white/40 text-center">
                      {label?.label ?? ""}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grid */}
            <div className="flex gap-[3px]" style={{ paddingLeft: 24 }}>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day) => (
                    <div
                      key={day.date}
                      title={`${day.date}: ${day.count} visits`}
                      className={`h-[11px] w-[11px] rounded-[2px] cursor-default transition-opacity hover:opacity-80 ${getIntensity(day.count)}`}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center gap-1 text-[10px] text-black/40 dark:text-white/40">
              <span>{copy("lessVisits")}</span>
              {[0,1,2,3,4].map((n) => (
                <div key={n} className={`h-[10px] w-[10px] rounded-[2px] ${getIntensity(n)}`} />
              ))}
              <span>{copy("moreVisits")}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
