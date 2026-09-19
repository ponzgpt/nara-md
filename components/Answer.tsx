"use client";
// The written answer: body with [n] superscripts linking to each source, and a copyable bottom line.
// The sources themselves are listed in the result columns, carrying the same numbers.
import { citationHref } from "@/lib/catalog";
import type { Source } from "@/lib/types";

const CITE = /(\[\d+(?:,\s*\d+)*\])/;
const stripCites = (t: string) => t.replace(/\s*\[\d+(?:,\s*\d+)*\]/g, "");

export function Answer({ text, sources, proxy }: { text: string; sources: Source[]; proxy: string }) {
  const byN = new Map(sources.map((s) => [s.n, s]));
  const [body, bottom] = text.split(/Bottom line:\s*/);

  const cite = (t: string) => t.split(CITE).map((part, i) => {
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
      {body.trim().split(/\n{2,}/).map((p, i) => <p key={i}>{cite(p)}</p>)}
      {bottom && (
        <div className="wording">
          <span className="eyebrow">Bottom line</span>
          <p>{cite(bottom.trim())}</p>
          <button className="ghost" onClick={() => navigator.clipboard.writeText(stripCites(bottom.trim()))}>Copy</button>
        </div>
      )}
      <p className="ai-note">Written by AI from the source excerpts below. Check the cited source before you rely on it.</p>
    </article>
  );
}
