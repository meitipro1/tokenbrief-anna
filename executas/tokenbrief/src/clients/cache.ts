// executas/tokenbrief/src/clients/cache.ts — TTL + LRU cap + single-flight + stale fallback.
import { CONFIG } from "./config.js";

interface Entry<T> { value: T; expiresAt: number; staleUntil: number }

export class TtlCache<T> {
  private map = new Map<string, Entry<T>>();
  private inflight = new Map<string, Promise<T>>();

  constructor(private max = CONFIG.CACHE_MAX_ENTRIES, private staleS = CONFIG.CACHE_STALE_S) {}

  get(key: string): T | undefined {
    const e = this.map.get(key);
    if (!e || e.expiresAt <= Date.now()) return undefined;
    this.map.delete(key);
    this.map.set(key, e); // refresh LRU position
    return e.value;
  }

  getStale(key: string): T | undefined {
    const e = this.map.get(key);
    return e && e.staleUntil > Date.now() ? e.value : undefined;
  }

  set(key: string, value: T, ttlS: number): void {
    const now = Date.now();
    this.map.delete(key);
    this.map.set(key, { value, expiresAt: now + ttlS * 1000,
      staleUntil: now + (ttlS + this.staleS) * 1000 });
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value as string);
  }

  /** Cached value, else one shared load per key; on failure fall back to a stale entry. */
  getOrLoad(key: string, ttl: number | ((v: T) => number), load: () => Promise<T>): Promise<T> {
    const hit = this.get(key);
    if (hit !== undefined) return Promise.resolve(hit);
    const running = this.inflight.get(key);
    if (running) return running;
    const p = load()
      .then((v) => {
        this.set(key, v, typeof ttl === "function" ? ttl(v) : ttl);
        return v;
      })
      .catch((err) => {
        const stale = this.getStale(key);
        if (stale !== undefined) return stale;
        throw err;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }

  get size(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
    this.inflight.clear();
  }
}
