// ui/src/synthesis/llm.ts — llm.complete wiring: one call per brief with one validation retry
// that quotes the failure reason (§6.6.4); lazy Persian translation (§6.7); follow-up chat
// answers checked by the numeral rule only (§6.8). Host errors become notices, never errors:
// a template brief still completes the run.
import { HostError, type AnnaClient, type Msg } from "../anna";
import type { BriefText, Fact } from "../types";
import { buildMessages, CHAT_SYSTEM_PROMPT, SYSTEM_PROMPT_EN, SYSTEM_PROMPT_FA_TRANSLATE }
  from "./prompt";
import { numeralCheck, stripDigits, validate } from "./validate";

const env = import.meta.env;
const MAX_TOKENS = Number(env.VITE_LLM_MAX_TOKENS ?? 1200);
const TEMPERATURE = Number(env.VITE_LLM_TEMPERATURE ?? 0.3);
const RETRIES = Number(env.VITE_SYNTH_RETRIES ?? 1);

export type LlmNotice = "LLM_QUOTA" | "LLM_INVALID" | "LLM_UNAVAILABLE";
export type Synth =
  | { text: BriefText; model: string | null; failures: string[] }
  | { text: null; notice: LlmNotice; failures: string[] };

async function completeValidated(anna: AnnaClient, systemPrompt: string, first: Msg[],
  facts: Record<string, Fact>, allow: string[], maxTokens: number, temperature: number,
  failures: string[]) {
  const messages = [...first];
  for (let i = 0; i <= RETRIES; i++) {
    const out = await anna.llmComplete({ systemPrompt, messages, maxTokens, temperature });
    const v = validate(out.text, facts, allow);
    if (v.ok) return { value: v.value, model: out.model };
    failures.push(v.reason);
    console.error(`[tokenbrief] llm output failed validation: ${v.reason}`);
    messages.push({ role: "assistant", content: out.text }, { role: "user",
      content: `Your previous output failed validation: ${v.reason}. ` +
        "Return only the corrected JSON." });
  }
  return null;
}

/** Host error codes per reference/host-api-llm.md; the SDK surfaces them on `err.code`. */
export function llmNotice(e: unknown): LlmNotice {
  const code = e instanceof HostError ? e.code : "";
  return /QUOTA/i.test(code) ? "LLM_QUOTA" : "LLM_UNAVAILABLE";
}

export async function synthesize(anna: AnnaClient, facts: Record<string, Fact>, header: string,
  allow: string[]): Promise<Synth> {
  const failures: string[] = [];
  try {
    const r = await completeValidated(anna, SYSTEM_PROMPT_EN, buildMessages(facts, header),
      facts, allow, MAX_TOKENS, TEMPERATURE, failures);
    return r ? { text: r.value, model: r.model, failures }
      : { text: null, notice: "LLM_INVALID", failures };
  } catch (e) {
    return { text: null, notice: llmNotice(e), failures };
  }
}

export async function translateBrief(anna: AnnaClient, en: BriefText,
  facts: Record<string, Fact>, allow: string[]): Promise<BriefText | null> {
  try {
    const r = await completeValidated(anna, SYSTEM_PROMPT_FA_TRANSLATE,
      [{ role: "user", content: JSON.stringify(en) }], facts, allow, 1400, 0.2, []);
    return r?.value ?? null;
  } catch {
    return null;
  }
}

export interface ChatCtx { header: string; facts: Record<string, Fact>; brief: BriefText;
  allow: string[]; lang: "en" | "fa" }

export async function askFollowUp(anna: AnnaClient, ctx: ChatCtx, history: Msg[],
  question: string): Promise<{ text: string; stripped: boolean }> {
  const systemPrompt = `${CHAT_SYSTEM_PROMPT}\nLanguage: answer in ` +
    `${ctx.lang === "fa" ? "Persian" : "English"}.\n\nCONTEXT\n${ctx.header}\n` +
    `${JSON.stringify(ctx.facts)}\nBRIEF: ${JSON.stringify(ctx.brief)}`;
  const messages: Msg[] = [...history.slice(-6), { role: "user", content: question }];
  let last = "";
  for (let i = 0; i < 2; i++) {
    const out = await anna.llmComplete({ systemPrompt, messages, maxTokens: 400,
      temperature: 0.3 });
    last = out.text.trim();
    if (!numeralCheck(last, ctx.facts, ctx.allow)) return { text: last, stripped: false };
  }
  return { text: stripDigits(last, ctx.allow), stripped: true };
}
