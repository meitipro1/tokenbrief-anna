// executas/tokenbrief/src/clients/limiter.ts — per-host spacing ("next free slot").
// A 429 pushes the slot forward for every caller of that host, not just the one that got it.
import { RateLimitTimeout } from "../errors.js";
import { CONFIG } from "./config.js";

const nextSlot = new Map<string, number>();

const intervalFor = (host: string): number =>
  host.includes("coingecko") ? CONFIG.CG_MIN_INTERVAL_MS : CONFIG.DS_MIN_INTERVAL_MS;

export async function acquire(host: string, interval = intervalFor(host)): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, nextSlot.get(host) ?? 0);
  if (slot - now > CONFIG.LIMITER_MAX_WAIT_MS) throw new RateLimitTimeout(host);
  nextSlot.set(host, slot + interval);
  if (slot > now) await new Promise((r) => setTimeout(r, slot - now));
}

export function penalize(host: string, ms: number): void {
  nextSlot.set(host, Math.max(nextSlot.get(host) ?? 0, Date.now() + ms));
}

export function resetLimiter(): void {
  nextSlot.clear();
}
