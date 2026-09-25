// scripts/release-check.ts — P-9.15 gate before any `anna-app apps push/cut`:
// build, test, typecheck, validate --strict, and the bundle/manifest hygiene rules the store
// reviewers check. Fails loudly on the first problem.
//   pnpm release:check
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const run = (cmd: string) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};
const fail = (msg: string): never => {
  console.error(`\n✗ release:check — ${msg}`);
  process.exit(1);
};

run("pnpm build");
run("pnpm -r typecheck");
run("pnpm -r test");
run("anna-app validate --bundle bundle --strict");

// 1. Both copies of types.ts are identical below their header comments.
const body = (p: string) => readFileSync(p, "utf8").split("\n")
  .filter((l) => !l.startsWith("//")).join("\n").trim();
if (body("executas/tokenbrief/src/types.ts") !== body("ui/src/types.ts")) {
  fail("executas/tokenbrief/src/types.ts and ui/src/types.ts have drifted");
}

// 2. Bundle hygiene: relative paths, allowed file names, no dev leftovers, sizes.
const files: string[] = [];
const walk = (d: string) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
};
walk("bundle");
let total = 0;
for (const f of files) {
  const rel = f.slice("bundle/".length).replace(/\\/g, "/");
  if (!/^[A-Za-z0-9_./-]+$/.test(rel)) fail(`bundle path not allowed: ${rel}`);
  const size = statSync(f).size;
  total += size;
  if (size > 10 * 1024 * 1024) fail(`${rel} exceeds 10 MB`);
  const text = /\.(js|html|css)$/.test(rel) ? readFileSync(f, "utf8") : "";
  if (/localhost|127\.0\.0\.1/.test(text)) fail(`${rel} references localhost`);
  if (/tool-dev-tokenbrief/.test(text) && rel !== "anna-tool-ids.js") {
    // the fallback literal is allowed only as the last resort in anna.ts
    const hits = text.match(/tool-dev-tokenbrief/g)!.length;
    if (hits > 1) fail(`${rel} hard-codes the dev tool id ${hits} times`);
  }
  if (/fixtures\/tools|mockAnna/.test(text)) fail(`${rel} contains the dev mock`);
  if (/name="viewport"/.test(text)) fail(`${rel} declares its own viewport meta`);
  if (rel.endsWith(".css") && /:hover/.test(text)) fail(`${rel} has hover-only styles`);
}
if (total > 50 * 1024 * 1024) fail("bundle exceeds 50 MB");
const html = readFileSync("bundle/index.html", "utf8");
if (/<script>(?!\s*<\/script>)/.test(html)) fail("inline <script> in bundle/index.html");
if (/(src|href)="\/(?!\/)/.test(html)) fail("absolute asset path in bundle/index.html");

// 3. Manifest: the executa is referenced through the bundled handle, never a raw id.
const manifest = readFileSync("manifest.json", "utf8");
if (/tool-dev-|tool-meitipro1-/.test(manifest)) fail("manifest.json contains a raw tool id");
if (!existsSync("executas/tokenbrief/dist/plugin.js")) fail("executa not built");

console.log(`\n✓ release:check passed — ${files.length} bundle files, ` +
  `${(total / 1024).toFixed(0)} KiB`);

// 4. Executa binaries (uploaded by `apps cut`, not by push): report stale or missing archives
// now; `pnpm release:verify` is the hard gate right before the cut.
run("tsx scripts/release-verify.ts --warn");
