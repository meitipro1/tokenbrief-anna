// ui/test/bundle.test.ts — §11.5: drive runBrief through @anna-ai/cli/test's mountBundle, the
// same ACL gating and call recording as `anna-app dev`, in-process. Tool replies come from a
// recorded live run (fixtures/tools/pepe.jsonl); llm.complete returns a canned valid reply.
import { mountBundle } from "@anna-ai/cli/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { wrapRuntime, type Runtime } from "../src/anna";
import { runBrief } from "../src/run/runBrief";

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const TOOL_ID = "tool-dev-tokenbrief";

// The harness rewrites bundled:tokenbrief to the local id; do the same for the test manifest.
const manifest = JSON.parse(readFileSync(root("manifest.json"), "utf8")
  .replaceAll("bundled:tokenbrief", TOOL_ID));
type Rec = { tool: string; arguments: object; result: { data: unknown } };
const RECS: Rec[] = readFileSync(root("fixtures/tools/pepe.jsonl"), "utf8").split("\n")
  .filter(Boolean).map((l) => JSON.parse(l));
const byTool = (m: string) => RECS.find((r) => r.tool === m)!.result.data;
const LLM = JSON.parse(readFileSync(root("fixtures/llm/replies.jsonl"), "utf8")).result;

const MOCKS = {
  "tools.invoke": (args: { tool_id: string; method: string }) => {
    expect(args.tool_id).toBe(TOOL_ID);
    return byTool(args.method);
  },
  "llm.complete": () => LLM,
};

describe("runBrief under the manifest ACL", () => {
  it("resolve → metrics ∥ pairs → flags, then one llm.complete, numbers from tools", async () => {
    const h = await mountBundle({ manifest, mocks: MOCKS as never });
    const steps: string[] = [];
    const out = await runBrief(wrapRuntime(h.runtime as unknown as Runtime), "PEPE",
      (s) => steps.push(s));
    expect(out.kind).toBe("ready");
    if (out.kind !== "ready") return;
    expect(steps).toEqual(["resolving", "fetching", "flagging", "synthesizing"]);
    const methods = h.calls.byNs("tools.invoke").map((c) => (c.args as { method: string }).method);
    expect(methods.slice(0, 1)).toEqual(["resolve_token"]);
    expect(methods.slice(1, 3).sort()).toEqual(["fetch_metrics", "fetch_pairs"]);
    expect(methods[3]).toBe("risk_flags");
    expect(h.calls.byNs("llm.complete")).toHaveLength(1);
    const metrics = byTool("fetch_metrics") as { priceUsd: { value: number } };
    expect(out.brief.facts.F1.value).toBe(metrics.priceUsd.value);
    expect(out.brief.text.en?.questions).toHaveLength(5);
    expect(out.brief.llm.templateFallback).toBe(false);
    expect(out.brief.share.text.length).toBeLessThanOrEqual(280);
    expect(h.calls.byNs("storage.set").length).toBeGreaterThan(0);
  });

  it("falls back to the template brief when llm.complete keeps failing validation", async () => {
    const h = await mountBundle({ manifest, mocks: { ...MOCKS,
      "llm.complete": () => ({ ...LLM, content: { type: "text", text: "Price is $1.23!" } }),
    } as never });
    const out = await runBrief(wrapRuntime(h.runtime as unknown as Runtime), "PEPE", () => {});
    expect(out.kind).toBe("ready");
    if (out.kind !== "ready") return;
    expect(h.calls.byNs("llm.complete")).toHaveLength(2); // one retry with the reason
    expect(out.brief.llm.templateFallback).toBe(true);
    expect(out.notice).toBe("LLM_INVALID");
  });

  it("the manifest does not grant namespaces the bundle never uses", async () => {
    const h = await mountBundle({ manifest });
    const rt = h.runtime as unknown as Record<string, Record<string, (a: object) => Promise<unknown>>>;
    await expect(rt.chat.write_message({ text: "x" })).rejects.toThrow();
    await expect(rt.fs.read({ path: "/etc/passwd" })).rejects.toThrow();
    expect(h.calls.last()?.outcome).toBe("denied");
  });
});
