// scripts/fixtures-sync.ts — copy evidence/<name>/ (raw upstream responses written by
// `TOKENBRIEF_EVIDENCE=1 TOKENBRIEF_EVIDENCE_DIR=evidence/<name> pnpm smoke -- <q> --record
// fixtures/tools/<name>.jsonl`) into the Executa's committed test fixtures, minified, and drop
// response headers. The replay test serves these files instead of the network.
//   pnpm tsx scripts/fixtures-sync.ts
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = "evidence";
const DST = "executas/tokenbrief/test/fixtures/evidence";

rmSync(DST, { recursive: true, force: true });
let files = 0;
let bytes = 0;
for (const name of readdirSync(SRC)) {
  const dir = join(SRC, name);
  if (!statSync(dir).isDirectory()) continue;
  for (const host of readdirSync(dir)) {
    for (const file of readdirSync(join(dir, host))) {
      const rec = JSON.parse(readFileSync(join(dir, host, file), "utf8"));
      const out = JSON.stringify({ url: rec.url, status: rec.status, fetchedAt: rec.fetchedAt,
        body: rec.body });
      mkdirSync(join(DST, name, host), { recursive: true });
      writeFileSync(join(DST, name, host, file), out);
      files++;
      bytes += out.length;
    }
  }
}
console.log(`synced ${files} responses (${(bytes / 1024).toFixed(0)} KiB) into ${DST}`);
