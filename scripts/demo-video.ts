// scripts/demo-video.ts — the 60-second tutorial (content/launch/tutorial-60s.md) recorded from
// the running harness, with that file's EN/FA captions burned in: DexScreener link → numbers →
// flags + "Why?" → prose → share → فارسی → follow-up → end card. Output is WebM (YouTube and
// DoraHacks links take it as is; X wants MP4, so convert before posting there).
//   anna-app dev --bundle bundle      # other terminal; logged in = the real LLM. Record the
//                                     # upload with the real LLM: the mock replies are canned.
//   pnpm tsx scripts/demo-video.ts [--query <link or ticker>] [--no-follow-up] [--out <file>]
import { copyFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { chromium, type Frame, type Page } from "playwright";
import { harnessLlm, persianForMockTranslation } from "./lib/mock-persian";

const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
// PEPE/WETH on Uniswap v2: an established pair, so the flags shown are real but not alarming.
const QUERY = arg("--query")
  ?? "https://dexscreener.com/ethereum/0xa43fe16908251ee70ef74718545e4fe6c5ccec9f";
const FOLLOW_UP = !process.argv.includes("--no-follow-up");
const OUT = arg("--out")
  ?? `screenshots/demo/tokenbrief-demo-${new Date().toISOString().slice(0, 10)}.webm`;
const HARNESS = "http://localhost:5180";
const TMP = "screenshots/tmp/demo";
const [W, H] = [1280, 720];

// Captions come from the shot list itself: | time | shot | caption EN | caption FA |
const SHOTS = readFileSync("content/launch/tutorial-60s.md", "utf8").split("\n")
  .filter((l) => /^\| \d:\d\d/.test(l))
  .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
  .map(([time, shot, en, fa]) => ({ time, shot, en, fa }));
if (SHOTS.length !== 8) throw new Error(`expected 8 shots in tutorial-60s.md, got ${SHOTS.length}`);

async function caption(page: Page, n: number) {
  const { en, fa } = SHOTS[n];
  await page.evaluate(([en, fa]) => {
    let box = document.getElementById("tb-caption");
    if (!box) {
      box = document.createElement("div");
      box.id = "tb-caption";
      Object.assign(box.style, { position: "fixed", left: "50%", bottom: "26px",
        transform: "translateX(-50%)", zIndex: "2147483647", maxWidth: "88vw",
        padding: "12px 24px", borderRadius: "14px", background: "rgba(8,10,14,.88)",
        color: "#fff", textAlign: "center", boxShadow: "0 8px 28px rgba(0,0,0,.4)",
        font: "600 26px/1.35 'Segoe UI', Tahoma, sans-serif" });
      document.body.append(box);
    }
    const line = (text: string, rtl: boolean) => {
      const d = document.createElement("div");
      d.textContent = text;
      if (rtl) {
        d.dir = "rtl";
        Object.assign(d.style, { fontSize: "23px", opacity: ".92", marginTop: "4px" });
      }
      return d;
    };
    box.replaceChildren(line(en, false), line(fa, true));
  }, [en, fa]);
}

async function scrollTo(frame: Frame, text: string, pause = 2200) {
  await frame.locator("h3", { hasText: text }).first().evaluate((el) =>
    el.scrollIntoView({ behavior: "smooth", block: "start" }));
  await frame.page().waitForTimeout(pause);
}

async function endCard(page: Page, n: number) {
  const logo = readFileSync("content/brand/logo-512.png").toString("base64");
  const [en, fa] = [SHOTS[n].en, SHOTS[n].fa];
  await page.evaluate(([logo, en, fa]) => {
    document.getElementById("tb-caption")?.remove();
    const card = document.createElement("div");
    Object.assign(card.style, { position: "fixed", inset: "0", zIndex: "2147483647",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: "14px", background: "#0f1115", color: "#fff",
      font: "600 30px/1.4 'Segoe UI', Tahoma, sans-serif", textAlign: "center" });
    const img = Object.assign(document.createElement("img"),
      { src: `data:image/png;base64,${logo}`, width: 150, height: 150 });
    const line =(text: string, size: number, rtl = false, muted = false) => {
      const d = document.createElement("div");
      d.textContent = text;
      d.dir = rtl ? "rtl" : "ltr";
      Object.assign(d.style, { fontSize: `${size}px`, opacity: muted ? ".75" : "1" });
      card.append(d);
    };
    card.append(img);
    line(en, 30);
    line(fa, 27, true);
    line("tokenbrief-anna.vercel.app", 22, false, true);
    document.body.append(card);
  }, [logo, en, fa]);
}

rmSync(TMP, { recursive: true, force: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, colorScheme: "dark",
  recordVideo: { dir: TMP, size: { width: W, height: H } } });
const page = await ctx.newPage();
// tsx keeps function names with an injected __name() helper that the page does not have.
await page.addInitScript("window.__name = (f) => f;");
await persianForMockTranslation(page);
await page.goto(HARNESS, { waitUntil: "networkidle" });
const frame = (await (await page.waitForSelector("iframe")).contentFrame())!;
await frame.waitForSelector("text=TokenBrief", { timeout: 30_000 });
// Only the app in frame: the harness chrome is hidden and the iframe fills the viewport.
await page.addStyleTag({ content: "html,body{background:#111317!important}" +
  "#app{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;" +
  "border:0!important;z-index:2147483000!important}" });
await frame.evaluate(() => { document.documentElement.style.zoom = "1.2"; });
await page.waitForTimeout(800);

await caption(page, 0); // empty input
await page.waitForTimeout(3500);

await caption(page, 1); // paste a link → numbers
const input = frame.locator("input").first();
await input.fill(QUERY);
await page.waitForTimeout(900);
await input.press("Enter");
await frame.waitForSelector("text=/5 questions|۵ سؤال/", { timeout: 200_000 });
await page.waitForTimeout(4000);

await caption(page, 2); // flags + Why?
await scrollTo(frame, "Risk flags", 1500);
await frame.locator("button", { hasText: "Why?" }).first().click();
await page.waitForTimeout(4000);

await caption(page, 3); // prose, never the numbers
for (const h of ["What it is", "Narrative snapshot", "5 questions"]) await scrollTo(frame, h, 2300);

await caption(page, 4); // share
await scrollTo(frame, "Share", 1200);
await frame.locator("button", { hasText: "Copy share card" }).first().click();
await page.waitForTimeout(3500);

await caption(page, 5); // فارسی
await frame.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
await page.waitForTimeout(900);
await frame.locator("button", { hasText: "فارسی" }).first().click();
await frame.waitForSelector("text=اعداد کلیدی", { timeout: 60_000 });
await page.waitForTimeout(2500);
await scrollTo(frame, "این توکن چیست", 3000);

// The mock answers a follow-up with the canned brief JSON, so that shot needs a real model.
if (FOLLOW_UP && harnessLlm.mock) console.warn("mock LLM: follow-up shot skipped");
if (FOLLOW_UP && !harnessLlm.mock) {
  await caption(page, 6); // follow-up: the first suggested question
  await scrollTo(frame, "۵ سؤال پیش از خرید", 1200);
  const chip = frame.locator("section button.text-start").first();
  await chip.scrollIntoViewIfNeeded();
  await chip.click();
  await frame.waitForSelector("text=در حال فکر کردن…", { timeout: 10_000 }).catch(() => {});
  await frame.waitForSelector("text=در حال فکر کردن…", { state: "detached", timeout: 90_000 });
  await frame.locator("section p.rounded-lg").last().scrollIntoViewIfNeeded();
  await page.waitForTimeout(4500);
}

await endCard(page, 7);
await page.waitForTimeout(4500);

const video = page.video()!;
await ctx.close();
await browser.close();
mkdirSync(dirname(OUT), { recursive: true });
copyFileSync(await video.path(), OUT);
rmSync(TMP, { recursive: true, force: true });
console.log(`wrote ${OUT}`);
if (harnessLlm.mock) {
  console.warn("recorded with the harness mock LLM: the prose is canned — a draft, not for " +
    "upload. Re-record with `anna-app dev --bundle bundle` while logged in.");
}
