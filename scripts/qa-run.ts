// scripts/qa-run.ts — the §11.7 manual QA rows, driven through the running `anna-app dev`
// harness (desktop view, then the mobile shell). Records time-to-brief, what resolved, the
// flags, notices and the mobile layout checks into docs/qa-results.md.
//   anna-app dev --bundle bundle [--mock-llm fixtures/llm/replies.jsonl]   # other terminal
//   pnpm tsx scripts/qa-run.ts [--fresh <solana|base>:<address>] [--only desktop|mobile]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { chromium, type Frame, type Page } from "playwright";

const arg = (k: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const HARNESS = arg("harness") ?? "http://localhost:5180";
const fresh = arg("fresh"); // e.g. solana:BozphR8Ehb4zxLKYSh9aPApaZnLN5QiDs8KXjtnB4sEG
const freshPair = arg("fresh-pair"); // e.g. https://dexscreener.com/solana/<pair>

const ROWS: [id: string, input: string, cls: string, expect: string][] = [
  ["1", "BTC", "major", "brief; pair rules not checked"],
  ["2", "ETH", "major", "brief"],
  ["3", "SOL", "major + twins", "Solana; twins in evidence"],
  ["4", "0xdAC17F958D2ee523a2206206994597C13D831ec7", "stablecoin address",
    "USDT; liquidity not checked (quote asset)"],
  ["5", "PEPE", "memecoin", "Ethereum PEPE, TWIN_TICKER"],
  ["6", "WIF", "Solana memecoin", "dogwifhat on Solana"],
  ["7", "https://www.coingecko.com/en/coins/dogwifcoin", "URL", "same as 6"],
  ["8", freshPair ?? "", "fresh pair URL", "FRESH_PAIR (+ LOW_LIQUIDITY)"],
  ["9", fresh?.split(":")[1] ?? "", "fresh pair address", "same token as 8"],
  ["10", "https://coinmarketcap.com/currencies/pepe/", "CMC URL", "same token as 5"],
  ["11", "ARB", "twin ticker", "Arbitrum or picker"],
  ["12a", "asdfqwerty", "invalid", "friendly not found"],
  ["12b", "0x1234", "invalid", "friendly error"],
  ["12c", "hello world", "invalid", "friendly error"],
];

type Result = { id: string; input: string; outcome: string; ms: number; token: string;
  flags: string; notice: string; layout: string };

async function open(page: Page, mobile: boolean): Promise<Frame> {
  await page.goto(HARNESS, { waitUntil: "networkidle" });
  if (mobile) {
    await page.locator("button", { hasText: "Mobile" }).click();
    await page.waitForTimeout(800);
  }
  const frame = (await (await page.waitForSelector("iframe")).contentFrame())!;
  await frame.waitForSelector("text=TokenBrief", { timeout: 30_000 });
  return frame;
}

async function run(frame: Frame, input: string): Promise<Omit<Result, "id" | "input" | "layout">> {
  const box = frame.locator("input").first();
  await box.fill(input);
  const t0 = Date.now();
  await box.press("Enter");
  if (!input.trim()) {
    await frame.waitForTimeout(1500);
    const busy = await frame.locator("[role=status]").count();
    return { outcome: busy ? "SPINNER (bad)" : "no-op (button disabled)", ms: 0, token: "",
      flags: "", notice: "" };
  }
  const wait = { timeout: 200_000 }; // covers a full CoinGecko Retry-After countdown
  const which = await Promise.race([
    frame.waitForSelector("text=/5 questions|۵ سؤال/", wait).then(() => "brief"),
    frame.waitForSelector("text=/pick one/", wait).then(() => "picker"),
    frame.waitForSelector("[role=alert]", wait).then(() => "error"),
  ]).catch(() => "timeout");
  const ms = Date.now() - t0;
  if (which === "error") {
    const text = (await frame.locator("[role=alert] p").first().innerText()).trim();
    return { outcome: `error: ${text}`, ms, token: "", flags: "", notice: "" };
  }
  if (which === "picker") {
    const rows = await frame.locator("section ul li button").allInnerTexts();
    return { outcome: "picker", ms, token: rows.map((r) => r.split("\n")[0]).join(" / "),
      flags: "", notice: "" };
  }
  if (which !== "brief") return { outcome: which, ms, token: "", flags: "", notice: "" };
  const token = (await frame.locator("article h2").first().innerText()).replace(/\s+/g, " ");
  const chain = await frame.locator("article span.rounded-full").first().innerText()
    .catch(() => "");
  // each flag row shows a severity badge then the code, both font-mono → "CODE:severity"
  const flags = (await frame.locator("article li").evaluateAll((lis) => lis.map((li) => {
    const [sev, code] = [...li.querySelectorAll("span.font-mono")]
      .map((e) => (e.textContent ?? "").trim());
    return code ? `${code}:${sev.toLowerCase()}` : "";
  }).filter(Boolean))).join(", ");
  // brief-level notices are divs directly under <article>; flag rows (li) share the colour
  const notice = await frame.locator("article > div.bg-\\[var\\(--warn-bg\\)\\] > span").first()
    .innerText({ timeout: 500 }).catch(() => "");
  return { outcome: "brief", ms, token: `${token}${chain ? ` · ${chain}` : ""}`,
    flags: flags || "none", notice };
}

// The harness' Mobile shell is 390 px wide; the roadmap asks for 320 px too, so the iframe is
// narrowed in place and measured again.
async function narrow(page: Page, frame: Frame, width: number): Promise<string> {
  await page.$eval("iframe", (f, w) => { (f as HTMLElement).style.width = `${w}px`; }, width);
  await page.waitForTimeout(300);
  return layout(frame);
}

async function layout(frame: Frame): Promise<string> {
  return frame.evaluate(() => {
    const de = document.documentElement;
    const small = [...document.querySelectorAll("button, input")].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.height < 44 || r.width < 44);
    }).length;
    const wide = [...document.querySelectorAll("body *")]
      .filter((el) => el.getBoundingClientRect().right > de.clientWidth + 1).length;
    return `w=${de.clientWidth} hscroll=${de.scrollWidth > de.clientWidth ? "YES" : "no"} ` +
      `overflow=${wide} small-targets=${small}`;
  });
}

