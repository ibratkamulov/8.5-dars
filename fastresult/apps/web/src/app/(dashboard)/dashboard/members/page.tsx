"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Download, Eye, EyeOff, Layers, Search, User, Users, X } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { api, type MemberItem } from "@/lib/api";

type Role = "MEMBER" | "TRAINER";

type CreatedUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
};

export default function MembersPage() {
  const { copy } = useLang();
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  // Bulk assign state
  const [showBulk, setShowBulk] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkPlan, setBulkPlan] = useState("");
  const [bulkPeriod, setBulkPeriod] = useState("MONTHLY");
  const [bulkStart, setBulkStart] = useState(new Date().toISOString().slice(0, 10));
  const [bulkEnd, setBulkEnd] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10);
  });
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
  const [copied, setCopied] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState<Role>("MEMBER");

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  function loadMembers() {
    setLoading(true);
    api.members
      .list()
      .then(setMembers)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : copy("error")))
      .finally(() => setLoading(false));
  }

  function openModal() {
    setShowModal(true);
    setCreatedUser(null);
    setFormError("");
    setFullName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRole("MEMBER");
    setTimeout(() => nameRef.current?.focus(), 50);
  }

  function closeModal() {
    setShowModal(false);
    setCreatedUser(null);
    if (createdUser) loadMembers();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setFormError("Parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      const user = await api.users.create({
        fullName,
        email,
        phone: phone || undefined,
        password,
        role,
      });
      setCreatedUser(user);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : copy("error"));
    } finally {
      setSubmitting(false);
    }
  }

  function copyCredentials() {
    const text = `Email: ${createdUser?.email}\nParol: ${password}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const filtered = members.filter(
    (m) =>
      m.user.fullName.toLowerCase().includes(query.toLowerCase()) ||
      m.user.email.toLowerCase().includes(query.toLowerCase())
  );

  function exportCsv() {
    const header = ["Name", "Email", "Phone", "Club"];
    const rows = filtered.map((m) => [
      m.user.fullName,
      m.user.email,
      m.user.phone ?? "",
      m.user.clubId ?? "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "members.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function doBulkAssign() {
    if (!bulkPlan || bulkSelected.size === 0) return;
    setBulkLoading(true);
    setBulkMsg("");
    try {
      const res = await api.memberships.bulkAssign({
        memberIds: Array.from(bulkSelected),
        planName: bulkPlan,
        period: bulkPeriod,
        startsAt: bulkStart,
        expiresAt: bulkEnd,
      });
      setBulkMsg(`${res.created} ${copy("bulkDone")}`);
      setBulkSelected(new Set());
    } catch (e: unknown) {
      setBulkMsg(e instanceof Error ? e.message : copy("error"));
    } finally {
      setBulkLoading(false);
    }
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy("members")}</h1>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            {members.length} {copy("totalMembers").toLowerCase()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulk(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-white/5 px-4 py-2.5 text-sm font-black text-black/70 dark:text-white/70 hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition"
          >
            <Layers size={16} />
            {copy("bulkAssign")}
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-white/5 px-4 py-2.5 text-sm font-black text-black/70 dark:text-white/70 hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition"
          >
            <Download size={16} />
            {copy("exportCsv")}
          </button>
          <button
            onClick={openModal}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-black text-black hover:bg-brand-600 hover:text-white"
          >
            <User size={16} />
            {copy("addMember")}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={copy("search")}
          className="w-full rounded-lg border border-black/15 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-white/5 sm:max-w-sm"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-dashed border-black/20 bg-white/60 p-12 text-center dark:border-white/15 dark:bg-white/[0.03]"
        >
          <Users size={40} className="mx-auto text-brand-500 opacity-50" />
          <p className="mt-3 font-semibold text-black/55 dark:text-white/55">{copy("noMembers")}</p>
        </motion.div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white/80 dark:border-white/10 dark:bg-white/[0.04]">
          <table className="w-full text-sm">
            <thead className="border-b border-black/8 dark:border-white/8">
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-black/45 dark:text-white/45">
                <th className="px-4 py-3">{copy("memberName")}</th>
                <th className="hidden px-4 py-3 sm:table-cell">{copy("email")}</th>
                <th className="hidden px-4 py-3 md:table-cell">{copy("phone")}</th>
                <th className="px-4 py-3">{copy("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {filtered.map((m, i) => (
                <motion.tr
                  key={m.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-brand-500/5"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500/15 text-xs font-black text-brand-700 dark:text-brand-400">
                        {m.user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold">{m.user.fullName}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-black/60 dark:text-white/60 sm:table-cell">
                    {m.user.email}
                  </td>
                  <td className="hidden px-4 py-3 text-black/60 dark:text-white/60 md:table-cell">
                    {m.user.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button className="rounded-md bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-500/25 dark:text-brand-400">
                      {copy("view")}
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Create Member Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-md rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#111]"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-black/8 px-6 py-4 dark:border-white/8">
                <h2 className="text-lg font-black">{copy("createMember")}</h2>
                <button
                  onClick={closeModal}
                  className="grid h-8 w-8 place-items-center rounded-lg text-black/40 hover:bg-black/5 hover:text-black dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-6 py-5">
                {/* ── Success state ── */}
                {createdUser ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-3 rounded-xl bg-brand-500/10 px-4 py-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-500/20 text-brand-600 dark:text-brand-400">
                        <Check size={18} />
                      </div>
                      <div>
                        <p className="font-black">{copy("memberCreated")}</p>
                        <p className="text-sm text-black/55 dark:text-white/55">{createdUser.fullName}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-black/45 dark:text-white/45">
                        {copy("loginInfo")}
                      </p>
                      <div className="space-y-2 font-mono text-sm">
                        <div className="flex justify-between">
                          <span className="text-black/50 dark:text-white/50">Email:</span>
                          <span className="font-semibold">{createdUser.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-black/50 dark:text-white/50">{copy("password")}:</span>
                          <span className="font-semibold">{password}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={copyCredentials}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/10 py-2.5 text-sm font-black transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                    >
                      {copied ? (
                        <>
                          <Check size={15} className="text-brand-500" />
                          {copy("credentialsCopied")}
                        </>
                      ) : (
                        <>
                          <Copy size={15} />
                          {copy("copyCredentials")}
                        </>
                      )}
                    </button>

                    <button
                      onClick={closeModal}
                      className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-black text-black hover:bg-brand-600 hover:text-white"
                    >
                      {copy("close")}
                    </button>
                  </motion.div>
                ) : (
                  /* ── Form state ── */
                  <form onSubmit={handleCreate} className="space-y-4">
                    {/* Role selector */}
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold">{copy("role")}</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["MEMBER", "TRAINER"] as Role[]).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRole(r)}
                            className={`rounded-lg border py-2 text-sm font-bold transition ${
                              role === r
                                ? "border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-400"
                                : "border-black/10 bg-black/5 text-black/60 hover:border-brand-500/40 dark:border-white/10 dark:bg-white/5 dark:text-white/60"
                            }`}
                          >
                            {r === "MEMBER" ? copy("member") : copy("trainer")}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Full name */}
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold">{copy("fullName")}</label>
                      <input
                        ref={nameRef}
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Dilshod Toshmatov"
                        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-white/5"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold">
                        {copy("phone")}{" "}
                        <span className="font-normal text-black/40 dark:text-white/40">(ixtiyoriy)</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+998 90 123 45 67"
                        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-white/5"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold">{copy("email")}</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="dilshod@example.com"
                        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-white/5"
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold">{copy("tempPassword")}</label>
                      <div className="relative">
                        <input
                          type={showPw ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Kamida 6 belgi"
                          className="w-full rounded-lg border border-black/15 bg-white py-2.5 pl-3 pr-10 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-white/5"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"
                        >
                          {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {formError && (
                      <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                        {formError}
                      </p>
                    )}

                    <div className="flex gap-3 pt-1">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="flex-1 rounded-lg border border-black/10 py-2.5 text-sm font-black transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                      >
                        {copy("cancel")}
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-black text-black transition hover:bg-brand-600 hover:text-white disabled:opacity-50"
                      >
                        {submitting ? copy("loading") : copy("createMember")}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk assign modal */}
      <AnimatePresence>
        {showBulk && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowBulk(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-lg rounded-2xl border border-black/10 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#0d1f14]/95"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-black">{copy("bulkAssign")}</h2>
                <button onClick={() => { setShowBulk(false); setBulkMsg(""); setBulkSelected(new Set()); }}
                  className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/5"><X size={16} /></button>
              </div>

              {bulkMsg && (
                <div className="mb-3 rounded-lg bg-brand-500/10 px-3 py-2 text-xs font-semibold text-brand-700 dark:text-brand-300">{bulkMsg}</div>
              )}

              <div className="space-y-3 mb-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-black/60 dark:text-white/60">{copy("planName")}</label>
                  <input value={bulkPlan} onChange={(e) => setBulkPlan(e.target.value)} placeholder="Premium Monthly"
                    className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-black/60 dark:text-white/60">{copy("period")}</label>
                    <select value={bulkPeriod} onChange={(e) => setBulkPeriod(e.target.value)}
                      className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none dark:border-white/15 dark:bg-white/5">
                      {["DAILY","WEEKLY","MONTHLY","QUARTERLY","YEARLY"].map((p) => (
                        <option key={p} value={p}>{copy(p as import("@/lib/i18n").TKey)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-black/60 dark:text-white/60">{copy("startDate")}</label>
                    <input type="date" value={bulkStart} onChange={(e) => setBulkStart(e.target.value)}
                      className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none dark:border-white/15 dark:bg-white/5" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-black/60 dark:text-white/60">{copy("endDate")}</label>
                    <input type="date" value={bulkEnd} onChange={(e) => setBulkEnd(e.target.value)}
                      className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none dark:border-white/15 dark:bg-white/5" />
                  </div>
                </div>
              </div>

              <p className="mb-2 text-xs font-semibold text-black/50 dark:text-white/50">
                {copy("selectMembers")} ({bulkSelected.size} {copy("total").toLowerCase()})
              </p>
              <div className="max-h-48 overflow-y-auto space-y-0.5 mb-4 rounded-lg border border-black/10 dark:border-white/10">
                {members.map((m) => (
                  <label key={m.id} className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-black/3 dark:hover:bg-white/3">
                    <input
                      type="checkbox"
                      checked={bulkSelected.has(m.user.id)}
                      onChange={(e) => {
                        const next = new Set(bulkSelected);
                        if (e.target.checked) next.add(m.user.id); else next.delete(m.user.id);
                        setBulkSelected(next);
                      }}
                      className="accent-brand-500"
                    />
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500/15 text-[10px] font-black text-brand-700 dark:text-brand-300">
                      {m.user.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{m.user.fullName}</p>
                      <p className="truncate text-xs text-black/45 dark:text-white/45">{m.user.email}</p>
                    </div>
                  </label>
                ))}
              </div>

              <button
                onClick={doBulkAssign}
                disabled={bulkLoading || bulkSelected.size === 0 || !bulkPlan}
                className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-black text-black transition hover:bg-brand-600 hover:text-white disabled:opacity-50"
              >
                {bulkLoading ? copy("loading") : `${copy("assignPlan")} (${bulkSelected.size})`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
