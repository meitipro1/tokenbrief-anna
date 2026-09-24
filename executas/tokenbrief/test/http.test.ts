// executas/tokenbrief/test/http.test.ts — P-9.3: retry, Retry-After, 404 negative cache,
// single-flight, limiter spacing. No network: global fetch is stubbed.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TtlCache } from "../src/clients/cache.js";
import { clearHttpCache, fetchJson } from "../src/clients/http.js";
import { acquire, penalize, resetLimiter } from "../src/clients/limiter.js";
import { RateLimitTimeout, UpstreamError } from "../src/errors.js";

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

  it("fails fast when the queue wait would exceed the cap", async () => {
    penalize("api.coingecko.com", 60_000);
    await expect(acquire("api.coingecko.com")).rejects.toBeInstanceOf(RateLimitTimeout);
  });
});
