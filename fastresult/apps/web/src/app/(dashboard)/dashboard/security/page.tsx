"use client";

import { useLang } from "@/lib/lang-context";

export default function SecurityPage() {
  const { copy } = useLang();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy("security")}</h1>
        <p className="mt-1 text-sm text-black/55 dark:text-white/55">
          Account security information and best practices
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            icon: "🔐",
            title: "Password Security",
            desc: "Use a strong, unique password with at least 12 characters. Mix letters, numbers, and symbols. Never reuse passwords across services.",
          },
          {
            icon: "🚪",
            title: "Session Management",
            desc: "Sessions expire after 30 days of inactivity. Always log out on shared or public devices to prevent unauthorized access.",
          },
          {
            icon: "📧",
            title: "Account Recovery",
            desc: "Keep your email address up to date. It is used for password recovery and important account notifications.",
          },
          {
            icon: "🛡️",
            title: "Access Control",
            desc: "Your account has role-based permissions. Contact your gym administrator if you need access changes or suspect unauthorized activity.",
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-black/8 bg-white/60 p-5 dark:border-white/8 dark:bg-white/[0.04]"
          >
            <p className="mb-2 text-2xl">{card.icon}</p>
            <p className="font-bold">{card.title}</p>
            <p className="mt-1 text-sm text-black/55 dark:text-white/55">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
