import { useState } from "react";
import type { Msg } from "../anna";
import type { Strings } from "../i18n";

export const MAX_FOLLOW_UPS = 5; // Journey B: up to 5 per brief keeps token cost predictable

/** Single-turn follow-ups about the brief (no re-fetch). Suggestions come from the questions. */
export function FollowUp(p: { s: Strings; chat: Msg[]; render: (x: string) => string;
  suggestions: string[]; dir: "ltr" | "rtl"; onAsk: (q: string) => Promise<void> }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const asked = p.chat.filter((m) => m.role === "user").length;
  const full = asked >= MAX_FOLLOW_UPS;
  async function ask(text: string) {
    if (!text.trim() || busy || full) return;
    setBusy(true);
    try { await p.onAsk(text.trim()); setQ(""); } finally { setBusy(false); }
  }
  return (
    <section className="space-y-2" dir={p.dir}>
      {p.chat.map((m, i) => (
        <p key={i} className={m.role === "user"
          ? "font-medium" : "rounded-lg border border-[var(--line)] bg-[var(--card)] p-3"}>
          {m.role === "user" ? m.content : p.render(m.content)}
        </p>
      ))}
      {busy && <p className="animate-pulse text-sm text-[var(--muted)]">{p.s.thinking}</p>}
      {full ? <p className="text-sm text-[var(--muted)]">{p.s.followUpLimit}</p> : (
        <>
          {p.chat.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {p.suggestions.slice(0, 3).map((sug) => (
                <button key={sug} type="button" disabled={busy}
                  className="tap rounded-lg border border-[var(--line)] px-3 py-1.5 text-start text-[13px]"
                  onClick={() => void ask(sug)}>{sug}</button>
              ))}
            </div>
          )}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void ask(q); }}>
            <input className="tap min-w-0 flex-1 rounded-lg border border-[var(--line)]
              bg-[var(--card)] px-3" value={q} placeholder={p.s.askPlaceholder}
              aria-label={p.s.sections.followUp} onChange={(e) => setQ(e.target.value)} />
            <button type="submit" disabled={busy || !q.trim()}
              className="tap rounded-lg border border-[var(--line)] px-4 disabled:opacity-40">
              {p.s.ask}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
