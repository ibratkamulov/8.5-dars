"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, ExternalLink, Loader2, MapPin, Navigation, Phone, Search, Star, X,
} from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { api, type GymItem } from "@/lib/api";

// Leaflet uses browser APIs — must be loaded client-side only
const GymMap = dynamic(() => import("@/components/gym-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-black/5 dark:bg-white/5">
      <Loader2 size={28} className="animate-spin text-brand-500" />
    </div>
  ),
});

// ── Haversine distance (km) ──────────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Rating stars ─────────────────────────────────────────────────────────────
function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={11}
          className={i <= n ? "text-amber-400 fill-amber-400" : "text-black/20 dark:text-white/20"}
        />
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function DiscoveryPage() {
  const { copy } = useLang();

  const [gyms, setGyms] = useState<GymItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);

  // ── Fetch gyms ─────────────────────────────────────────────────────────────
  const loadGyms = useCallback((q?: string) => {
    setLoading(true);
    setError("");
    api.gyms
      .search("urgench", q)
      .then((data) => {
        const sorted = userPos
          ? [...data]
              .map((g) => ({ ...g, distance: haversine(userPos[0], userPos[1], g.lat, g.lon) }))
              .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
          : data;
        setGyms(sorted);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : copy("error"))
      )
      .finally(() => setLoading(false));
  }, [userPos, copy]);

  useEffect(() => { loadGyms(); }, []); // initial load only

  // Re-sort when user position changes
  useEffect(() => {
    if (!userPos || gyms.length === 0) return;
    setGyms((prev) =>
      [...prev]
        .map((g) => ({ ...g, distance: haversine(userPos[0], userPos[1], g.lat, g.lon) }))
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
    );
  }, [userPos]); // re-sort on location change only

  // ── Search ─────────────────────────────────────────────────────────────────
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadGyms(query.trim() || undefined);
  }

  // ── Near Me ────────────────────────────────────────────────────────────────
  function handleNearMe() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 sm:h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy("discovery")}</h1>
        <p className="mt-0.5 text-sm text-black/50 dark:text-white/50">{copy("mapHint")}</p>
      </div>

      {/* Search + Near Me */}
      <form onSubmit={handleSearch} className="flex shrink-0 gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35 dark:text-white/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy("searchGyms")}
            className="w-full rounded-lg border border-black/12 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/12 dark:bg-white/5"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); loadGyms(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 hover:text-black dark:text-white/30 dark:hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-black text-black hover:bg-brand-600 hover:text-white transition"
        >
          {copy("search")}
        </button>
        <button
          type="button"
          onClick={handleNearMe}
          disabled={locating}
          className="flex items-center gap-1.5 rounded-lg border border-black/12 bg-white px-3 py-2.5 text-sm font-semibold text-black/70 transition hover:border-brand-500 hover:text-brand-600 disabled:opacity-50 dark:border-white/12 dark:bg-white/5 dark:text-white/70"
          title="Near Me"
        >
          {locating ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
          <span className="hidden sm:inline">{copy("nearMe")}</span>
        </button>
      </form>

      {/* Error banner */}
      {error && (
        <div className="shrink-0 flex items-center justify-between rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
          {error}
          <button onClick={() => setError("")}><X size={14} /></button>
        </div>
      )}

      {/* Body: map + cards */}
      <div className="flex min-h-0 flex-1 gap-4 lg:flex-row flex-col">
        {/* Map */}
        <div className="relative min-h-[240px] flex-1 overflow-hidden rounded-xl border border-black/10 dark:border-white/10 lg:min-h-0">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-xl">
              <Loader2 size={28} className="animate-spin text-brand-500" />
            </div>
          )}
          <GymMap
            gyms={gyms}
            userPos={userPos}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {/* Gym count badge */}
          {!loading && gyms.length > 0 && (
            <div className="absolute top-3 left-3 z-[1000] rounded-full bg-white/90 px-3 py-1 text-xs font-bold shadow-sm backdrop-blur dark:bg-black/70 dark:text-white">
              {gyms.length} {copy("gymsFound")}
            </div>
          )}
        </div>

        {/* Cards */}
        <div className="w-full shrink-0 overflow-y-auto lg:w-80">
          {loading && (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />
              ))}
            </div>
          )}

          {!loading && gyms.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/20 bg-white/50 p-10 text-center dark:border-white/15 dark:bg-white/[0.03]">
              <MapPin size={36} className="text-brand-500/50" />
              <p className="mt-3 text-sm font-semibold text-black/50 dark:text-white/50">{copy("noGyms")}</p>
              <p className="mt-1 text-xs text-black/35 dark:text-white/35">
                {copy("osmHint")}
              </p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {gyms.map((gym, i) => {
              const isSelected = gym.id === selectedId;
              return (
                <motion.button
                  key={gym.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  onClick={() => setSelectedId(isSelected ? null : gym.id)}
                  className={`mb-2.5 w-full rounded-xl border p-4 text-left shadow-sm transition-all duration-150 ${
                    isSelected
                      ? "border-brand-500/50 bg-brand-500/8 ring-2 ring-brand-500/20"
                      : "border-black/10 bg-white/80 hover:border-brand-500/30 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${isSelected ? "bg-brand-500" : "bg-brand-500/15"}`}>
                      <MapPin size={16} className={isSelected ? "text-black" : "text-brand-600 dark:text-brand-400"} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black leading-tight">{gym.name}</p>
                      <p className="mt-0.5 truncate text-xs text-black/50 dark:text-white/50">{gym.address}</p>
                    </div>
                    {gym.distance !== undefined && (
                      <span className="shrink-0 text-xs font-bold text-brand-600 dark:text-brand-400">
                        {gym.distance < 1
                          ? `${Math.round(gym.distance * 1000)}m`
                          : `${gym.distance.toFixed(1)}km`}
                      </span>
                    )}
                  </div>

                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 space-y-1.5 border-t border-black/8 pt-3 dark:border-white/8">
                          {gym.phone && (
                            <div className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
                              <Phone size={11} className="shrink-0" />
                              <span>{gym.phone}</span>
                            </div>
                          )}
                          {gym.openingHours && (
                            <div className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
                              <Clock size={11} className="shrink-0" />
                              <span className="truncate">{gym.openingHours}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-black/40 dark:text-white/40">
                            <MapPin size={11} className="shrink-0" />
                            <span className="font-mono">{gym.lat.toFixed(5)}, {gym.lon.toFixed(5)}</span>
                          </div>
                          {gym.website && (
                            <a
                              href={gym.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                            >
                              <ExternalLink size={11} />
                              {copy("website")}
                            </a>
                          )}
                          {gym.rating > 0 && (
                            <div className="pt-1">
                              <Stars n={gym.rating} />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
