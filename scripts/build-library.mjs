// Resolves data/seeds.json against Europe PMC so every entry carries a real DOI/PMID.
// Run: node scripts/build-library.mjs  → writes data/library.json, prints anything that needs a human look.
import { readFileSync, writeFileSync } from "node:fs";

const seeds = JSON.parse(readFileSync("data/seeds.json", "utf8")).filter((s) => !s.skip);
const words = (s) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3));
const overlap = (a, b) => { const A = words(a), B = words(b); return [...A].filter((w) => B.has(w)).length / A.size; };

const out = [];
for (const s of seeds) {
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&pageSize=25&resultType=core&query=${encodeURIComponent(`TITLE:(${s.q.replace(/[():"]/g, " ")})`)}`;
  const hits = (await (await fetch(url)).json()).resultList?.result ?? [];
  const real = hits.filter((h) => !/^(response|reply|comment|endorsement|\[)|\b(erratum|corrigendum)\b/i.test(h.title) && (!s.year || +h.pubYear === s.year));
  const best = real.map((h) => ({ h, score: overlap(s.q, h.title) })).sort((a, b) => b.score - a.score)[0];
  if (!best || best.score < 0.6) { console.log(`✗ NO MATCH  ${s.q}  ${best ? `→ ${best.h.title}` : ""}`); continue; }
  const h = best.h;
  if (best.score < 0.85) console.log(`? ${best.score.toFixed(2)}  ${s.q}\n       → ${h.title}`);
  out.push({
    id: h.pmid ?? h.id,
    title: h.title.replace(/\.$/, ""),
    authors: h.authorString?.split(", ").slice(0, 3).join(", ") + (h.authorString?.split(", ").length > 3 ? " et al." : ""),
    journal: h.journalInfo?.journal?.isoabbreviation ?? h.journalTitle,
    year: Number(h.pubYear),
    doi: h.doi ?? null,
    pmid: h.pmid ?? null,
    pmcid: h.pmcid ?? null,
    openAccess: h.isOpenAccess === "Y" || !!h.pmcid,
    abstract: (h.abstractText ?? "").replace(/<[^>]+>/g, "").slice(0, 3200),
    societies: s.soc,
    type: s.type,
    keywords: s.kw,
    modalities: s.mod,
    retired: /\[RETIRED\]/i.test(h.title),
  });
}
writeFileSync("data/library.json", JSON.stringify(out, null, 1));
console.log(`\n${out.length}/${seeds.length} resolved → data/library.json`);
