"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck,
  Clock,
  LogIn,
  LogOut,
  QrCode,
  RefreshCw,
  ScanLine,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/lang-context";
import { api, type LiveData, type MemberItem, type TodayRecord } from "@/lib/api";
import { useLiveAttendance } from "@/lib/use-live-attendance";

const FADE = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06 },
});

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AttendancePage() {
  const { user } = useAuth();
  const { copy } = useLang();
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [todayRecords, setTodayRecords] = useState<TodayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [showManual, setShowManual] = useState(false);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [manualQuery, setManualQuery] = useState("");
  const [manualMsg, setManualMsg] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  const isAdminOrOwner =
    user?.role === "SUPER_ADMIN" || user?.role === "GYM_OWNER" || user?.role === "TRAINER";

  // Real-time WebSocket updates
  const { insideCount: wsCount, connected: wsConnected } = useLiveAttendance(user?.clubId);

  // Sync WebSocket live count into liveData
  useEffect(() => {
    if (wsCount !== null && liveData) {
      setLiveData((prev) => prev ? { ...prev, insideNow: prev.insideNow } : prev);
    }
  }, [wsCount, liveData]);

  const loadData = useCallback(async () => {
    if (!isAdminOrOwner) {
      setLoading(false);
      return;
    }
    try {
      const [live, today] = await Promise.all([
        api.attendance.live(),
        api.attendance.today(),
      ]);
      setLiveData(live);
      setTodayRecords(today);
      setLastRefresh(new Date());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : copy("error"));
    } finally {
      setLoading(false);
    }
  }, [isAdminOrOwner, copy]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (isAdminOrOwner) api.members.list().then(setMembers).catch(() => {});
  }, [isAdminOrOwner]);

  async function doManualToggle(userId: string, direction: "IN" | "OUT") {
    setManualLoading(true);
    setManualMsg("");
    try {
      const res = await api.attendance.manualToggle(userId, direction);
      setManualMsg(`${res.member.name} — ${res.event}`);
      loadData();
    } catch (e: unknown) {
      setManualMsg(e instanceof Error ? e.message : copy("error"));
    } finally {
      setManualLoading(false);
    }
  }

  const filteredMembers = members.filter((m) =>
    m.user.fullName.toLowerCase().includes(manualQuery.toLowerCase()) ||
    m.user.email.toLowerCase().includes(manualQuery.toLowerCase())
  );

  // MEMBER view — redirect to my-qr page
  if (!isAdminOrOwner) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy("attendance")}</h1>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">{copy("checkIn")}</p>
        </div>
        <motion.div
          {...FADE(0)}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Link
            href="/dashboard/attendance/my-qr"
            className="group flex items-center gap-4 rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm transition hover:border-brand-500/40 hover:bg-brand-500/5 dark:border-white/10 dark:bg-white/[0.06]"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-400">
              <QrCode size={24} />
            </div>
            <div>
              <p className="font-black">{copy("myQrCode")}</p>
              <p className="text-sm text-black/55 dark:text-white/55">{copy("checkInLong")}</p>
            </div>
          </Link>
          <Link
            href="/dashboard/attendance/history"
            className="group flex items-center gap-4 rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm transition hover:border-brand-500/40 hover:bg-brand-500/5 dark:border-white/10 dark:bg-white/[0.06]"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-400">
              <CalendarCheck size={24} />
            </div>
            <div>
              <p className="font-black">{copy("attendanceHistory")}</p>
              <p className="text-sm text-black/55 dark:text-white/55">{copy("totalVisits")}</p>
            </div>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy("attendance")}</h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-black/55 dark:text-white/55">
              {`${copy("today")}: ${lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            </p>
            <span className={`h-2 w-2 rounded-full ${wsConnected ? "bg-brand-500 animate-pulse" : "bg-black/20 dark:bg-white/20"}`} title={wsConnected ? "Live" : "Polling"} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-lg border border-black/15 bg-white/80 px-3 py-2 text-sm font-semibold transition hover:border-brand-500/40 hover:bg-brand-500/5 dark:border-white/15 dark:bg-white/[0.06]"
          >
            <RefreshCw size={14} />
            {copy("tryAgain")}
          </button>
          <button
            onClick={() => setShowManual(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-black/15 bg-white/80 px-3 py-2 text-sm font-semibold transition hover:border-brand-500/40 hover:bg-brand-500/5 dark:border-white/15 dark:bg-white/[0.06]"
          >
            <UserCheck size={14} />
            {copy("manualCheckIn")}
          </button>
          <Link
            href="/dashboard/attendance/scanner"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-black text-black hover:bg-brand-600 hover:text-white"
          >
            <ScanLine size={15} />
            {copy("scanQr")}
          </Link>
        </div>
      </div>

      {/* Manual check-in modal */}
      <AnimatePresence>
        {showManual && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowManual(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-2xl border border-black/10 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#0d1f14]/95"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-black">{copy("manualCheckIn")}</h2>
                <button onClick={() => setShowManual(false)} className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/5">
                  <X size={16} />
                </button>
              </div>
              <input
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder={copy("search")}
                className="mb-3 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5"
              />
              {manualMsg && (
                <p className="mb-3 rounded-lg bg-brand-500/10 px-3 py-2 text-xs font-semibold text-brand-700 dark:text-brand-300">{manualMsg}</p>
              )}
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredMembers.slice(0, 10).map((m) => {
                  const inside = liveData?.insideNow.some((x) => x.userId === m.user.id);
                  return (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-black/4 dark:hover:bg-white/4">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500/15 text-xs font-black text-brand-700 dark:text-brand-300">
                        {m.user.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{m.user.fullName}</p>
                        <p className="text-xs text-black/45 dark:text-white/45">
                          {inside ? copy("memberInsideGym") : copy("memberOutsideGym")}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          disabled={!!inside || manualLoading}
                          onClick={() => doManualToggle(m.user.id, "IN")}
                          className="rounded-lg bg-brand-500/15 px-2 py-1 text-xs font-bold text-brand-700 hover:bg-brand-500/25 disabled:opacity-40 dark:text-brand-300"
                        >
                          <LogIn size={12} />
                        </button>
                        <button
                          disabled={!inside || manualLoading}
                          onClick={() => doManualToggle(m.user.id, "OUT")}
                          className="rounded-lg bg-red-500/10 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-500/20 disabled:opacity-40 dark:text-red-400"
                        >
                          <LogOut size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Stats cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />
          ))}
        </div>
      ) : (
        liveData && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div
              {...FADE(0)}
              className="rounded-xl border border-brand-500/30 bg-brand-500/8 p-5 dark:border-brand-500/20"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-black/65 dark:text-white/65">{copy("liveCount")}</p>
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-500" />
                </span>
              </div>
              <p className="mt-3 text-4xl font-black text-brand-600 dark:text-brand-400">
                {wsCount ?? liveData.insideNow.length}
              </p>
            </motion.div>

            <motion.div
              {...FADE(1)}
              className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-black/55 dark:text-white/55">{copy("today")}</p>
                <CalendarCheck size={18} className="text-brand-600 dark:text-brand-400" />
              </div>
              <p className="mt-3 text-3xl font-black">{liveData.todayCount}</p>
            </motion.div>

            <motion.div
              {...FADE(2)}
              className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-black/55 dark:text-white/55">{copy("weekCount")}</p>
                <TrendingUp size={18} className="text-brand-600 dark:text-brand-400" />
              </div>
              <p className="mt-3 text-3xl font-black">{liveData.weekCount}</p>
            </motion.div>

            <motion.div
              {...FADE(3)}
              className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-black/55 dark:text-white/55">{copy("avgDuration")}</p>
                <Clock size={18} className="text-brand-600 dark:text-brand-400" />
              </div>
              <p className="mt-3 text-3xl font-black">
                {formatDuration(liveData.avgDurationSeconds)}
              </p>
            </motion.div>
          </div>
        )
      )}

      {/* Currently inside */}
      {!loading && liveData && (
        <motion.div {...FADE(4)}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-black flex items-center gap-2">
              <Users size={16} className="text-brand-500" />
              {copy("insideNow")}
              <span className="ml-1 rounded-full bg-brand-500 px-2 py-0.5 text-xs font-black text-black">
                {liveData.insideNow.length}
              </span>
            </h2>
          </div>

          {liveData.insideNow.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/20 bg-white/60 py-10 text-center dark:border-white/15 dark:bg-white/[0.03]">
              <Users size={32} className="mx-auto text-brand-500 opacity-40" />
              <p className="mt-2 text-sm font-semibold text-black/50 dark:text-white/50">
                {copy("noAttendance")}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-black/10 bg-white/80 dark:border-white/10 dark:bg-white/[0.04]">
              <table className="w-full text-sm">
                <thead className="border-b border-black/8 dark:border-white/8">
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-black/45 dark:text-white/45">
                    <th className="px-4 py-3">{copy("memberName")}</th>
                    <th className="hidden px-4 py-3 sm:table-cell">{copy("plan")}</th>
                    <th className="px-4 py-3">{copy("checkInTime")}</th>
                    <th className="hidden px-4 py-3 md:table-cell">{copy("duration")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {liveData.insideNow.map((m, i) => {
                    const durationSec = m.checkInAt
                      ? Math.floor((Date.now() - new Date(m.checkInAt).getTime()) / 1000)
                      : null;
                    return (
                      <motion.tr
                        key={m.userId}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="hover:bg-brand-500/5"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500/15 text-xs font-black text-brand-700 dark:text-brand-400">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold">{m.name}</p>
                              <p className="text-xs text-black/45 dark:text-white/45">{m.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 text-black/60 dark:text-white/60 sm:table-cell">
                          {m.plan ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-black/60 dark:text-white/60">
                          {m.checkInAt ? formatTime(m.checkInAt) : "—"}
                        </td>
                        <td className="hidden px-4 py-3 text-black/60 dark:text-white/60 md:table-cell">
                          {formatDuration(durationSec)}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* Today's check-ins */}
      {!loading && todayRecords.length > 0 && (
        <motion.div {...FADE(5)}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-black">{copy("today")} — {copy("attendanceHistory")}</h2>
            <Link
              href="/dashboard/attendance/history"
              className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              {copy("view")} →
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-black/10 bg-white/80 dark:border-white/10 dark:bg-white/[0.04]">
            <table className="w-full text-sm">
              <thead className="border-b border-black/8 dark:border-white/8">
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-black/45 dark:text-white/45">
                  <th className="px-4 py-3">{copy("memberName")}</th>
                  <th className="px-4 py-3">{copy("checkInTime")}</th>
                  <th className="hidden px-4 py-3 sm:table-cell">{copy("checkOutTime")}</th>
                  <th className="hidden px-4 py-3 md:table-cell">{copy("duration")}</th>
                  <th className="px-4 py-3">{copy("status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {todayRecords.slice(0, 15).map((r, i) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-brand-500/5"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-500/15 text-xs font-black text-brand-700 dark:text-brand-400">
                          {r.memberName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{r.memberName}</span>
                      </div>
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
                            : "bg-black/10 text-black/60 dark:bg-white/10 dark:text-white/60"
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
        </motion.div>
      )}

      {/* Quick links */}
      <motion.div {...FADE(6)} className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/attendance/scanner"
          className="flex items-center gap-4 rounded-xl border border-black/10 bg-white/80 p-4 shadow-sm transition hover:border-brand-500/40 hover:bg-brand-500/5 dark:border-white/10 dark:bg-white/[0.06]"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-400">
            <ScanLine size={20} />
          </div>
          <div>
            <p className="font-black text-sm">{copy("attendanceScanner")}</p>
            <p className="text-xs text-black/50 dark:text-white/50">{copy("scanQr")}</p>
          </div>
        </Link>
        <Link
          href="/dashboard/attendance/history"
          className="flex items-center gap-4 rounded-xl border border-black/10 bg-white/80 p-4 shadow-sm transition hover:border-brand-500/40 hover:bg-brand-500/5 dark:border-white/10 dark:bg-white/[0.06]"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-400">
            <CalendarCheck size={20} />
          </div>
          <div>
            <p className="font-black text-sm">{copy("attendanceHistory")}</p>
            <p className="text-xs text-black/50 dark:text-white/50">{copy("totalVisits")}</p>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
