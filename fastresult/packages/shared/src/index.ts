export const roles = ["SUPER_ADMIN", "GYM_OWNER", "TRAINER", "MEMBER"] as const;
export type Role = (typeof roles)[number];

export const languages = ["uz", "ru", "en"] as const;
export type Language = (typeof languages)[number];

export const fitnessGoals = [
  "WEIGHT_LOSS",
  "WEIGHT_GAIN",
  "MUSCLE_BUILDING",
  "HEIGHT_GROWTH",
  "FAT_REDUCTION",
  "FITNESS_IMPROVEMENT",
  "ENDURANCE_INCREASE",
  "STRENGTH_DEVELOPMENT"
] as const;
export type FitnessGoal = (typeof fitnessGoals)[number];

export type DashboardMetric = {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "flat";
};

export type AttendanceSummary = {
  totalVisits: number;
  weeklyVisits: number;
  monthlyVisits: number;
  attendancePercentage: number;
  streak: number;
  missedDays: number;
};

export type NutritionSummary = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  waterLiters: number;
};