const only = arg("only");
const results: Record<string, Result[]> = {};
const browser = await chromium.launch();
try {
  for (const mode of ["desktop", "mobile"] as const) {
    if (only && only !== mode) continue;
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    results[mode] = [];
    for (const [id, input] of ROWS) {
      if (!input && id !== "12d") continue;
      const frame = await open(page, mode === "mobile");
      const r = await run(frame, input);
      const l = mode === "mobile"
        ? `${await layout(frame)} · ${await narrow(page, frame, 320)}` : "";
      results[mode].push({ id, input, ...r, layout: l });
      console.log(`${mode} ${id} ${input.slice(0, 40)} → ${r.outcome} ${r.ms} ms ${r.token} ` +
        `[${r.flags}] ${r.notice}`);
    }
    const frame = await open(page, mode === "mobile");
    const r = await run(frame, "");
    results[mode].push({ id: "12d", input: "(empty)", ...r, layout: "" });
    await page.close();
  }
} finally {
  await browser.close();
}

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const short = (s: string) => (s.length > 46 ? `${s.slice(0, 22)}…${s.slice(-16)}` : s);
const stamp = `${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`;
const sections: Record<string, string> = {};
for (const [mode, rows] of Object.entries(results)) {
  let md = `\n## ${mode} — ${stamp}\n\n` +
    `| # | Input | Outcome | Time | Resolved | Flags | Notice |` +
    `${mode === "mobile" ? " Layout |" : ""}\n|---|---|---|---|---|---|---|` +
    `${mode === "mobile" ? "---|" : ""}\n`;
  for (const r of rows) {
    md += `| ${r.id} | \`${esc(short(r.input))}\` | ${esc(r.outcome)} | ` +
      `${r.ms ? `${(r.ms / 1000).toFixed(1)} s` : "—"} | ${esc(r.token)} | ${esc(r.flags)} | ` +
      `${esc(r.notice)} |${mode === "mobile" ? ` ${r.layout} |` : ""}\n`;
  }
  sections[mode] = md;
}
const OUT = "docs/qa-results.md";
const prev = only && existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
const own = new RegExp(`\\n## ${only}\\b[^\\n]*\\n[\\s\\S]*?(?=\\n## |$)`);
const md = only && own.test(prev)
  ? prev.replace(own, () => sections[only]) // a function: "$" in token names stays literal
  : `# QA results — ${stamp}\n\n` +
    `Driven through \`anna-app dev\` by \`scripts/qa-run.ts\` (§11.7 rows). LLM: whatever the ` +
    `harness was started with (mock unless noted), so prose is not assessed here — numbers, ` +
    `resolution, flags, errors, timing and layout are. Mobile layout is measured in the ` +
    `harness' 390 px shell and again with the iframe narrowed to 320 px.\n` +
    Object.values(sections).join("");
writeFileSync(OUT, md);
console.log("\nwrote docs/qa-results.md");
