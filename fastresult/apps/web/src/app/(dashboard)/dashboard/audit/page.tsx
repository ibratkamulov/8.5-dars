"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { api, type AuditPage } from "@/lib/api";

const ACTION_COLORS: Record<string, string> = {
  ATTENDANCE_CHECK_IN:  "bg-brand-500/15 text-brand-700 dark:text-brand-300",
  ATTENDANCE_CHECK_OUT: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  MANUAL_CHECK_IN:      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  MANUAL_CHECK_OUT:     "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AuditPage() {
  const { copy } = useLang();
  const [data, setData] = useState<AuditPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.audit.list(page);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy("error"));
    } finally {
      setLoading(false);
    }
  }, [page, copy]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy("auditLog")}</h1>
        <p className="mt-1 text-sm text-black/55 dark:text-white/55">
          {data ? `${data.total} ${copy("total")}` : ""}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-brand-500" />
        </div>
      )}

      {!loading && data && data.items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-black/15 py-16 dark:border-white/15">
          <FileText size={32} className="text-black/20 dark:text-white/20" />
          <p className="text-sm font-semibold text-black/45 dark:text-white/45">{copy("noAuditLogs")}</p>
        </div>
      )}

      {!loading && data && data.items.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-black/10 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/8 dark:border-white/8">
                  {[copy("auditAction"), copy("auditUser"), copy("auditEntity"), "Time", copy("auditIp")].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-black/40 dark:text-white/40">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, i) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-black/5 last:border-0 hover:bg-black/2 dark:border-white/5 dark:hover:bg-white/2"
                  >
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${ACTION_COLORS[item.action] ?? "bg-black/10 text-black/60 dark:bg-white/10 dark:text-white/60"}`}>
                        {item.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.user ? (
                        <div>
                          <p className="font-semibold">{item.user.fullName}</p>
                          <p className="text-xs text-black/45 dark:text-white/45">{item.user.role}</p>
                        </div>
                      ) : (
                        <span className="text-black/35 dark:text-white/35">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-black/60 dark:text-white/60">
                      <span>{item.entity}</span>
                      {item.entityId && (
                        <span className="ml-1 font-mono text-[10px] text-black/30 dark:text-white/30">
                          {item.entityId.slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-black/50 dark:text-white/50">
                      {fmt(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-black/40 dark:text-white/40">
                      {item.ipAddress ?? "—"}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-black/50 dark:text-white/50">
                {copy("page")} {data.page} / {data.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex items-center gap-1 rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold disabled:opacity-40 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <ChevronLeft size={14} /> {copy("prevPage")}
                </button>
                <button
                  disabled={page === data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1 rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold disabled:opacity-40 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                >
                  {copy("nextPage")} <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
