"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Activity, BarChart3, Bot, CalendarCheck, CalendarDays, ChevronDown, ClipboardList,
  CreditCard, DollarSign, Dumbbell, FileText, Languages, LogOut, MapPin, Menu, Moon,
  Settings, ShieldCheck, Sun, TrendingUp, Trophy, Users, X,
} from "lucide-react";
import { GlobalSearch } from "@/components/global-search";
import { NotificationBell } from "@/components/notification-bell";
import { useTheme } from "next-themes";
import type { Role } from "@fastresult/shared";
import { useAuth } from "@/lib/auth";
import { LangProvider, useLang } from "@/lib/lang-context";
import type { TKey } from "@/lib/i18n";

// ─── Nav config ──────────────────────────────────────────────────────────────

type NavItem = { key: TKey; icon: React.ReactNode; href: string; roles?: Role[] };

const NAV: NavItem[] = [
  { key: "overview",     icon: <Activity size={17} />,      href: "/dashboard" },
  { key: "attendance",   icon: <CalendarCheck size={17} />, href: "/dashboard/attendance" },
  { key: "members",      icon: <Users size={17} />,         href: "/dashboard/members",     roles: ["SUPER_ADMIN", "GYM_OWNER", "TRAINER"] },
  { key: "trainers",     icon: <Dumbbell size={17} />,      href: "/dashboard/trainers",    roles: ["SUPER_ADMIN", "GYM_OWNER"] },
  { key: "trainerSchedule", icon: <ClipboardList size={17} />, href: "/dashboard/schedule", roles: ["SUPER_ADMIN", "GYM_OWNER", "TRAINER"] },
  { key: "goals",        icon: <Trophy size={17} />,        href: "/dashboard/goals",       roles: ["TRAINER", "MEMBER"] },
  { key: "nutrition",    icon: <Bot size={17} />,           href: "/dashboard/nutrition",   roles: ["TRAINER", "MEMBER"] },
  { key: "workout",      icon: <ClipboardList size={17} />, href: "/dashboard/workout",     roles: ["TRAINER", "MEMBER"] },
  { key: "progressCharts", icon: <TrendingUp size={17} />, href: "/dashboard/progress",    roles: ["TRAINER", "MEMBER"] },
  { key: "attendanceCalendar", icon: <CalendarDays size={17} />, href: "/dashboard/calendar", roles: ["MEMBER"] },
  { key: "aiRecommendations", icon: <Bot size={17} />,     href: "/dashboard/ai",          roles: ["TRAINER", "MEMBER"] },
  { key: "analytics",    icon: <BarChart3 size={17} />,     href: "/dashboard/analytics",   roles: ["SUPER_ADMIN", "GYM_OWNER"] },
  { key: "payments",     icon: <DollarSign size={17} />,    href: "/dashboard/payments",    roles: ["SUPER_ADMIN", "GYM_OWNER"] },
  { key: "memberships",  icon: <CreditCard size={17} />,    href: "/dashboard/memberships", roles: ["GYM_OWNER", "MEMBER"] },
  { key: "discovery",    icon: <MapPin size={17} />,        href: "/dashboard/discovery",   roles: ["MEMBER"] },
  { key: "reports",      icon: <DollarSign size={17} />,    href: "/dashboard/reports",     roles: ["SUPER_ADMIN", "GYM_OWNER"] },
  { key: "auditLog",     icon: <FileText size={17} />,      href: "/dashboard/audit",       roles: ["SUPER_ADMIN", "GYM_OWNER"] },
  { key: "onboarding",   icon: <Trophy size={17} />,        href: "/dashboard/onboarding",  roles: ["MEMBER"] },
  { key: "settings",     icon: <Settings size={17} />,      href: "/dashboard/settings" },
  { key: "security",     icon: <ShieldCheck size={17} />,   href: "/dashboard/security",    roles: ["SUPER_ADMIN"] },
];

const langs = ["uz", "ru", "en"] as const;
const langLabels = { uz: "UZ", ru: "RU", en: "EN" };

// ─── Language dropdown ────────────────────────────────────────────────────────

