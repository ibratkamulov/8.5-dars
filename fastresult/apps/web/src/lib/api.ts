// Typed API client — all requests go through here.
// Access token stored in memory + cookie (for SSR middleware), refresh token in localStorage.

import type { Role } from "@fastresult/shared";

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000") + "/api";

// ─── Types ──────────────────────────────────────────────────────────────────

export type AuthTokens = { accessToken: string; refreshToken: string };
export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  clubId: string | null;
};

export type LoginDto = { email: string; password: string };
export type RegisterDto = {
  email: string;
  fullName: string;
  password: string;
  role: Role;
};

export type DashboardData = {
  totalMembers: number;
  activeMembers: number;
  todayAttendance: number;
  revenue: number;
  goalCompletionRate: number;
  topTrainers: { name: string; memberCount: number; rating: number }[];
  popularPrograms: unknown[];
  monthlyRevenue: { month: string; revenue: number; visits: number }[];
  membershipBreakdown: { period: string; count: number }[];
};

export type MemberItem = {
  id: string;
  userId: string;
  user: { id: string; fullName: string; email: string; phone: string | null; clubId: string | null };
  trainerId: string | null;
  dateOfBirth: string | null;
};

export type TrainerItem = {
  id: string;
  userId: string;
  user: { id: string; fullName: string; email: string };
  bio: string | null;
  rating: number;
  specialties: string[];
  _count?: { members: number };
};

export type GoalItem = {
  id: string;
  type: string;
  currentValue: number | null;
  targetValue: number | null;
  progressPercentage: number;
  estimatedCompletion: string | null;
  status: string;
  createdAt: string;
};

export type NutritionLog = {
  id: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  waterMl: number;
  loggedAt: string;
};

export type BodyMeasurement = {
  id: string;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  bodyFatPct: number | null;
  muscleMass: number | null;
  measuredAt: string;
};

export type MembershipItem = {
  id: string;
  planName: string;
  period: string;
  startsAt: string;
  expiresAt: string;
  remainingDays: number;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  status: string;
  channel: string;
  readAt: string | null;
  createdAt: string;
};

export type PaymentItem = {
  id: string;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
  membership: {
    id: string;
    planName: string;
    period: string;
    memberName: string;
    memberEmail: string;
  } | null;
};

export type PaymentSummary = {
  totalPaid: number;
  totalPending: number;
  revenueToday: number;
  revenueMonth: number;
  revenueYear: number;
  monthly: { month: string; revenue: number }[];
};

export type TrainerShift = {
  id: string;
  trainerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  note: string | null;
  clubId: string | null;
};

export type TrainerShiftWithTrainer = TrainerShift & {
  trainer: { id: string; userId: string; user: { id: string; fullName: string } };
};

export type WorkoutExercise = {
  name: string;
  sets: number;
  reps: number;
  weight?: string;
};

export type WorkoutDay = {
  day: number; // 1=Mon … 7=Sun
  active: boolean;
  exercises: WorkoutExercise[];
};

export type WorkoutProgram = {
  id: string;
  memberId: string;
  title: string;
  description: string;
  difficulty: string;
  days: WorkoutDay[];
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
};

export type ClubItem = {
  id: string;
  name: string;
  address: string;
  rating: number;
  phone: string | null;
  packages: { id: string; name: string; price: number; period: string }[];
};

export type GymItem = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  phone?: string;
  website?: string;
  openingHours?: string;
  rating: number;
  source: "osm";
  distance?: number; // km, computed on frontend
};

export type AuditLogItem = {
  id: string;
  userId: string | null;
  user: { id: string; fullName: string; email: string; role: string } | null;
  action: string;
  entity: string;
  entityId: string | null;
  ipAddress: string | null;
  metadata: unknown;
  createdAt: string;
};

export type AuditPage = {
  items: AuditLogItem[];
  total: number;
  page: number;
  totalPages: number;
};

export type SearchResult = {
  members: { id: string; userId: string; user: { id: string; fullName: string; email: string } }[];
  trainers: { id: string; userId: string; user: { id: string; fullName: string; email: string } }[];
  payments: { id: string; amount: number; currency: string; status: string; paidAt: string | null; memberName: string; memberEmail: string; planName: string }[];
  memberships: { id: string; planName: string; period: string; expiresAt: string; memberName: string; memberEmail: string }[];
};

