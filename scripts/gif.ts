// scripts/gif.ts — P-9.16: record the harness flow (paste → brief → flags → فارسی) as video
// with Playwright and convert it to landing/demo.gif (≤ 3 MB, 6 fps, 560 px wide).
//   anna-app dev --bundle bundle   # other terminal (real LLM for the published GIF)
//   pnpm tsx scripts/gif.ts [--ffmpeg <path>]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync }
  from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
// @ts-expect-error gifenc ships no types
import gifenc from "gifenc";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import { persianForMockTranslation } from "./lib/mock-persian";

const i = process.argv.indexOf("--ffmpeg");
const pwDir = join(process.env.LOCALAPPDATA ?? join(homedir(), ".cache"), "ms-playwright");
const bundled = existsSync(pwDir) ? readdirSync(pwDir).filter((d) => d.startsWith("ffmpeg"))
  .map((d) => join(pwDir, d, process.platform === "win32" ? "ffmpeg-win64.exe" : "ffmpeg"))
  .find(existsSync) : undefined;
const FFMPEG = i >= 0 ? process.argv[i + 1] : bundled ?? "ffmpeg";
const TMP = "screenshots/tmp";
rmSync(TMP, { recursive: true, force: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 960, height: 760 },
  recordVideo: { dir: TMP, size: { width: 960, height: 760 } } });
const page = await ctx.newPage();
await persianForMockTranslation(page);
await page.goto("http://localhost:5180", { waitUntil: "networkidle" });
const frame = (await (await page.waitForSelector("iframe")).contentFrame())!;
await frame.waitForSelector("text=TokenBrief");
// Only the app in frame: no harness chrome (or its local dev URL) in a public GIF.
await page.addStyleTag({ content: "#app{position:fixed!important;inset:0!important;" +
  "width:100vw!important;height:100vh!important;border:0!important;" +
  "z-index:2147483000!important}" });
await page.waitForTimeout(600);
const input = frame.locator("input").first();
await input.pressSequentially("PEPE", { delay: 120 });
await page.waitForTimeout(300);
await input.press("Enter");
await frame.waitForSelector("text=5 questions", { timeout: 90_000 });
await page.waitForTimeout(1500);
for (const h of ["Risk flags", "What it is", "5 questions", "Share"]) {
  await frame.locator("h3", { hasText: h }).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(1300);
}
await frame.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
await page.waitForTimeout(700);
await frame.locator("button", { hasText: "فارسی" }).click();
await frame.waitForSelector("text=اعداد کلیدی");
await page.waitForTimeout(2500);
await frame.locator("h3", { hasText: "این توکن چیست" }).first().scrollIntoViewIfNeeded();
await page.waitForTimeout(1800);
const video = page.video()!;
await ctx.close();
await browser.close();
const webm = await video.path();

// Playwright's ffmpeg build encodes PNG but not GIF, so: frames via ffmpeg, GIF via gifenc.
const { applyPalette, GIFEncoder, quantize } = gifenc;
const FPS = 6;
const frames = join(TMP, "frames");
mkdirSync(frames, { recursive: true });
execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", webm, "-vf", "scale=560:-2",
  "-r", String(FPS), join(frames, "f%04d.png")], { stdio: "inherit" }); // no fps filter in this build
const files = readdirSync(frames).filter((f) => f.endsWith(".png")).sort();
const gif = GIFEncoder();
let palette: number[][] | null = null;
files.forEach((f, n) => {
  const png = PNG.sync.read(readFileSync(join(frames, f)));
  // one global palette from an early brief frame keeps colours stable and the file small
  if (!palette || n === Math.floor(files.length / 3)) palette = quantize(png.data, 64);
  const index = applyPalette(png.data, palette);
  gif.writeFrame(index, png.width, png.height, { palette, delay: Math.round(1000 / FPS) });
});
gif.finish();
const out = "landing/demo.gif";
writeFileSync(out, gif.bytes());
console.log(`${out}: ${files.length} frames, ${(statSync(out).size / 1e6).toFixed(2)} MB`);
