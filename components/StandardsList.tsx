// Curated documents grouped by what they settle (lib/catalog DOC_TYPES), each group in rank order.
import { citationHref, DOC_TYPES } from "@/lib/catalog";
import type { Entry } from "@/lib/search";

type Props = { entries: Entry[]; proxy: string; citeNo: (e: Entry) => number | undefined };

export function StandardsList({ entries, proxy, citeNo }: Props) {
  if (!entries.length) return <p className="empty">No society document in the library covers this yet. The literature may.</p>;
  return (
    <>
      {DOC_TYPES.map((t) => {
        const group = entries.filter((e) => e.type === t.id);
        if (!group.length) return null;
        return (
          <div key={t.id} className="group">
            <h3 className="group-title">{t.label} <span>{group.length}</span></h3>
            <ul className="list">
              {group.map((e) => {
                const n = citeNo(e);
                return (
                  <li key={e.id} className="row">
                    {n && <span className="cite-no" aria-label={`Source ${n}`}>{n}</span>}
                    <a className="title" href={citationHref(e, proxy)} target="_blank" rel="noreferrer">{e.title}</a>
                    <div className="meta">
                      <span className="soc">{e.societies.join(" · ")}</span>
                      <span>{e.journal} {e.year}</span>
                      {e.openAccess && <span className="tag open">Open access</span>}
                      {e.retired && <span className="tag warn">Retired</span>}
                      {e.pmcid && <a href={`https://europepmc.org/article/PMC/${e.pmcid}`} target="_blank" rel="noreferrer">Full text</a>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </>
  );
}
