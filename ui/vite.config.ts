/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const SDK = "/static/anna-apps/_sdk/latest/index.js"; // host-served, loaded at runtime

// The bundle is served into a sandboxed iframe (opaque origin): a `crossorigin` attribute
// would turn the stylesheet into a CORS request, so plain same-origin loads are emitted.
const noCrossorigin: Plugin = {
  name: "tokenbrief-no-crossorigin",
  enforce: "post",
  transformIndexHtml: (html) => html.replace(/\s+crossorigin(?:="[^"]*")?/g, ""),
};

export default defineConfig({
  base: "./", // every asset reference relative (bundle paths ^[A-Za-z0-9_./-]+$)
  envDir: "..",
  plugins: [react(), tailwindcss(), noCrossorigin],
  build: {
    outDir: "../bundle",
    emptyOutDir: true,
    assetsDir: "assets",
    target: "es2022",
    modulePreload: { polyfill: false }, // no inline script in index.html
    rollupOptions: { external: [SDK] },
  },
  server: { fs: { allow: [".."] } },
  test: { environment: "node", include: ["src/**/*.test.ts", "test/**/*.test.ts"] },
});
