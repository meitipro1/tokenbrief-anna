// executas/tokenbrief/src/tools/index.ts — registry + argument checks. metrics/pairs may
// arrive as JSON strings because LLM tool callers often stringify nested objects.
import { normalizeChain } from "../chains.js";
import { InvalidParams } from "../errors.js";
import type { Metrics, PairsResult } from "../types.js";
import { fetchMetrics } from "./metrics.js";
import { fetchPairs } from "./pairs.js";
import { resolveToken } from "./resolve.js";
import { riskFlags } from "./risk.js";

type Args = Record<string, unknown>;
export type ToolFn = (args: Args) => Promise<unknown>;

function str(a: Args, key: string): string | undefined {
  const v = a[key];
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v !== "string") throw new InvalidParams(`${key} must be a string`);
  return v.trim();
}

function need(a: Args, key: string): string {
  const v = str(a, key);
  if (!v) throw new InvalidParams(`${key} is required`);
  return v;
}

function object<T>(a: Args, key: string): T | undefined {
  let v = a[key];
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "string") {
    try { v = JSON.parse(v); } catch { throw new InvalidParams(`${key} is not valid JSON`); }
  }
  if (typeof v !== "object" || Array.isArray(v)) {
    throw new InvalidParams(`${key} must be an object`);
  }
  return v as T;
}

export const TOOLS: Record<string, ToolFn> = {
  resolve_token: (a) => resolveToken({ query: need(a, "query") }),
  fetch_metrics: (a) => fetchMetrics({
    cgId: str(a, "cgId"), chain: normalizeChain(str(a, "chain")),
    address: str(a, "address"), symbol: need(a, "symbol"),
  }),
  fetch_pairs: (a) => fetchPairs({
    chain: normalizeChain(str(a, "chain")), address: need(a, "address"),
  }),
  risk_flags: async (a) => {
    const metrics = object<Metrics>(a, "metrics");
    if (!metrics) throw new InvalidParams("metrics is required");
    if (!metrics.liquidityUsd || !metrics.socials || !Array.isArray(metrics.twinTickers)) {
      throw new InvalidParams("metrics must be the full fetch_metrics result");
    }
    return riskFlags({ metrics, pairs: object<PairsResult>(a, "pairs") });
  },
};
