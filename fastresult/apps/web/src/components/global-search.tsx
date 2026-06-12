"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Dumbbell, Loader2, Search, Star, Users } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { api, type SearchResult } from "@/lib/api";
import { useLang } from "@/lib/lang-context";

const STATUS_COLOR: Record<string, string> = {
  PAID: "text-brand-600 dark:text-brand-400",
  PENDING: "text-amber-600 dark:text-amber-400",
  FAILED: "text-red-600 dark:text-red-400",
};

export function GlobalSearch() {
  const { copy } = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim() || q.length < 2) { setResults(null); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.search.query(q);
        setResults(data);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const totalResults = results
    ? results.members.length + results.trainers.length + results.payments.length + results.memberships.length
    : 0;
  const hasResults = totalResults > 0;

  function navigate(href: string) {
    setOpen(false);
    setQ("");
    setResults(null);
    router.push(href);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 rounded-lg border border-black/10 bg-black/5 px-3 py-1.5 text-xs text-black/50 transition hover:bg-black/8 dark:border-white/10 dark:bg-white/5 dark:text-white/50 dark:hover:bg-white/8"
      >
        <Search size={13} />
        <span className="hidden sm:inline">{copy("searchAll")}</span>
        <span className="hidden sm:inline text-[10px] opacity-50 ml-1">Ctrl+K</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-black/10 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#0d1f14]/95"
          >
            <div className="flex items-center gap-2 border-b border-black/8 px-3 py-2.5 dark:border-white/8">
              {loading ? (
                <Loader2 size={14} className="shrink-0 animate-spin text-brand-500" />
              ) : (
                <Search size={14} className="shrink-0 text-black/40 dark:text-white/40" />
              )}
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={copy("searchAll")}
                className="w-full bg-transparent text-sm outline-none placeholder:text-black/35 dark:placeholder:text-white/35"
              />
            </div>

            <div className="max-h-80 overflow-y-auto py-1">
              {!q && (
                <p className="px-4 py-3 text-xs text-black/40 dark:text-white/40">
                  {copy("search")}...
                </p>
              )}

              {q.length > 0 && !loading && !hasResults && (
                <p className="px-4 py-3 text-xs text-black/40 dark:text-white/40">{copy("noResults")}</p>
              )}

              {results && results.members.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-black/35 dark:text-white/35">
                    <Users size={10} /> {copy("members")}
                  </p>
                  {results.members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => navigate(`/dashboard/members`)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-500/15 text-[11px] font-black text-brand-700 dark:text-brand-300">
                        {m.user.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{m.user.fullName}</p>
                        <p className="truncate text-xs text-black/45 dark:text-white/45">{m.user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results && results.trainers.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-black/35 dark:text-white/35">
                    <Dumbbell size={10} /> {copy("trainers")}
                  </p>
                  {results.trainers.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => navigate(`/dashboard/trainers`)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-500/15 text-[11px] font-black text-blue-700 dark:text-blue-300">
                        {t.user.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{t.user.fullName}</p>
                        <p className="truncate text-xs text-black/45 dark:text-white/45">{t.user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results && results.payments.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-black/35 dark:text-white/35">
                    <CreditCard size={10} /> {copy("payments")}
                  </p>
                  {results.payments.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/dashboard/payments`)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-500/15 text-[11px] font-black text-amber-700 dark:text-amber-300">
                        $
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{p.memberName}</p>
                        <p className="truncate text-xs text-black/45 dark:text-white/45">{p.planName}</p>
                      </div>
                      <span className={`shrink-0 text-xs font-bold ${STATUS_COLOR[p.status] ?? ""}`}>
                        ${p.amount.toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {results && results.memberships.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-black/35 dark:text-white/35">
                    <Star size={10} /> {copy("memberships")}
                  </p>
                  {results.memberships.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => navigate(`/dashboard/memberships`)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-purple-500/15 text-[11px] font-black text-purple-700 dark:text-purple-300">
                        M
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{m.memberName}</p>
                        <p className="truncate text-xs text-black/45 dark:text-white/45">{m.planName}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
