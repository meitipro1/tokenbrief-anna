// ui/src/App.tsx — input → progress → picker → brief (numbers, flags, prose, share, follow-up)
// with the EN/FA toggle. State transitions go through run/machine.ts (ch06 §6.8).
import { useEffect, useReducer, useRef, useState } from "react";
import { connectAnna, type AnnaClient, type Msg } from "./anna";
import { plainBrief } from "./briefText";
import { BriefTextView } from "./components/BriefText";
import { CandidatePicker } from "./components/CandidatePicker";
import { FlagList } from "./components/FlagList";
import { FollowUp } from "./components/FollowUp";
import { NumbersTable } from "./components/NumbersTable";
import { QueryInput } from "./components/QueryInput";
import { ShareBar } from "./components/ShareBar";
import { StatusBar } from "./components/StatusBar";
import { STRINGS, type Lang } from "./i18n";
import { hasBrief, isBusy, reduce } from "./run/machine";
import { cgUrl, persist, runBrief, type Outcome, type RecentItem } from "./run/runBrief";
import { allowList, factsHeader } from "./synthesis/facts";
import { templateBrief } from "./synthesis/fallback";
import { askFollowUp, synthesize, translateBrief } from "./synthesis/llm";
import { buildShare, shareText } from "./synthesis/share";
import { substitute } from "./synthesis/substitute";
import type { Brief, Candidate } from "./types";

