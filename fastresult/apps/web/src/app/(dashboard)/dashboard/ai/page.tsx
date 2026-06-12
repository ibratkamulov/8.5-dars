"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, CheckCircle2, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/lang-context";
import { api, type AiRecommendation } from "@/lib/api";

export default function AiPage() {
  const { user } = useAuth();
  const { copy } = useLang();
  const [data, setData] = useState<AiRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.ai.recommendations(user.id);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy("error"));
    } finally {
      setLoading(false);
    }
  }, [user, copy]);

  useEffect(() => { load(); }, [load]);

  const cards = data
    ? [
        { icon: "💪", key: "aiWorkout",    value: data.workout,    color: "from-brand-500/10 to-brand-500/5" },
        { icon: "🥗", key: "aiNutrition",  value: data.nutrition,  color: "from-emerald-500/10 to-emerald-500/5" },
        { icon: "📈", key: "aiProgress",   value: data.progress,   color: "from-blue-500/10 to-blue-500/5" },
        { icon: "🎯", key: "aiPrediction", value: data.prediction, color: "from-purple-500/10 to-purple-500/5" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy("aiRecommendations")}</h1>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">{copy("ai")}</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-black text-black transition hover:bg-brand-600 hover:text-white disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {copy("regenerate")}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {loading && !data && (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="relative">
            <Bot size={40} className="text-brand-500" />
            <Loader2 size={16} className="absolute -right-1 -top-1 animate-spin text-brand-400" />
          </div>
          <p className="text-sm text-black/50 dark:text-white/50">{copy("aiLoading")}</p>
        </div>
      )}

      <AnimatePresence>
        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {cards.map((c, i) => (
                <motion.div
                  key={c.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className={`rounded-xl border border-black/10 bg-gradient-to-br ${c.color} p-5 shadow-sm dark:border-white/10`}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xl">{c.icon}</span>
                    <h2 className="font-black">{copy(c.key as import("@/lib/i18n").TKey)}</h2>
                  </div>
                  <p className="text-sm leading-relaxed text-black/70 dark:text-white/70">{c.value}</p>
                </motion.div>
              ))}
            </div>

            {data.suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32 }}
                className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
              >
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles size={16} className="text-brand-500" />
                  <h2 className="font-black">{copy("aiSuggestions")}</h2>
                </div>
                <ul className="space-y-2">
                  {data.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-black/70 dark:text-white/70">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-brand-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
