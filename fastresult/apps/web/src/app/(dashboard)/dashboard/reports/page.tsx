"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, CheckCircle, ChevronDown, DollarSign, Download,
  FileSpreadsheet, FileText, Loader2, Printer, TrendingUp, Users, XCircle,
} from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { api, type DashboardData } from "@/lib/api";

function fmt(n: number) { return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function fmtUsd(n: number) { return "$" + fmt(n); }

const PERIOD_LABELS: Record<string, string> = {
  MONTHLY: "Monthly", QUARTERLY: "Quarterly", SEMI_ANNUAL: "6-Month", ANNUAL: "Annual",
};

const SCOPES = [
  { value: "revenue",     label: "Monthly Revenue" },
  { value: "attendance",  label: "Attendance Stats" },
  { value: "memberships", label: "Memberships" },
  { value: "trainers",    label: "Trainer Statistics" },
  { value: "top-members", label: "Top 20 Members" },
];

type Toast = { id: number; type: "success" | "error"; message: string };
let _toastId = 0;

export default function ReportsPage() {
  const { copy } = useLang();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const [scope, setScope] = useState("revenue");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [xlsxLoading, setXlsxLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await api.analytics.dashboard()); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : copy("error")); }
    finally { setLoading(false); }
  }, [copy]);

  useEffect(() => { load(); }, [load]);

  function addToast(type: Toast["type"], message: string) {
    const id = ++_toastId;
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }

  async function handleDownload(type: "pdf" | "excel") {
    const setter = type === "pdf" ? setPdfLoading : setXlsxLoading;
    setter(true);
    try {
      const blob = await api.reports.download(type, scope);
      const ext = type === "pdf" ? "pdf" : "xlsx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${scope}-${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast("success", `${type.toUpperCase()} download started`);
    } catch (e: unknown) {
      addToast("error", e instanceof Error ? e.message : "Download failed");
    } finally {
      setter(false);
    }
  }

  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-report, #printable-report * { visibility: visible !important; }
          #printable-report { position: fixed; inset: 0; background: white; padding: 24px; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Toast container */}
      <div className="fixed right-4 top-4 z-[300] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold shadow-xl pointer-events-auto ${
                t.type === "success"
                  ? "bg-brand-500/95 text-black"
                  : "bg-red-500/95 text-white"
              }`}
            >
              {t.type === "success" ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 no-print">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy("reports")}</h1>
            <p className="mt-1 text-sm text-black/55 dark:text-white/55">{today}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Scope selector */}
            <div className="relative">
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="appearance-none rounded-lg border border-black/15 bg-white pl-3 pr-8 py-2 text-sm font-semibold outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/[0.06]"
              >
                {SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
            </div>

            {/* Download PDF */}
            <button
              onClick={() => handleDownload("pdf")}
              disabled={pdfLoading}
              className="no-print inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-black text-black hover:bg-brand-600 hover:text-white disabled:opacity-50"
            >
              {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              PDF
            </button>

            {/* Download Excel */}
            <button
              onClick={() => handleDownload("excel")}
              disabled={xlsxLoading}
              className="no-print inline-flex items-center gap-2 rounded-lg border border-black/15 bg-white px-4 py-2 text-sm font-black text-black/70 hover:border-brand-500 hover:text-brand-600 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-white/70 dark:hover:text-brand-400"
            >
              {xlsxLoading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              Excel
            </button>

            {/* Print */}
            <button
              onClick={() => window.print()}
              disabled={loading || !data}
              className="no-print inline-flex items-center gap-2 rounded-lg border border-black/15 bg-white px-4 py-2 text-sm font-black text-black/70 hover:border-brand-500 hover:text-brand-600 disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:text-white/70 dark:hover:text-brand-400"
            >
              <Printer size={14} />
              {copy("downloadPdf")}
            </button>
          </div>
        </div>

        {error && (
          <div className="no-print rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        {loading && (
          <div className="no-print grid gap-4 sm:grid-cols-2">
            {[0,1,2,3].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />)}
          </div>
        )}

        {data && (
          <div id="printable-report" ref={printRef} className="space-y-6">
            {/* Print-only title */}
            <div className="hidden print:block mb-4">
              <h1 className="text-2xl font-black">FastResult — Analytics Report</h1>
              <p className="text-sm text-gray-500">{today}</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { icon: <Users size={20} />, label: copy("totalMembers"), value: fmt(data.totalMembers), color: "text-blue-600 bg-blue-500/10" },
                { icon: <Activity size={20} />, label: copy("activeMembers"), value: fmt(data.activeMembers), color: "text-brand-600 bg-brand-500/10 dark:text-brand-400" },
                { icon: <TrendingUp size={20} />, label: copy("todayCheckIns"), value: fmt(data.todayAttendance), color: "text-emerald-600 bg-emerald-500/10" },
                { icon: <DollarSign size={20} />, label: copy("monthlyRevenue"), value: fmtUsd(data.revenue), color: "text-amber-600 bg-amber-500/10" },
              ].map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-black/8 bg-white/80 p-4 shadow-sm dark:border-white/8 dark:bg-white/[0.06]"
                >
                  <div className={`mb-2 inline-flex rounded-lg p-2 ${card.color}`}>{card.icon}</div>
                  <p className="text-xs font-semibold text-black/50 dark:text-white/50">{card.label}</p>
                  <p className="text-xl font-black">{card.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Monthly Revenue Table */}
            <div className="rounded-xl border border-black/10 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.06] overflow-hidden">
              <div className="border-b border-black/8 px-5 py-4 dark:border-white/8">
                <h2 className="font-black">{copy("monthlyRevenue")}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/8 dark:border-white/8">
                      {["Month", copy("revenue"), "Visits"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-black/40 dark:text-white/40">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthlyRevenue.map((row, i) => (
                      <tr key={i} className="border-b border-black/5 last:border-0 hover:bg-black/2 dark:border-white/5 dark:hover:bg-white/2">
                        <td className="px-4 py-2.5 font-semibold">{row.month}</td>
                        <td className="px-4 py-2.5 font-mono">{fmtUsd(row.revenue)}</td>
                        <td className="px-4 py-2.5 font-mono text-black/60 dark:text-white/60">{fmt(row.visits)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-brand-500/5">
                      <td className="px-4 py-2.5 font-black">Total</td>
                      <td className="px-4 py-2.5 font-black text-brand-700 dark:text-brand-400">
                        {fmtUsd(data.monthlyRevenue.reduce((s, r) => s + r.revenue, 0))}
                      </td>
                      <td className="px-4 py-2.5 font-black text-black/60 dark:text-white/60">
                        {fmt(data.monthlyRevenue.reduce((s, r) => s + r.visits, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Membership Breakdown + Top Trainers */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-black/10 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.06] overflow-hidden">
                <div className="border-b border-black/8 px-5 py-4 dark:border-white/8">
                  <h2 className="font-black">{copy("memberships")}</h2>
                </div>
                {data.membershipBreakdown.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-black/40 dark:text-white/40">No active memberships</p>
                ) : (
                  <div className="divide-y divide-black/5 dark:divide-white/5">
                    {data.membershipBreakdown.map((m, i) => {
                      const total = data.membershipBreakdown.reduce((s, x) => s + x.count, 0);
                      const pct = total ? Math.round((m.count / total) * 100) : 0;
                      return (
                        <div key={i} className="flex items-center justify-between px-5 py-3">
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{PERIOD_LABELS[m.period] ?? m.period}</p>
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/8 dark:bg-white/8">
                              <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <div className="ml-4 text-right">
                            <span className="text-sm font-black">{m.count}</span>
                            <span className="ml-1 text-xs text-black/40 dark:text-white/40">({pct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-black/10 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.06] overflow-hidden">
                <div className="border-b border-black/8 px-5 py-4 dark:border-white/8">
                  <h2 className="font-black">{copy("trainers")}</h2>
                </div>
                {data.topTrainers.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-black/40 dark:text-white/40">No trainers yet</p>
                ) : (
                  <div className="divide-y divide-black/5 dark:divide-white/5">
                    {data.topTrainers.map((t, i) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500/15 text-xs font-black text-brand-700 dark:text-brand-400">{i + 1}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{t.name}</p>
                          <p className="text-xs text-black/45 dark:text-white/45">{t.memberCount} members</p>
                        </div>
                        <span className="text-sm font-black text-amber-600">★ {t.rating.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Download buttons (in-report, no-print) */}
            <div className="no-print flex flex-wrap gap-3">
              <button
                onClick={() => handleDownload("pdf")}
                disabled={pdfLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-black text-black hover:bg-brand-600 hover:text-white disabled:opacity-50"
              >
                {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Download PDF
              </button>
              <button
                onClick={() => handleDownload("excel")}
                disabled={xlsxLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-black/15 bg-white px-5 py-2.5 text-sm font-black text-black/70 hover:border-brand-500 hover:text-brand-600 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-white/70"
              >
                {xlsxLoading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                Download Excel
              </button>
            </div>

            {/* Footer */}
            <div className="rounded-xl border border-black/8 bg-black/3 px-5 py-3 dark:border-white/8 dark:bg-white/3">
              <div className="flex items-center justify-between text-xs text-black/40 dark:text-white/40">
                <span>FastResult Enterprise SaaS</span>
                <span>Generated: {today}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