export type AiRecommendation = {
  workout: string;
  nutrition: string;
  progress: string;
  prediction: string;
  suggestions: string[];
};

export type AttendanceSummary = {
  totalVisits: number;
  weeklyVisits: number;
  monthlyVisits: number;
  attendancePercentage: number;
  streak: number;
  missedDays: number;
};

// ─── Attendance system types ─────────────────────────────────────────────────

export type ScanResult = {
  event: "CHECK_IN" | "CHECK_OUT";
  member: { name: string; email: string };
  time: string;
  durationSeconds: number | null;
  recordId: string | null;
};

export type LiveMember = {
  userId: string;
  name: string;
  email: string;
  checkInAt: string | null;
  plan: string | null;
};

export type LiveData = {
  insideNow: LiveMember[];
  todayCount: number;
  weekCount: number;
  monthCount: number;
  avgDurationSeconds: number;
};

export type TodayRecord = {
  id: string;
  memberName: string;
  memberEmail: string;
  userId: string;
  entryAt: string;
  exitAt: string | null;
  durationSeconds: number | null;
  status: string;
};

export type TodayStats = TodayRecord[];

export type AttendanceStats = {
  todayCount: number;
  weekCount: number;
  monthCount: number;
  prevMonthCount: number;
  monthGrowth: number;
  totalCount: number;
  completedCount: number;
  currentlyInside: number;
  avgDurationSeconds: number;
};

export type AttendanceHistory = {
  id: string;
  entryAt: string;
  exitAt: string | null;
  durationSeconds: number | null;
  status: string;
  source: string;
};

export type MemberAttendance = {
  userId: string;
  memberName: string;
  email: string;
  insideGym: boolean;
  totalVisits: number;
  weeklyVisits: number;
  monthlyVisits: number;
  attendancePercentage: number;
  streak: number;
  missedDays: number;
  avgDurationSeconds: number;
  activeMembership: { planName: string; expiresAt: string } | null;
};

// ─── Token helpers ───────────────────────────────────────────────────────────

let _mem: string | null = null; // in-memory access token

export function setTokens(tokens: AuthTokens) {
  _mem = tokens.accessToken;
  // Cookie for Next.js middleware (15 min, same as JWT expiry)
  if (typeof document !== "undefined") {
    document.cookie = `fr_token=${tokens.accessToken}; path=/; max-age=900; samesite=lax`;
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("fr_refresh", tokens.refreshToken);
  }
}

export function clearTokens() {
  _mem = null;
  if (typeof document !== "undefined") {
    document.cookie = "fr_token=; path=/; max-age=0";
  }
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("fr_refresh");
    localStorage.removeItem("fr_user");
  }
}

export function getRefreshToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("fr_refresh");
}

export function saveUser(user: AuthUser) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("fr_user", JSON.stringify(user));
  }
}

export function loadUser(): AuthUser | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem("fr_user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

// ─── Simple TTL cache for GET requests ──────────────────────────────────────

const _cache = new Map<string, { data: unknown; ts: number }>();

function cached<T>(key: string, fetcher: () => Promise<T>, ttl = 90_000): Promise<T> {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < ttl) return Promise.resolve(hit.data as T);
  return fetcher().then((data) => {
    _cache.set(key, { data, ts: Date.now() });
    return data;
  });
}

export function invalidateCache(prefix?: string) {
  if (!prefix) { _cache.clear(); return; }
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) _cache.delete(key);
  }
}

// ─── Core fetch ──────────────────────────────────────────────────────────────

async function req<T>(path: string, init?: RequestInit, _retry = true): Promise<T> {
  const token = _mem;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401 && _retry) {
    // Attempt token refresh
    const refreshed = await tryRefresh();
    if (refreshed) return req<T>(path, init, false);
    clearTokens();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg = (body.message as string) ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

async function tryRefresh(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;
    const data = await res.json() as AuthTokens;
    setTokens(data);
    return true;
  } catch {
    return false;
  }
}

// ─── Binary fetch (for file downloads) ───────────────────────────────────────

async function reqBlob(path: string, _retry = true): Promise<Blob> {
  const token = _mem;
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 401 && _retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return reqBlob(path, false);
    clearTokens();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((body.message as string) ?? `HTTP ${res.status}`);
  }
  return res.blob();
}

