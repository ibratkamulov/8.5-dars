"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import type { GymItem } from "@/lib/api";

const URGENCH: [number, number] = [41.5497, 60.6345];

const TILE_LAYERS = {
  map: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 20,
    maxNativeZoom: 19,
    subdomains: "abc",
  },
  satellite: {
    // Google satellite — best coverage for Central Asia / Uzbekistan
    url: "https://mt{s}.google.com/vt/lyrs=s&hl=uz&x={x}&y={y}&z={z}",
    attribution: "© Google",
    maxZoom: 21,
    maxNativeZoom: 20,
    subdomains: "0123",
  },
};

function makeIcon(active = false) {
  const color = active ? "#08a94b" : "#13cf5f";
  const size = active ? 36 : 30;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid white;
      box-shadow:0 2px 10px rgba(0,0,0,0.35);
    "></div>`,
  });
}

function makeUserIcon() {
  return L.divIcon({
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<div style="
      width:18px;height:18px;
      background:#3b82f6;
      border-radius:50%;
      border:3px solid white;
      box-shadow:0 0 0 6px rgba(59,130,246,0.25);
    "></div>`,
  });
}

interface Props {
  gyms: GymItem[];
  userPos: [number, number] | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function GymMap({ gyms, userPos, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<Record<"map" | "satellite", L.TileLayer | null>>({ map: null, satellite: null });
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [mode, setMode] = useState<"map" | "satellite">("map");

  // Init map + both tile layers once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: URGENCH,
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });

    // Create both layers upfront so tiles are cached on first switch
    (["map", "satellite"] as const).forEach((key) => {
      const cfg = TILE_LAYERS[key];
      layersRef.current[key] = L.tileLayer(cfg.url, {
        attribution: cfg.attribution,
        maxZoom: cfg.maxZoom,
        maxNativeZoom: cfg.maxNativeZoom,
        subdomains: cfg.subdomains,
      });
    });

    layersRef.current.map!.addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = { map: null, satellite: null };
      markersRef.current.clear();
    };
  }, []);

  // Switch tile layer — just swap pre-built instances
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const active   = layersRef.current[mode];
    const inactive = layersRef.current[mode === "map" ? "satellite" : "map"];
    if (inactive && map.hasLayer(inactive)) map.removeLayer(inactive);
    if (active && !map.hasLayer(active)) active.addTo(map);
  }, [mode]);

  // Sync gym markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker, id) => {
      if (!gyms.find((g) => g.id === id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    gyms.forEach((gym) => {
      const existing = markersRef.current.get(gym.id);
      const active = gym.id === selectedId;
      const icon = makeIcon(active);

      if (existing) {
        existing.setIcon(icon);
        return;
      }

      const marker = L.marker([gym.lat, gym.lon], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="min-width:180px;font-family:sans-serif">
            <strong style="font-size:14px">${gym.name}</strong>
            <p style="margin:4px 0;font-size:12px;color:#555">${gym.address}</p>
            ${gym.phone ? `<p style="margin:2px 0;font-size:12px">📞 ${gym.phone}</p>` : ""}
            ${gym.openingHours ? `<p style="margin:2px 0;font-size:11px;color:#777">🕐 ${gym.openingHours}</p>` : ""}
          </div>`,
          { maxWidth: 260 }
        );

      marker.on("click", () => onSelect(gym.id));
      markersRef.current.set(gym.id, marker);
    });
  }, [gyms, selectedId, onSelect]);

  // Pan to selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const gym = gyms.find((g) => g.id === selectedId);
    if (!gym) return;
    map.flyTo([gym.lat, gym.lon], 16, { animate: true, duration: 0.6 });
    markersRef.current.get(selectedId)?.openPopup();
  }, [selectedId, gyms]);

  // User position marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    userMarkerRef.current?.remove();
    if (!userPos) return;
    userMarkerRef.current = L.marker(userPos, { icon: makeUserIcon() })
      .addTo(map)
      .bindPopup("📍 You are here");
    map.flyTo(userPos, 14, { animate: true, duration: 0.8 });
  }, [userPos]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {/* Layer toggle */}
      <div className="absolute bottom-6 right-3 z-[1000] flex overflow-hidden rounded-lg border border-black/15 shadow-lg">
        <button
          onClick={() => setMode("map")}
          className={`px-3 py-1.5 text-xs font-bold transition ${
            mode === "map"
              ? "bg-brand-500 text-black"
              : "bg-white/90 text-black/60 hover:bg-white backdrop-blur-sm dark:bg-black/70 dark:text-white/60 dark:hover:bg-black/80"
          }`}
        >
          Xarita
        </button>
        <button
          onClick={() => setMode("satellite")}
          className={`px-3 py-1.5 text-xs font-bold transition ${
            mode === "satellite"
              ? "bg-brand-500 text-black"
              : "bg-white/90 text-black/60 hover:bg-white backdrop-blur-sm dark:bg-black/70 dark:text-white/60 dark:hover:bg-black/80"
          }`}
        >
          Satellite
        </button>
      </div>
    </div>
  );
}
