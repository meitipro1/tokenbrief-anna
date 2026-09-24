import type { Strings } from "../i18n";
import type { BriefText as Text } from "../types";

/** What / narrative / risk commentary / 5 questions — prose with numbers substituted. */
export function BriefTextView(p: { s: Strings; text: Text; render: (x: string) => string;
  dir: "ltr" | "rtl"; lang: string }) {
  return (
    <div className="space-y-4" dir={p.dir} lang={p.lang}>
      <Block title={p.s.sections.what}>{p.render(p.text.what)}</Block>
      <Block title={p.s.sections.narrative}>{p.render(p.text.narrative)}</Block>
      <Block title={p.s.sections.risk}>{p.render(p.text.risk_commentary)}</Block>
      <section>
        <h3 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {p.s.sections.questions}
        </h3>
        <ol className="list-decimal space-y-1.5 ps-5 text-[15px] leading-relaxed">
          {p.text.questions.map((q, i) => <li key={i} dir="auto">{p.render(q)}</li>)}
        </ol>
      </section>
    </div>
  );
}

function Block(p: { title: string; children: string }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {p.title}
      </h3>
      <p className="text-[15px] leading-relaxed" dir="auto">{p.children}</p>
    </section>
  );
}
