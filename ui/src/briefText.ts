// ui/src/briefText.ts — the plain-text "Copy brief" rendering: numbers table + flags +
// prose + questions + sources line. Built from Brief fields only.
import type { Strings } from "./i18n";
import { formatFact, substitute, type Lang } from "./synthesis/substitute";
import type { Brief, BriefText } from "./types";

const ROWS = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8"];

export function plainBrief(b: Brief, text: BriefText, lang: Lang, s: Strings): string {
  const t = b.resolved.token!;
  const sub = (x: string) => substitute(x, b.facts, lang);
  const lines = [
    `${t.name} ($${t.symbol})${t.primaryChain ? ` · ${t.primaryChain}` : ""}` +
      `${t.primaryAddress ? ` · ${t.primaryAddress}` : ""}`,
    "",
    `${s.sections.numbers}:`,
    ...ROWS.filter((id) => b.facts[id]).map((id) =>
      `- ${s.labels[id] ?? b.facts[id].label}: ${formatFact(b.facts[id], "en")}`),
    "",
    `${s.sections.flags}:`,
    ...(b.flags.length ? b.flags.map((f) => `- [${f.severity}] ${f.code}: ${f.message}`)
      : [`- ${s.noFlags}`]),
    "",
    `${s.sections.what}: ${sub(text.what)}`,
    "",
    `${s.sections.narrative}: ${sub(text.narrative)}`,
    "",
    `${s.sections.risk}: ${sub(text.risk_commentary)}`,
    "",
    `${s.sections.questions}:`,
    ...text.questions.map((q, i) => `${i + 1}. ${sub(q)}`),
    "",
    `${s.sources} · ${s.fetched} ${b.metrics.fetchedAt.slice(11, 16)} UTC · ${s.notAdvice}`,
    b.share.link,
  ];
  return lines.join("\n");
}
