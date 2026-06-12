"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Utensils } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/lang-context";
import { api, type NutritionLog } from "@/lib/api";

function MacroBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className="text-black/55 dark:text-white/55">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function NutritionPage() {
  const { user } = useAuth();
  const { copy } = useLang();
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ calories: "", proteinG: "", carbsG: "", fatsG: "", waterMl: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.nutrition.list(user.id)
      .then(setLogs)
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : copy("error");
        if (!msg.toLowerCase().includes("not found")) setError(msg);
      })
      .finally(() => setLoading(false));
  }, [user, copy]);

  const todayLogs = logs.filter((l) => {
    const d = new Date(l.loggedAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const totals = todayLogs.reduce(
    (acc, l) => ({
      calories: acc.calories + l.calories,
      proteinG: acc.proteinG + l.proteinG,
      carbsG: acc.carbsG + l.carbsG,
      fatsG: acc.fatsG + l.fatsG,
      waterMl: acc.waterMl + l.waterMl,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatsG: 0, waterMl: 0 }
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const log = await api.nutrition.create(user.id, {
        calories: parseInt(form.calories),
        proteinG: parseInt(form.proteinG),
        carbsG: parseInt(form.carbsG),
        fatsG: parseInt(form.fatsG),
        waterMl: parseInt(form.waterMl),
      });
      setLogs((prev) => [log, ...prev]);
      setShowForm(false);
      setForm({ calories: "", proteinG: "", carbsG: "", fatsG: "", waterMl: "" });
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
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy("nutrition")}</h1>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">{copy("nutritionToday")}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-black text-black hover:bg-brand-600 hover:text-white"
        >
          <Plus size={16} />
          {copy("addLog")}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* Today summary */}
      {todayLogs.length > 0 && (
        <div className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
          <h2 className="mb-4 font-black">{copy("nutritionToday")}</h2>
          <div className="mb-4 flex items-end gap-2">
            <span className="text-4xl font-black">{totals.calories}</span>
            <span className="mb-1 text-sm text-black/55 dark:text-white/55">{copy("calories")}</span>
          </div>
          <div className="space-y-3">
            <MacroBar label={copy("protein")} value={totals.proteinG} max={200} color="bg-blue-500" />
            <MacroBar label={copy("carbs")} value={totals.carbsG} max={300} color="bg-amber-500" />
            <MacroBar label={copy("fats")} value={totals.fatsG} max={80} color="bg-red-500" />
            <MacroBar label={copy("water")} value={totals.waterMl} max={3000} color="bg-brand-500" />
          </div>
        </div>
      )}

      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAdd}
          className="rounded-xl border border-brand-500/30 bg-brand-500/5 p-5"
        >
          <h2 className="mb-4 font-black">{copy("logNutrition")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(["calories", "proteinG", "carbsG", "fatsG", "waterMl"] as const).map((field) => (
              <div key={field}>
                <label className="mb-1.5 block text-sm font-semibold">
                  {copy(field === "calories" ? "calories" : field === "proteinG" ? "protein" : field === "carbsG" ? "carbs" : field === "fatsG" ? "fats" : "water")}
                </label>
                <input
                  type="number"
                  required
                  value={form[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  className="w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm dark:border-white/15 dark:bg-white/5"
                  placeholder="0"
                />
              </div>
            ))}
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

      {loading && <div className="h-48 animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />}

      {!loading && logs.length === 0 && (
        <div className="rounded-xl border border-dashed border-black/20 bg-white/60 p-12 text-center dark:border-white/15 dark:bg-white/[0.03]">
          <Utensils size={40} className="mx-auto text-brand-500 opacity-50" />
          <p className="mt-3 font-semibold text-black/55 dark:text-white/55">{copy("noNutrition")}</p>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div className="space-y-3">
          {logs.slice(0, 10).map((l, i) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between rounded-xl border border-black/10 bg-white/80 px-5 py-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/15">
                  <Utensils size={16} className="text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <p className="font-semibold">{l.calories} {copy("calories")}</p>
                  <p className="text-xs text-black/50 dark:text-white/50">
                    {new Date(l.loggedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="hidden gap-4 text-xs text-black/55 dark:text-white/55 sm:flex">
                <span>P: {l.proteinG}g</span>
                <span>C: {l.carbsG}g</span>
                <span>F: {l.fatsG}g</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
