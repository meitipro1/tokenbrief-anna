// ui/src/synthesis/synthesis.test.ts — P-9.8: validator, substitution, share cap, facts ids,
// fallback, and the "numbers never from the model" rule end to end.
import { describe, expect, it } from "vitest";
import type { BriefText, Fact, Metrics, PairsResult, RiskFlag, Sourced } from "../types";
import { allowList, buildFacts, factsHeader } from "./facts";
import { templateBrief } from "./fallback";
import { CHAT_SYSTEM_PROMPT, SYSTEM_PROMPT_EN } from "./prompt";
import { buildShare, fit, SHARE_MAX, shareText } from "./share";
import { formatFact, substitute, usd } from "./substitute";
import { numeralCheck, stripDigits, validate } from "./validate";

const at = "2026-09-25T12:00:00.000Z";
const s = (v: number | null): Sourced<number> =>
  v === null ? { value: null, source: null, asOf: null } : { value: v, source: "coingecko", asOf: at };

const METRICS: Metrics = {
  cgId: "pepe", symbol: "PEPE", name: "Pepe", priceUsd: s(0.00001234), change24hPct: s(-3.2),
  marketCapUsd: s(5.1e9), fdvUsd: s(5.1e9), volume24hUsd: s(8.12e8), liquidityUsd: s(4.1e7),
  holders: s(null), circulatingSupply: s(4.2e14), totalSupply: s(4.2e14), maxSupply: s(4.2e14),
  athUsd: s(0.00002), athChangePct: s(-40), listingAgeDays: s(900), rank: s(30),
  categories: ["Meme", "Layer 1 (L1)"], descriptionSnippet: "Pepe is a meme coin.",
  socials: { website: "https://pepe.vip", twitter: "pepecoineth", telegram: null, discord: null,
    github: null, curated: true },
  twinTickers: [], fetchedAt: at, partial: false, errors: [],
};
const PAIRS: PairsResult = { pairs: [{ chain: "ethereum", dexId: "uniswap", pairAddress: "0xp",
  url: "u", baseSymbol: "PEPE", quoteSymbol: "WETH", priceUsd: 0.0000123, liquidityUsd: 4.1e7,
  volume24hUsd: 1e7, buys24h: 100, sells24h: 90, priceChange24hPct: -3, pairCreatedAt: at }],
  totalPairsSeen: 7, oldestPairCreatedAt: at, fetchedAt: at, source: "dexscreener" };
const FLAGS: RiskFlag[] = [
  { code: "TWIN_TICKER", severity: "warn", message: "m", evidence: {}, rule: "r" },
  { code: "PAIR_CONCENTRATION", severity: "info", message: "m", evidence: {}, rule: "r" },
];
const FACTS = buildFacts(METRICS, PAIRS, FLAGS);

const GOOD: BriefText = {
  what: "Pepe is a meme token. It trades at {F1} with a market cap of {F3}.",
  narrative: "It is known for the frog meme; it moved {F2} over 24h and ranks {F8}.",
  risk_commentary: "{F14} means other coins share the ticker. {F15} shows one pool dominates.",
  questions: ["Why is FDV {F4}?", "Is {F6} of liquidity enough?", "Who else uses PEPE?",
    "Are socials official?", "What moved it {F2} in 24h?"],
  share: "$PEPE — frog meme token. Price {F1}, MC {F3}. Top risk: {F14}.",
  confidence: "high",
};

describe("facts (§6.6.1)", () => {
  it("uses the stable ids and sends nulls as n/a", () => {
    expect(Object.keys(FACTS)).toEqual(["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9",
      "F10", "F11", "F12", "F13", "D1", "F14", "F15"]);
    expect(FACTS.F14.value).toBe("TWIN_TICKER:warn");
    expect(FACTS.F11.value).toBe("uniswap/ethereum");
    expect(FACTS.F13.value).toBe("yes");
    const noPairs = buildFacts({ ...METRICS, liquidityUsd: s(null) }, null, []);
    expect(noPairs.F6.value).toBe("n/a");
    expect(noPairs.F10.value).toBe("n/a");
    expect(noPairs.F14).toBeUndefined();
  });

  it("builds the header line", () => {
    expect(factsHeader({ status: "resolved", source: "coingecko", resolvedAt: at,
      query: { raw: "PEPE", kind: "ticker" }, token: { cgId: "pepe", symbol: "PEPE",
        name: "Pepe", marketCapUsd: 1, rank: 1, contracts: {}, primaryChain: "ethereum" } }))
      .toBe("TOKEN: PEPE (Pepe) on ethereum. FACTS:");
  });

  it("allow list holds only digit-bearing names, longest first", () => {
    expect(allowList(METRICS)).toEqual(["Layer 1 (L1)"]);
    expect(allowList({ ...METRICS, symbol: "1INCH", name: "1inch" })).toContain("1INCH");
  });
});