function LangDropdown() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative mb-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-black/10 bg-black/5 px-3 py-2 text-sm font-bold transition hover:bg-black/8 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8"
      >
        <div className="flex items-center gap-2">
          <Languages size={14} className="text-brand-600 dark:text-brand-400" />
          <span>{langLabels[lang]}</span>
        </div>
        <ChevronDown
          size={13}
          className={`text-black/40 transition-transform duration-200 dark:text-white/40 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`absolute bottom-full left-0 mb-1.5 w-full overflow-hidden rounded-lg border border-black/10 bg-white/90 shadow-xl backdrop-blur-xl transition-all duration-200 dark:border-white/10 dark:bg-[#0d1f14]/95 ${
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-1 pointer-events-none"
        }`}
      >
        {langs.map((l) => (
          <button
            key={l}
            onClick={() => { setLang(l); setOpen(false); }}
            className={`flex w-full items-center justify-between px-3 py-2 text-sm font-bold transition ${
              lang === l
                ? "bg-brand-500 text-black"
                : "text-black/65 hover:bg-brand-500/10 dark:text-white/65 dark:hover:bg-brand-500/10"
            }`}
          >
            {langLabels[l]}
            {lang === l && <span className="text-xs opacity-80">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar content ──────────────────────────────────────────────────────────

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { copy } = useLang();

  const visibleNav = NAV.filter(
    (item) => !item.roles || (user?.role && item.roles.includes(user.role))
  );

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center justify-between gap-3 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 text-black shadow-glow">
            <Dumbbell size={20} />
          </div>
          <div>
            <p className="font-black tracking-tight">FastResult</p>
            <p className="text-xs text-black/40 dark:text-white/40">Enterprise SaaS</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg text-black/40 transition hover:bg-black/8 hover:text-black dark:text-white/40 dark:hover:bg-white/8 dark:hover:text-white lg:hidden"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Global search */}
      <div className="px-3 pb-2">
        <GlobalSearch />
      </div>

      {/* User card */}
      {user && (
        <div className="mx-3 mb-3 rounded-xl border border-brand-500/20 bg-brand-500/8 p-3">
          <p className="text-sm font-bold leading-tight">{user.fullName}</p>
          <p className="truncate text-xs text-black/50 dark:text-white/50">{user.email}</p>
          <span className="mt-2 inline-block rounded-full bg-brand-500/20 px-2.5 py-0.5 text-xs font-bold text-brand-700 dark:text-brand-400">
            {copy(
              user.role === "SUPER_ADMIN" ? "superAdmin"
              : user.role === "GYM_OWNER" ? "owner"
              : user.role === "TRAINER" ? "trainer"
              : "member"
            )}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {visibleNav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
                active
                  ? "bg-brand-500 text-black shadow-sm shadow-brand-500/25"
                  : "text-black/60 hover:bg-black/5 hover:text-black dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
              }`}
            >
              <span className={active ? "text-black" : "text-black/45 dark:text-white/45"}>
                {item.icon}
              </span>
              {copy(item.key)}
            </Link>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="border-t border-black/8 p-3 dark:border-white/8">
        {/* Notification bell */}
        <div className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-black/60 dark:text-white/60">
          <NotificationBell />
          <span>{copy("notifications")}</span>
        </div>

        {/* Language dropdown */}
        <LangDropdown />

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-black/60 transition hover:bg-black/5 hover:text-black dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
        >
          {mounted && (resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />)}
          {mounted && (resolvedTheme === "dark" ? copy("lightMode") : copy("darkMode"))}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-500/10 dark:text-red-400"
        >
          <LogOut size={16} />
          {copy("logout")}
        </button>
      </div>
    </div>
  );
}

// ─── Main layout ──────────────────────────────────────────────────────────────

function DashboardInner({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { copy } = useLang();

  const currentPage = NAV.find(
    (item) =>
      item.href === pathname ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href))
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — glassmorphism */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-black/8 bg-white/75 backdrop-blur-2xl dark:border-white/8 dark:bg-black/35 lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile overlay — always mounted, animated in/out */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />

        {/* Slide-in sidebar panel */}
        <aside
          className={`absolute inset-y-0 left-0 w-64 border-r border-white/10 bg-white/88 shadow-2xl backdrop-blur-2xl transition-transform duration-300 ease-out dark:border-white/8 dark:bg-[#08110d]/92 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarContent onClose={() => setSidebarOpen(false)} />
        </aside>
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-black/8 bg-white/80 px-4 py-3.5 backdrop-blur-xl dark:border-white/8 dark:bg-black/40 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="grid h-8 w-8 place-items-center rounded-lg text-black/60 transition hover:bg-black/6 dark:text-white/60 dark:hover:bg-white/6"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-brand-500 text-black">
              <Dumbbell size={14} />
            </div>
            <span className="font-black tracking-tight">FastResult</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <GlobalSearch />
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <DashboardInner>{children}</DashboardInner>
    </LangProvider>
  );
}
