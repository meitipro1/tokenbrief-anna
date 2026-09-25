// executas/tokenbrief/src/clients/limiter.ts — per-host request budget.
// Keyless CoinGecko allows about 5 origin requests per minute (measured 2026-09-25: the 6th
// request in a minute gets 429 with Retry-After counting down to the window end). Each host
// therefore gets (a) a sliding-window budget of N requests per 60 s, (b) a minimum spacing,
// and (c) a penalty window after a 429 that applies to every caller. Responses served by the
// CDN cache (cf-cache-status: HIT) never reached the origin, so their slot is refunded.
// A call that would wait longer than LIMITER_MAX_WAIT_MS fails fast with the wait attached.
import { RateLimitTimeout } from "../errors.js";
import { CONFIG } from "./config.js";

const WINDOW_MS = 60_000;
const sent = new Map<string, number[]>(); // send times inside the window, incl. reserved slots
const blockedUntil = new Map<string, number>();
const lastSlot = new Map<string, number>();

const isCg = (host: string) => host.includes("coingecko");
const intervalFor = (host: string) =>
  isCg(host) ? CONFIG.CG_MIN_INTERVAL_MS : CONFIG.DS_MIN_INTERVAL_MS;
const budgetFor = (host: string) => (isCg(host) ? CONFIG.CG_PER_MINUTE : CONFIG.DS_PER_MINUTE);

export interface Slot { host: string; at: number }

export async function acquire(host: string, interval = intervalFor(host),
  budget = budgetFor(host)): Promise<Slot> {
  const now = Date.now();
  const times = (sent.get(host) ?? []).filter((t) => t > now - WINDOW_MS).sort((a, b) => a - b);
  let at = Math.max(now, blockedUntil.get(host) ?? 0, (lastSlot.get(host) ?? -Infinity) + interval);
  // budget > 0: at most `budget` sends in any 60 s window ending at `at`
  if (budget > 0 && times.length >= budget) at = Math.max(at, times[times.length - budget] + WINDOW_MS);
  if (at - now > CONFIG.LIMITER_MAX_WAIT_MS) {
    throw new RateLimitTimeout(host, Math.ceil((at - now) / 1000));
  }
  times.push(at);
  sent.set(host, times);
  lastSlot.set(host, at);
  if (at > now) await new Promise((r) => setTimeout(r, at - now));
  return { host, at };
}

/** The response came from the CDN cache: it did not use the origin's budget. */
export function refund(slot: Slot): void {
  const times = sent.get(slot.host);
  const i = times?.indexOf(slot.at) ?? -1;
  if (times && i >= 0) times.splice(i, 1);
}

export function penalize(host: string, ms: number): void {
  blockedUntil.set(host, Math.max(blockedUntil.get(host) ?? 0, Date.now() + ms));
}

export function resetLimiter(): void {
  sent.clear();
  blockedUntil.clear();
  lastSlot.clear();
}
