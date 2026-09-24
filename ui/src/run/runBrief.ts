// ui/src/run/runBrief.ts — the ch06 §6.8 orchestration: resolve → (pick) → metrics ∥ pairs →
// flags → facts → llm.complete (validated, one retry) → template fallback → substitute/share.
// Numbers travel Executa → Sourced → Fact → placeholder; nothing here computes a number.
import { HostError, ToolError, type AnnaClient } from "../anna";
import { allowList, buildFacts, factsHeader } from "../synthesis/facts";
import { templateBrief } from "../synthesis/fallback";
import { synthesize, type LlmNotice } from "../synthesis/llm";
import { buildShare } from "../synthesis/share";
import type { Brief, Candidate, Metrics, PairsResult, ResolvedToken, RiskFlag } from "../types";

export type Step = "resolving" | "fetching" | "flagging" | "synthesizing";
export type RunError =
  | "INPUT_INVALID" | "NOT_FOUND" | "UPSTREAM_DOWN" | "UPSTREAM_RATE_LIMITED"
  | "TOOL_NOT_GRANTED" | "AGENT_UNAVAILABLE";

export type Outcome =
  | { kind: "ready"; brief: Brief; notice: LlmNotice | null }
  | { kind: "choose"; candidates: Candidate[]; symbol: string }
  | { kind: "error"; code: RunError };

const env = import.meta.env;
const TEXT_TTL_MS = Number(env.VITE_BRIEF_TEXT_TTL_S ?? 1800) * 1000;
export const SHARE_LINK: string = env.VITE_SHARE_LINK ??
  "https://tokenbrief-anna.vercel.app/?utm_source=share&utm_medium=card";
export const cgUrl = (cgId: string) => `https://www.coingecko.com/en/coins/${cgId}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function toRunError(e: unknown): RunError {
  const text = e instanceof Error ? e.message : String(e);
  if (/UPSTREAM_RATE_LIMITED/.test(text)) return "UPSTREAM_RATE_LIMITED";
  if (e instanceof ToolError) return "UPSTREAM_DOWN";
  if (e instanceof HostError) {
    if (e.code === "permission_denied") return "TOOL_NOT_GRANTED";
    if (e.code === "agent_unavailable" || e.code === "executa_unavailable") {
      return "AGENT_UNAVAILABLE";
    }
  }
  return "UPSTREAM_DOWN"; // tool_timeout, tool_failed, …
}

async function tool<T>(anna: AnnaClient, method: string, args: object): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await anna.invokeTool<T>(method, args);
    } catch (e) {
      // ch06 §6.8: "Data source is rate-limited; retrying in 3 s…" (auto-retry ×2)
      if (attempt < 2 && toRunError(e) === "UPSTREAM_RATE_LIMITED") { await sleep(3000); continue; }
      throw e;
    }
  }
}

const sameFlags = (a: RiskFlag[], b: RiskFlag[]) =>
  a.map((f) => f.code + f.severity).join() === b.map((f) => f.code + f.severity).join();

export async function runBrief(anna: AnnaClient, query: string,
  onStep: (s: Step) => void): Promise<Outcome> {
  try {
    onStep("resolving");
    const resolved = await tool<ResolvedToken>(anna, "resolve_token", { query });
    if (resolved.status === "not_found") {
      return { kind: "error", code: resolved.query.kind === "invalid" ? "INPUT_INVALID" : "NOT_FOUND" };
    }
    if (resolved.status === "ambiguous") {
      return { kind: "choose", candidates: resolved.candidates ?? [],
        symbol: resolved.candidates?.[0]?.symbol ?? query.toUpperCase() };
    }
    const t = resolved.token!;
    onStep("fetching");
    const [metrics, pairs] = await Promise.all([
      tool<Metrics>(anna, "fetch_metrics",
        { cgId: t.cgId, chain: t.primaryChain, address: t.primaryAddress, symbol: t.symbol }),
      t.primaryAddress
        ? tool<PairsResult>(anna, "fetch_pairs",
          { chain: t.primaryChain, address: t.primaryAddress }).catch(() => null)
        : Promise.resolve(null),
    ]);
    onStep("flagging");
    const { flags } = await tool<{ flags: RiskFlag[] }>(anna, "risk_flags",
      pairs ? { metrics, pairs } : { metrics });
    const facts = buildFacts(metrics, pairs, flags);
    const allow = allowList(metrics);
    const id = `${t.cgId ?? t.primaryAddress}:${new Date().toISOString().slice(0, 13)}`;

    onStep("synthesizing");
    const cached = await anna.storageGet<Omit<Brief, "facts">>(`brief/${id}`);
    const reuse = Boolean(cached?.text?.en && !cached.llm.templateFallback &&
      sameFlags(cached.flags, flags) && Date.now() - Date.parse(cached.generatedAt) < TEXT_TTL_MS);
    let text: Brief["text"];
    let llm: Brief["llm"];
    let notice: LlmNotice | null = null;
    if (reuse && cached) {
      text = cached.text; // prose only: the numbers were re-fetched above
      llm = cached.llm;
    } else {
      const s = await synthesize(anna, facts, factsHeader(resolved), allow);
      if (s.text) {
        text = { en: s.text, fa: null };
        llm = { model: s.model, templateFallback: false };
      } else {
        text = { en: templateBrief(facts, flags, "en"), fa: null };
        llm = { model: null, templateFallback: true };
        notice = s.notice;
      }
    }
    const brief: Brief = {
      id, resolved, metrics, flags, text, facts, llm,
      pairs: pairs ?? { pairs: [], totalPairsSeen: 0, oldestPairCreatedAt: null,
        fetchedAt: metrics.fetchedAt, source: "dexscreener" },
      share: buildShare(text.en!, facts, SHARE_LINK, t.symbol),
      generatedAt: reuse && cached ? cached.generatedAt : new Date().toISOString(),
    };
    await persist(anna, brief);
    await anna.setTitle(`TokenBrief — ${t.symbol}`).catch(() => undefined);
    return { kind: "ready", brief, notice };
  } catch (e) {
    console.error("[tokenbrief] run failed", e);
    return { kind: "error", code: toRunError(e) };
  }
}

export interface RecentItem { id: string; symbol: string; name: string; query: string }

/** brief/<id> (without facts — rebuilt from fresh numbers) and "recent" (last 20). */
export async function persist(anna: AnnaClient, brief: Brief): Promise<void> {
  const { facts: _facts, ...stored } = brief;
  await anna.storageSet(`brief/${brief.id}`, stored).catch(() => undefined);
  const recent = (await anna.storageGet<RecentItem[]>("recent")) ?? [];
  const t = brief.resolved.token!;
  const item: RecentItem = { id: brief.id, symbol: t.symbol, name: t.name,
    query: t.cgId ? cgUrl(t.cgId) : brief.resolved.query.raw };
  const next = [item, ...recent.filter((x) => x && x.query !== item.query)].slice(0, 20);
  await anna.storageSet("recent", next).catch(() => undefined);
}
