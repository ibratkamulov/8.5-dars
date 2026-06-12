import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import type { GymDto } from "./gym.dto";

const URGENCH_LAT = 41.5497;
const URGENCH_LON = 60.6345;
const SEARCH_RADIUS_M = 25000;
const CACHE_TTL_S = 86400; // 24 h

const CITY_COORDS: Record<string, [number, number]> = {
  urgench: [URGENCH_LAT, URGENCH_LON],
  urganch: [URGENCH_LAT, URGENCH_LON],
};

// Mirrors tried in order; first success wins
const OVERPASS_ENDPOINTS = [
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const memCache = new Map<string, { data: GymDto[]; expiresAt: number }>();

// Static seed — real gyms confirmed in OSM for Urgench, Khorezm
const URGENCH_STATIC_GYMS: GymDto[] = [
  {
    id: "osm-node-10571521267",
    name: "LADY FITNESS",
    address: "Urgench, Xorazm",
    lat: 41.5605,
    lon: 60.6086,
    source: "osm",
  },
  {
    id: "osm-node-tiger-sport-zal",
    name: "TIGER sport zal",
    address: "Urgench, Xorazm",
    lat: 41.5675,
    lon: 60.6150,
    source: "osm",
  },
  {
    id: "osm-way-361068345",
    name: "Yoshlik sport kompleksi",
    address: "Urgench, Xorazm",
    lat: 41.5403,
    lon: 60.6236,
    source: "osm",
  },
  {
    id: "osm-node-muay-thai",
    name: "Муай Тай спорт.секция",
    address: "Urgench, Xorazm",
    lat: 41.5515,
    lon: 60.6422,
    source: "osm",
  },
  {
    id: "osm-node-legenda-fit",
    name: "Legenda Fit",
    address: "Daritalda, Urgench, Xorazm",
    lat: 41.5538,
    lon: 60.6195,
    source: "osm",
  },
  {
    id: "osm-node-sport-palace",
    name: "Xorazm Sport Palace",
    address: "Urgench, Xorazm",
    lat: 41.5480,
    lon: 60.6310,
    source: "osm",
  },
];

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

@Injectable()
export class GymsService implements OnModuleInit {
  private readonly logger = new Logger(GymsService.name);
  private redis: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>("REDIS_URL");
    if (!url) return;
    const client = new Redis(url, {
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null, // no auto-retry
      enableOfflineQueue: false,
    });
    // Suppress unhandled error events that would crash Node
    client.on("error", () => undefined);
    try {
      await client.connect();
      this.redis = client;
      this.logger.log("Redis connected — gym cache active");
    } catch {
      this.logger.warn("Redis unavailable — using in-memory cache");
      client.disconnect();
    }
  }

  async search(city = "urgench", query?: string): Promise<GymDto[]> {
    const cityKey = city.toLowerCase().trim();
    const cacheKey = `gyms:${cityKey}`;

    const cached = await this.getCache(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey} (${cached.length} gyms)`);
      return this.filter(cached, query);
    }

    let gyms = await this.fetchFromOverpass(cityKey);

    // Fallback to known static data when live fetch fails
    if (gyms.length === 0) {
      const staticGyms = cityKey === "urgench" || cityKey === "urganch"
        ? URGENCH_STATIC_GYMS
        : [];
      if (staticGyms.length > 0) {
        this.logger.warn(`Overpass unavailable — serving ${staticGyms.length} static gyms for ${cityKey}`);
        gyms = staticGyms;
      }
    }

    if (gyms.length > 0) await this.setCache(cacheKey, gyms);
    return this.filter(gyms, query);
  }

  // ── Overpass ────────────────────────────────────────────────────────────────

  private buildQuery(lat: number, lon: number): string {
    const r = SEARCH_RADIUS_M;
    // Covers: fitness centres, gyms, sports halls, sports centres, boxing/martial arts
    return `
[out:json][timeout:25];
(
  node["leisure"="fitness_centre"](around:${r},${lat},${lon});
  way["leisure"="fitness_centre"](around:${r},${lat},${lon});
  node["leisure"="sports_hall"](around:${r},${lat},${lon});
  way["leisure"="sports_hall"](around:${r},${lat},${lon});
  node["amenity"="gym"](around:${r},${lat},${lon});
  way["amenity"="gym"](around:${r},${lat},${lon});
  node["sport"="fitness"](around:${r},${lat},${lon});
  way["sport"="fitness"](around:${r},${lat},${lon});
  node["leisure"="sports_centre"](around:${r},${lat},${lon});
  way["leisure"="sports_centre"](around:${r},${lat},${lon});
);
out center;`.trim();
  }

  private async fetchFromOverpass(cityKey: string): Promise<GymDto[]> {
    const [lat, lon] = CITY_COORDS[cityKey] ?? [URGENCH_LAT, URGENCH_LON];
    const query = this.buildQuery(lat, lon);
    const body = `data=${encodeURIComponent(query)}`;

    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        this.logger.log(`Trying Overpass: ${endpoint}`);
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "FastResult/1.0 (fitness-club-management; contact@fastresult.uz)",
          },
          body,
          signal: AbortSignal.timeout(28_000),
        });

        if (!res.ok) {
          this.logger.warn(`${endpoint} → HTTP ${res.status}`);
          continue;
        }

        const json = await res.json() as { elements: OverpassElement[] };
        const gyms = json.elements
          .map((el) => this.parseElement(el))
          .filter((g): g is GymDto => g !== null && !!g.name.trim() && g.lat > 0);

        this.logger.log(`Overpass (${endpoint}): ${gyms.length} gyms near ${cityKey}`);
        return gyms;
      } catch (err) {
        this.logger.warn(`${endpoint} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    this.logger.error("All Overpass endpoints failed");
    return [];
  }

  private parseElement(el: OverpassElement): GymDto | null {
    const tags = el.tags ?? {};
    const lat = el.type === "node" ? (el.lat ?? 0) : (el.center?.lat ?? 0);
    const lon = el.type === "node" ? (el.lon ?? 0) : (el.center?.lon ?? 0);
    if (!lat || !lon) return null;

    const name =
      tags["name"] ??
      tags["name:uz"] ??
      tags["name:ru"] ??
      tags["name:en"] ??
      tags["brand"] ??
      "";

    return {
      id: `osm-${el.type}-${el.id}`,
      name,
      address: this.buildAddress(tags),
      lat,
      lon,
      ...(tags["phone"] ?? tags["contact:phone"] ?? tags["telephone"]
        ? { phone: tags["phone"] ?? tags["contact:phone"] ?? tags["telephone"] }
        : {}),
      ...(tags["website"] ?? tags["contact:website"] ?? tags["url"]
        ? { website: tags["website"] ?? tags["contact:website"] ?? tags["url"] }
        : {}),
      ...(tags["opening_hours"] ? { openingHours: tags["opening_hours"] } : {}),
      source: "osm",
    };
  }

  private buildAddress(tags: Record<string, string>): string {
    if (tags["addr:full"]) return tags["addr:full"];
    const parts: string[] = [];
    if (tags["addr:street"]) parts.push(tags["addr:street"]);
    if (tags["addr:housenumber"]) parts.push(tags["addr:housenumber"]);
    if (tags["addr:city"]) parts.push(tags["addr:city"]);
    return parts.join(", ") || "Urgench, Xorazm";
  }

  // ── Cache ────────────────────────────────────────────────────────────────────

  private async getCache(key: string): Promise<GymDto[] | null> {
    try {
      if (this.redis) {
        const raw = await this.redis.get(key);
        return raw ? (JSON.parse(raw) as GymDto[]) : null;
      }
    } catch { /* fall through */ }
    const entry = memCache.get(key);
    return entry && Date.now() < entry.expiresAt ? entry.data : null;
  }

  private async setCache(key: string, data: GymDto[]): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.set(key, JSON.stringify(data), "EX", CACHE_TTL_S);
        return;
      }
    } catch { /* fall through */ }
    memCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_S * 1000 });
  }

  private filter(gyms: GymDto[], query?: string): GymDto[] {
    if (!query?.trim()) return gyms;
    const q = query.toLowerCase();
    return gyms.filter(
      (g) => g.name.toLowerCase().includes(q) || g.address.toLowerCase().includes(q),
    );
  }
}
