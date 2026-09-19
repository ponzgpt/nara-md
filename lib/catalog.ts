// Everything region-, modality- and source-specific lives here, so adding a country or a connector is a data edit.

export const MODALITIES = [
  "EEG", "ICU-EEG", "Neonatal", "Epilepsy", "MEG", "EMG/NCS", "Carpal tunnel", "Polyneuropathy", "ALS",
  "Nerve ultrasound", "Evoked potentials", "IONM", "TMS", "PSG/Sleep", "Brain death", "Wearables",
];

// Global bodies apply everywhere; each region adds the societies whose guidance local practice follows.
export const GLOBAL_SOCIETIES = ["IFCN", "ILAE", "WFN", "ISCEV", "ISIN", "WFSICCM"];
export const REGIONS: Record<string, { label: string; short: string; societies: string[] }> = {
  global: { label: "Global", short: "Global", societies: [] },
  us: { label: "United States", short: "US", societies: ["ACNS", "AANEM", "AAN", "AASM", "ASNM"] },
  uk: { label: "United Kingdom", short: "UK", societies: ["BSCN", "ANS", "EAN"] },
  es: { label: "Spain", short: "ES", societies: ["SENFC", "EAN"] },
  de: { label: "Germany", short: "DE", societies: ["DGKN", "EAN"] },
  eu: { label: "Europe (other)", short: "EU", societies: ["EAN", "EFNS", "PNS"] },
  jp: { label: "Japan", short: "JP", societies: ["JSCN"] },
  cn: { label: "China", short: "CN", societies: [] },
  latam: { label: "Latin America", short: "LatAm", societies: ["ACNS", "AANEM"] },
};

// The ontology results are grouped by: what kind of question a document settles. Order = display order.
export const DOC_TYPES = [
  { id: "criteria", label: "Criteria & grading", short: "criteria sets" },
  { id: "terminology", label: "Terminology, classification & scoring", short: "terminologies & classifications" },
  { id: "technical", label: "Technical standards", short: "technical standards" },
  { id: "practice", label: "Practice guidelines & consensus", short: "practice guidelines" },
] as const;

// Rotating search suggestions. Each one shows a different thing NaraMD settles, and lib/search.test.ts
// checks that every one of them finds a document in the library.
export const EXAMPLES = [
  "Awaji vs Gold Coast", "LPD vs GPD", "CTS severity grading",
  "Seizure classification 2017 vs 2025", "EEG minimum recording standards", "Hypopnea scoring rules",
  "NCSE Salzburg criteria", "MSLT criteria", "CIDP electrodiagnostic criteria",
  "Brain death EEG standards", "MEP monitoring in IONM", "TMS safety screening",
];

export const SOCIETY_SITES: Record<string, string> = {
  IFCN: "https://www.ifcn.info", ACNS: "https://www.acns.org", AANEM: "https://www.aanem.org",
  ILAE: "https://www.ilae.org", AASM: "https://aasm.org", BSCN: "https://www.bscn.org.uk",
  JSCN: "https://square.umin.ac.jp/JSCN/english/", SENFC: "https://senfc.org", DGKN: "https://dgkn.de",
  EAN: "https://www.ean.org", ASNM: "https://www.asnm.org", ISIN: "https://www.isin.org",
  ISCEV: "https://www.iscev.org", ANS: "https://ansuk.org", WFN: "https://www.wfneurology.org",
};

// How each source reaches the clinician:
//   live  — queried by NaraMD on every question
//   proxy — paywalled DOIs opened through the user's own library proxy (EZproxy / OpenAthens prefix)
//   link  — hand-off, with the question prefilled when the URL ends in "="
export type Connector = { id: string; name: string; kind: "live" | "proxy" | "link"; access: string; note: string; url?: string; handoff?: boolean };
export const CONNECTORS: Connector[] = [
  { id: "nara", name: "NaraMD guideline library", kind: "live", access: "Open", note: "Curated society guidance, every entry resolved to a DOI or PMID." },
  { id: "epmc", name: "Europe PMC (includes MEDLINE/PubMed)", kind: "live", access: "Open", note: "Live literature search with open-access flags." },
  { id: "pubmed", name: "PubMed", kind: "link", access: "Open", note: "Open the same query in PubMed.", url: "https://pubmed.ncbi.nlm.nih.gov/?term=", handoff: true },
  { id: "openevidence", name: "OpenEvidence", kind: "link", access: "Free for verified HCPs", note: "No public API; NaraMD hands off the question.", url: "https://www.openevidence.com/", handoff: true },
  { id: "consensus", name: "Consensus", kind: "link", access: "Freemium", note: "General research engine for broad questions.", url: "https://consensus.app/results/?q=", handoff: true },
  { id: "cochrane", name: "Cochrane Library", kind: "proxy", access: "Institutional / national licence", note: "Opened through your library proxy." },
  { id: "embase", name: "Embase", kind: "proxy", access: "Institutional", note: "Opened through your library proxy." },
  { id: "ebsco", name: "MEDLINE Complete (EBSCO)", kind: "proxy", access: "Institutional", note: "Opened through your library proxy." },
  { id: "aasm-manual", name: "AASM Scoring Manual", kind: "link", access: "Subscription", note: "Scoring rules live behind AASM login.", url: "https://aasm.org/clinical-resources/scoring-manual/" },
];

// Retrieval boosts for a region: its own societies weigh most, the international bodies a little.
export const boostFor = (region: string) => ({ boostSocieties: GLOBAL_SOCIETIES, localSocieties: REGIONS[region]?.societies ?? [] });

// How a document relates to the user's region: issued by one of its societies, by an international body, or neither.
export type Tier = "local" | "international" | "other";
export function tierOf(societies: string[], region: string): Tier {
  if (societies.some((s) => REGIONS[region]?.societies.includes(s))) return "local";
  if (societies.some((s) => GLOBAL_SOCIETIES.includes(s))) return "international";
  return "other";
}
export const TIER_ORDER: Record<Tier, number> = { local: 0, international: 1, other: 2 };

// The region's societies that have no document in the library yet, so the UI can say so instead of silently doing nothing.
export const missingLocal = (region: string, library: { societies: string[] }[]) =>
  (REGIONS[region]?.societies ?? []).filter((s) => !library.some((e) => e.societies.includes(s)));

// Where a citation opens: the document's own URL, else its DOI (through the user's library proxy unless open access), else PubMed.
export function citationHref(s: { doi: string | null; pmid: string | null; url?: string; openAccess: boolean }, proxy: string): string {
  if (s.url) return s.url; // society documents are public PDFs; no proxy needed
  if (!s.doi) return `https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/`;
  const doi = `https://doi.org/${s.doi}`;
  return proxy && !s.openAccess ? proxy + encodeURIComponent(doi) : doi;
}
