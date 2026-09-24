// executas/tokenbrief/build.mjs — one ESM file with a shebang; version injected so
// `describe` and package.json cannot drift apart.
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));

await build({
  entryPoints: ["src/plugin.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "dist/plugin.js",
  banner: { js: "#!/usr/bin/env node" },
  define: { __VERSION__: JSON.stringify(pkg.version) },
  logLevel: "warning",
});

// A CommonJS twin for @yao-pkg/pkg, which snapshots CJS entry points.
await build({
  entryPoints: ["src/plugin.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "dist/plugin.cjs",
  define: { __VERSION__: JSON.stringify(pkg.version) },
  logLevel: "warning",
});
