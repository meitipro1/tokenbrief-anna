// scripts/checkpoint.ts — P-9.17: append a weekly checkpoint row to docs/growth-log.md.
// Only numbers you can screenshot go in; unknown values are written as "—", never guessed.
//   pnpm checkpoint -- --week W1 --runs 25 --users 18 --mau 18 --top "X thread" \
//     --error "none" --decision "keep Persian-first"
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "docs/growth-log.md";
const args = process.argv.slice(2).filter((a) => a !== "--");
const get = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "—";
};
const numOrDash = (k: string) => {
  const v = get(k);
  if (v !== "—" && !/^\d+$/.test(v)) {
    console.error(`--${k} must be a whole number (or omitted), got ${v}`);
    process.exit(2);
  }
  return v;
};

const week = get("week");
if (week === "—") {
  console.error("usage: pnpm checkpoint -- --week W1 [--runs N] [--users N] [--mau N] " +
    "[--top <channel>] [--error <text>] [--decision <text>]");
  process.exit(2);
}
const row = `| ${new Date().toISOString().slice(0, 10)} | ${week} | ${numOrDash("runs")} | ` +
  `${numOrDash("users")} | ${numOrDash("mau")} | ${get("top")} | ${get("error")} | ` +
  `${get("decision")} |`;
const marker = "<!-- checkpoints:end -->";
const md = readFileSync(FILE, "utf8");
if (!md.includes(marker)) {
  console.error(`${FILE} has no ${marker} marker`);
  process.exit(2);
}
writeFileSync(FILE, md.replace(marker, `${row}\n${marker}`));
console.log(`checkpoint: ${row}`);
