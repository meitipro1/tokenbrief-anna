// ui/src/synthesis/share.ts — ShareCard: the validated share text with numbers substituted
// from FACTS, a "not financial advice" line and the link, capped at 280 characters.
import type { BriefText, Fact, ShareCard } from "../types";
import { isolate, substitute, type Lang } from "./substitute";

export const SHARE_MAX = 280;
const NOTE = { en: "Not financial advice.", fa: "توصیهٔ مالی نیست." };

/** Trim on a word boundary so `text` fits in `max` characters (adds an ellipsis). */
export function fit(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, Math.max(max - 1, 0));
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.5 ? cut.slice(0, sp) : cut).trimEnd() + "…";
}

export function shareText(brief: BriefText, facts: Record<string, Fact>, lang: Lang,
  link: string, symbol: string): string {
  const tail = `\n${NOTE[lang]} ${link}`;
  let body = substitute(brief.share, facts, lang).replace(/\s+/g, " ").trim();
  if (!body.toUpperCase().includes(symbol.toUpperCase())) body = `$${symbol} — ${body}`;
  if (lang === "fa") {
    // Telegram and X pick a message's direction from its first strong letter: start with an
    // RLM so the Persian card is laid out right-to-left, and keep "$PEPE" in one piece.
    body = "\u200f" + body.replace(/\$[A-Za-z][A-Za-z0-9]{0,14}\b/g, isolate);
  }
  return fit(body, SHARE_MAX - tail.length) + tail;
}

/** The English card; the Persian text is added later by the lazy translation (§6.7). */
export function buildShare(brief: BriefText, facts: Record<string, Fact>, link: string,
  symbol: string): ShareCard {
  return { text: shareText(brief, facts, "en", link, symbol), textFa: null, link };
}
