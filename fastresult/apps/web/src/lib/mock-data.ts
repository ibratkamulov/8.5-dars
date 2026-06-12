import type { DashboardMetric, Role } from "@fastresult/shared";

export const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: "superAdmin",
  GYM_OWNER: "owner",
  TRAINER: "trainer",
  MEMBER: "member"
};

export const metrics: DashboardMetric[] = [
  { label: "members", value: "12,840", delta: "+18.2%", trend: "up" },
  { label: "active", value: "9,416", delta: "+11.4%", trend: "up" },
  { label: "today", value: "1,283", delta: "+7.8%", trend: "up" },
  { label: "revenue", value: "$148.6K", delta: "+22.1%", trend: "up" }
];

export const attendanceTrend = [
  { day: "Mon", visits: 920, goal: 780 },
  { day: "Tue", visits: 1030, goal: 820 },
  { day: "Wed", visits: 1188, goal: 860 },
  { day: "Thu", visits: 1110, goal: 900 },
  { day: "Fri", visits: 1283, goal: 940 },
  { day: "Sat", visits: 1510, goal: 1100 },
  { day: "Sun", visits: 990, goal: 760 }
];

export const bodyTrend = [
  { month: "Jan", weight: 86, fat: 27, muscle: 34 },
  { month: "Feb", weight: 83, fat: 25, muscle: 35 },
  { month: "Mar", weight: 80, fat: 23, muscle: 36 },
  { month: "Apr", weight: 78, fat: 21, muscle: 37 },
  { month: "May", weight: 76, fat: 19, muscle: 39 },
  { month: "Jun", weight: 74, fat: 17, muscle: 40 }
];

export const programs = [
  "Fat Burn Accelerator",
  "Strength Foundation",
  "Hypertrophy Pro",
  "Endurance Builder",
  "Mobility Reset"
];

export const aiSuggestions = [
  "Increase protein by 18g today to stay aligned with muscle-building goals.",
  "Member attendance risk detected: 23 members missed 3 consecutive sessions.",
  "Friday evening classes are over capacity. Add one strength slot at 19:00.",
  "Revenue forecast is 14% above plan if yearly renewals stay above 68%."
];
