// executas/tokenbrief/test/fixtureFetch.ts — stubs global fetch with the responses a smoke run
// recorded (test/fixtures/evidence/<name>/<host>/<sha1(url)>.json). A missing fixture returns
// HTTP 418, which http.ts turns into UpstreamError(…, 418): "coingecko:418" in Metrics.errors
// means "record this fixture", and fails fast because 4xx statuses are not retried.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { vi } from "vitest";
import { clearHttpCache, evidenceName } from "../src/clients/http.js";
import { resetLimiter } from "../src/clients/limiter.js";
import { clearResolveCache } from "../src/tools/resolve.js";

export const EVIDENCE = fileURLToPath(new URL("./fixtures/evidence", import.meta.url));

export function installFixtureFetch(dir: string) {
  clearHttpCache();
  clearResolveCache();
  resetLimiter();
  const missing: string[] = [];
  const fake = vi.fn(async (input: string | URL) => {
    const url = String(input);
    const file = join(dir, new URL(url).host, evidenceName(url));
    if (!existsSync(file)) {
      missing.push(url);
      return new Response(JSON.stringify({ missing: url }), { status: 418 });
    }
    const rec = JSON.parse(readFileSync(file, "utf8"));
    return new Response(JSON.stringify(rec.body), {
      status: rec.status, headers: { "content-type": "application/json" } });
  });
  vi.stubGlobal("fetch", fake);
  return { fake, missing };
}
