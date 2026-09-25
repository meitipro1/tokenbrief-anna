// executas/tokenbrief/test/http.test.ts — P-9.3: retry, Retry-After, 404 negative cache,
// single-flight, limiter spacing. No network: global fetch is stubbed.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TtlCache } from "../src/clients/cache.js";
import { clearHttpCache, fetchJson } from "../src/clients/http.js";
import { acquire, penalize, refund, resetLimiter } from "../src/clients/limiter.js";
import { RateLimitTimeout, toolErrorCode, UpstreamError } from "../src/errors.js";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

beforeEach(() => { clearHttpCache(); resetLimiter(); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("fetchJson", () => {
  it("retries a 503 and then succeeds", async () => {
    vi.useFakeTimers();
    const fake = vi.fn()
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({ ok: 1 }));
    vi.stubGlobal("fetch", fake);
    const p = fetchJson<{ ok: number }>("https://api.dexscreener.com/a", { ttl: 60, retries: 1 });
    await vi.advanceTimersByTimeAsync(1100);
    const r = await p;
    expect(r?.data.ok).toBe(1);
    expect(fake).toHaveBeenCalledTimes(2);
  });

  it("honours Retry-After on 429", async () => {
    vi.useFakeTimers();
    const fake = vi.fn()
      .mockResolvedValueOnce(json({}, 429, { "retry-after": "1" }))
      .mockResolvedValueOnce(json({ ok: 2 }));
    vi.stubGlobal("fetch", fake);
    const p = fetchJson<{ ok: number }>("https://api.dexscreener.com/b", { ttl: 60, retries: 1 });
    await vi.advanceTimersByTimeAsync(500);
    expect(fake).toHaveBeenCalledTimes(1); // still waiting out the penalty
    await vi.advanceTimersByTimeAsync(700);
    expect((await p)?.data.ok).toBe(2);
    expect(fake).toHaveBeenCalledTimes(2);
  });

  it("throws UpstreamError(429) when retries are exhausted", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 429)));
    const err = await fetchJson("https://api.coingecko.com/api/v3/x", { ttl: 60, retries: 0 })
      .catch((e) => e);
    expect(err).toBeInstanceOf(UpstreamError);
    expect(err.tag).toBe("coingecko:429");
  });

  it("returns null on 404 and caches the miss", async () => {
    const fake = vi.fn().mockResolvedValue(json({ error: "not found" }, 404));
    vi.stubGlobal("fetch", fake);
    expect(await fetchJson("https://api.coingecko.com/api/v3/coins/nope", { ttl: 60 })).toBeNull();
    expect(await fetchJson("https://api.coingecko.com/api/v3/coins/nope", { ttl: 60 })).toBeNull();
    expect(fake).toHaveBeenCalledTimes(1);
  });

  it("throws on a 200 that is not JSON (Cloudflare page)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 200 })));
    const err = await fetchJson("https://api.dexscreener.com/c", { ttl: 60 }).catch((e) => e);
    expect(err.tag).toBe("dexscreener:badjson");
  });

  it("shares one request between concurrent callers", async () => {
    const fake = vi.fn().mockImplementation(async () => json({ n: 1 }));
    vi.stubGlobal("fetch", fake);
    const [a, b] = await Promise.all([
      fetchJson("https://api.dexscreener.com/d", { ttl: 60 }),
      fetchJson("https://api.dexscreener.com/d", { ttl: 60 }),
    ]);
    expect(a).toBe(b);
    expect(fake).toHaveBeenCalledTimes(1);
  });
});

describe("TtlCache", () => {
  it("serves a stale value when the reload fails", async () => {
    vi.useFakeTimers();
    const c = new TtlCache<number>(10, 60);
    await c.getOrLoad("k", 1, async () => 7);
    await vi.advanceTimersByTimeAsync(2000); // expired but within stale window
    expect(await c.getOrLoad("k", 1, async () => { throw new Error("down"); })).toBe(7);
  });

  it("evicts the least recently used entry past the cap", () => {
    const c = new TtlCache<number>(2, 0);
    c.set("a", 1, 60); c.set("b", 2, 60); c.get("a"); c.set("c", 3, 60);
    expect(c.get("b")).toBeUndefined();
    expect(c.get("a")).toBe(1);
  });
});

describe("limiter", () => {
  it("spaces calls to the same host", async () => {
    vi.useFakeTimers();
    await acquire("api.example.com", 250);
    let done = false;
    const second = acquire("api.example.com", 250).then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(200);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(60);
    await second;
    expect(done).toBe(true);
    await acquire("api.other.com", 250); // other hosts are not delayed
  });

  it("fails fast when the queue wait would exceed the cap, with the wait attached", async () => {
    penalize("api.coingecko.com", 60_000);
    const err = await acquire("api.coingecko.com").catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitTimeout);
    expect(err.retryAfterS).toBeGreaterThanOrEqual(59);
    expect(toolErrorCode(err)).toMatch(/^UPSTREAM_RATE_LIMITED retry_after=(59|60)$/);
  });

  it("allows at most `budget` requests per 60 s window (keyless CoinGecko ≈ 5)", async () => {
    for (let i = 0; i < 5; i++) await acquire("api.coingecko.com", 0, 5);
    const err = await acquire("api.coingecko.com", 0, 5).catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitTimeout); // the 6th would wait ~60 s > 20 s cap
    expect(err.retryAfterS).toBeGreaterThan(50);
  });

  it("a CDN cache hit gives its slot back", async () => {
    const slots = [];
    for (let i = 0; i < 5; i++) slots.push(await acquire("api.coingecko.com", 0, 5));
    refund(slots[4]);
    await expect(acquire("api.coingecko.com", 0, 5)).resolves.toBeTruthy();
  });

  it("waits for the window when the wait is short", async () => {
    vi.useFakeTimers();
    for (let i = 0; i < 2; i++) await acquire("api.example.com", 0, 2);
    let done = false;
    // the window is 60 s; the queue cap (20 s) forbids that, so use a nearly-full window
    vi.setSystemTime(Date.now() + 50_000);
    const p = acquire("api.example.com", 0, 2).then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(9_000);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1_500);
    await p;
    expect(done).toBe(true);
  });
});

describe("upstream failure shapes (§11.9)", () => {
  it("a 429 carries Retry-After to the tool error code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 429, { "retry-after": "42" })));
    const err = await fetchJson("https://api.coingecko.com/api/v3/y", { ttl: 60, retries: 0 })
      .catch((e) => e);
    expect(toolErrorCode(err)).toBe("UPSTREAM_RATE_LIMITED retry_after=42");
  });

  it("a hung upstream is aborted at the per-call timeout, not the tool timeout", async () => {
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_, reject) => {
      init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    })));
    const t0 = Date.now();
    const err = await fetchJson("https://api.dexscreener.com/slow",
      { ttl: 60, retries: 0, timeoutMs: 80 }).catch((e) => e);
    expect(err.tag).toBe("dexscreener:timeout");
    expect(Date.now() - t0).toBeLessThan(2_000);
  });

  it("a 503 then success is transparent; a 503 twice becomes UPSTREAM_DOWN", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 503)));
    const err = await fetchJson("https://api.dexscreener.com/z", { ttl: 60, retries: 0 })
      .catch((e) => e);
    expect(toolErrorCode(err)).toBe("UPSTREAM_DOWN");
  });
});
