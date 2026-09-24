// ui/src/synthesis/fallback.ts — the template brief used when llm.complete is unavailable or
// its output fails validation twice (ch06 §6.6.4). Written with placeholders only, so the
// same substitute() path renders it and no number is ever typed by hand.
import type { BriefText, Fact, RiskFlag } from "../types";
import type { Lang } from "./substitute";

const has = (facts: Record<string, Fact>, id: string) =>
  facts[id] !== undefined && facts[id].value !== "n/a" && facts[id].value !== null;

export function templateBrief(facts: Record<string, Fact>, flags: RiskFlag[],
  lang: Lang): BriefText {
  const real = flags.filter((f) => f.code !== "PARTIAL_DATA");
  const flagIds = real.map((f) => `{F${14 + flags.indexOf(f)}}`);
  return lang === "fa" ? fa(facts, flagIds) : en(facts, flagIds);
}

function en(facts: Record<string, Fact>, flagIds: string[]): BriefText {
  const price = has(facts, "F1") ? "It trades at {F1} ({F2} over 24h)." : "No price is available.";
  const size = has(facts, "F3") ? " Market cap is {F3} and FDV is {F4}." : "";
  const what = (has(facts, "D1")
    ? "This data-only brief lists the token's live numbers; see the CoinGecko description."
    : "No curated description exists for this token.") + " " + price + size;
  const narrative = [
    has(facts, "F12") ? "Categories on record: {F12}." : "",
    has(facts, "F8") ? "Its market-cap rank is {F8}." : "",
    has(facts, "F7") ? "It has been listed for {F7}." : "",
    has(facts, "F6") ? "DEX liquidity across the top pairs is {F6}." : "",
  ].filter(Boolean).join(" ") || "Few details are available from free data.";
  const risk_commentary = flagIds.length
    ? `Automated checks raised: ${flagIds.join(", ")}. Open each flag to see the evidence.`
    : "No automated flags fired; this is not proof of safety.";
  return {
    what, narrative, risk_commentary,
    questions: [
      "Who controls the token contract, and can supply still be minted?",
      "Where is most of the liquidity, and is it locked?",
      "How much of the supply is not yet circulating, and when does it unlock?",
      "Are the website and social accounts official and active?",
      "Does the volume come from real traders or from a few wallets?",
    ],
    share: has(facts, "F1")
      ? "Price {F1} ({F2} 24h) · MC {F3} · Liq {F6}" + (flagIds[0] ? ` · Top flag: ${flagIds[0]}` : "")
      : "Data-only brief" + (flagIds[0] ? ` · Top flag: ${flagIds[0]}` : ""),
    confidence: "low",
  };
}

function fa(facts: Record<string, Fact>, flagIds: string[]): BriefText {
  const price = has(facts, "F1") ? "قیمت فعلی {F1} است ({F2} در 24h)." : "قیمتی در دسترس نیست.";
  const size = has(facts, "F3") ? " ارزش بازار {F3} و ارزش کاملاً رقیق‌شده {F4} است." : "";
  const what = (has(facts, "D1")
    ? "این خلاصه فقط اعداد زندهٔ توکن را نشان می‌دهد؛ توضیحات را در CoinGecko ببینید."
    : "برای این توکن توضیحات تأییدشده‌ای وجود ندارد.") + " " + price + size;
  const narrative = [
    has(facts, "F12") ? "دسته‌بندی‌ها: {F12}." : "",
    has(facts, "F8") ? "رتبهٔ ارزش بازار: {F8}." : "",
    has(facts, "F7") ? "مدت فهرست‌شدن: {F7}." : "",
    has(facts, "F6") ? "نقدینگی صرافی‌های غیرمتمرکز در جفت‌های اصلی {F6} است." : "",
  ].filter(Boolean).join(" ") || "داده‌های رایگان جزئیات زیادی ندارند.";
  const risk_commentary = flagIds.length
    ? `بررسی خودکار این پرچم‌ها را نشان داد: ${flagIds.join("، ")}. برای دیدن شواهد هر پرچم را باز کنید.`
    : "هیچ پرچم خودکاری فعال نشد؛ این به معنای امن بودن نیست.";
  return {
    what, narrative, risk_commentary,
    questions: [
      "چه کسی قرارداد توکن را کنترل می‌کند و آیا هنوز امکان ضرب توکن جدید هست؟",
      "بیشتر نقدینگی کجاست و آیا قفل شده است؟",
      "چه بخشی از عرضه هنوز در گردش نیست و کی آزاد می‌شود؟",
      "آیا وب‌سایت و حساب‌های اجتماعی رسمی و فعال هستند؟",
      "آیا حجم معاملات از معامله‌گران واقعی است یا از چند کیف پول محدود؟",
    ],
    share: has(facts, "F1")
      ? "قیمت {F1} ({F2} در 24h) · ارزش بازار {F3} · نقدینگی {F6}" +
        (flagIds[0] ? ` · مهم‌ترین پرچم: ${flagIds[0]}` : "")
      : "خلاصهٔ فقط‌داده" + (flagIds[0] ? ` · مهم‌ترین پرچم: ${flagIds[0]}` : ""),
    confidence: "low",
  };
}
