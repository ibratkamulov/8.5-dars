"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, Clock, CreditCard, Loader2, LogIn } from "lucide-react";
import { api, type NotificationItem } from "@/lib/api";
import { useLang } from "@/lib/lang-context";

function notifIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes("expir") || t.includes("membership")) return <Clock size={14} className="text-amber-500" />;
  if (t.includes("payment") || t.includes("paid")) return <CreditCard size={14} className="text-brand-500" />;
  if (t.includes("attendance") || t.includes("check")) return <LogIn size={14} className="text-blue-500" />;
  return <Bell size={14} className="text-black/40 dark:text-white/40" />;
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function NotificationBell() {
  const { copy } = useLang();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loadUnread = useCallback(() => {
    api.notifications.unreadCount().then((r) => setUnread(r.count)).catch(() => {});
  }, []);

  useEffect(() => {
    loadUnread();
    const t = setInterval(loadUnread, 30_000);
    return () => clearInterval(t);
  }, [loadUnread]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  async function handleOpen() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    try {
      const list = await api.notifications.list();
      setItems(list);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAll() {
    await api.notifications.markAllRead();
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString(), status: "READ" })));
  }

  async function handleMarkOne(id: string) {
    await api.notifications.markRead(id);
    setUnread((c) => Math.max(0, c - 1));
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString(), status: "READ" } : n));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-black/55 transition hover:bg-black/5 hover:text-black dark:text-white/55 dark:hover:bg-white/5 dark:hover:text-white"
        title={copy("notifications")}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            className="absolute left-0 top-full z-[200] mt-2 w-80 overflow-hidden rounded-xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-gray-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/8 dark:border-white/8 px-4 py-3">
              <p className="font-black text-sm">{copy("notifications")}</p>
              {unread > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  <Check size={12} /> {copy("markAllRead")}
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-brand-500" />
                </div>
              )}
              {!loading && items.length === 0 && (
                <p className="py-8 text-center text-sm text-black/40 dark:text-white/40">
                  {copy("noNotifications")}
                </p>
              )}
              {!loading && items.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <button
                    key={n.id}
                    onClick={() => isUnread && handleMarkOne(n.id)}
                    className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-black/4 dark:hover:bg-white/4 ${
                      isUnread ? "bg-brand-500/5" : ""
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 ${isUnread ? "opacity-100" : "opacity-40"}`}>
                      {notifIcon(n.title)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black">{n.title}</p>
                      <p className="mt-0.5 text-xs text-black/55 dark:text-white/55 line-clamp-2">{n.body}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-black/35 dark:text-white/35">
                      {timeAgo(n.createdAt)}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
