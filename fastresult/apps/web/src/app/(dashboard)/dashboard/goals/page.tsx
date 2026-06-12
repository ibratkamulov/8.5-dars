"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Target } from "lucide-react";
import { fitnessGoals } from "@fastresult/shared";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/lang-context";
import { api, type GoalItem } from "@/lib/api";
import type { TKey } from "@/lib/i18n";

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
      <div
        className="h-full rounded-full bg-brand-500 transition-all"
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

export default function GoalsPage() {
  const { user } = useAuth();
  const { copy } = useLang();
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState<string>(fitnessGoals[0]);
  const [newTarget, setNewTarget] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.goals.list(user.id)
      .then(setGoals)
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : copy("error");
        if (!msg.toLowerCase().includes("not found")) setError(msg);
      })
      .finally(() => setLoading(false));
  }, [user, copy]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newTarget) return;
    setSubmitting(true);
    try {
      const g = await api.goals.create(user.id, { type: newType, targetValue: parseFloat(newTarget) });
      setGoals((prev) => [g, ...prev]);
      setShowForm(false);
      setNewTarget("");
    } catch (err) {
      setError(err instanceof Error ? err.message : copy("error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy("goals")}</h1>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            {goals.filter(g => g.status === "ACTIVE").length} {copy("activeGoals").toLowerCase()}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-black text-black hover:bg-brand-600 hover:text-white"
        >
          <Plus size={16} />
          {copy("addGoal")}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAdd}
          className="rounded-xl border border-brand-500/30 bg-brand-500/5 p-5"
        >
          <h2 className="mb-4 font-black">{copy("addGoal")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold">{copy("goalType")}</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm dark:border-white/15 dark:bg-white/5"
              >
                {fitnessGoals.map((g) => (
                  <option key={g} value={g}>{copy(g as TKey)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold">{copy("targetValue")}</label>
              <input
                type="number"
                required
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                className="w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm dark:border-white/15 dark:bg-white/5"
                placeholder="e.g. 75"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={submitting} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-black text-black hover:bg-brand-600 hover:text-white disabled:opacity-50">
              {submitting ? copy("loading") : copy("save")}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-black/15 px-4 py-2 text-sm font-semibold dark:border-white/15">
              {copy("cancel")}
            </button>
          </div>
        </motion.form>
      )}

      {loading && (
        <div className="space-y-3">
          {[0,1,2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />)}
        </div>
      )}

      {!loading && goals.length === 0 && (
        <div className="rounded-xl border border-dashed border-black/20 bg-white/60 p-12 text-center dark:border-white/15 dark:bg-white/[0.03]">
          <Target size={40} className="mx-auto text-brand-500 opacity-50" />
          <p className="mt-3 font-semibold text-black/55 dark:text-white/55">{copy("noGoals")}</p>
        </div>
      )}

      {!loading && goals.length > 0 && (
        <div className="space-y-3">
          {goals.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-black">{copy(g.type as TKey)}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      g.status === "ACTIVE"
                        ? "bg-brand-500/15 text-brand-700 dark:text-brand-400"
                        : "bg-black/10 text-black/50 dark:bg-white/10 dark:text-white/50"
                    }`}>
                      {g.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-black/55 dark:text-white/55">
                    {g.currentValue !== null && <span>{copy("currentValue")}: <strong>{g.currentValue}</strong></span>}
                    {g.targetValue !== null && <span>{copy("targetValue")}: <strong>{g.targetValue}</strong></span>}
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-black/50 dark:text-white/50">{copy("progressPct")}</span>
                      <span className="font-bold text-brand-600 dark:text-brand-400">{g.progressPercentage.toFixed(0)}%</span>
                    </div>
                    <ProgressBar pct={g.progressPercentage} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
