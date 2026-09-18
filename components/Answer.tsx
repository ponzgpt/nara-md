"use client";
// A cited answer: body with [n] superscripts, a copyable bottom line, numbered sources, hand-offs.
import { CONNECTORS, citationHref } from "@/lib/catalog";
import type { AskResponse, Source } from "@/lib/types";

const CITE = /(\[\d+(?:,\s*\d+)*\])/;
const stripCites = (t: string) => t.replace(/\s*\[\d+(?:,\s*\d+)*\]/g, "");

export function Answer({ r, q, proxy }: { r: AskResponse; q: string; proxy: string }) {
  const byN = new Map(r.sources.map((s) => [s.n, s]));
  const [body, wording] = (r.answer ?? "").split(/Bottom line:\s*/);

  const cite = (text: string) => text.split(CITE).map((part, i) => {
    const ns = part.match(/^\[([\d,\s]+)\]$/)?.[1].split(",").map(Number);
    if (!ns) return part;
    return (
      <sup key={i}>
        {ns.map((n) => { const s = byN.get(n); return s ? <a key={n} href={citationHref(s, proxy)} target="_blank" rel="noreferrer">{n}</a> : n; })}
      </sup>
    );
  });

  return (
    <article className="card answer">
      {(r.error || r.note) && <p className="note">{r.error ?? r.note}</p>}
      {body.trim() && body.trim().split(/\n{2,}/).map((p, i) => <p key={i}>{cite(p)}</p>)}
      {wording && (
        <div className="wording">
          <span className="eyebrow">Bottom line</span>
          <p>{cite(wording.trim())}</p>
          <button className="ghost" onClick={() => navigator.clipboard.writeText(stripCites(wording.trim()))}>Copy</button>
        </div>
      )}
      {r.sources.length > 0 && (
        <ol className="cites">
          {r.sources.map((s: Source) => (
            <li key={s.n} value={s.n}>
              <a href={citationHref(s, proxy)} target="_blank" rel="noreferrer">{s.title}</a>
              <span><em className={`tag ${s.kind}`}>{s.kind === "guideline" ? "Guideline" : "Literature"}</em> {s.meta}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="handoff">
        Also ask
        {CONNECTORS.filter((c) => c.handoff).map((c) => (
          <a key={c.id} href={c.url!.endsWith("=") ? c.url + encodeURIComponent(q) : c.url} target="_blank" rel="noreferrer">{c.name}</a>
        ))}
      </p>
    </article>
  );
}
