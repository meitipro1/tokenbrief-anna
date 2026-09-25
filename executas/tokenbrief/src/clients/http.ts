// executas/tokenbrief/src/clients/http.ts — every network call goes through fetchJson:
// timeout, retry, per-host budget (limiter.ts), TTL cache with single-flight + stale fallback,
// evidence capture.
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { UpstreamError } from "../errors.js";
import { log } from "../log.js";
import { TtlCache } from "./cache.js";
import { CONFIG } from "./config.js";
import { acquire, penalize, refund } from "./limiter.js";

export interface Fetched<T> { data: T; fetchedAt: string }
export interface FetchOpts { ttl: number; timeoutMs?: number; retries?: number }

const cache = new TtlCache<Fetched<unknown> | null>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const backoff = (attempt: number) => 1000 * 2 ** attempt;

export const clearHttpCache = () => cache.clear();

/** Fresh cached response for `url`, without any network call (undefined = not cached). */
export const peekJson = <T>(url: string) => cache.get(url) as Fetched<T> | null | undefined;

/** Seed the cache, e.g. /coins/{id} from a /coins/{platform}/contract/{addr} response. */
export const primeJson = (url: string, value: Fetched<unknown>, ttlS: number) =>
  cache.set(url, value, ttlS);

/** 404 → null (negative-cached); 429/5xx/network → retried; other 4xx → UpstreamError. */
export function fetchJson<T>(url: string, opts: FetchOpts): Promise<Fetched<T> | null> {
  const ttl = (v: Fetched<unknown> | null) => (v === null ? CONFIG.CACHE_NEGATIVE_TTL_S : opts.ttl);
  return cache.getOrLoad(url, ttl, () => load(url, opts)) as Promise<Fetched<T> | null>;
}

async function load(url: string, opts: FetchOpts): Promise<Fetched<unknown> | null> {
  const host = new URL(url).host;
  const retries = opts.retries ?? CONFIG.HTTP_RETRIES;
  for (let attempt = 0; ; attempt++) {
    const slot = await acquire(host);
    let res: Response;
    try {
      res = await fetch(url, {
        headers: headersFor(host),
        signal: AbortSignal.timeout(opts.timeoutMs ?? CONFIG.HTTP_TIMEOUT_MS),
      });
    } catch {
      if (attempt < retries) { await sleep(backoff(attempt)); continue; }
      throw new UpstreamError(host, "timeout");
    }
    const cdn = res.headers.get("cf-cache-status");
    if (cdn === "HIT") refund(slot); // served by the CDN: the origin budget was not used
    log(`GET ${host}${new URL(url).pathname} → ${res.status}${cdn ? ` (${cdn})` : ""}`);
    if (res.status === 404) { // a definite "no such coin" — recorded so replays see it too
      if (process.env.TOKENBRIEF_EVIDENCE === "1") {
        await saveEvidence(url, res, await res.text(), new Date().toISOString());
      }
      return null;
    }
    if (res.status === 429) {
      const wait = retryAfterMs(res);
      penalize(host, wait); // every caller of this host waits it out
      if (attempt < retries) continue; // acquire() waits, or fails fast with the wait
      throw new UpstreamError(host, 429, Math.ceil(wait / 1000));
    }
    if (res.status >= 500) {
      if (attempt < retries) { await sleep(backoff(attempt)); continue; }
      throw new UpstreamError(host, res.status);
    }
    if (!res.ok) throw new UpstreamError(host, res.status);
    const body = await res.text();
    const fetchedAt = new Date().toISOString();
    if (process.env.TOKENBRIEF_EVIDENCE === "1") await saveEvidence(url, res, body, fetchedAt);
    try {
      return { data: JSON.parse(body), fetchedAt };
    } catch {
      throw new UpstreamError(host, "badjson"); // typically a Cloudflare challenge page
    }
  }
}

function retryAfterMs(res: Response): number {
  const s = Number(res.headers.get("retry-after"));
  return Number.isFinite(s) && s > 0 ? s * 1000 : 3000;
}

function headersFor(host: string): Record<string, string> {
  const h: Record<string, string> = { accept: "application/json" };
  if (host.includes("coingecko") && CONFIG.COINGECKO_API_KEY) {
    h["x-cg-demo-api-key"] = CONFIG.COINGECKO_API_KEY;
  }
  return h;
}

export const evidenceName = (url: string) =>
  createHash("sha1").update(url).digest("hex") + ".json";

async function saveEvidence(url: string, res: Response, body: string, fetchedAt: string) {
  const dir = join(process.env.TOKENBRIEF_EVIDENCE_DIR || "evidence", new URL(url).host);
  await mkdir(dir, { recursive: true });
  let parsed: unknown = body;
  try { parsed = JSON.parse(body); } catch { /* keep raw text */ }
  const headers = Object.fromEntries([...res.headers.entries()]
    .filter(([k]) => !/cookie|key|token|auth/i.test(k)));
  const record = { url, status: res.status, fetchedAt, headers, body: parsed };
  await writeFile(join(dir, evidenceName(url)), JSON.stringify(record, null, 2));
}
