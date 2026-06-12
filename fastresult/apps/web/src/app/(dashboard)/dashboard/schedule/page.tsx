"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/lang-context";
import { api, type TrainerItem, type TrainerShift } from "@/lib/api";
import type { TKey } from "@/lib/i18n";

const DAY_KEYS: TKey[] = ["dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat", "daySun"];
const COLORS = ["bg-brand-500/15", "bg-blue-500/15", "bg-purple-500/15", "bg-amber-500/15", "bg-red-500/15", "bg-pink-500/15", "bg-teal-500/15"];

type ShiftMap = Record<number, TrainerShift>;

function toMap(shifts: TrainerShift[]): ShiftMap {
  return Object.fromEntries(shifts.map((s) => [s.dayOfWeek, s]));
}

function ShiftCell({ day, shift, trainerId, onSaved, onDeleted }: {
  day: number;
  shift?: TrainerShift;
  trainerId: string;
  onSaved: (s: TrainerShift) => void;
  onDeleted: (day: number) => void;
}) {
  const { copy } = useLang();
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(shift?.startTime ?? "09:00");
  const [end, setEnd] = useState(shift?.endTime ?? "18:00");
  const [note, setNote] = useState(shift?.note ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const s = await api.schedule.upsert({ trainerId, dayOfWeek: day, startTime: start, endTime: end, note: note || undefined });
      onSaved(s);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    await api.schedule.remove({ trainerId, dayOfWeek: day });
    onDeleted(day);
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-brand-500/40 bg-brand-500/8 p-2 space-y-1.5">
        <div className="flex gap-1">
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)}
            className="flex-1 rounded bg-white dark:bg-white/10 px-2 py-1 text-xs outline-none" />
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)}
            className="flex-1 rounded bg-white dark:bg-white/10 px-2 py-1 text-xs outline-none" />
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={copy("description")}
          className="w-full rounded bg-white dark:bg-white/10 px-2 py-1 text-xs outline-none" />
        <div className="flex gap-1">
          <button onClick={save} disabled={saving}
            className="flex flex-1 items-center justify-center gap-1 rounded bg-brand-500 py-1 text-xs font-black text-black hover:bg-brand-600 hover:text-white">
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          </button>
          <button onClick={() => setEditing(false)}
            className="rounded border border-black/15 dark:border-white/15 px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5">
            <X size={11} />
          </button>
        </div>
      </div>
    );
  }

  if (shift) {
    return (
      <div className="group relative rounded-lg bg-brand-500/10 p-2">
        <p className="text-xs font-black text-brand-700 dark:text-brand-300">{shift.startTime} – {shift.endTime}</p>
        {shift.note && <p className="mt-0.5 truncate text-[10px] text-black/50 dark:text-white/50">{shift.note}</p>}
        <div className="absolute right-1 top-1 hidden gap-0.5 group-hover:flex">
          <button onClick={() => { setStart(shift.startTime); setEnd(shift.endTime); setNote(shift.note ?? ""); setEditing(true); }}
            className="rounded p-0.5 text-black/40 hover:text-brand-600">
            <Pencil size={11} />
          </button>
          <button onClick={remove} className="rounded p-0.5 text-black/40 hover:text-red-500">
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)}
      className="flex w-full items-center justify-center rounded-lg border border-dashed border-black/15 dark:border-white/15 py-3 text-black/25 dark:text-white/25 hover:border-brand-500/40 hover:text-brand-500 transition">
      <Plus size={14} />
    </button>
  );
}

export default function SchedulePage() {
  const { user } = useAuth();
  const { copy } = useLang();
  const [trainers, setTrainers] = useState<TrainerItem[]>([]);
  const [shiftsByTrainer, setShiftsByTrainer] = useState<Record<string, ShiftMap>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isTrainer = user?.role === "TRAINER";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (isTrainer) {
        const shifts = await api.schedule.listForTrainer(user!.id);
        setShiftsByTrainer({ [user!.id]: toMap(shifts) });
        setTrainers([{ id: user!.id, userId: user!.id, user: { id: user!.id, fullName: user!.fullName, email: "" }, bio: null, rating: 0, specialties: [] }]);
      } else {
        const [allShifts, trainerList] = await Promise.all([
          api.schedule.listAll(),
          api.trainers.list(),
        ]);
        setTrainers(trainerList);
        const map: Record<string, ShiftMap> = {};
        for (const s of allShifts) {
          const tid = s.trainer.user.id;
          if (!map[tid]) map[tid] = {};
          map[tid][s.dayOfWeek] = s;
        }
        setShiftsByTrainer(map);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy("error"));
    } finally {
      setLoading(false);
    }
  }, [isTrainer, user, copy]);

  useEffect(() => { load(); }, [load]);

  function handleSaved(trainerId: string, shift: TrainerShift) {
    setShiftsByTrainer((prev) => ({
      ...prev,
      [trainerId]: { ...(prev[trainerId] ?? {}), [shift.dayOfWeek]: shift },
    }));
  }

  function handleDeleted(trainerId: string, day: number) {
    setShiftsByTrainer((prev) => {
      const copy2 = { ...(prev[trainerId] ?? {}) };
      delete copy2[day];
      return { ...prev, [trainerId]: copy2 };
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy("trainerSchedule")}</h1>
        <p className="mt-1 text-sm text-black/55 dark:text-white/55">{trainers.length} {copy("trainers").toLowerCase()}</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-brand-500" />
        </div>
      )}

      <AnimatePresence initial={false}>
        {!loading && trainers.map((trainer, tIdx) => {
          const shifts = shiftsByTrainer[trainer.user.id] ?? {};
          return (
            <motion.div
              key={trainer.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: tIdx * 0.04 }}
              className="rounded-xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-black text-black/60 dark:text-white/60 ${COLORS[tIdx % COLORS.length]}`}>
                  {trainer.user.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-black">{trainer.user.fullName}</p>
                  {trainer.specialties.length > 0 && (
                    <p className="text-xs text-black/40 dark:text-white/40">{trainer.specialties.join(", ")}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {DAY_KEYS.map((key, i) => (
                  <div key={i}>
                    <p className="mb-1.5 text-center text-[10px] font-black text-black/40 dark:text-white/40">
                      {copy(key).slice(0, 2).toUpperCase()}
                    </p>
                    <ShiftCell
                      day={i + 1}
                      shift={shifts[i + 1]}
                      trainerId={trainer.user.id}
                      onSaved={(s) => handleSaved(trainer.user.id, s)}
                      onDeleted={(d) => handleDeleted(trainer.user.id, d)}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