describe("validate (§6.6.4)", () => {
  it("accepts a good sample", () => {
    expect(validate(JSON.stringify(GOOD), FACTS)).toMatchObject({ ok: true });
  });
  it("accepts fenced JSON", () => {
    expect(validate("```json\n" + JSON.stringify(GOOD) + "\n```", FACTS).ok).toBe(true);
  });
  it("rejects a raw digit the model typed", () => {
    const bad = { ...GOOD, what: "It trades at $0.0000123." };
    expect(validate(JSON.stringify(bad), FACTS)).toEqual({ ok: false, reason: "NUMERAL:what" });
  });
  it("rejects Persian digits", () => {
    const bad = { ...GOOD, narrative: "رتبه ۳۰ است." };
    expect(validate(JSON.stringify(bad), FACTS)).toEqual({ ok: false, reason: "NUMERAL:narrative" });
  });
  it("allows the time-window literals", () => {
    expect(numeralCheck("over 24h and 7d, not 1h or 30d", FACTS)).toBeNull();
  });
  it("rejects an unknown placeholder", () => {
    const bad = { ...GOOD, share: "Price {F99}" };
    expect(validate(JSON.stringify(bad), FACTS)).toEqual({ ok: false,
      reason: "UNKNOWN_FACT:F99:share" });
  });
  it("rejects four questions, extra keys, bad confidence, over-long fields, non-JSON", () => {
    expect(validate(JSON.stringify({ ...GOOD, questions: GOOD.questions.slice(0, 4) }), FACTS))
      .toMatchObject({ reason: "SCHEMA:questions" });
    expect(validate(JSON.stringify({ ...GOOD, extra: 1 }), FACTS))
      .toMatchObject({ reason: "SCHEMA:extra:extra" });
    expect(validate(JSON.stringify({ ...GOOD, confidence: "sure" }), FACTS))
      .toMatchObject({ reason: "SCHEMA:confidence" });
    expect(validate(JSON.stringify({ ...GOOD, share: "x".repeat(241) }), FACTS))
      .toMatchObject({ reason: "SCHEMA:share" });
    expect(validate("Sure! Here is the brief:", FACTS)).toMatchObject({ reason: "PARSE" });
  });
  it("allow-listed names with digits pass", () => {
    const text = { ...GOOD, narrative: "It is tagged Layer 1 (L1) on CoinGecko." };
    expect(validate(JSON.stringify(text), FACTS).ok).toBe(false);
    expect(validate(JSON.stringify(text), FACTS, allowList(METRICS)).ok).toBe(true);
  });
  it("stripDigits keeps placeholders and allowed words", () => {
    expect(stripDigits("FDV is 5.1B vs {F3}; Layer 1 (L1)", ["Layer 1 (L1)"]))
      .toBe("FDV is .B vs {F3}; Layer 1 (L1)");
  });
});

