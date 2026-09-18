// Everything region-, modality- and source-specific lives here, so adding a country or a connector is a data edit.

export const MODALITIES = [
  "EEG", "ICU-EEG", "Neonatal", "Epilepsy", "MEG", "EMG/NCS", "Carpal tunnel", "Polyneuropathy", "ALS",
  "Nerve ultrasound", "Evoked potentials", "IONM", "TMS", "PSG/Sleep", "Brain death", "Wearables",
];

// Global bodies apply everywhere; each region adds the societies whose guidance local practice follows.
export const GLOBAL_SOCIETIES = ["IFCN", "ILAE", "WFN", "ISCEV", "ISIN"];
export const REGIONS: Record<string, { label: string; societies: string[] }> = {
  global: { label: "Global", societies: [] },
  us: { label: "United States", societies: ["ACNS", "AANEM", "AAN", "AASM", "ASNM"] },
  uk: { label: "United Kingdom", societies: ["BSCN", "EAN"] },
  es: { label: "Spain", societies: ["SENFC", "EAN"] },
  de: { label: "Germany", societies: ["DGKN", "EAN"] },
  eu: { label: "Europe (other)", societies: ["EAN", "EFNS", "PNS"] },
  jp: { label: "Japan", societies: ["JSCN"] },
  cn: { label: "China", societies: [] },
  latam: { label: "Latin America", societies: ["ACNS", "AANEM"] },
};

export const SOCIETY_SITES: Record<string, string> = {
  IFCN: "https://www.ifcn.info", ACNS: "https://www.acns.org", AANEM: "https://www.aanem.org",
  ILAE: "https://www.ilae.org", AASM: "https://aasm.org", BSCN: "https://www.bscn.org.uk",
  JSCN: "https://square.umin.ac.jp/JSCN/english/", SENFC: "https://senfc.org", DGKN: "https://dgkn.de",
  EAN: "https://www.ean.org", ASNM: "https://www.asnm.org", ISIN: "https://www.isin.org",
  ISCEV: "https://www.iscev.org", WFN: "https://www.wfneurology.org",
};

// How each source reaches the clinician:
//   live  — queried by Nara on every question
//   proxy — paywalled DOIs opened through the user's own library proxy (EZproxy / OpenAthens prefix)
//   link  — hand-off, with the question prefilled when the URL ends in "="
export type Connector = { id: string; name: string; kind: "live" | "proxy" | "link"; access: string; note: string; url?: string; handoff?: boolean };
export const CONNECTORS: Connector[] = [
  { id: "nara", name: "Nara guideline library", kind: "live", access: "Open", note: "Curated society guidance, every entry resolved to a DOI or PMID." },
  { id: "epmc", name: "Europe PMC (includes MEDLINE/PubMed)", kind: "live", access: "Open", note: "Live literature search with open-access flags." },
  { id: "pubmed", name: "PubMed", kind: "link", access: "Open", note: "Open the same query in PubMed.", url: "https://pubmed.ncbi.nlm.nih.gov/?term=", handoff: true },
  { id: "openevidence", name: "OpenEvidence", kind: "link", access: "Free for verified HCPs", note: "No public API; Nara hands off the question.", url: "https://www.openevidence.com/", handoff: true },
  { id: "consensus", name: "Consensus", kind: "link", access: "Freemium", note: "General research engine for broad questions.", url: "https://consensus.app/results/?q=", handoff: true },
  { id: "cochrane", name: "Cochrane Library", kind: "proxy", access: "Institutional / national licence", note: "Opened through your library proxy." },
  { id: "embase", name: "Embase", kind: "proxy", access: "Institutional", note: "Opened through your library proxy." },
  { id: "ebsco", name: "MEDLINE Complete (EBSCO)", kind: "proxy", access: "Institutional", note: "Opened through your library proxy." },
  { id: "aasm-manual", name: "AASM Scoring Manual", kind: "link", access: "Subscription", note: "Scoring rules live behind AASM login.", url: "https://aasm.org/clinical-resources/scoring-manual/" },
];

export const boostFor = (region: string) => [...GLOBAL_SOCIETIES, ...(REGIONS[region]?.societies ?? [])];

// Where a citation opens: DOI (through the user's library proxy unless open access), else PubMed.
export function citationHref(s: { doi: string | null; pmid: string | null; openAccess: boolean }, proxy: string): string {
  if (!s.doi) return `https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/`;
  const doi = `https://doi.org/${s.doi}`;
  return proxy && !s.openAccess ? proxy + encodeURIComponent(doi) : doi;
}
