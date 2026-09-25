// executas/tokenbrief/src/errors.ts
export class InvalidParams extends Error {}

export class UpstreamDown extends Error {
  constructor() { super("UPSTREAM_DOWN"); }
}

export class UpstreamError extends Error {
  readonly tag: string; // "coingecko:429" → Metrics.errors
  constructor(readonly host: string, readonly status: number | string,
    readonly retryAfterS?: number) {
    super(`${host} ${status}`);
    this.tag = `${host.includes("coingecko") ? "coingecko" : "dexscreener"}:${status}`;
  }
}

/** The per-host budget or a 429 penalty would hold the call longer than the queue cap. */
export class RateLimitTimeout extends UpstreamError {
  constructor(host: string, retryAfterS: number) { super(host, "queue-full", retryAfterS); }
}

export const isRateLimited = (e: unknown): e is UpstreamError =>
  e instanceof RateLimitTimeout || (e instanceof UpstreamError && e.status === 429);

/**
 * Stable, user-facing tool error codes (ch06 §6.8). A rate limit carries the wait the
 * upstream asked for ("UPSTREAM_RATE_LIMITED retry_after=42") so the UI can count down.
 */
export function toolErrorCode(e: unknown): string {
  if (isRateLimited(e)) {
    return e.retryAfterS ? `UPSTREAM_RATE_LIMITED retry_after=${e.retryAfterS}`
      : "UPSTREAM_RATE_LIMITED";
  }
  if (e instanceof UpstreamError || e instanceof UpstreamDown) return "UPSTREAM_DOWN";
  return "INTERNAL_ERROR";
}
