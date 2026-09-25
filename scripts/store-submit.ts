// scripts/store-submit.ts — docs/notes/s4-publish.md (P-9.15) as one guided run, for you to run
// in your own terminal after `anna-app login`. Local and read-only checks run on their own;
// every command that changes something on Anna (push, sync-meta, cut, submit-review) is shown
// first and runs only after you type "y". Stops at the first failure; everything printed is
// also appended to docs/notes/s4-run.log (no secrets: the CLI never prints the PAT).
//   pnpm store:submit
import { spawn } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const LOG = "docs/notes/s4-run.log";
const ANNA = "node_modules/@anna-ai/cli/dist/cli.js"; // the anna-app bin, run with this node
const app = JSON.parse(readFileSync("app.json", "utf8")) as { slug: string; version: string };
const PLATFORMS = Object.keys(JSON.parse(readFileSync("executas/tokenbrief/executa.json", "utf8"))
  .distribution.profiles.binary.binary_artifacts);
const CHANGELOG = "MVP: token brief from ticker, address or CG/CMC/DexScreener link; " +
  "risk flags; Persian; share card";
const rl = createInterface({ input: process.stdin, output: process.stdout });

/** Runs a command with live output (tee'd into the log); resolves to its exit status + text. */
function run(label: string, cmd: string, args: string[]): Promise<{ ok: boolean; out: string }> {
  console.log(`\n$ ${label}`);
  appendFileSync(LOG, `\n## ${new Date().toISOString()}  $ ${label}\n`);
  return new Promise((done) => {
    let out = "";
    const child = spawn(cmd, args, { stdio: ["inherit", "pipe", "pipe"] });
    const tee = (chunk: Buffer, to: NodeJS.WriteStream) => {
      to.write(chunk);
      out += chunk.toString();
      appendFileSync(LOG, chunk);
    };
    child.stdout.on("data", (c: Buffer) => tee(c, process.stdout));
    child.stderr.on("data", (c: Buffer) => tee(c, process.stderr));
    child.on("error", (e) => done({ ok: false, out: `${out}${e.message}` }));
    child.on("close", (code) => {
      appendFileSync(LOG, `→ exit ${code}\n`);
      done({ ok: code === 0, out });
    });
  });
}
const anna = (...args: string[]) =>
  run(`anna-app ${args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" ")}`,
    process.execPath, [ANNA, ...args]);
// Through pnpm's own entry when started by `pnpm store:submit` (no shell needed on Windows).
const pnpm = (...args: string[]) => process.env.npm_execpath
  ? run(`pnpm ${args.join(" ")}`, process.execPath, [process.env.npm_execpath, ...args])
  : run(`pnpm ${args.join(" ")}`, process.platform === "win32" ? "pnpm.cmd" : "pnpm", args);

async function confirm(question: string): Promise<boolean> {
  const a = (await rl.question(`\n${question} [y/N] `)).trim().toLowerCase();
  return a === "y" || a === "yes";
}
async function pause(todo: string): Promise<void> {
  await rl.question(`\n${todo}\nPress Enter when done… `);
}
function stop(why: string): never {
  console.error(`\n✗ ${why}\n  (log: ${LOG}; fix it and run \`pnpm store:submit\` again)`);
  rl.close();
  process.exit(1);
}

console.log(`TokenBrief ${app.version} → Anna store review (@${app.slug}). Steps: account, local ` +
  "gates, dry run, push, listing, cut, pre-flight, submit.");

// 0. Account (read-only)
const who = await anna("whoami");
if (!who.ok || /no accounts/i.test(who.out)) {
  stop("not logged in — run `anna-app login --host https://nexus.anna.partners`, then " +
    "`anna-app account set-handle meitipro1` (s4-publish.md §0)");
}

// 1. Local gates: build + tests + validate, then the binaries `apps cut` will upload.
if (!(await pnpm("release:check")).ok) stop("release:check failed");
if (!(await pnpm("release:verify")).ok) {
  if (!(await confirm("The Executa binaries are missing or stale. Rebuild them now " +
    "(local only, a few minutes)?"))) stop("rebuild the binaries before cutting");
  if (!(await pnpm("--filter", "@meitipro1/tokenbrief-executa", "package:binaries", "--",
    ...PLATFORMS)).ok) stop("package:binaries failed");
  if (!(await pnpm("release:verify")).ok) stop("release:verify still fails");
}

// 2. Dry run: resolves identity and shows the diff, uploads nothing.
if (!(await anna("apps", "publish", "--dry-run")).ok) stop("publish --dry-run failed");

// 3. Working draft + listing (mutating)
if (!(await confirm("Upload the working draft with `apps push` (registers the bundled " +
  "executa, uploads manifest, bundle and the listing images)?"))) stop("stopped before push");
if (!(await anna("apps", "push")).ok) stop("apps push failed");
if (!(await confirm("Push the listing text, logo and screenshots with `apps sync-meta`?"))) {
  stop("stopped before sync-meta");
}
if (!(await anna("apps", "sync-meta")).ok) stop("apps sync-meta failed");
await pause("Console check (s4-publish.md §4): the app's Listing shows the logo, 5 screenshots, " +
  "category `data` and the three URLs; /executa → My Tools → TokenBrief Data is `app_bundled`.");

// 4. Version (mutating): uploads the four binaries and freezes the executa binding.
if (!(await confirm(`Cut version ${app.version} now (uploads ${PLATFORMS.length} binaries)?`))) {
  stop("stopped before cut");
}
if (!(await pnpm("release:verify")).ok) stop("binaries changed since the check — rebuild");
if (!(await anna("apps", "cut", app.version, "--changelog", CHANGELOG)).ok) stop("apps cut failed");
await anna("apps", "status", app.slug, "--json");
await anna("apps", "versions", app.slug, "--json");
await pause("Pre-flight (s4-publish.md §6): Versions tab → Validate → valid: true; bundle " +
  "`bundle_ready`; install the candidate on your account and run PEPE on desktop and phone.");

// 5. Review (mutating): one of the 5 submissions per day.
if (!(await confirm("Submit for review now?"))) stop("stopped before submit-review");
if (!(await anna("apps", "submit-review", "--json")).ok) stop("apps submit-review failed");
await anna("apps", "status", app.slug, "--json");
console.log("\n✓ Submitted. Next (s4-publish.md §7): screenshot the Console showing " +
  "PENDING_REVIEW into docs/evidence/, `git tag v0.1.0`, post the note in the Anna Discord.");
rl.close();
