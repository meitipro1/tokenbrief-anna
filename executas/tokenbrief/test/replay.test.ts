// executas/tokenbrief/test/replay.test.ts — P-9.7: replay every fixtures/tools/<name>.jsonl
// through the tool functions with fetch served from that run's recorded responses. Network-free.
// The clock is pinned to the recording time so listing ages and pair ages match; volatile
// timestamps (fetchedAt/asOf/resolvedAt) are dropped before comparing.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TOOLS } from "../src/tools/index.js";
import { EVIDENCE, installFixtureFetch } from "./fixtureFetch.js";

const FIXTURES = fileURLToPath(new URL("../../../fixtures/tools", import.meta.url));
type Line = { tool: string; arguments: Record<string, unknown>; result: { success: boolean;
  data?: unknown; error?: unknown } };

const VOLATILE = new Set(["fetchedAt", "asOf", "resolvedAt"]);
function stable(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).filter(([k]) => !VOLATILE.has(k))
      .map(([k, x]) => [k, stable(x)]));
  }
  return v;
}

const names = existsSync(FIXTURES)
  ? readdirSync(FIXTURES).filter((f) => f.endsWith(".jsonl")).map((f) => f.slice(0, -6))
    .filter((n) => existsSync(join(EVIDENCE, n)))
  : [];

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe.runIf(names.length > 0)("replay recorded tool chains", () => {
  it.each(names)("%s", async (name) => {
    const lines = readFileSync(join(FIXTURES, `${name}.jsonl`), "utf8").split("\n")
      .filter(Boolean).map((l) => JSON.parse(l) as Line);
    const first = lines[0].result.data as { resolvedAt?: string } | undefined;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(first?.resolvedAt ?? Date.now()));
    const { missing } = installFixtureFetch(join(EVIDENCE, name));
    for (const line of lines) {
      const data = await TOOLS[line.tool](line.arguments);
      expect(line.result.success, `${name}/${line.tool} was recorded as a failure`).toBe(true);
      expect(stable(data), `${name}/${line.tool}`).toEqual(stable(line.result.data));
    }
    expect(missing, "responses not recorded").toEqual([]);
  });
});
