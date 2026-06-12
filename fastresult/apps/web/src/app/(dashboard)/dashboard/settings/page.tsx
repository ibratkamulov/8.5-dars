"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import type { Language } from "@fastresult/shared";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/lang-context";
import { api } from "@/lib/api";

const langs: { value: Language; label: string }[] = [
  { value: "uz", label: "O'zbek" },
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { lang, setLang, copy } = useLang();
  const { resolvedTheme, setTheme } = useTheme();
  const [pwForm, setPwForm] = useState({ current: "", next: "" });
  const [saved, setSaved] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handlePwChange(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.next.length < 8) {
      setPwError("Password must be at least 8 characters");
      return;
    }
    setPwError("");
    setPwSaving(true);
    try {
      await api.auth.changePassword(pwForm.current, pwForm.next);
      setPwForm({ current: "", next: "" });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy("settings")}</h1>
        <p className="mt-1 text-sm text-black/55 dark:text-white/55">{copy("profileSettings")}</p>
      </div>

      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-brand-500/10 px-4 py-3 text-sm font-semibold text-brand-700 dark:text-brand-400"
        >
          ✓ {copy("saveChanges")} — saved
        </motion.div>
      )}

      {/* Profile */}
      <div className="rounded-xl border border-black/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
        <h2 className="mb-4 font-black">{copy("profileSettings")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">{copy("fullName")}</label>
            <input
              defaultValue={user?.fullName ?? ""}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-white/5"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">{copy("email")}</label>
            <input
              defaultValue={user?.email ?? ""}
              type="email"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-white/5"
            />
          </div>
        </div>
        <button onClick={handleSave} className="mt-4 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-black text-black hover:bg-brand-600 hover:text-white">
          {copy("saveChanges")}
        </button>
      </div>

      {/* Language */}
      <div className="rounded-xl border border-black/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
        <h2 className="mb-4 font-black">{copy("language")}</h2>
        <div className="flex flex-wrap gap-2">
          {langs.map((l) => (
            <button
              key={l.value}
              onClick={() => setLang(l.value)}
              className={`rounded-lg border-2 px-5 py-2.5 text-sm font-bold transition ${
                lang === l.value
                  ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-400"
                  : "border-black/10 hover:border-brand-500/40 dark:border-white/10"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="rounded-xl border border-black/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
        <h2 className="mb-4 font-black">{copy("theme")}</h2>
        <div className="flex gap-3">
          {[
            { value: "light", icon: <Sun size={18} />, label: copy("lightMode") },
            { value: "dark", icon: <Moon size={18} />, label: copy("darkMode") },
            { value: "system", icon: <span className="text-base">⚙</span>, label: "System" },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-bold transition ${
                resolvedTheme === t.value
                  ? "border-brand-500 bg-brand-500/10"
                  : "border-black/10 hover:border-brand-500/40 dark:border-white/10"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Change password */}
      <div className="rounded-xl border border-black/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
        <h2 className="mb-4 font-black">{copy("changePassword")}</h2>
        {pwError && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{pwError}</div>
        )}
        <form onSubmit={handlePwChange} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">{copy("currentPassword")}</label>
            <input
              type="password"
              value={pwForm.current}
              onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-white/5"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">{copy("newPassword")}</label>
            <input
              type="password"
              value={pwForm.next}
              onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-white/5"
              placeholder="Min 8 characters"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={pwSaving}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-black text-black hover:bg-brand-600 hover:text-white disabled:opacity-60"
            >
              {pwSaving && <Loader2 size={14} className="animate-spin" />}
              {copy("changePassword")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
