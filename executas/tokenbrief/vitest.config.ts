import { defineConfig } from "vitest/config";

// Tests call the real clients with a stubbed fetch, so the rate limiter and retries are
// switched off; otherwise every CoinGecko call would wait 2.1 s.
export default defineConfig({
  test: {
    env: { CG_MIN_INTERVAL_MS: "0", DS_MIN_INTERVAL_MS: "0", HTTP_RETRIES: "0" },
    testTimeout: 20_000,
  },
});
