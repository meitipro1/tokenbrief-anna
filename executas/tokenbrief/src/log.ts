// executas/tokenbrief/src/log.ts — stderr only; stdout is the protocol channel.
export function log(...args: unknown[]): void {
  if (process.env.TOKENBRIEF_DEBUG === "1") console.error("[tokenbrief]", ...args);
}

/** One anonymous line per invoke (tool, ms, success) — no arguments, no user data (§11.8). */
export function audit(tool: string, ms: number, success: boolean): void {
  process.stderr.write(`[tokenbrief] invoke tool=${tool} ms=${ms} success=${success}\n`);
}
