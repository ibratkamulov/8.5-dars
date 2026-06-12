"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Download, QrCode, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/lib/lang-context";
import { api } from "@/lib/api";

type QrData = {
  qrToken: string;
  memberName: string;
  expiresAt: string | null;
};

export default function MyQrPage() {
  const { copy } = useLang();
  const [qrData, setQrData] = useState<QrData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadQr = useCallback(async () => {
    try {
      const data = await api.attendance.myQr();
      setQrData(data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : copy("error"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [copy]);

  useEffect(() => {
    loadQr();
  }, [loadQr]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadQr();
  };

  const handleDownload = () => {
    if (!qrData) return;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(qrData.qrToken)}`;
    window.open(url, "_blank");
  };

  const qrImageUrl = qrData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData.qrToken)}&bgcolor=ffffff&color=000000&qzone=2`
    : null;

  const isExpired =
    qrData?.expiresAt ? new Date(qrData.expiresAt) < new Date() : false;

  const daysUntilExpiry = qrData?.expiresAt
    ? Math.ceil(
        (new Date(qrData.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/attendance"
          className="grid h-9 w-9 place-items-center rounded-lg border border-black/15 bg-white/80 text-black/60 transition hover:bg-black/5 dark:border-white/15 dark:bg-white/[0.06] dark:text-white/60"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight">{copy("myQrCode")}</h1>
          <p className="text-sm text-black/55 dark:text-white/55">{copy("checkInLong")}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      )}

      {!loading && qrData && (
        <div className="flex flex-col items-center gap-6">
          {/* QR Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-[#0d1f14]"
          >
            {/* Top section */}
            <div className="bg-brand-500 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-black/15">
                  <QrCode size={20} className="text-black" />
                </div>
                <div>
                  <p className="font-black text-black">FastResult</p>
                  <p className="text-xs text-black/60">{copy("membership")}</p>
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-4 p-6">
              <div className="relative rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/8">
                {qrImageUrl && (
                  <img
                    src={qrImageUrl}
                    alt="QR Code"
                    width={280}
                    height={280}
                    className="block h-[280px] w-[280px] rounded-lg"
                    draggable={false}
                  />
                )}
                {isExpired && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
                    <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">
                      {copy("overdue")}
                    </span>
                  </div>
                )}
              </div>

              {/* Member info */}
              <div className="w-full text-center">
                <p className="text-xl font-black">{qrData.memberName}</p>
                {qrData.expiresAt && (
                  <p
                    className={`mt-1 text-sm font-semibold ${
                      isExpired
                        ? "text-red-500"
                        : daysUntilExpiry !== null && daysUntilExpiry <= 7
                        ? "text-orange-500"
                        : "text-black/55 dark:text-white/55"
                    }`}
                  >
                    {copy("membershipExpires")}:{" "}
                    {new Date(qrData.expiresAt).toLocaleDateString()}
                    {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                      <span className="ml-1 text-xs">
                        ({daysUntilExpiry} {copy("remainingDays").toLowerCase()})
                      </span>
                    )}
                  </p>
                )}
                {!qrData.expiresAt && (
                  <p className="mt-1 text-sm text-black/45 dark:text-white/45">
                    {copy("noMembershipActive")}
                  </p>
                )}
              </div>

              {/* Token preview */}
              <div className="w-full rounded-lg bg-black/5 px-4 py-2 text-center dark:bg-white/5">
                <p className="font-mono text-xs text-black/40 dark:text-white/40 break-all">
                  {qrData.qrToken}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Action buttons */}
          <div className="flex w-full max-w-sm gap-3">
            <button
              onClick={handleDownload}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/15 bg-white/80 py-3 text-sm font-black transition hover:border-brand-500/40 hover:bg-brand-500/5 dark:border-white/15 dark:bg-white/[0.06]"
            >
              <Download size={16} />
              {copy("downloadQr")}
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-black text-black hover:bg-brand-600 hover:text-white disabled:opacity-60"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              {copy("refreshToken")}
            </button>
          </div>

          {/* Usage note */}
          <p className="max-w-sm text-center text-xs text-black/40 dark:text-white/40">
            Show this QR code at the gym entrance. The receptionist or trainer will scan it to check you in or out.
          </p>
        </div>
      )}
    </div>
  );
}
