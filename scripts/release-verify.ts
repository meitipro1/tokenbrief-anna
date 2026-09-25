// scripts/release-verify.ts — run right before `anna-app apps cut`, which uploads the Executa
// binaries. Every binary_artifacts archive in executas/tokenbrief/executa.json must exist, hold
// an executable of the right format for its platform, and embed the current dist/plugin.cjs
// byte for byte, so a build from older source can never be uploaded. The archive for this
// machine's platform is also run over stdio: describe, health, an invalid query, an unknown
// method (the same checks as the CI linux-binary job).
//   pnpm release:verify             fails on any problem
//   pnpm release:verify -- --warn   reports, exits 0 (release:check uses this)
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync }
  from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync, inflateRawSync } from "node:zlib";

const DIR = "executas/tokenbrief";
const warnOnly = process.argv.includes("--warn");
const version: string = JSON.parse(readFileSync(join(DIR, "package.json"), "utf8")).version;
const artifacts: Record<string, { path: string; entrypoint: string }> = JSON.parse(
  readFileSync(join(DIR, "executa.json"), "utf8")).distribution.profiles.binary.binary_artifacts;
const plugin = readFileSync(join(DIR, "dist/plugin.cjs"));

/** The named file in a ustar archive (package-binaries.mjs writes one entry). */
function fromTarGz(buf: Buffer, name: string): Buffer {
  const tar = gunzipSync(buf);
  const str = (b: Buffer) => b.toString("ascii").replace(/\0[\s\S]*$/, "").trim();
  for (let off = 0; off + 512 <= tar.length;) {
    const h = tar.subarray(off, off + 512);
    if (h.every((b) => b === 0)) break;
    const size = parseInt(str(h.subarray(124, 136)), 8);
    if (str(h.subarray(0, 100)) === name) return tar.subarray(off + 512, off + 512 + size);
    off += 512 + Math.ceil(size / 512) * 512;
  }
  throw new Error(`${name} is not in the archive`);
}

/** The named entry of a zip: end record → central directory → local header → data. */
function fromZip(buf: Buffer, name: string): Buffer {
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) throw new Error("no zip end record");
  let p = buf.readUInt32LE(end + 16);
  for (let i = buf.readUInt16LE(end + 10); i > 0; i--) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("bad zip central directory");
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const [nlen, xlen, clen] = [28, 30, 32].map((o) => buf.readUInt16LE(p + o));
    const local = buf.readUInt32LE(p + 42);
    if (buf.toString("utf8", p + 46, p + 46 + nlen) === name) {
      if (size === 0xffffffff) throw new Error("zip64 entries are not supported here");
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + size);
      if (method === 0) return data;
      if (method === 8) return inflateRawSync(data);
      throw new Error(`zip method ${method}`);
    }
    p += 46 + nlen + xlen + clen;
  }
  throw new Error(`${name} is not in the archive`);
}

const elf = (b: Buffer, machine: number) =>
  b.readUInt32BE(0) === 0x7f454c46 && b[4] === 2 && b.readUInt16LE(18) === machine;
const macho = (b: Buffer, cpu: number) =>
  b.readUInt32LE(0) === 0xfeedfacf && b.readUInt32LE(4) === cpu;
const pe = (b: Buffer, machine: number) => {
  if (b.toString("ascii", 0, 2) !== "MZ") return false;
  const off = b.readUInt32LE(0x3c);
  return b.readUInt32LE(off) === 0x00004550 && b.readUInt16LE(off + 4) === machine;
};
const FORMAT: Record<string, [string, (b: Buffer) => boolean]> = {
  "linux-x86_64": ["ELF x86-64", (b) => elf(b, 0x3e)],
  "linux-aarch64": ["ELF AArch64", (b) => elf(b, 0xb7)],
  "darwin-x86_64": ["Mach-O x86_64", (b) => macho(b, 0x01000007)],
  "darwin-arm64": ["Mach-O arm64", (b) => macho(b, 0x0100000c)],
  "windows-x86_64": ["PE x86-64", (b) => pe(b, 0x8664)],
};
/** Linux binaries link glibc dynamically: the newest GLIBC_x.y symbol version they need. */
function glibc(b: Buffer): string {
  const v = [...b.toString("latin1").matchAll(/GLIBC_2\.(\d+)(?:\.\d+)?\0/g)]
    .map((m) => Number(m[1])).sort((x, y) => x - y).pop();
  return v === undefined ? "" : ` (needs glibc >= 2.${v})`;
}

