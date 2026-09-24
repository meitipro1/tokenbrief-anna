// scripts/check-copy.ts — length and hygiene checks for content/launch/*.md: X posts
// (sections split by ---, numbered "n/"; links count as 23) ≤ 260 chars, Telegram posts
// ≤ 600, Discord ≤ 900, and no incentive wording anywhere.
//   pnpm tsx scripts/check-copy.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "content/launch";
const BANNED = /giveaway|airdrop|reward|prize|raffle|whitelist|run it to win|جایزه‌ای|قرعه‌کشی/i;
let bad = 0;
const check = (label: string, text: string, max: number) => {
  const n = [...text.trim()].length;
  const ok = n <= max;
  if (!ok) bad++;
  console.log(`${ok ? "ok " : "BAD"} ${label}: ${n}/${max}`);
};

for (const f of readdirSync(DIR).filter((x) => x.endsWith(".md"))) {
  const md = readFileSync(join(DIR, f), "utf8");
  const body = md.replace(/^- \[ \].*$/gm, ""); // checklists mention the banned words
  if (BANNED.test(body.replace(/\(no giveaway[^)]*\)|جایزه، قرعه‌کشی/g, ""))) {
    bad++;
    console.log(`BAD ${f}: incentive wording`);
  }
  if (f.startsWith("x-thread")) {
    for (const part of md.split(/\n---\n/).slice(1)) {
      const m = part.trim().match(/^([0-9۰-۹]+)\/\n([\s\S]*)$/);
      // X shortens every link to t.co: a URL counts as 23 characters.
      if (m) check(`${f} #${m[1]}`, m[2].replace(/(LANDING|https?:\/\/)\S*/g, "x".repeat(23))
        .replace(/\s*\[[^\]]+\]\s*$/, ""), 260);
    }
  }
  if (f === "telegram-pinned.md") {
    for (const [, lang, text] of md.matchAll(/## (EN|FA)\n([\s\S]*?)(?=\n## |\n---)/g)) {
      check(`${f} ${lang}`, text, 600);
    }
  }
  if (f === "discord-post.md") check(f, md.split("\n---\n")[0].split("\n").slice(1).join("\n"), 900);
}
if (bad) process.exit(1);