// ─── API namespace ───────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (dto: LoginDto) =>
      req<AuthTokens>("/auth/login", { method: "POST", body: JSON.stringify(dto) }),
    refresh: (refreshToken: string) =>
      req<AuthTokens>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) }),
    logout: () =>
      req<void>("/auth/logout", { method: "POST" }),
    me: () =>
      req<AuthUser>("/auth/me"),
    changePassword: (currentPassword: string, newPassword: string) =>
      req<{ ok: boolean }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },

  users: {
    create: (dto: { email: string; fullName: string; phone?: string; password: string; role: "GYM_OWNER" | "TRAINER" | "MEMBER" }) =>
      req<{ id: string; email: string; fullName: string; phone: string | null; role: string; clubId: string | null }>(
        "/auth/create-user",
        { method: "POST", body: JSON.stringify(dto) }
      ).then((r) => { invalidateCache("members:"); invalidateCache("trainers:"); return r; }),
  },

  attendance: {
    scan: (token: string) =>
      req<ScanResult>("/attendance/scan", { method: "POST", body: JSON.stringify({ token }) }),
    live: () =>
      req<LiveData>("/attendance/live"),
    today: () =>
      req<TodayStats>("/attendance/today"),
    stats: () =>
      req<AttendanceStats>("/attendance/stats"),
    history: (userId: string) =>
      req<AttendanceHistory[]>(`/attendance/history/${userId}`),
    member: (userId: string) =>
      req<MemberAttendance>(`/attendance/member/${userId}`),
    myQr: () =>
      req<{ qrToken: string; memberName: string; expiresAt: string | null }>("/attendance/my-qr"),
    // Legacy
    summary: (memberId: string) =>
      req<AttendanceSummary>(`/attendance/summary?memberId=${memberId}`),
    checkIn: (clubId: string, memberId: string) =>
      req<unknown>("/attendance/check-in", { method: "POST", body: JSON.stringify({ clubId, memberId }) }),
    manualToggle: (userId: string, direction: "IN" | "OUT") =>
      req<{ event: string; member: { name: string; email: string }; time: string }>(
        "/attendance/manual",
        { method: "POST", body: JSON.stringify({ userId, direction }) },
      ),
  },

  members: {
    list: () => cached("members:list", () => req<MemberItem[]>("/members"), 30_000),
    get: (id: string) => cached(`members:${id}`, () => req<MemberItem>(`/members/${id}`), 30_000),
  },

  trainers: {
    list: () => cached("trainers:list", () => req<TrainerItem[]>("/trainers"), 60_000),
    get: (id: string) => cached(`trainers:${id}`, () => req<TrainerItem>(`/trainers/${id}`), 60_000),
  },

  goals: {
    list: (memberId: string) => cached(`goals:${memberId}`, () => req<GoalItem[]>(`/goals?memberId=${memberId}`), 30_000),
    create: (memberId: string, dto: { type: string; targetValue: number }) =>
      req<GoalItem>("/goals", { method: "POST", body: JSON.stringify({ memberId, ...dto }) })
        .then((r) => { invalidateCache(`goals:${memberId}`); return r; }),
    update: (id: string, dto: Partial<GoalItem>) =>
      req<GoalItem>(`/goals/${id}`, { method: "PATCH", body: JSON.stringify(dto) })
        .then((r) => { invalidateCache("goals:"); return r; }),
  },

  nutrition: {
    list: (memberId: string) => cached(`nutrition:${memberId}`, () => req<NutritionLog[]>(`/nutrition?memberId=${memberId}`), 30_000),
    create: (memberId: string, dto: Omit<NutritionLog, "id" | "loggedAt">) =>
      req<NutritionLog>("/nutrition", { method: "POST", body: JSON.stringify({ memberId, ...dto }) })
        .then((r) => { invalidateCache(`nutrition:${memberId}`); return r; }),
  },

  measurements: {
    list: (memberId: string) => cached(`measurements:${memberId}`, () => req<BodyMeasurement[]>(`/measurements?memberId=${memberId}`), 30_000),
    create: (memberId: string, dto: Omit<BodyMeasurement, "id" | "measuredAt">) =>
      req<BodyMeasurement>("/measurements", { method: "POST", body: JSON.stringify({ memberId, ...dto }) })
        .then((r) => { invalidateCache(`measurements:${memberId}`); return r; }),
  },

  memberships: {
    list: (memberId: string) => cached(`memberships:${memberId}`, () => req<MembershipItem[]>(`/memberships?memberId=${memberId}`), 30_000),
    bulkAssign: (dto: { memberIds: string[]; planName: string; period: string; startsAt: string; expiresAt: string }) =>
      req<{ created: number; total: number }>("/memberships/bulk-assign", { method: "POST", body: JSON.stringify(dto) })
        .then((r) => { invalidateCache("memberships:"); return r; }),
  },

  workout: {
    list: (memberId: string) => cached(`workout:${memberId}`, () => req<WorkoutProgram[]>(`/workout/${memberId}`), 30_000),
    create: (dto: {
      memberId: string; title: string; description: string;
      difficulty: string; startsAt: string; endsAt?: string; days: WorkoutDay[];
    }) => req<WorkoutProgram>("/workout", { method: "POST", body: JSON.stringify(dto) })
        .then((r) => { invalidateCache(`workout:${dto.memberId}`); return r; }),
    remove: (id: string) =>
      req<{ deleted: boolean }>(`/workout/${id}`, { method: "DELETE" })
        .then((r) => { invalidateCache("workout:"); return r; }),
  },

  clubs: {
    list: (q?: string) => req<ClubItem[]>(`/clubs${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  },

  gyms: {
    search: (city = "urgench", q?: string) => {
      const params = new URLSearchParams({ city });
      if (q) params.set("q", q);
      return req<GymItem[]>(`/gyms/search?${params.toString()}`);
    },
  },

  reports: {
    download: (type: "pdf" | "excel", scope: string): Promise<Blob> =>
      reqBlob(`/reports/generate?type=${type}&scope=${encodeURIComponent(scope)}`),
  },

  notifications: {
    list: () => req<NotificationItem[]>("/notifications"),
    unreadCount: () => req<{ count: number }>("/notifications/unread-count"),
    markAllRead: () => req<{ ok: boolean }>("/notifications/read-all", { method: "PATCH" }),
    markRead: (id: string) => req<{ ok: boolean }>(`/notifications/${id}/read`, { method: "PATCH" }),
    sendExpiryReminders: () => req<{ sent: number }>("/notifications/send-expiry-reminders", { method: "POST" }),
  },

  payments: {
    list: () => cached("payments:list", () => req<PaymentItem[]>("/payments"), 60_000),
    summary: () => cached("payments:summary", () => req<PaymentSummary>("/payments/summary"), 60_000),
    create: (dto: { membershipId: string; amount: string; provider?: string; status: string }) =>
      req<PaymentItem>("/payments", { method: "POST", body: JSON.stringify(dto) })
        .then((r) => { invalidateCache("payments:"); return r; }),
  },

  schedule: {
    listAll: () => cached("schedule:all", () => req<TrainerShiftWithTrainer[]>("/schedule"), 60_000),
    listForTrainer: (trainerId: string) => cached(`schedule:${trainerId}`, () => req<TrainerShift[]>(`/schedule/${trainerId}`), 60_000),
    upsert: (dto: { trainerId: string; dayOfWeek: number; startTime: string; endTime: string; note?: string }) =>
      req<TrainerShift>("/schedule", { method: "POST", body: JSON.stringify(dto) })
        .then((r) => { invalidateCache("schedule:"); return r; }),
    remove: (dto: { trainerId: string; dayOfWeek: number }) =>
      req<{ deleted: boolean }>("/schedule", { method: "DELETE", body: JSON.stringify(dto) })
        .then((r) => { invalidateCache("schedule:"); return r; }),
  },

  analytics: {
    dashboard: () => cached("analytics:dashboard", () => req<DashboardData>("/analytics/dashboard"), 120_000),
  },

  ai: {
    recommendations: (memberId: string) =>
      req<AiRecommendation>(`/ai/recommendations?memberId=${memberId}`),
  },

  audit: {
    list: (page = 1, limit = 50) =>
      cached(`audit:${page}:${limit}`, () => req<AuditPage>(`/audit?page=${page}&limit=${limit}`), 60_000),
  },

  search: {
    query: (q: string) =>
      req<SearchResult>(`/search?q=${encodeURIComponent(q)}`),
  },

};