const HOST = ({ "win32-x64": "windows-x86_64", "linux-x64": "linux-x86_64",
  "linux-arm64": "linux-aarch64", "darwin-x64": "darwin-x86_64" } as Record<string, string>)[
  `${process.platform}-${process.arch}`];

type Reply = { id: number; error?: { code: number };
  result?: { tools?: unknown[]; version?: string; status?: string; data?: { status?: string } } };

/** The same four requests as the CI linux-binary job, over real stdio. */
function runOnHost(exe: Buffer, entrypoint: string): string {
  const dir = mkdtempSync(join(tmpdir(), "tokenbrief-verify-"));
  try {
    const file = join(dir, entrypoint);
    writeFileSync(file, exe);
    chmodSync(file, 0o755);
    const input = [
      { jsonrpc: "2.0", id: 1, method: "describe" },
      { jsonrpc: "2.0", id: 2, method: "health" },
      { jsonrpc: "2.0", id: 3, method: "invoke",
        params: { tool: "resolve_token", arguments: { query: "hello world" } } },
      { jsonrpc: "2.0", id: 4, method: "nope" },
    ].map((m) => JSON.stringify(m)).join("\n") + "\n";
    const r = spawnSync(file, [], { input, timeout: 60_000, encoding: "utf8" });
    if (r.error) throw r.error;
    const by: Record<number, Reply> = Object.fromEntries(r.stdout.trim().split("\n")
      .map((l) => JSON.parse(l) as Reply).map((m) => [m.id, m]));
    const fails = [
      by[1]?.result?.tools?.length === 4 || "describe: 4 tools",
      by[1]?.result?.version === version || `describe: version ${version}`,
      by[2]?.result?.status === "healthy" || "health",
      by[3]?.result?.data?.status === "not_found" || "invoke: invalid query → not_found",
      by[4]?.error?.code === -32601 || "unknown method → -32601",
    ].filter((x) => x !== true);
    return fails.length ? `FAILED ${fails.join(", ")}` : "ran: describe, health, invoke, -32601 ok";
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

let bad = 0;
console.log(`Executa ${version} — dist/plugin.cjs sha256 ` +
  `${createHash("sha256").update(plugin).digest("hex").slice(0, 16)}…`);
for (const [platform, a] of Object.entries(artifacts)) {
  const path = join(DIR, a.path.replace("{version}", version));
  const problems: string[] = [];
  let note = "";
  if (!existsSync(path)) {
    problems.push(`missing ${path} — run package:binaries`);
  } else {
    const buf = readFileSync(path);
    const exe = (path.endsWith(".zip") ? fromZip : fromTarGz)(buf, a.entrypoint);
    const [label, ok] = FORMAT[platform] ?? ["?", () => false];
    if (!ok(exe)) problems.push(`not a ${label} executable`);
    if (!exe.includes(plugin)) problems.push("STALE: built from older source");
    if (!problems.length && platform === HOST) note = runOnHost(exe, a.entrypoint);
    if (note.startsWith("FAILED")) problems.push(note);
    note ||= `${label}${platform.startsWith("linux") ? glibc(exe) : ""}, current code`;
  }
  bad += problems.length ? 1 : 0;
  console.log(`${problems.length ? "✗" : "✓"} ${platform.padEnd(15)} ` +
    `${problems.length ? problems.join("; ") : note}`);
}
if (bad) {
  console.error(`\n${bad} archive(s) not ready for \`anna-app apps cut\`. Rebuild with:\n` +
    "  pnpm --filter @meitipro1/tokenbrief-executa package:binaries -- " +
    Object.keys(artifacts).join(" "));
  if (!warnOnly) process.exit(1);
} else {
  console.log("\n✓ release:verify — all binaries embed the current Executa");
}
