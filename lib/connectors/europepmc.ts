// Europe PMC: open REST API covering MEDLINE/PubMed + PMC. No key needed.
// https://europepmc.org/RestfulWebService
import type { Source } from "@/lib/types";

const API = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";

const clean = (t: string) => t.replace(/[():"]/g, " ").trim();

/** `q` is either the user's sentence, or match units (words/phrases) that must all appear, phrases verbatim. */
export async function searchLiterature(q: string | string[], size = 6): Promise<Omit<Source, "n">[]> {
  const terms = Array.isArray(q) ? q.map((u) => (u.includes(" ") ? `"${clean(u)}"` : clean(u))).join(" AND ") : clean(q);
  // Title+abstract only: whole-text matching on PMC articles drags in unrelated papers.
  const query = `TITLE_ABS:(${terms}) AND HAS_ABSTRACT:y AND (SRC:MED OR SRC:PMC)`;
  try {
    const res = await fetch(`${API}?format=json&resultType=core&pageSize=${size}&query=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(6000),
    });
    const hits: any[] = (await res.json()).resultList?.result ?? [];
    return hits.map((h) => ({
      kind: "literature",
      title: h.title,
      meta: `${h.journalInfo?.journal?.isoabbreviation ?? ""} ${h.pubYear}`.trim(),
      doi: h.doi ?? null,
      pmid: h.pmid ?? null,
      openAccess: h.isOpenAccess === "Y",
      abstract: String(h.abstractText ?? "").replace(/<[^>]+>/g, "").slice(0, 1500),
    }));
  } catch {
    return []; // Down or slow: the caller answers from the curated library alone.
  }
}
