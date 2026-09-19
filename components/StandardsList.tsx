// Curated documents grouped by what they settle (lib/catalog DOC_TYPES). Within each group, relevance order is kept
// but documents from the user's region come first, then international bodies, then other regions' societies.
// Region never moves a document across groups or past a more relevant group-mate from the same tier.
import { citationHref, DOC_TYPES, REGIONS, SOCIETY_SITES, TIER_ORDER, tierOf } from "@/lib/catalog";
import type { Entry } from "@/lib/search";

const LANG = { en: "English", de: "Deutsch", es: "Español" };

type Props = { entries: Entry[]; proxy: string; region: string; missing: string[]; citeNo: (e: Entry) => number | undefined };

export function StandardsList({ entries, proxy, region, missing, citeNo }: Props) {
  const short = REGIONS[region].short;
  const notice = region !== "global" && missing.length > 0 && (
    <p className="region-note">
      No {missing.map((s, i) => (
        <span key={s}>{i > 0 && (i === missing.length - 1 ? " or " : ", ")}{SOCIETY_SITES[s] ? <a href={SOCIETY_SITES[s]} target="_blank" rel="noreferrer">{s}</a> : s}</span>
      ))} documents in the library yet, so international standards come first. Check {missing.length > 1 ? "their sites" : "its site"} for national guidance.
    </p>
  );

  if (!entries.length) return <>{notice}<p className="empty">No society document in the library covers this yet. The literature may.</p></>;
  return (
    <>
      {notice}
      {DOC_TYPES.map((t) => {
        const group = entries
          .filter((e) => e.type === t.id)
          .map((e, i) => ({ e, i, tier: tierOf(e.societies, region) }))
          .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.i - b.i);
        if (!group.length) return null;
        return (
          <div key={t.id} className="group">
            <h3 className="group-title">{t.label} <span>{group.length}</span></h3>
            <ul className="list">
              {group.map(({ e, tier }) => {
                const n = citeNo(e);
                return (
                  <li key={e.id} className="row">
                    {n && <span className="cite-no" aria-label={`Source ${n}`}>{n}</span>}
                    <a className="title" href={citationHref(e, proxy)} target="_blank" rel="noreferrer" lang={e.lang}>{e.title}</a>
                    {e.titleEn && <p className="title-en">{e.titleEn}</p>}
                    <div className="meta">
                      <span className="soc">{e.societies.join(" · ")}</span>
                      <span>{e.journal} {e.approxYear ? "c. " : ""}{e.year}</span>
                      {e.lang && e.lang !== "en" && <span className="tag lang" title="Language of the document">{LANG[e.lang]}</span>}
                      {region !== "global" && tier === "local" && <span className="tag local">{short}</span>}
                      {tier === "international" && <span className="tag intl">International</span>}
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
