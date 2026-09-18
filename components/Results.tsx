"use client";
// Results, in the order a clinician resolves a question:
//   answer (if any) → society standards, grouped by what they settle → literature → elsewhere.
// Standards and literature sit side by side on wide screens and stack on narrow ones.
// Numbers match the [n] citations in the answer.
import { citationHref, CONNECTORS } from "@/lib/catalog";
import type { Entry } from "@/lib/search";
import type { AskResponse } from "@/lib/types";
import { Answer } from "@/components/Answer";
import { StandardsList } from "@/components/StandardsList";

type Props = { q: string; entries: Entry[]; result: AskResponse | null; asking: boolean; proxy: string; papers: string };

const key = (x: { doi: string | null; pmid: string | null }) => x.doi ?? x.pmid ?? "";

export function Results({ q, entries, result, asking, proxy, papers }: Props) {
  const cited = new Map(result?.sources.filter((s) => s.kind === "guideline").map((s) => [key(s), s.n]));
  const literature = result?.sources.filter((s) => s.kind === "literature");
  const status = result?.error ?? (result && !result.answer ? result.note : undefined);

  return (
    <div aria-live="polite">
      {result?.answer && <Answer text={result.answer} sources={result.sources} proxy={proxy} />}
      {status && <p className="status">{status}</p>}

      <div className="results">
        <section className="col" aria-labelledby="col-standards">
          <h2 id="col-standards" className="col-title">Standards <span>{entries.length}</span></h2>
          <StandardsList entries={entries} proxy={proxy} citeNo={(e) => cited.get(key(e))} />
        </section>

        <section className="col" aria-labelledby="col-literature">
          <h2 id="col-literature" className="col-title">Literature {literature && <span>{literature.length}</span>}</h2>
          {asking ? (
            <div className="card skeleton" aria-label="Searching the literature"><i /><i /><i /></div>
          ) : literature?.length ? (
            <ul className="list">
              {literature.map((s) => (
                <li key={s.n} className="row">
                  <span className="cite-no">{s.n}</span>
                  <a className="title" href={citationHref(s, proxy)} target="_blank" rel="noreferrer">{s.title}</a>
                  <div className="meta"><span>{s.meta}</span>{s.openAccess && <span className="tag open">Open access</span>}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">{literature ? "No matching papers." : <>Press <kbd>Enter</kbd> to search {papers} papers in Europe PMC.</>}</p>
          )}
          <p className="handoff">
            Also ask
            {CONNECTORS.filter((c) => c.handoff).map((c) => (
              <a key={c.id} href={c.url!.endsWith("=") ? c.url + encodeURIComponent(q) : c.url} target="_blank" rel="noreferrer">{c.name}</a>
            ))}
          </p>
        </section>
      </div>
    </div>
  );
}
