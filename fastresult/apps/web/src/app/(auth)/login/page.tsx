"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email, password });
      router.push(params.get("next") ?? "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {error && (
        <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-white/5"
            placeholder="admin@fastresult.uz"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Password</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-black/15 bg-white py-2.5 pl-3 pr-10 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-white/5"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-lg bg-brand-500 py-2.5 text-sm font-black text-black transition hover:bg-brand-600 hover:text-white disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="mt-6 rounded-lg bg-brand-500/10 p-3 text-xs text-black/60 dark:text-white/60">
        <p className="font-semibold text-brand-700 dark:text-brand-400">Demo credentials</p>
        <p className="mt-1">Email: <span className="font-mono">admin@fastresult.uz</span></p>
        <p>Password: <span className="font-mono">FastResult123</span></p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/80 p-8 shadow-xl backdrop-blur dark:border-white/10 dark:bg-white/[0.06]">
      <h1 className="text-2xl font-black tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-black/55 dark:text-white/55">Sign in to your account</p>
      <Suspense fallback={<div className="mt-6 h-48 animate-pulse rounded-lg bg-black/5 dark:bg-white/5" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