describe("substitute (§6.6.5)", () => {
  it.each([
    [0.00001234, "$0.00001234"], [1234567, "$1.23M"], [5.1e9, "$5.10B"], [45600, "$45.6K"],
    [1.23, "$1.23"], [0, "$0.00"], [2.4e12, "$2.40T"], [0.000000001234, "$0.00000000123"],
  ])("usd %s → %s", (v, want) => expect(usd(v)).toBe(want));

  it("formats pct with sign, days, counts", () => {
    expect(formatFact({ value: -12.34, unit: "pct" }, "en")).toBe("-12.3%");
    expect(formatFact({ value: 3.21, unit: "pct" }, "en")).toBe("+3.2%");
    expect(formatFact({ value: 412, unit: "days" }, "en")).toBe("412 days");
    expect(formatFact({ value: 412, unit: "days" }, "fa")).toBe("412 روز");
    expect(formatFact({ value: 1234, unit: "count" }, "en")).toBe("1,234");
    expect(formatFact({ value: "n/a", unit: "usd" }, "en")).toBe("n/a");
  });

  it("replaces placeholders with FACTS values, never touching the rest", () => {
    expect(substitute("Price {F1}, MC {F3}, {F2} 24h; {F14}.", FACTS, "en"))
      .toBe("Price $0.00001234, MC $5.10B, -3.2% 24h; twin ticker (warn).");
  });

  it("Persian: each value is a first-strong isolate, so $ and % stay on the number", () => {
    const I = (s: string) => `\u2068${s}\u2069`;
    expect(substitute("قیمت {F1} و تغییر {F2} در 24h", FACTS, "fa"))
      .toBe(`قیمت ${I("$0.00001234")} و تغییر ${I("-3.2%")} در 24h`);
    expect(substitute("قیمت {F1}", FACTS, "en")).toBe("قیمت $0.00001234"); // EN untouched
  });

  it("every number in a substituted brief exists in FACTS (the §3.9 rule)", () => {
    const out = [GOOD.what, GOOD.narrative, ...GOOD.questions].map((x) => substitute(x, FACTS, "en"));
    const formatted = new Set(Object.values(FACTS).map((f: Fact) => formatFact(f, "en")));
    for (const line of out) {
      const numbers = line.replace(/\b(24h|7d|1h|30d)\b/g, "")
        .match(/[-+$]?\d[\d.,]*[KMBT%]?/g) ?? [];
      for (const n of numbers) {
        expect([...formatted].some((f) => f.includes(n.replace(/[.,]$/, "")))).toBe(true);
      }
    }
  });
});

describe("share card", () => {
  it("fits in 280 characters including the link", () => {
    const link = "https://tokenbrief-anna.vercel.app/?utm_source=share&utm_medium=telegram";
    const long = { ...GOOD, share: "word ".repeat(47).trim() + " {F1}" };
    const card = buildShare(long, FACTS, link, "PEPE");
    expect(card.text.length).toBeLessThanOrEqual(SHARE_MAX);
    expect(card.text.endsWith(link)).toBe(true);
    expect(card.text).toContain("Not financial advice.");
    expect(card.text).toContain("$PEPE");
  });
  it("prefixes the symbol when the model left it out", () => {
    expect(shareText({ ...GOOD, share: "Price {F1}" } as never, FACTS, "en", "L", "PEPE"))
      .toMatch(/^\$PEPE — Price \$0\.00001234\n/);
  });
  it("Persian card: right-to-left first line, the ticker and numbers isolated", () => {
    const fa = shareText({ ...GOOD, share: "قیمت {F1}" } as never, FACTS, "fa", "L", "PEPE");
    expect(fa.startsWith("\u200f\u2068$PEPE\u2069 — قیمت \u2068$0.00001234\u2069")).toBe(true);
    expect(fa.endsWith("\nتوصیهٔ مالی نیست. L")).toBe(true);
  });
  it("fit trims on a word boundary", () => {
    expect(fit("alpha beta gamma delta", 12)).toBe("alpha beta…");
  });
});

describe("template fallback", () => {
  it("passes the same validator in both languages", () => {
    for (const lang of ["en", "fa"] as const) {
      const t = templateBrief(FACTS, FLAGS, lang);
      expect(validate(JSON.stringify(t), FACTS)).toMatchObject({ ok: true });
    }
  });
  it("mentions no flags when none fired", () => {
    expect(templateBrief(FACTS, [], "en").risk_commentary).toMatch(/not proof of safety/);
  });
});

describe("prompts", () => {
  it("system prompt is the §6.6.2 text with the language filled in", () => {
    expect(SYSTEM_PROMPT_EN).toContain("8. Language: write in English.");
    expect(SYSTEM_PROMPT_EN).not.toContain("{{LANG}}");
    expect(SYSTEM_PROMPT_EN).toContain('"share":            {"type":"string","maxLength":240}');
  });
  it("chat prompt carries rules 1–3 and 6 only", () => {
    expect(CHAT_SYSTEM_PROMPT).toContain("1. You never invent");
    expect(CHAT_SYSTEM_PROMPT).toContain("3. If a fact is");
    expect(CHAT_SYSTEM_PROMPT).not.toContain("4. Every claim");
    expect(CHAT_SYSTEM_PROMPT).toContain("6. Nothing you write is financial advice.");
    expect(CHAT_SYSTEM_PROMPT).toContain("max 120 words");
  });
});
