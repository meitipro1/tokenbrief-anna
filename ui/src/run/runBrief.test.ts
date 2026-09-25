// ui/src/run/runBrief.test.ts — rate-limit handling in the orchestrator: wait exactly as long
// as the upstream asked (countdown via onWait), retry once, give up when the wait is too long.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { ToolError, type AnnaClient } from "../anna";
import { retryAfterS, runBrief } from "./runBrief";

const root = (p: string) => fileURLToPath(new URL(`../../../${p}`, import.meta.url));
const RECS: { tool: string; result: { data: unknown } }[] = readFileSync(
  root("fixtures/tools/pepe.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const byTool = (m: string) => RECS.find((r) => r.tool === m)!.result.data;
const LLM_TEXT = JSON.parse(readFileSync(root("fixtures/llm/replies.jsonl"), "utf8"))
  .result.content.text as string;

function client(failFirst: string | null): AnnaClient & { invokeTool: ReturnType<typeof vi.fn> } {
  let failed = false;
  return {
    mock: true,
    invokeTool: vi.fn(async (method: string) => {
      if (failFirst && !failed) { failed = true; throw new ToolError(failFirst); }
      return byTool(method);
    }),
    llmComplete: async () => ({ text: LLM_TEXT, model: "test" }),
    storageGet: async () => null,
    storageSet: async () => undefined,
    setTitle: async () => undefined,
    onEvent: () => () => {},
    entryPayload: null,
  } as never;
}

describe("runBrief rate-limit handling", () => {
  it("parses the upstream's wait", () => {
    expect(retryAfterS(new ToolError("UPSTREAM_RATE_LIMITED retry_after=42"))).toBe(42);
    expect(retryAfterS(new ToolError("UPSTREAM_RATE_LIMITED"))).toBeNull();
  });

  it("waits the hinted time with a countdown, then completes the brief", async () => {
    const anna = client("UPSTREAM_RATE_LIMITED retry_after=1");
    const waits: (number | null)[] = [];
    const t0 = Date.now();
    const out = await runBrief(anna, "PEPE", () => {}, (u) => waits.push(u));
    expect(out.kind).toBe("ready");
    expect(Date.now() - t0).toBeGreaterThanOrEqual(1400);
    expect(waits[0]).toBeGreaterThan(t0 + 1000);
    expect(waits.at(-1)).toBeNull(); // countdown cleared
  });

  it("gives up at once when the wait is longer than a countdown is worth", async () => {
    const anna = client("UPSTREAM_RATE_LIMITED retry_after=600");
    const waits: (number | null)[] = [];
    const out = await runBrief(anna, "PEPE", () => {}, (u) => waits.push(u));
    expect(out).toEqual({ kind: "error", code: "UPSTREAM_RATE_LIMITED" });
    expect(waits).toEqual([]);
    expect(anna.invokeTool).toHaveBeenCalledTimes(1);
  });

  it("a token without any live price ends with NO_MARKET_DATA, not an empty brief", async () => {
    const anna = client(null);
    const metrics = byTool("fetch_metrics") as Record<string, unknown>;
    anna.invokeTool.mockImplementation(async (m: string) => m === "fetch_metrics"
      ? { ...metrics, priceUsd: { value: null, source: null, asOf: null } } : byTool(m));
    const out = await runBrief(anna, "PEPE", () => {});
    expect(out).toEqual({ kind: "error", code: "NO_MARKET_DATA" });
  });

  it("other tool failures end the run without waiting", async () => {
    const anna = client("UPSTREAM_DOWN");
    const out = await runBrief(anna, "PEPE", () => {});
    expect(out).toEqual({ kind: "error", code: "UPSTREAM_DOWN" });
  });
});
