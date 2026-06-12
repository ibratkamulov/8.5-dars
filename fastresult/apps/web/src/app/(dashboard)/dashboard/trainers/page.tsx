"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Dumbbell, Search, Star } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { api, type TrainerItem } from "@/lib/api";

export default function TrainersPage() {
  const { copy } = useLang();
  const [trainers, setTrainers] = useState<TrainerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.trainers.list()
      .then(setTrainers)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : copy("error")))
      .finally(() => setLoading(false));
  }, [copy]);

  const filtered = trainers.filter(
    (t) =>
      t.user.fullName.toLowerCase().includes(query.toLowerCase()) ||
      t.specialties.some((s) => s.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy("trainers")}</h1>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">{trainers.length} {copy("trainers").toLowerCase()}</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-black text-black hover:bg-brand-600 hover:text-white">
          <Dumbbell size={16} />
          {copy("addTrainer")}
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={copy("search")}
          className="w-full rounded-lg border border-black/15 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-white/5 sm:max-w-sm"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0,1,2].map((i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-black/20 bg-white/60 p-12 text-center dark:border-white/15 dark:bg-white/[0.03]">
          <Dumbbell size={40} className="mx-auto text-brand-500 opacity-50" />
          <p className="mt-3 font-semibold text-black/55 dark:text-white/55">{copy("noTrainers")}</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tr, i) => (
            <motion.div
              key={tr.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
            >
              <div className="flex items-start justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500/15 text-xl font-black text-brand-700 dark:text-brand-400">
                  {tr.user.fullName.charAt(0)}
                </div>
                <div className="flex items-center gap-1 text-sm font-semibold text-amber-500">
                  <Star size={14} fill="currentColor" />
                  {tr.rating.toFixed(1)}
                </div>
              </div>
              <p className="mt-3 font-black">{tr.user.fullName}</p>
              <p className="text-xs text-black/50 dark:text-white/50">{tr.user.email}</p>
              {tr.bio && <p className="mt-2 text-xs text-black/60 dark:text-white/60 line-clamp-2">{tr.bio}</p>}
              {tr.specialties.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {tr.specialties.slice(0, 3).map((s) => (
                    <span key={s} className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:text-brand-400">
                      {s}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-black/50 dark:text-white/50">
                <span>{tr._count?.members ?? 0} {copy("members").toLowerCase()}</span>
                <button className="rounded-md bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-500/25 dark:text-brand-400">
                  {copy("view")}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
