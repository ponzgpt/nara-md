// The curated library, already ranked and scoped by the caller.
import { citationHref } from "@/lib/catalog";
import type { Entry } from "@/lib/search";

export function GuidelineList({ entries, proxy }: { entries: Entry[]; proxy: string }) {
  if (!entries.length) return <p className="empty">Nothing in the curated library. Press Enter to search the literature.</p>;
  return (
    <ul className="list">
      {entries.map((e) => (
        <li key={e.id} className="row">
          <a className="title" href={citationHref(e, proxy)} target="_blank" rel="noreferrer">{e.title}</a>
          <div className="meta">
            <span className="soc">{e.societies.join(" · ")}</span>
            <span>{e.journal} {e.year}</span>
            {e.openAccess && <span className="tag open">Open access</span>}
            {e.retired && <span className="tag warn">Retired</span>}
            {e.pmcid && <a href={`https://europepmc.org/article/PMC/${e.pmcid}`} target="_blank" rel="noreferrer">Full text</a>}
            {e.pmid && <a href={`https://pubmed.ncbi.nlm.nih.gov/${e.pmid}/`} target="_blank" rel="noreferrer">PubMed</a>}
          </div>
        </li>
      ))}
    </ul>
  );
}
