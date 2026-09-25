// scripts/qa-run.ts — the §11.7 manual QA rows, driven through the running `anna-app dev`
// harness (desktop view, then the mobile shell). Records time-to-brief, what resolved, the
// flags, notices and the mobile layout checks into docs/qa-results.md.
//   anna-app dev --bundle bundle [--mock-llm fixtures/llm/replies.jsonl]   # other terminal
//   pnpm tsx scripts/qa-run.ts [--fresh <solana|base>:<address>] [--only desktop|mobile]
import { writeFileSync } from "node:fs";
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
  const which = await Promise.race([
    frame.waitForSelector("text=/5 questions|۵ سؤال/", { timeout: 120_000 }).then(() => "brief"),
    frame.waitForSelector("text=/pick one/", { timeout: 120_000 }).then(() => "picker"),
    frame.waitForSelector("[role=alert]", { timeout: 120_000 }).then(() => "error"),
  ]).catch(() => "timeout");
  const ms = Date.now() - t0;
  if (which === "error") {
    return { outcome: `error: ${(await frame.locator("[role=alert] p").first().innerText()).trim()}`,
      ms, token: "", flags: "", notice: "" };
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
  const flags = (await frame.locator("article li span.font-mono").allInnerTexts()).join(", ");
  const notice = await frame.locator("article .bg-\\[var\\(--warn-bg\\)\\] span").first()
    .innerText({ timeout: 500 }).catch(() => "");
  return { outcome: "brief", ms, token: `${token}${chain ? ` · ${chain}` : ""}`,
    flags: flags || "none", notice };
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
      const l = mode === "mobile" ? await layout(frame) : "";
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
let md = `# QA results — ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC\n\n` +
  `Driven through \`anna-app dev\` by \`scripts/qa-run.ts\` (§11.7 rows). LLM: whatever the ` +
  `harness was started with (mock unless noted), so prose is not assessed here — numbers, ` +
  `resolution, flags, errors, timing and layout are.\n`;
for (const [mode, rows] of Object.entries(results)) {
  md += `\n## ${mode}\n\n| # | Input | Outcome | Time | Resolved | Flags | Notice |` +
    `${mode === "mobile" ? " Layout |" : ""}\n|---|---|---|---|---|---|---|` +
    `${mode === "mobile" ? "---|" : ""}\n`;
  for (const r of rows) {
    md += `| ${r.id} | \`${esc(short(r.input))}\` | ${esc(r.outcome)} | ` +
      `${r.ms ? `${(r.ms / 1000).toFixed(1)} s` : "—"} | ${esc(r.token)} | ${esc(r.flags)} | ` +
      `${esc(r.notice)} |${mode === "mobile" ? ` ${r.layout} |` : ""}\n`;
  }
}
writeFileSync("docs/qa-results.md", md);
console.log("\nwrote docs/qa-results.md");
