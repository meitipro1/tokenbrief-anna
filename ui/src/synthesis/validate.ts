// ui/src/synthesis/validate.ts — ch06 §6.6.4, hand-rolled (no ajv in the bundle).
// The optional allow list is the Chapter 10 fix: without it a symbol such as 1INCH or API3
// fails the numeral rule every time and forces the template fallback.
import type { BriefText, Fact } from "../types";

export type Verdict = { ok: true; value: BriefText } | { ok: false; reason: string };

const KEYS = ["what", "narrative", "risk_commentary", "questions", "share", "confidence"];
const MAX: Record<string, number> = { what: 700, narrative: 600, risk_commentary: 700,
  share: 240 };
const PLACEHOLDER = /\{(F\d+|D1)\}/g;
const WINDOWS = /\b(24h|7d|1h|30d)\b/g;

/** null = clean; otherwise "UNKNOWN_FACT:F99" or "NUMERAL". */
export function numeralCheck(s: string, facts: Record<string, Fact>,
  allow: string[] = []): string | null {
  for (const m of s.matchAll(PLACEHOLDER)) if (!(m[1] in facts)) return `UNKNOWN_FACT:${m[1]}`;
  let rest = s.replace(PLACEHOLDER, "").replace(WINDOWS, "");
  for (const a of allow) if (a) rest = rest.split(a).join("");
  return /\p{Nd}/u.test(rest) ? "NUMERAL" : null; // \p{Nd} also catches Persian digits
}

export function validate(raw: string, facts: Record<string, Fact>,
  allow: string[] = []): Verdict {
  const fail = (reason: string): Verdict => ({ ok: false, reason });
  const text = raw.trim().replace(/^`{3}(?:json)?\s*/i, "").replace(/\s*`{3}$/, "");
  let obj: unknown;
  try { obj = JSON.parse(text); } catch { return fail("PARSE"); }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return fail("SCHEMA:$");
  const o = obj as Record<string, unknown>;
  for (const k of Object.keys(o)) if (!KEYS.includes(k)) return fail(`SCHEMA:${k}:extra`);
  for (const k of KEYS) if (!(k in o)) return fail(`SCHEMA:${k}:missing`);
  for (const [k, max] of Object.entries(MAX)) {
    if (typeof o[k] !== "string" || (o[k] as string).length > max) return fail(`SCHEMA:${k}`);
  }
  const q = o.questions;
  if (!Array.isArray(q) || q.length !== 5 ||
    q.some((x) => typeof x !== "string" || x.length > 160)) return fail("SCHEMA:questions");
  if (!["low", "medium", "high"].includes(o.confidence as string)) {
    return fail("SCHEMA:confidence");
  }
  const fields: [string, string][] = [
    ...Object.keys(MAX).map((k): [string, string] => [k, o[k] as string]),
    ...(q as string[]).map((s, i): [string, string] => [`questions.${i}`, s]),
  ];
  for (const [field, s] of fields) {
    const bad = numeralCheck(s, facts, allow);
    if (bad) return fail(`${bad}:${field}`);
  }
  return { ok: true, value: o as unknown as BriefText };
}

/** Last-resort cleanup for chat answers: strip digits outside placeholders and allowed words. */
export function stripDigits(s: string, allow: string[] = []): string {
  const escape = (a: string) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const keep = ["\\{(?:F\\d+|D1)\\}", ...allow.map(escape)].join("|"); // no inner groups
  return s.split(new RegExp(`(${keep})`, "g"))
    .map((part, i) => (i % 2 ? part : (part ?? "").replace(/\p{Nd}/gu, ""))).join("");
}
