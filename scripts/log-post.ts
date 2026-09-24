// scripts/log-post.ts — P-9.17: append one row to docs/growth-log.md (## Posts), today's UTC
// date. This file is the acquisition proof the program rules ask for (ch02 §2.6), so it
// refuses anything that reads like an incentive for runs.
//   pnpm log:post -- <url> <channel> [type] [lang] [notes…]
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "docs/growth-log.md";
const BANNED = /giveaway|airdrop|reward|prize|incentive|raffle|whitelist|run it and dm/i;
const RULE = "Anna AI OS Founding Builder Program: zero tolerance for \"paying or incentivizing " +
  "users purely to generate runs without genuine utility\" (suspension, 7-day appeal).";

const [url, channel, type = "post", lang = "en", ...notesParts] =
  process.argv.slice(2).filter((a) => a !== "--");
const notes = notesParts.join(" ");

if (!url || !channel) {
  console.error("usage: pnpm log:post -- <url> <channel> [type] [lang] [notes…]");
  process.exit(2);
}
try {
  const u = new URL(url);
  if (!/^https?:$/.test(u.protocol)) throw new Error("scheme");
} catch {
  console.error(`not a valid http(s) URL: ${url}`);
  process.exit(2);
}
if (BANNED.test(`${type} ${notes} ${channel}`)) {
  console.error(`refused — incentive language in the row.\n${RULE}`);
  process.exit(2);
}
if (!["en", "fa"].includes(lang)) {
  console.error(`lang must be en or fa, got ${lang}`);
  process.exit(2);
}

const esc = (s: string) => s.replace(/\|/g, "\\|");
const row = `| ${new Date().toISOString().slice(0, 10)} | ${esc(channel)} | ${esc(type)} | ` +
  `${esc(url)} | ${lang} | ${esc(notes)} |`;
const md = readFileSync(FILE, "utf8");
const marker = "<!-- posts:end -->";
if (!md.includes(marker)) {
  console.error(`${FILE} has no ${marker} marker`);
  process.exit(2);
}
writeFileSync(FILE, md.replace(marker, `${row}\n${marker}`));
console.log(`logged: ${row}`);
