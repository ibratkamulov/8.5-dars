"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookmarkPlus, ChevronDown, ChevronUp, ClipboardList, Copy, Loader2, Plus, Trash2, X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/lang-context";
import { api, type WorkoutDay, type WorkoutExercise, type WorkoutProgram } from "@/lib/api";
import type { TKey } from "@/lib/i18n";

// ── Template persistence (localStorage) ──────────────────────────────────────

type WorkoutTemplate = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  days: WorkoutDay[];
};

function loadTemplates(): WorkoutTemplate[] {
  try {
    const raw = localStorage.getItem("fr_workout_templates");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTemplates(ts: WorkoutTemplate[]) {
  localStorage.setItem("fr_workout_templates", JSON.stringify(ts));
}

function saveAsTemplate(prog: WorkoutProgram) {
  const ts = loadTemplates();
  const t: WorkoutTemplate = {
    id: crypto.randomUUID(),
    title: prog.title,
    description: prog.description,
    difficulty: prog.difficulty,
    days: prog.days,
  };
  saveTemplates([t, ...ts.filter((x) => x.title !== prog.title)]);
  return t;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_KEYS: TKey[] = ["dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat", "daySun"];
const DIFFICULTIES: TKey[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

function difficultyColor(d: string) {
  if (d === "BEGINNER") return "bg-brand-500/15 text-brand-700 dark:text-brand-300";
  if (d === "ADVANCED") return "bg-red-500/15 text-red-700 dark:text-red-300";
  return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
}

// ── Empty days skeleton ───────────────────────────────────────────────────────

function emptyDays(): WorkoutDay[] {
  return Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    active: false,
    exercises: [],
  }));
}

// ── Exercise row ──────────────────────────────────────────────────────────────

function ExRow({ ex, onChange, onRemove }: {
  ex: WorkoutExercise;
  onChange: (f: Partial<WorkoutExercise>) => void;
  onRemove: () => void;
}) {
  const { copy } = useLang();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-black/5 dark:bg-white/5 px-3 py-2 text-sm">
      <input
        value={ex.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder={copy("exercises")}
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
      />
      <input
        type="number" min={1} max={99}
        value={ex.sets}
        onChange={(e) => onChange({ sets: Math.max(1, +e.target.value) })}
        className="w-14 rounded bg-white dark:bg-white/10 px-2 py-0.5 text-center outline-none"
        title={copy("sets")}
      />
      <span className="text-black/30 dark:text-white/30">×</span>
      <input
        type="number" min={1} max={999}
        value={ex.reps}
        onChange={(e) => onChange({ reps: Math.max(1, +e.target.value) })}
        className="w-14 rounded bg-white dark:bg-white/10 px-2 py-0.5 text-center outline-none"
        title={copy("reps")}
      />
      <input
        value={ex.weight ?? ""}
        onChange={(e) => onChange({ weight: e.target.value || undefined })}
        placeholder={copy("weightOpt")}
        className="w-24 rounded bg-white dark:bg-white/10 px-2 py-0.5 outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
      />
      <button type="button" onClick={onRemove} className="text-red-500/60 hover:text-red-500">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ── Day card (inside create form) ────────────────────────────────────────────

function DayEditor({ day, label, onChange }: {
  day: WorkoutDay;
  label: string;
  onChange: (d: WorkoutDay) => void;
}) {
  const { copy } = useLang();

  function addEx() {
    onChange({ ...day, exercises: [...day.exercises, { name: "", sets: 3, reps: 10 }] });
  }
  function updateEx(i: number, patch: Partial<WorkoutExercise>) {
    const exs = day.exercises.map((e, idx) => idx === i ? { ...e, ...patch } : e);
    onChange({ ...day, exercises: exs });
  }
  function removeEx(i: number) {
    onChange({ ...day, exercises: day.exercises.filter((_, idx) => idx !== i) });
  }

  return (
    <div className={`rounded-xl border transition-all ${
      day.active
        ? "border-brand-500/40 bg-brand-500/5"
        : "border-black/10 dark:border-white/10"
    }`}>
      <button
        type="button"
        onClick={() => onChange({ ...day, active: !day.active, exercises: day.active ? [] : day.exercises })}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-bold"
      >
        <span>{label}</span>
        <span className={`text-xs font-normal ${day.active ? "text-brand-600 dark:text-brand-400" : "text-black/40 dark:text-white/40"}`}>
          {day.active ? `${day.exercises.length} ${copy("exercises")}` : copy("empty")}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {day.active && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 px-4 pb-4">
              {day.exercises.map((ex, i) => (
                <ExRow
                  key={i}
                  ex={ex}
                  onChange={(p) => updateEx(i, p)}
                  onRemove={() => removeEx(i)}
                />
              ))}
              <button
                type="button"
                onClick={addEx}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                <Plus size={13} /> {copy("addExercise")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Read-only program card ────────────────────────────────────────────────────

function ProgramCard({ prog, onDelete, canDelete, onSaveTemplate }: {
  prog: WorkoutProgram;
  onDelete: (id: string) => void;
  canDelete: boolean;
  onSaveTemplate: (prog: WorkoutProgram) => void;
}) {
  const { copy } = useLang();
  const [open, setOpen] = useState(false);
  const activeDays = prog.days.filter((d) => d.active);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="rounded-xl border border-black/10 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-500/15">
          <ClipboardList size={18} className="text-brand-600 dark:text-brand-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-black">{prog.title}</p>
          <p className="mt-0.5 truncate text-xs text-black/50 dark:text-white/50">{prog.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${difficultyColor(prog.difficulty)}`}>
              {copy(prog.difficulty as TKey)}
            </span>
            <span className="text-xs text-black/40 dark:text-white/40">
              {new Date(prog.startsAt).toLocaleDateString()}
              {prog.endsAt ? ` → ${new Date(prog.endsAt).toLocaleDateString()}` : ""}
            </span>
            <span className="text-xs text-black/40 dark:text-white/40">
              {activeDays.length} {copy("dayMon").includes("Mon") ? "days" : "kun"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onSaveTemplate(prog)}
            title="Save as template"
            className="rounded-lg p-1.5 text-black/40 dark:text-white/40 hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 transition"
          >
            <BookmarkPlus size={15} />
          </button>
          {canDelete && (
            <button
              onClick={() => onDelete(prog.id)}
              className="rounded-lg p-1.5 text-red-500/50 hover:bg-red-500/10 hover:text-red-500 transition"
            >
              <Trash2 size={15} />
            </button>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-1.5 text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && activeDays.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid gap-3 border-t border-black/8 dark:border-white/8 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeDays.map((day) => (
                <div key={day.day} className="rounded-lg border border-black/8 dark:border-white/8 p-3">
                  <p className="mb-2 text-xs font-black text-brand-600 dark:text-brand-400">
                    {copy(DAY_KEYS[day.day - 1])}
                  </p>
                  <div className="space-y-1">
                    {day.exercises.map((ex, i) => (
                      <p key={i} className="text-xs text-black/70 dark:text-white/70">
                        <span className="font-semibold">{ex.name}</span>
                        {" "}
                        <span className="text-black/45 dark:text-white/45">
                          {ex.sets}×{ex.reps}{ex.weight ? ` @ ${ex.weight}` : ""}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Create program modal ──────────────────────────────────────────────────────

type MemberOption = { id: string; name: string };

function CreateModal({ members, onClose, onCreated }: {
  members: MemberOption[];
  onClose: () => void;
  onCreated: (p: WorkoutProgram) => void;
}) {
  const { copy } = useLang();
  const { user } = useAuth();
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<string>("INTERMEDIATE");
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [endsAt, setEndsAt] = useState("");
  const [days, setDays] = useState<WorkoutDay[]>(emptyDays());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [templates] = useState<WorkoutTemplate[]>(() => loadTemplates());
  const [templateSaved, setTemplateSaved] = useState("");

  // For MEMBER creating own self-directed program
  useEffect(() => {
    if (user?.role === "MEMBER") setMemberId(user.id);
  }, [user]);

  function updateDay(i: number, d: WorkoutDay) {
    setDays((prev) => prev.map((x, idx) => idx === i ? d : x));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setErr("Title is required"); return; }
    setSaving(true);
    setErr("");
    try {
      const prog = await api.workout.create({
        memberId,
        title: title.trim(),
        description: description.trim(),
        difficulty,
        startsAt,
        endsAt: endsAt || undefined,
        days,
      });
      onCreated(prog);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : copy("error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 dark:border-white/10 bg-white dark:bg-gray-900 px-5 py-4">
          <h2 className="font-black text-lg">{copy("addProgram")}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-black/8 dark:hover:bg-white/8">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {err && (
            <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{err}</div>
          )}

          {/* Template loader */}
          {templates.length > 0 && (
            <div className="rounded-xl border border-brand-500/25 bg-brand-500/5 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-black text-brand-700 dark:text-brand-400">
                <Copy size={13} /> Load Template
              </div>
              <div className="flex flex-wrap gap-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTitle(t.title);
                      setDescription(t.description);
                      setDifficulty(t.difficulty);
                      setDays(t.days);
                      setTemplateSaved(`Loaded: ${t.title}`);
                      setTimeout(() => setTemplateSaved(""), 2000);
                    }}
                    className="rounded-lg bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-500/25 dark:text-brand-400 transition"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
              {templateSaved && (
                <p className="mt-1 text-xs font-semibold text-brand-600 dark:text-brand-400">{templateSaved}</p>
              )}
            </div>
          )}

          {/* Member selector (trainer/owner only) */}
          {user?.role !== "MEMBER" && members.length > 0 && (
            <div>
              <label className="block mb-1.5 text-sm font-semibold">{copy("selectMember")}</label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block mb-1.5 text-sm font-semibold">
              {copy("workoutPrograms")} — {copy("name")}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block mb-1.5 text-sm font-semibold">{copy("description")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none"
            />
          </div>

          {/* Difficulty + dates */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block mb-1.5 text-sm font-semibold">{copy("difficulty")}</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{copy(d)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-semibold">{copy("startsAt")}</label>
              <input
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-semibold">{copy("expiresAt")}</label>
              <input
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Day editors */}
          <div>
            <p className="mb-2 text-sm font-semibold">{copy("programPeriod")}</p>
            <div className="space-y-2">
              {days.map((day, i) => (
                <DayEditor
                  key={day.day}
                  day={day}
                  label={copy(DAY_KEYS[i])}
                  onChange={(d) => updateDay(i, d)}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-black/15 dark:border-white/15 px-4 py-2.5 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5">
              {copy("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-black text-black hover:bg-brand-600 hover:text-white disabled:opacity-60 transition"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {copy("saveProgram")}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WorkoutPage() {
  const { user } = useAuth();
  const { copy } = useLang();
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [templateToast, setTemplateToast] = useState("");

  const isTrainer = user?.role === "TRAINER";
  const isOwner = user?.role === "GYM_OWNER" || user?.role === "SUPER_ADMIN";
  const canCreate = isTrainer || isOwner || user?.role === "MEMBER";
  const canDelete = isTrainer || isOwner;

  // Load trainer's member list for member selector
  useEffect(() => {
    if (!user || user.role === "MEMBER") return;
    api.members.list()
      .then((list) => {
        const opts = list.map((m: { user: { id: string; fullName: string } }) => ({
          id: m.user.id,
          name: m.user.fullName,
        }));
        setMembers(opts);
        if (opts.length > 0) setSelectedMemberId(opts[0].id);
      })
      .catch(() => {});
  }, [user]);

  const targetId = user?.role === "MEMBER" ? user.id : selectedMemberId;

  const load = useCallback(() => {
    if (!targetId) { setLoading(false); return; }
    setLoading(true);
    setError("");
    api.workout
      .list(targetId)
      .then(setPrograms)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : copy("error")))
      .finally(() => setLoading(false));
  }, [targetId, copy]);

  useEffect(() => { load(); }, [load]);

  function handleSaveTemplate(prog: WorkoutProgram) {
    saveAsTemplate(prog);
    setTemplateToast(`"${prog.title}" saved as template`);
    setTimeout(() => setTemplateToast(""), 2500);
  }

  async function handleDelete(id: string) {
    try {
      await api.workout.remove(id);
      setPrograms((prev) => prev.filter((p) => p.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy("error"));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy("workoutPrograms")}</h1>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">{programs.length} {copy("workoutPrograms").toLowerCase()}</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-black text-black hover:bg-brand-600 hover:text-white transition"
          >
            <Plus size={16} /> {copy("addProgram")}
          </button>
        )}
      </div>

      {/* Member selector for trainer/owner */}
      {(isTrainer || isOwner) && members.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-black/60 dark:text-white/60">{copy("selectMember")}:</span>
          <select
            value={selectedMemberId ?? ""}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-500"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {templateToast && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="rounded-lg bg-brand-500/10 px-4 py-3 text-sm font-semibold text-brand-700 dark:text-brand-400"
        >
          ✓ {templateToast}
        </motion.div>
      )}

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />
          ))}
        </div>
      )}

      {!loading && programs.length === 0 && (
        <div className="rounded-xl border border-dashed border-black/20 dark:border-white/15 bg-white/60 dark:bg-white/[0.03] p-14 text-center">
          <ClipboardList size={40} className="mx-auto text-brand-500 opacity-40" />
          <p className="mt-3 font-semibold text-black/50 dark:text-white/50">{copy("noPrograms")}</p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {!loading && programs.map((prog) => (
          <ProgramCard
            key={prog.id}
            prog={prog}
            canDelete={canDelete}
            onDelete={handleDelete}
            onSaveTemplate={handleSaveTemplate}
          />
        ))}
      </AnimatePresence>

      {showCreate && (
        <CreateModal
          members={members}
          onClose={() => setShowCreate(false)}
          onCreated={(p) => {
            setPrograms((prev) => [p, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}
