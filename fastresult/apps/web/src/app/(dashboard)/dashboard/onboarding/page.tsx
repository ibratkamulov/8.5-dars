"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, ChevronRight, ChevronLeft, Dumbbell,
  Ruler, Target, Trophy, User,
} from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const STEPS = [1, 2, 3, 4, 5] as const;

const GOAL_TYPES = [
  "WEIGHT_LOSS", "MUSCLE_GAIN", "ENDURANCE",
  "FLEXIBILITY", "GENERAL_FITNESS",
];

const GOAL_LABELS: Record<string, string> = {
  WEIGHT_LOSS: "Weight Loss",
  MUSCLE_GAIN: "Muscle Gain",
  ENDURANCE: "Endurance",
  FLEXIBILITY: "Flexibility",
  GENERAL_FITNESS: "General Fitness",
};

export default function OnboardingPage() {
  const { copy } = useLang();
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // Step 2: Measurements
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscleMass, setMuscleMass] = useState("");

  // Step 3: Membership (read-only display)
  const [memberships, setMemberships] = useState<{ id: string; planName: string; period: string; expiresAt: string; remainingDays: number }[]>([]);

  // Step 4: Goals
  const [goalType, setGoalType] = useState("GENERAL_FITNESS");
  const [goalTarget, setGoalTarget] = useState("10");

  const [memberId, setMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.members.list().then((members) => {
      const mine = members.find((m) => m.userId === user.id);
      if (mine) {
        setMemberId(mine.id);
        api.memberships.list(mine.id).then(setMemberships).catch(() => {});
      }
    }).catch(() => {});
  }, [user]);

  function goNext() {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 5));
  }

  function goPrev() {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  }

  async function saveMeasurements() {
    if (!memberId) { goNext(); return; }
    if (!weight && !height) { goNext(); return; }
    setSaving(true);
    try {
      await api.measurements.create(memberId, {
        weightKg: weight ? parseFloat(weight) : null,
        heightCm: height ? parseFloat(height) : null,
        bodyFatPct: bodyFat ? parseFloat(bodyFat) : null,
        muscleMass: muscleMass ? parseFloat(muscleMass) : null,
        bmi: weight && height ? parseFloat((parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1)) : null,
      });
      setSavedMsg("Saved!");
      setTimeout(() => setSavedMsg(""), 2000);
      goNext();
    } catch {
      goNext();
    } finally {
      setSaving(false);
    }
  }

  async function saveGoal() {
    if (!memberId) { goNext(); return; }
    setSaving(true);
    try {
      await api.goals.create(memberId, {
        type: goalType,
        targetValue: parseFloat(goalTarget) || 10,
      });
      setSavedMsg("Goal set!");
      setTimeout(() => setSavedMsg(""), 2000);
      goNext();
    } catch {
      goNext();
    } finally {
      setSaving(false);
    }
  }

  const stepIcons = [User, Ruler, Dumbbell, Target, Trophy];
  const stepKeys = [
    copy("onboardingStep1"),
    copy("onboardingStep2"),
    copy("onboardingStep3"),
    copy("onboardingStep4"),
    copy("onboardingStep5"),
  ];

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d < 0 ? 60 : -60, opacity: 0 }),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500 text-black shadow-glow">
          <Dumbbell size={26} />
        </div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy("onboardingWelcome")}</h1>
        <p className="mt-1 text-sm text-black/55 dark:text-white/55">{user?.fullName}</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((s) => {
          const Icon = stepIcons[s - 1];
          const done = step > s;
          const active = step === s;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black transition-all duration-300 ${
                done ? "bg-brand-500 text-black" : active ? "bg-brand-500/20 text-brand-700 ring-2 ring-brand-500 dark:text-brand-400" : "bg-black/8 text-black/30 dark:bg-white/8 dark:text-white/30"
              }`}>
                {done ? <CheckCircle2 size={16} /> : <Icon size={16} />}
              </div>
              {s < 5 && (
                <div className={`h-px w-6 transition-all duration-300 ${step > s ? "bg-brand-500" : "bg-black/15 dark:bg-white/15"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step label */}
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">
        {copy("page")} {step} / 5 — {stepKeys[step - 1]}
      </p>

      {/* Step content */}
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="p-6"
          >
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-black">{copy("onboardingStep1")}</h2>
                <div className="rounded-xl bg-black/4 p-4 dark:bg-white/4 space-y-3">
                  <Row label={copy("fullName")} value={user?.fullName ?? "—"} />
                  <Row label={copy("email")} value={user?.email ?? "—"} />
                  <Row label={copy("role")} value={user?.role ?? "—"} />
                </div>
                <p className="text-sm text-black/50 dark:text-white/50">
                  Your account has been created by your gym admin. Complete the steps below to set up your fitness profile.
                </p>
              </div>
            )}

            {/* Step 2: Measurements */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-black">{copy("onboardingStep2")}</h2>
                <p className="text-sm text-black/50 dark:text-white/50">
                  Enter your initial body measurements to track your progress over time.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Weight (kg)" value={weight} onChange={setWeight} placeholder="e.g. 75" />
                  <Field label="Height (cm)" value={height} onChange={setHeight} placeholder="e.g. 175" />
                  <Field label="Body Fat %" value={bodyFat} onChange={setBodyFat} placeholder="e.g. 18" />
                  <Field label="Muscle Mass (kg)" value={muscleMass} onChange={setMuscleMass} placeholder="e.g. 32" />
                </div>
                {savedMsg && <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">{savedMsg}</p>}
              </div>
            )}

            {/* Step 3: Membership */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-black">{copy("onboardingStep3")}</h2>
                {memberships.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-black/15 py-8 text-center dark:border-white/15">
                    <Dumbbell size={28} className="mx-auto mb-2 text-black/25 dark:text-white/25" />
                    <p className="text-sm font-semibold text-black/45 dark:text-white/45">
                      No active membership yet. Ask your gym admin to assign a plan.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {memberships.map((m) => (
                      <div key={m.id} className="rounded-xl border border-brand-500/25 bg-brand-500/5 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-black">{m.planName}</p>
                            <p className="text-sm text-black/50 dark:text-white/50">{m.period}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-brand-700 dark:text-brand-400">{m.remainingDays}d left</p>
                            <p className="text-xs text-black/40 dark:text-white/40">
                              Expires {new Date(m.expiresAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Goals */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-lg font-black">{copy("onboardingStep4")}</h2>
                <p className="text-sm text-black/50 dark:text-white/50">
                  Set your primary fitness goal to help your trainer create a personalized plan.
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {GOAL_TYPES.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGoalType(g)}
                      className={`rounded-xl border-2 p-3 text-left text-sm font-semibold transition ${
                        goalType === g
                          ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-400"
                          : "border-black/10 text-black/60 hover:border-brand-500/40 dark:border-white/10 dark:text-white/60"
                      }`}
                    >
                      {GOAL_LABELS[g]}
                    </button>
                  ))}
                </div>
                <Field
                  label="Target (weeks to goal)"
                  value={goalTarget}
                  onChange={setGoalTarget}
                  placeholder="e.g. 12"
                />
                {savedMsg && <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">{savedMsg}</p>}
              </div>
            )}

            {/* Step 5: Complete */}
            {step === 5 && (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-500 text-black shadow-glow">
                  <Trophy size={30} />
                </div>
                <h2 className="text-xl font-black">{copy("onboardingStep5")}</h2>
                <p className="max-w-sm text-sm text-black/55 dark:text-white/55">
                  Your profile is all set! Head to your dashboard to explore workouts, track progress, and connect with your trainer.
                </p>
                <div className="mt-2 rounded-xl bg-brand-500/8 px-6 py-3">
                  <p className="text-sm font-semibold text-brand-700 dark:text-brand-400">
                    Welcome to FastResult, {user?.fullName?.split(" ")[0]}! 🎉
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between border-t border-black/8 px-6 py-4 dark:border-white/8">
          <button
            onClick={goPrev}
            disabled={step === 1}
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/12 px-4 py-2 text-sm font-semibold disabled:opacity-30 hover:bg-black/5 dark:border-white/12 dark:hover:bg-white/5"
          >
            <ChevronLeft size={16} />
            {copy("prevStep")}
          </button>

          {step < 5 ? (
            <button
              onClick={
                step === 2 ? saveMeasurements :
                step === 4 ? saveGoal :
                goNext
              }
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-black text-black hover:bg-brand-600 hover:text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : copy("nextStep")}
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-black text-black hover:bg-brand-600 hover:text-white"
            >
              {copy("onboardingDone")}
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-black/50 dark:text-white/50">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-black/60 dark:text-white/60">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-black/12 bg-black/4 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-white/12 dark:bg-white/4"
      />
    </div>
  );
}
