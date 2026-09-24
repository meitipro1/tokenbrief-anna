// scripts/brand.ts — render the store logo (512 and 1024 px) and the 1600×900 cover from
// inline SVG/HTML with Playwright. Outputs content/brand/ and landing/public/brand/.
//   pnpm tsx scripts/brand.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const TEAL = "#2dd4bf";
const INK = "#0f1216";

export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${INK}"/>
  <rect x="44" y="44" width="424" height="424" rx="84" fill="none" stroke="${TEAL}"
    stroke-opacity="0.25" stroke-width="6"/>
  <path d="M132 150h176" stroke="${TEAL}" stroke-width="44" stroke-linecap="round"/>
  <path d="M220 150v220" stroke="${TEAL}" stroke-width="44" stroke-linecap="round"/>
  <path d="M292 214h52a46 46 0 0 1 0 92h-52m0-92v92m0 0h60a48 48 0 0 1 0 96h-60v-96"
    fill="none" stroke="#e8eaed" stroke-width="36" stroke-linecap="round"
    stroke-linejoin="round"/>
  <circle cx="118" cy="424" r="18" fill="#f87171"/>
  <circle cx="164" cy="424" r="18" fill="#fbbf24"/>
</svg>`;

const COVER_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;width:1600px;height:900px;background:${INK};color:#e8eaed;
    font-family:"Segoe UI",system-ui,sans-serif;display:flex;align-items:center;gap:80px;
    padding:0 120px;box-sizing:border-box}
  .logo{width:360px;height:360px;flex:none}
  h1{font-size:112px;margin:0;letter-spacing:-3px}
  h1 span{color:${TEAL}}
  p{font-size:44px;margin:18px 0 0;color:#9aa1ad}
  .fa{font-family:Tahoma,"Segoe UI",sans-serif;direction:rtl;font-size:38px;margin-top:36px;
    color:#c9ced6}
  .chips{margin-top:40px;display:flex;gap:16px;font-size:26px}
  .chips b{border:2px solid #2d323b;border-radius:999px;padding:8px 22px;font-weight:500}
</style></head><body>
  <div class="logo">${LOGO_SVG}</div>
  <div><h1><span>Token</span>Brief</h1>
    <p>Paste a token, get the brief.</p>
    <div class="chips"><b>Live numbers</b><b>Risk flags</b><b>Share card</b><b>فارسی</b></div>
    <div class="fa">یک توکن بچسبانید، خلاصه‌اش را بگیرید.</div></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const dir of ["content/brand", "landing/public/brand"]) mkdirSync(dir, { recursive: true });
writeFileSync("landing/public/brand/logo.svg", LOGO_SVG);
for (const size of [512, 1024]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${LOGO_SVG.replace("<svg ",
    `<svg width="${size}" height="${size}" `)}</body></html>`);
  const png = await page.screenshot({ omitBackground: true });
  writeFileSync(`content/brand/logo-${size}.png`, png);
  writeFileSync(`landing/public/brand/logo-${size}.png`, png);
}
await page.setViewportSize({ width: 1600, height: 900 });
await page.setContent(COVER_HTML);
const cover = await page.screenshot();
writeFileSync("content/brand/cover-1600x900.png", cover);
writeFileSync("landing/public/brand/cover-1600x900.png", cover);
await page.setViewportSize({ width: 64, height: 64 });
await page.setContent(`<html><body style="margin:0">${LOGO_SVG.replace("<svg ",
  '<svg width="64" height="64" ')}</body></html>`);
writeFileSync("landing/public/favicon.png", await page.screenshot({ omitBackground: true }));
await browser.close();
console.log("brand: content/brand/{logo-512,logo-1024,cover-1600x900}.png + landing copies");
