// ui/src/mock.ts — DEV ONLY (`pnpm --filter ui dev` outside the Anna harness). Serves the
// recorded tool calls in fixtures/tools/*.jsonl and canned llm.complete replies, so the UI can
// be developed without a host. `import.meta.env.DEV` is false in `vite build`, so this module
// never reaches bundle/.
import type { AnnaClient, LlmArgs } from "./anna";
import { ToolError } from "./anna";
import FA_REPLY from "../../fixtures/llm/translate-fa.json?raw";

type Rec = { tool: string; arguments: Record<string, unknown>;
  result: { success?: boolean; data?: unknown; error?: unknown } };

const files = import.meta.glob("../../fixtures/tools/*.jsonl",
  { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const RECORDS: Rec[] = Object.values(files).flatMap((txt) =>
  txt.split("\n").filter(Boolean).map((l) => JSON.parse(l) as Rec));

const same = (a: Record<string, unknown>, b: Record<string, unknown>) =>
  JSON.stringify(a, Object.keys(a).sort()) === JSON.stringify(b, Object.keys(b).sort());

const LLM_EN = JSON.stringify({
  what: "This token is described on CoinGecko; it trades at {F1}, with {F2} over 24h.",
  narrative: "It sits at market-cap rank {F8} with a market cap of {F3} and 24h volume of {F5}.",
  risk_commentary: "Review each automated flag above; the listing age is {F7} and DEX " +
    "liquidity across the top pairs is {F6}.",
  questions: [
    "Is any supply still to be unlocked, or is the FDV of {F4} already close to the " +
      "market cap of {F3}?",
    "Is the DEX liquidity of {F6} enough for the size you have in mind?",
    "Who holds most of the supply, given that holder data is not available here?",
    "Are the official website and X account the ones linked on CoinGecko?",
    "What drove the {F2} move over 24h?",
  ],
  share: "Price {F1} ({F2} 24h) · MC {F3} · Liq {F6}",
  confidence: "medium",
});

// The canned Persian translation, shared with the recording scripts (scripts/lib/mock-persian.ts)
const LLM_FA = JSON.stringify(JSON.parse(FA_REPLY));

const store = new Map<string, unknown>();

export function mockAnna(): AnnaClient {
  console.error(`[tokenbrief] mock host: ${RECORDS.length} recorded tool calls`);
  return {
    mock: true,
    async invokeTool<T>(method: string, args: object): Promise<T> {
      await new Promise((r) => setTimeout(r, 250));
      const a = JSON.parse(JSON.stringify(args)) as Record<string, unknown>;
      const hit = RECORDS.find((r) => r.tool === method && same(r.arguments, a)) ??
        (method === "risk_flags" ? RECORDS.find((r) => r.tool === method) : undefined);
      if (!hit) {
        if (method === "resolve_token") {
          return { status: "not_found", query: { raw: String(a.query), kind: "ticker" },
            source: "derived", resolvedAt: new Date().toISOString() } as T;
        }
        throw new ToolError("UPSTREAM_DOWN");
      }
      if (hit.result.success === false) throw new ToolError(String(hit.result.error));
      return hit.result.data as T;
    },
    async llmComplete(a: LlmArgs) {
      await new Promise((r) => setTimeout(r, 600));
      if (a.systemPrompt.startsWith("Translate")) return { text: LLM_FA, model: "mock" };
      if (a.systemPrompt.includes("Answer in plain text")) {
        return { text: "The brief lists the FDV as {F4} and the market cap as {F3}. " +
          "(canned preview answer)", model: "mock" };
      }
      return { text: LLM_EN, model: "mock" };
    },
    async storageGet<T>(key: string) { return (store.get(key) as T) ?? null; },
    async storageSet(key, value) { store.set(key, value); },
    async setTitle(title) { document.title = title; },
    onEvent: () => () => {},
    entryPayload: null,
  };
}
