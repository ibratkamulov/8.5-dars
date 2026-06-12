"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, QrCode, X } from "lucide-react";
import QRCode from "react-qr-code";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/lang-context";
import { api, type MembershipItem } from "@/lib/api";
import type { TKey } from "@/lib/i18n";

function DaysBar({ remaining, total }: { remaining: number; total: number }) {
  const pct = Math.max(0, Math.min((remaining / total) * 100, 100));
  const color = pct > 30 ? "bg-brand-500" : pct > 10 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const PERIOD_DAYS: Record<string, number> = {
  DAILY: 1, WEEKLY: 7, MONTHLY: 30, QUARTERLY: 90, YEARLY: 365
};

type QrData = { qrToken: string; memberName: string; expiresAt: string | null };

function QrModal({ data, onClose }: { data: QrData; onClose: () => void }) {
  const { copy } = useLang();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-xs rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl text-center"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 hover:bg-black/8 dark:hover:bg-white/8"
        >
          <X size={16} />
        </button>
        <p className="mb-1 font-black text-lg">{data.memberName}</p>
        <p className="mb-5 text-xs text-black/50 dark:text-white/50">{copy("scanThis")}</p>
        <div className="mx-auto w-fit rounded-xl bg-white p-4 shadow-inner">
          <QRCode value={data.qrToken} size={200} />
        </div>
        {data.expiresAt && (
          <p className="mt-4 text-xs text-black/50 dark:text-white/50">
            {copy("qrValidUntil")}: <span className="font-semibold">{new Date(data.expiresAt).toLocaleDateString()}</span>
          </p>
        )}
      </motion.div>
    </div>
  );
}

export default function MembershipsPage() {
  const { user } = useAuth();
  const { copy } = useLang();
  const [items, setItems] = useState<MembershipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qrData, setQrData] = useState<QrData | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.memberships.list(user.id)
      .then(setItems)
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : copy("error");
        if (!msg.toLowerCase().includes("not found")) setError(msg);
      })
      .finally(() => setLoading(false));
  }, [user, copy]);

  async function handleShowQr() {
    setQrLoading(true);
    try {
      const d = await api.attendance.myQr();
      setQrData(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy("error"));
    } finally {
      setQrLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy("memberships")}</h1>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">{items.length} {copy("memberships").toLowerCase()}</p>
        </div>
        <div className="flex gap-2">
          {user?.role === "MEMBER" && (
            <button
              onClick={handleShowQr}
              disabled={qrLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-white/5 px-4 py-2.5 text-sm font-black text-black/80 dark:text-white/80 hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-50 transition"
            >
              <QrCode size={16} />
              {copy("showQr")}
            </button>
          )}
          <button className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-black text-black hover:bg-brand-600 hover:text-white">
            <CreditCard size={16} />
            {copy("newMembership")}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {loading && (
        <div className="space-y-3">
          {[0,1,2].map((i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />)}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-black/20 bg-white/60 p-12 text-center dark:border-white/15 dark:bg-white/[0.03]">
          <CreditCard size={40} className="mx-auto text-brand-500 opacity-50" />
          <p className="mt-3 font-semibold text-black/55 dark:text-white/55">{copy("noMemberships")}</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-4">
          {items.map((m, i) => {
            const periodDays = PERIOD_DAYS[m.period] ?? 30;
            const expires = new Date(m.expiresAt);
            const isExpired = expires < new Date();
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/15">
                      <CreditCard size={20} className="text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                      <p className="font-black">{m.planName}</p>
                      <p className="text-xs text-black/50 dark:text-white/50">
                        {copy(m.period as TKey)} · {copy("startsAt")} {new Date(m.startsAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    isExpired
                      ? "bg-red-500/15 text-red-600 dark:text-red-400"
                      : m.remainingDays < 7
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                      : "bg-brand-500/15 text-brand-700 dark:text-brand-400"
                  }`}>
                    {isExpired ? copy("overdue") : `${m.remainingDays} ${copy("remainingDays")}`}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-black/50 dark:text-white/50">
                    <span>{copy("expiresAt")}: {expires.toLocaleDateString()}</span>
                    <span>{m.remainingDays} / {periodDays} days</span>
                  </div>
                  <DaysBar remaining={m.remainingDays} total={periodDays} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {qrData && <QrModal data={qrData} onClose={() => setQrData(null)} />}
      </AnimatePresence>
    </div>
  );
}
