// executas/tokenbrief/src/errors.ts
export class InvalidParams extends Error {}

export class UpstreamDown extends Error {
  constructor() { super("UPSTREAM_DOWN"); }
}

export class UpstreamError extends Error {
  readonly tag: string; // "coingecko:429" → Metrics.errors
  constructor(readonly host: string, readonly status: number | string) {
    super(`${host} ${status}`);
    this.tag = `${host.includes("coingecko") ? "coingecko" : "dexscreener"}:${status}`;
  }
}

export class RateLimitTimeout extends UpstreamError {
  constructor(host: string) { super(host, "queue-full"); }
}

/** Stable, user-facing tool error codes (ch06 §6.8). */
export function toolErrorCode(e: unknown): string {
  if (e instanceof RateLimitTimeout) return "UPSTREAM_RATE_LIMITED";
  if (e instanceof UpstreamError) {
    return e.status === 429 ? "UPSTREAM_RATE_LIMITED" : "UPSTREAM_DOWN";
  }
  if (e instanceof UpstreamDown) return "UPSTREAM_DOWN";
  return "INTERNAL_ERROR";
}
