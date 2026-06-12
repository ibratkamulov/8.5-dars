"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarCheck, Search } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/lang-context";
import { api, type AttendanceHistory, type TodayRecord } from "@/lib/api";

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Unified row type for display
type DisplayRow = {
  id: string;
  entryAt: string;
  exitAt: string | null;
  durationSeconds: number | null;
  status: string;
  memberName?: string;
  userId?: string;
};

export default function AttendanceHistoryPage() {
  const { user } = useAuth();
  const { copy } = useLang();

  const isAdminOrTrainer =
    user?.role === "SUPER_ADMIN" ||
    user?.role === "GYM_OWNER" ||
    user?.role === "TRAINER";

  const [records, setRecords] = useState<DisplayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      if (isAdminOrTrainer) {
        // Admins/trainers see all today's records (full history via today endpoint)
        const today = await api.attendance.today() as TodayRecord[];
        const rows: DisplayRow[] = today.map((r) => ({
          id: r.id,
          entryAt: r.entryAt,
          exitAt: r.exitAt,
          durationSeconds: r.durationSeconds,
          status: r.status,
          memberName: r.memberName,
          userId: r.userId,
        }));
        setRecords(rows);
      } else {
        // Members see their own history
        const hist = await api.attendance.history(user.id) as AttendanceHistory[];
        const rows: DisplayRow[] = hist.map((r) => ({
          id: r.id,
          entryAt: r.entryAt,
          exitAt: r.exitAt,
          durationSeconds: r.durationSeconds,
          status: r.status,
        }));
        setRecords(rows);
      }
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : copy("error"));
    } finally {
      setLoading(false);
    }
  }, [user, isAdminOrTrainer, copy]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filtered = records.filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      r.memberName?.toLowerCase().includes(q) ||
      formatDate(r.entryAt).toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/attendance"
            className="grid h-9 w-9 place-items-center rounded-lg border border-black/15 bg-white/80 text-black/60 transition hover:bg-black/5 dark:border-white/15 dark:bg-white/[0.06] dark:text-white/60"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight">{copy("attendanceHistory")}</h1>
            <p className="mt-0.5 text-sm text-black/55 dark:text-white/55">
              {records.length} {copy("totalVisits").toLowerCase()}
            </p>
          </div>
        </div>

        {/* Search (admins only — search by member name) */}
        {isAdminOrTrainer && (
          <div className="relative w-full sm:max-w-xs">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={copy("search")}
              className="w-full rounded-lg border border-black/15 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-white/5"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-dashed border-black/20 bg-white/60 p-14 text-center dark:border-white/15 dark:bg-white/[0.03]"
        >
          <CalendarCheck size={40} className="mx-auto text-brand-500 opacity-40" />
          <p className="mt-3 font-semibold text-black/55 dark:text-white/55">
            {copy("noAttendance")}
          </p>
        </motion.div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white/80 dark:border-white/10 dark:bg-white/[0.04]">
          <table className="w-full text-sm">
            <thead className="border-b border-black/8 dark:border-white/8">
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-black/45 dark:text-white/45">
                {isAdminOrTrainer && (
                  <th className="px-4 py-3">{copy("memberName")}</th>
                )}
                <th className="px-4 py-3">{copy("createdAt")}</th>
                <th className="px-4 py-3">{copy("checkInTime")}</th>
                <th className="hidden px-4 py-3 sm:table-cell">{copy("checkOutTime")}</th>
                <th className="hidden px-4 py-3 md:table-cell">{copy("duration")}</th>
                <th className="px-4 py-3">{copy("status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {filtered.map((r, i) => (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="hover:bg-brand-500/5"
                >
                  {isAdminOrTrainer && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-500/15 text-xs font-black text-brand-700 dark:text-brand-400">
                          {(r.memberName ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{r.memberName ?? "—"}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3 text-black/60 dark:text-white/60">
                    {formatDate(r.entryAt)}
                  </td>
                  <td className="px-4 py-3 text-black/60 dark:text-white/60">
                    {formatTime(r.entryAt)}
                  </td>
                  <td className="hidden px-4 py-3 text-black/60 dark:text-white/60 sm:table-cell">
                    {r.exitAt ? formatTime(r.exitAt) : "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-black/60 dark:text-white/60 md:table-cell">
                    {formatDuration(r.durationSeconds)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        r.status === "ACTIVE"
                          ? "bg-brand-500/20 text-brand-700 dark:text-brand-400"
                          : "bg-black/8 text-black/55 dark:bg-white/8 dark:text-white/55"
                      }`}
                    >
                      {r.status === "ACTIVE" ? copy("statusActive") : copy("statusCompleted")}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
