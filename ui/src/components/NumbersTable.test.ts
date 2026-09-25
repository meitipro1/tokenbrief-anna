// ui/src/components/NumbersTable.test.ts — the numbers stay Latin and LTR in both languages;
// only the words inside values ("days", "n/a") follow the UI language, like the row labels.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { STRINGS, type Lang } from "../i18n";
import type { Brief, Fact } from "../types";
import { NumbersTable } from "./NumbersTable";

const fact = (label: string, value: Fact["value"], unit: Fact["unit"]): Fact =>
  ({ label, value, unit, source: "coingecko", asOf: "2026-09-25T02:38:00.000Z" });
const brief = { facts: { F1: fact("Price (USD)", 0.2371, "usd"),
  F4: fact("FDV", null, "usd"), F7: fact("Listing age", 1039, "days") } } as unknown as Brief;
const html = (lang: Lang) =>
  renderToStaticMarkup(createElement(NumbersTable, { s: STRINGS[lang], brief, lang }));

describe("NumbersTable", () => {
  it("English: days and n/a", () => {
    expect(html("en")).toContain("1,039 days");
    expect(html("en")).toContain(">n/a<");
  });

  it("Persian: same Latin digits, Persian unit words, still LTR", () => {
    const fa = html("fa");
    expect(fa).toContain("1,039 روز");
    expect(fa).toContain(">نامشخص<");
    expect(fa).toContain("$0.237");
    expect(fa).not.toMatch(/days|[۰-۹]/);
    expect(fa).toMatch(/^<table[^>]*dir="ltr"/);
  });
});
