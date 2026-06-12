"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Camera, CheckCircle2, ScanLine, XCircle } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/lib/lang-context";
import { api, type ScanResult } from "@/lib/api";

type ScanState =
  | { status: "idle" }
  | { status: "scanning" }
  | { status: "success"; result: ScanResult }
  | { status: "error"; message: string };

// BarcodeDetector is not in the standard TS lib yet
declare class BarcodeDetector {
  constructor(options: { formats: string[] });
  detect(image: HTMLVideoElement | HTMLCanvasElement): Promise<{ rawValue: string; format: string }[]>;
  static getSupportedFormats(): Promise<string[]>;
}

export default function ScannerPage() {
  const { copy } = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const processingRef = useRef(false);

  const [scanState, setScanState] = useState<ScanState>({ status: "idle" });
  const [cameraError, setCameraError] = useState<string>("");
  const [barcodeSupported, setBarcodeSupported] = useState<boolean | null>(null);

  // ─── Check BarcodeDetector support ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported = "BarcodeDetector" in window;
    setBarcodeSupported(supported);
    if (supported) {
      detectorRef.current = new BarcodeDetector({ formats: ["qr_code"] });
    }
  }, []);

  // ─── Start camera ────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanState({ status: "scanning" });
        setCameraError("");
      }
    } catch {
      setCameraError(copy("cameraNotSupported"));
    }
  }, [copy]);

  // ─── Stop camera ─────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // ─── Scan loop ────────────────────────────────────────────────────────────────
  const scan = useCallback(async () => {
    if (!videoRef.current || !detectorRef.current || processingRef.current) {
      scanLoopRef.current = requestAnimationFrame(scan);
      return;
    }

    const video = videoRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      scanLoopRef.current = requestAnimationFrame(scan);
      return;
    }

    try {
      const barcodes = await detectorRef.current.detect(video);
      if (barcodes.length > 0) {
        processingRef.current = true;
        const token = barcodes[0].rawValue;
        stopCamera();
        setScanState({ status: "scanning" }); // keep scanning visually while calling API

        try {
          const result = await api.attendance.scan(token);
          setScanState({ status: "success", result });
        } catch (e) {
          setScanState({
            status: "error",
            message: e instanceof Error ? e.message : copy("error"),
          });
        } finally {
          processingRef.current = false;
        }
        return;
      }
    } catch {
      // Detection errors are non-fatal — keep looping
    }

    scanLoopRef.current = requestAnimationFrame(scan);
  }, [copy, stopCamera]);

  // ─── Start scan loop when camera is ready ────────────────────────────────────
  useEffect(() => {
    if (scanState.status === "scanning" && barcodeSupported && detectorRef.current) {
      scanLoopRef.current = requestAnimationFrame(scan);
    }
    return () => {
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    };
  }, [scanState.status, barcodeSupported, scan]);

  // ─── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleScanAnother = useCallback(() => {
    setScanState({ status: "idle" });
    processingRef.current = false;
    startCamera();
  }, [startCamera]);

  const isCheckIn = scanState.status === "success" && scanState.result.event === "CHECK_IN";
  const isCheckOut = scanState.status === "success" && scanState.result.event === "CHECK_OUT";

  function formatDuration(secs: number | null): string {
    if (!secs) return "—";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

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
          <h1 className="text-2xl font-black tracking-tight">{copy("attendanceScanner")}</h1>
          <p className="text-sm text-black/55 dark:text-white/55">{copy("scanInstructions")}</p>
        </div>
      </div>

      {/* BarcodeDetector not supported */}
      {barcodeSupported === false && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-orange-500/30 bg-orange-500/8 p-6 text-center"
        >
          <ScanLine size={40} className="mx-auto mb-3 text-orange-500 opacity-60" />
          <p className="font-black text-orange-700 dark:text-orange-400">{copy("barcodeNotSupported")}</p>
        </motion.div>
      )}

      {/* Camera error */}
      {cameraError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/8 p-4 text-sm text-red-600 dark:text-red-400">
          {cameraError}
        </div>
      )}

      {/* Idle state */}
      {scanState.status === "idle" && barcodeSupported !== false && !cameraError && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-5 rounded-xl border border-dashed border-black/20 bg-white/60 py-16 text-center dark:border-white/15 dark:bg-white/[0.03]"
        >
          <div className="grid h-20 w-20 place-items-center rounded-2xl bg-brand-500/15 text-brand-600 dark:text-brand-400">
            <Camera size={36} />
          </div>
          <div>
            <p className="text-lg font-black">{copy("scanQr")}</p>
            <p className="mt-1 text-sm text-black/55 dark:text-white/55">{copy("scanInstructions")}</p>
          </div>
          <button
            onClick={startCamera}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-2.5 font-black text-black hover:bg-brand-600 hover:text-white"
          >
            <Camera size={16} />
            {copy("checkIn")}
          </button>
        </motion.div>
      )}

      {/* Camera viewport */}
      {(scanState.status === "scanning" ||
        (scanState.status === "idle" && streamRef.current)) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative overflow-hidden rounded-xl border border-black/10 bg-black dark:border-white/10"
          style={{ aspectRatio: "4/3" }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanning overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-56 w-56">
              {/* Corner brackets */}
              <span className="absolute left-0 top-0 h-8 w-8 border-l-3 border-t-3 border-brand-500 rounded-tl-lg" />
              <span className="absolute right-0 top-0 h-8 w-8 border-r-3 border-t-3 border-brand-500 rounded-tr-lg" />
              <span className="absolute bottom-0 left-0 h-8 w-8 border-b-3 border-l-3 border-brand-500 rounded-bl-lg" />
              <span className="absolute bottom-0 right-0 h-8 w-8 border-b-3 border-r-3 border-brand-500 rounded-br-lg" />

              {/* Animated scan line */}
              <motion.div
                className="absolute left-2 right-2 h-0.5 bg-brand-500/80"
                animate={{ top: ["12%", "88%", "12%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </div>

          <div className="absolute bottom-4 left-0 right-0 text-center">
            <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur-sm">
              {copy("scanInstructions")}
            </span>
          </div>
        </motion.div>
      )}

      {/* Result — success */}
      <AnimatePresence>
        {scanState.status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`rounded-xl border p-6 ${
              isCheckIn
                ? "border-brand-500/40 bg-brand-500/8"
                : isCheckOut
                ? "border-blue-500/40 bg-blue-500/8"
                : "border-brand-500/40 bg-brand-500/8"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
                  isCheckIn
                    ? "bg-brand-500/20 text-brand-600 dark:text-brand-400"
                    : "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                }`}
              >
                <CheckCircle2 size={24} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                  {copy("scanSuccess")}
                </p>
                <p className="mt-1 text-lg font-black">{scanState.result.member.name}</p>
                <p className="text-sm text-black/55 dark:text-white/55">
                  {scanState.result.member.email}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-black ${
                      isCheckIn
                        ? "bg-brand-500 text-black"
                        : "bg-blue-500 text-white"
                    }`}
                  >
                    {isCheckIn ? copy("checkInEvent") : copy("checkOutEvent")}
                  </span>
                  <span className="rounded-full border border-black/15 px-3 py-1 text-sm font-semibold text-black/60 dark:border-white/15 dark:text-white/60">
                    {new Date(scanState.result.time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {scanState.result.durationSeconds !== null && (
                    <span className="rounded-full border border-black/15 px-3 py-1 text-sm font-semibold text-black/60 dark:border-white/15 dark:text-white/60">
                      {copy("duration")}: {formatDuration(scanState.result.durationSeconds)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleScanAnother}
              className="mt-4 w-full rounded-lg bg-black/8 py-2.5 text-sm font-black transition hover:bg-black/12 dark:bg-white/8 dark:hover:bg-white/12"
            >
              {copy("scanAnother")}
            </button>
          </motion.div>
        )}

        {/* Result — error */}
        {scanState.status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-xl border border-red-500/40 bg-red-500/8 p-6"
          >
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-red-500/20 text-red-600 dark:text-red-400">
                <XCircle size={24} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-red-500/70">
                  {copy("scanError")}
                </p>
                <p className="mt-1 font-black text-red-700 dark:text-red-400">
                  {scanState.message}
                </p>
              </div>
            </div>
            <button
              onClick={handleScanAnother}
              className="mt-4 w-full rounded-lg bg-red-500/15 py-2.5 text-sm font-black text-red-700 transition hover:bg-red-500/25 dark:text-red-400"
            >
              {copy("scanAnother")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
