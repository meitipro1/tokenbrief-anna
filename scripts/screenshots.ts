// scripts/screenshots.ts — P-9.14: store screenshots from the running `anna-app dev` harness
// (same build that is uploaded). Crops to the app window, no browser chrome.
//   anna-app dev --bundle bundle [--mock-llm fixtures/llm/replies.jsonl]   # other terminal
//   pnpm tsx scripts/screenshots.ts [--out landing/public/shots] [--harness http://localhost:5180]
// Listing rule: real data with the timestamp visible; retake with the real LLM before submit.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Frame, type Page } from "playwright";
import { persianForMockTranslation } from "./lib/mock-persian";

const arg = (k: string, d: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1] : d;
};
const OUT = arg("out", "landing/public/shots");
const HARNESS = arg("harness", "http://localhost:5180");
mkdirSync(OUT, { recursive: true });

async function appFrame(page: Page): Promise<Frame> {
  await page.goto(HARNESS, { waitUntil: "networkidle" });
  const handle = await page.waitForSelector("iframe");
  const frame = (await handle.contentFrame())!;
  await frame.waitForSelector("text=TokenBrief", { timeout: 30_000 });
  return frame;
}

async function brief(frame: Frame, query: string) {
  const input = frame.locator("input").first();
  await input.fill(query);
  await input.press("Enter");
  await frame.waitForSelector("text=/Key numbers|اعداد کلیدی/", { timeout: 90_000 });
  await frame.waitForSelector("text=/5 questions|۵ سؤال/", { timeout: 90_000 });
  await frame.waitForTimeout(400);
}

async function scrollTo(frame: Frame, text: RegExp | string) {
  await frame.locator("h3", { hasText: text }).first().scrollIntoViewIfNeeded();
  await frame.evaluate(() => window.scrollBy(0, -12));
  await frame.waitForTimeout(250);
}

async function shoot(page: Page, name: string) {
  const el = await page.$("iframe");
  await el!.screenshot({ path: join(OUT, name) });
  console.log(`  ${join(OUT, name)}`);
}

/** The harness titlebar toggles the view between its desktop size and the mobile shell. */
async function formFactor(page: Page, which: "Desktop" | "Mobile") {
  await page.locator("button", { hasText: which }).click();
  await page.waitForTimeout(800);
  const frame = (await (await page.waitForSelector("iframe")).contentFrame())!;
  await frame.waitForSelector("text=TokenBrief", { timeout: 30_000 });
  return frame;
}

const browser = await chromium.launch();
try {
  // Desktop: the view's declared default size (900×680) at 2× for a crisp listing image.
  const desk = await browser.newPage({ viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2 });
  let f = await appFrame(desk);
  await shoot(desk, "00-desktop-input.png");
  await brief(f, "PEPE");
  await shoot(desk, "01-desktop-brief.png");
  await scrollTo(f, /Risk flags/);
  await f.locator("button", { hasText: "Why?" }).first().click();
  await shoot(desk, "02-desktop-flags.png");
  await scrollTo(f, /^Share$/);
  await shoot(desk, "03-desktop-share.png");

  // Mobile: the harness mobile shell at 3×.
  const mob = await browser.newPage({ viewport: { width: 1000, height: 1000 },
    deviceScaleFactor: 3 });
  await persianForMockTranslation(mob); // the Persian shot must show Persian prose
  await appFrame(mob);
  f = await formFactor(mob, "Mobile");
  await brief(f, "https://dexscreener.com/solana/EP2ib6dYdEeqD8MfE2ezHCxX3kP3K2eLKkirfPm5eyMx");
  await shoot(mob, "04-mobile-brief.png");
  await f.locator("button", { hasText: "فارسی" }).click();
  await f.waitForSelector("text=اعداد کلیدی");
  await f.waitForTimeout(2500); // lazy translation
  await scrollTo(f, /این توکن چیست/);
  await shoot(mob, "05-mobile-persian.png");
  await f.locator("button", { hasText: "English" }).click();

  // Picker, when the live caps make a ticker ambiguous (skipped otherwise).
  await appFrame(mob);
  f = await formFactor(mob, "Mobile");
  const input = f.locator("input").first();
  await input.fill("MOG");
  await input.press("Enter");
  const picker = await f.waitForSelector("text=/pick one/", { timeout: 25_000 })
    .catch(() => null);
  if (picker) await shoot(mob, "06-mobile-picker.png");
  else console.log("  (no ambiguous ticker right now — picker screenshot skipped)");
} finally {
  await browser.close();
}
