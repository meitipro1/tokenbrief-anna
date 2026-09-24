// landing/app.js — language toggle + store link with UTM passthrough.
// Links shared as …/?src=x|tg|dc (or full utm_* params) keep their source on the store button.
// STORE_LINK stays empty until the Anna store approves the app (docs/notes/s4-publish.md §8).
const STORE_LINK = "";
const FALLBACK = "https://anna.partners";

const params = new URLSearchParams(location.search);
const src = params.get("utm_source") || params.get("src") || "landing";
const medium = params.get("utm_medium") || "landing";
const campaign = params.get("utm_campaign") || "launch";

function storeHref() {
  const url = new URL(STORE_LINK || FALLBACK);
  url.searchParams.set("utm_source", src);
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_campaign", campaign);
  return url.toString();
}

for (const a of document.querySelectorAll("a.store")) {
  a.href = storeHref();
  a.addEventListener("click", () => {
    try { window.va?.("event", { name: "store_click", data: { src } }); } catch { /* optional */ }
  });
}
if (!STORE_LINK) for (const p of document.querySelectorAll(".pending")) p.hidden = false;

const btn = document.getElementById("lang");
function setLang(lang) {
  for (const el of document.querySelectorAll("[data-lang]")) el.hidden = el.dataset.lang !== lang;
  document.documentElement.lang = lang;
  btn.textContent = lang === "fa" ? "English" : "فارسی";
  document.getElementById("demo").src = lang === "fa"
    ? "/shots/05-mobile-persian.png" : "/demo.gif";
  try { localStorage.setItem("tb-lang", lang); } catch { /* private mode */ }
}
btn.addEventListener("click", () => setLang(document.documentElement.lang === "fa" ? "en" : "fa"));
let saved = null;
try { saved = localStorage.getItem("tb-lang"); } catch { /* private mode */ }
const wantFa = params.get("lang") === "fa" || src.startsWith("tg-fa") || saved === "fa";
if (wantFa) setLang("fa");
