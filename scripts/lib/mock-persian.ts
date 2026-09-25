// scripts/lib/mock-persian.ts — recordings only (screenshots, GIF, demo video). The harness'
// --mock-llm answers every llm.complete with the one canned English reply in
// fixtures/llm/replies.jsonl, so a recorded Persian toggle showed English prose. When the
// harness answers the translation call from that mock (model "mock…"), the reply is swapped for
// the canned Persian one in fixtures/llm/translate-fa.json — the same text ui/src/mock.ts
// serves. A reply from a real model is passed through untouched.
import { readFileSync } from "node:fs";
import type { Page } from "playwright";

const FA = readFileSync("fixtures/llm/translate-fa.json", "utf8");
const TRANSLATE = "from English to Persian (fa-IR)"; // ui/src/synthesis/prompt.ts, translation

type CallReply = { ok?: boolean; result?: { model?: string; content?: unknown } };

/** Set once a translation call was answered by the harness mock (so the run is not real). */
export const harnessLlm = { mock: false };

export async function persianForMockTranslation(page: Page): Promise<void> {
  await page.route("**/api/session/call", async (route) => {
    if (!(route.request().postData() ?? "").includes(TRANSLATE)) return route.continue();
    const res = await route.fetch();
    const json = (await res.json()) as CallReply;
    if (!json.ok || !json.result || !/^mock/.test(json.result.model ?? "")) {
      return route.fulfill({ response: res });
    }
    harnessLlm.mock = true;
    json.result.content = { type: "text", text: FA };
    return route.fulfill({ response: res, json });
  });
}