export default function App() {
  const annaRef = useRef<AnnaClient | null>(null);
  const [state, dispatch] = useReducer(reduce, { k: "idle" });
  const [query, setQuery] = useState("");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>(import.meta.env.VITE_DEFAULT_LANG === "fa" ? "fa" : "en");
  const langRef = useRef(lang);
  langRef.current = lang;
  const [chat, setChat] = useState<Msg[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [mock, setMock] = useState(false);
  const [bootError, setBootError] = useState(false);
  const [waitUntil, setWaitUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const s = STRINGS[lang];

  useEffect(() => {
    let off = () => {};
    connectAnna().then(async (a) => {
      annaRef.current = a;
      setMock(a.mock);
      const saved = await a.storageGet<Lang>("prefs/lang");
      if (saved === "fa" || saved === "en") setLang(saved);
      setRecent(((await a.storageGet<RecentItem[]>("recent")) ?? []).filter((x) => x?.symbol));
      const first = queryFrom(a.entryPayload);
      if (first) void start(first);
      off = a.onEvent("entry_payload", (p) => { const q = queryFrom(p); if (q) void start(q); });
    }).catch((e) => { console.error("[tokenbrief] connect failed", e); setBootError(true); });
    return () => off();
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => { // 1 s tick while a rate-limit countdown is shown
    if (!waitUntil) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [waitUntil]);

  async function start(q: string) {
    const a = annaRef.current;
    if (!a || !q.trim()) return;
    setQuery(q); setBrief(null); setChat([]); setNotice(null);
    dispatch({ type: "submit" });
    const out = await runBrief(a, q.trim(), (step) => dispatch({ type: "step", step }),
      (until) => { setWaitUntil(until); setNow(Date.now()); });
    setWaitUntil(null);
    apply(out);
  }

  function apply(out: Outcome) {
    if (out.kind === "choose") {
      return dispatch({ type: "ambiguous", candidates: out.candidates, symbol: out.symbol });
    }
    if (out.kind === "error") return dispatch({ type: "fail", code: out.code });
    setBrief(out.brief); setNotice(out.notice);
    dispatch({ type: "done" });
    void refreshRecent();
    if (langRef.current === "fa") void toFa(out.brief);
  }

  async function refreshRecent() {
    const a = annaRef.current;
    if (a) setRecent(((await a.storageGet<RecentItem[]>("recent")) ?? []).filter((x) => x?.symbol));
  }

  function pick(c: Candidate) {
    dispatch({ type: "pick" });
    void start(cgUrl(c.cgId!));
  }

  async function toFa(b: Brief) {
    const a = annaRef.current;
    if (!a || b.text.fa || !b.text.en) return;
    dispatch({ type: "translate" });
    const allow = allowList(b.metrics);
    const fa = b.llm.templateFallback ? templateBrief(b.facts, b.flags, "fa")
      : await translateBrief(a, b.text.en, b.facts, allow);
    dispatch({ type: "translated" });
    if (!fa) return setNotice("TRANSLATE_FAILED");
    const textFa = shareText(fa, b.facts, "fa", b.share.link, b.resolved.token!.symbol);
    const next: Brief = { ...b, text: { ...b.text, fa }, share: { ...b.share, textFa } };
    setBrief(next);
    void persist(a, next);
  }

  async function toggleLang() {
    const next: Lang = lang === "en" ? "fa" : "en";
    setLang(next);
    void annaRef.current?.storageSet("prefs/lang", next).catch(() => undefined);
    if (next === "fa" && brief) await toFa(brief);
  }

  async function retryNarrative() {
    const a = annaRef.current;
    if (!a || !brief) return;
    dispatch({ type: "translate" });
    const syn = await synthesize(a, brief.facts, factsHeader(brief.resolved), allowList(brief.metrics));
    dispatch({ type: "translated" });
    if (!syn.text) return setNotice(syn.notice);
    const next: Brief = { ...brief, text: { en: syn.text, fa: null },
      llm: { model: syn.model, templateFallback: false },
      share: buildShare(syn.text, brief.facts, brief.share.link, brief.resolved.token!.symbol) };
    setBrief(next); setNotice(null);
    void persist(a, next);
    if (lang === "fa") void toFa(next);
  }

  async function ask(question: string) {
    const a = annaRef.current;
    if (!a || !brief?.text.en) return;
    dispatch({ type: "ask" });
    const ctx = { header: factsHeader(brief.resolved), facts: brief.facts, brief: brief.text.en,
      allow: allowList(brief.metrics), lang };
    const ans = await askFollowUp(a, ctx, chat, question)
      .catch(() => ({ text: s.errors.LLM_UNAVAILABLE, stripped: false }));
    dispatch({ type: "answered" });
    setChat([...chat, { role: "user" as const, content: question },
      { role: "assistant" as const, content: ans.text + (ans.stripped ? ` ${s.numbersRemoved}` : "") }]);
  }

  const tl: Lang = lang === "fa" && brief?.text.fa ? "fa" : "en";
  const text = brief ? (tl === "fa" ? brief.text.fa : brief.text.en) : null;
  const dir = tl === "fa" ? "rtl" : "ltr";
  const render = (x: string) => (brief ? substitute(x, brief.facts, tl) : x);
  const t = brief?.resolved.token;

  return (
    <div className="app mx-auto max-w-3xl space-y-4 px-4 pb-8 pt-4" dir={lang === "fa" ? "rtl" : "ltr"}>
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-[var(--accent)]">Token</span>Brief
          </h1>
          <p className="truncate text-[13px] text-[var(--muted)]">{s.tagline}</p>
        </div>
        <button type="button" className="tap shrink-0 rounded-lg border border-[var(--line)] px-3
          text-[14px] font-medium" onClick={() => void toggleLang()} aria-label="Language">
          {s.langToggle}
        </button>
      </header>
      {mock && <p className="rounded-lg bg-[var(--warn-bg)] p-2 text-[13px]">{s.mockBanner}</p>}
      {bootError && <p className="rounded-lg bg-[var(--high-bg)] p-3">{s.errors.TOOL_NOT_GRANTED}</p>}

      <QueryInput s={s} busy={isBusy(state)} value={query} onChange={setQuery}
        onSubmit={(q) => void start(q)} />

      {state.k === "idle" && recent.length > 0 && (
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[var(--muted)]">{s.sections.recent}:</span>
          {recent.slice(0, 8).map((r) => (
            <button key={r.id} type="button" dir="ltr" className="tap rounded-full border
              border-[var(--line)] px-3 text-[13px]" onClick={() => void start(r.query)}>
              ${r.symbol}
            </button>
          ))}
        </nav>
      )}

      {(state.k === "resolving" || state.k === "fetching" || state.k === "flagging" ||
        state.k === "synthesizing") && <StatusBar s={s} step={state.k}
        waitS={waitUntil ? Math.max(0, Math.ceil((waitUntil - now) / 1000)) : null} />}

      {state.k === "error" && (
        <div className="space-y-2 rounded-lg border border-[var(--high)] bg-[var(--high-bg)] p-3" role="alert">
          <p>{s.errors[state.code] ?? state.code}</p>
          {(state.code === "UPSTREAM_DOWN" || state.code === "UPSTREAM_RATE_LIMITED" ||
            state.code === "AGENT_UNAVAILABLE") && (
            <button type="button" className="tap rounded-lg border border-[var(--line)] px-4"
              onClick={() => void start(query)}>{s.retry}</button>
          )}
        </div>
      )}

      {state.k === "choosing" && (
        <CandidatePicker s={s} symbol={state.symbol} candidates={state.candidates} onPick={pick}
          onCancel={() => dispatch({ type: "cancel" })} />
      )}

      {hasBrief(state) && brief && t && text && (
        <article className="space-y-5">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2" dir="ltr">
              <h2 className="text-lg font-bold">{t.name} <span className="text-[var(--muted)]">${t.symbol}</span></h2>
              {t.primaryChain && t.primaryChain !== "other" && <span className="rounded-full border border-[var(--line)] px-2
                py-0.5 text-[12px]">{t.primaryChain}</span>}
            </div>
            {t.primaryAddress && <p className="mt-1 break-all font-mono text-[12px] text-[var(--muted)]"
              dir="ltr">{t.primaryAddress}</p>}
            <p className="mt-1 text-[12px] text-[var(--muted)]" dir="ltr">
              {s.dataAsOf} {brief.metrics.fetchedAt.slice(11, 16)} UTC · CoinGecko + DexScreener
            </p>
          </div>

          {notice && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg
              bg-[var(--warn-bg)] p-3 text-[14px]">
              <span>{s.errors[notice] ?? notice}</span>
              {brief.llm.templateFallback && notice !== "LLM_QUOTA" && (
                <button type="button" className="tap rounded-lg border border-[var(--line)] px-3"
                  onClick={() => void retryNarrative()}>{s.retryNarrative}</button>
              )}
            </div>
          )}
          {brief.metrics.partial && (
            <p className="text-[13px] text-[var(--muted)]" dir="ltr">
              {s.partial}: {brief.metrics.errors.join(", ")}
            </p>
          )}

          <Section title={s.sections.numbers}><NumbersTable s={s} brief={brief} /></Section>
          <Section title={s.sections.flags}><FlagList s={s} flags={brief.flags} /></Section>
          {state.k === "translating" && <p className="animate-pulse text-sm text-[var(--muted)]">
            {s.thinking}</p>}
          <BriefTextView s={s} text={text} render={render} dir={dir} lang={tl} />
          <Section title={s.sections.share}>
            <ShareBar s={s} dir={dir}
              shareText={tl === "fa" && brief.share.textFa ? brief.share.textFa : brief.share.text}
              briefText={plainBrief(brief, text, tl, STRINGS[tl])} />
          </Section>
          {!brief.llm.templateFallback && (
            <Section title={s.sections.followUp}>
              <FollowUp s={s} chat={chat} render={render} dir={dir} onAsk={ask}
                suggestions={text.questions.map(render)} />
            </Section>
          )}
        </article>
      )}

      <footer className="border-t border-[var(--line)] pt-3 text-[12px] text-[var(--muted)]">
        {s.sources}{brief ? ` · ${s.fetched} ${brief.metrics.fetchedAt.slice(11, 16)} UTC` : ""}
        {" · "}{s.notAdvice}
      </footer>
    </div>
  );
}

function Section(p: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {p.title}
      </h3>
      {p.children}
    </section>
  );
}

function queryFrom(payload: unknown): string | null { // open_app_view(payload=…)
  if (typeof payload === "string") return payload || null;
  const o = payload as { query?: unknown; token?: unknown } | null;
  const q = o?.query ?? o?.token;
  return typeof q === "string" && q.trim() ? q : null;
}
