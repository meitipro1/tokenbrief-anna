// scripts/manifest.ts — inline prompts/addendum.txt into manifest.json and enforce the
// reference/app-manifest.md limits (addendum ≤ 4000 chars; exactly one {user_message}, ≤ 500).
// The Executa tool_id is NOT set here: manifest.json references `bundled:tokenbrief`, and
// `anna-app dev` / `anna-app apps publish` substitute the local or minted id.
//   pnpm manifest
import { readFileSync, writeFileSync } from "node:fs";

const ADDENDUM_MAX = 4000;
const PREFIX_MAX = 500;

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const addendum = readFileSync("prompts/addendum.txt", "utf8").replace(/\s+/g, " ").trim();
if (addendum.length > ADDENDUM_MAX) {
  throw new Error(`system_prompt_addendum is ${addendum.length} chars (max ${ADDENDUM_MAX})`);
}
const prefix: string = manifest.user_message_prefix_template ?? "";
if (prefix && (prefix.length > PREFIX_MAX || prefix.split("{user_message}").length !== 2)) {
  throw new Error("user_message_prefix_template: exactly one {user_message}, max 500 chars");
}
const refs = [
  ...manifest.required_executas.map((e: { tool_id: string }) => e.tool_id),
  ...manifest.ui.host_api.tools,
].join(" ");
if (/tool-dev-|tool-meitipro1-/.test(refs)) {
  throw new Error("manifest.json must reference the executa as bundled:tokenbrief, not a raw id");
}
manifest.system_prompt_addendum = addendum;
writeFileSync("manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`manifest.json ok: addendum ${addendum.length} chars, executa bundled:tokenbrief`);
