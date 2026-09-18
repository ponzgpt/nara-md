// Lexical ranking over the curated library. Shared by the page (instant filtering) and /api/ask (retrieval).
// ponytail: plain token scoring + a jargon synonym table. Fine for a few hundred guidelines;
// swap for embeddings (or Europe PMC's own ranking) once the library is in the thousands.

export type Entry = {
  id: string; title: string; authors: string; journal: string; year: number;
  doi: string | null; pmid: string | null; pmcid: string | null; openAccess: boolean;
  abstract: string; societies: string[]; modalities: string[]; retired?: boolean;
  type: "criteria" | "terminology" | "technical" | "practice";
};

// Field shorthand → the phrases guideline titles actually use. Each phrase is matched as a unit,
// so "fnd" needs "functional neurological disorder", not any title containing "disorder".
const SYNONYMS: Record<string, string[]> = {
  eeg: ["eeg", "electroencephalograph"], cts: ["carpal tunnel"], ncs: ["nerve conduction", "electrodiagnostic"],
  emg: ["electromyograph", "electrodiagnostic"], edx: ["electrodiagnostic"], une: ["ulnar neuropathy"], sfemg: ["single fiber"],
  als: ["als", "amyotrophic lateral sclerosis"], mnd: ["motor neuron", "als"], awaji: ["electrodiagnostic criteria"],
  gold: ["new diagnostic criteria for als"], coast: [],
  cidp: ["chronic inflammatory demyelinating"], gbs: ["guillain"], mmn: ["multifocal motor neuropathy"], dsp: ["distal symmetric polyneuropathy"],
  ceeg: ["continuous eeg"], icu: ["critical care", "critically ill"], ncse: ["nonconvulsive status epilepticus"], se: ["status epilepticus"],
  lpd: ["periodic discharges", "critical care eeg terminology"], gpd: ["periodic discharges", "critical care eeg terminology"],
  lrda: ["rhythmic delta", "critical care eeg terminology"], iiic: ["ictal interictal", "critical care eeg terminology"],
  ied: ["interictal epileptiform"], score: ["organized reporting"],
  fnd: ["functional neurological disorder"], pnes: ["nonepileptic", "functional seizures"],
  psg: ["polysomnograph", "sleep"], osa: ["obstructive sleep apnea"], mslt: ["multiple sleep latency"], mwt: ["maintenance of wakefulness"],
  rls: ["restless legs"], plm: ["periodic limb movement"],
  ep: ["evoked potential"], sep: ["somatosensory evoked"], ssep: ["somatosensory evoked"], vep: ["visual evoked"],
  baep: ["auditory brainstem"], mep: ["motor evoked"], ionm: ["intraoperative"],
  tms: ["transcranial magnetic"], rtms: ["repetitive transcranial magnetic"], meg: ["magnetoencephalograph"],
  dnc: ["brain death", "neurologic criteria"], nmus: ["neuromuscular ultrasound"],
  hypopnea: ["respiratory events"], hypopnoea: ["respiratory events"], salzburg: ["nonconvulsive status epilepticus"],
};

const STOP = new Set("the of and for in on a an to with by what is are how which when does do vs versus or".split(" "));

// Words that appear in almost every guideline title. They refine a match but can't make one on their own:
// "fnd criteria" must not return brain-death criteria just because both say "criteria".
const GENERIC = new Set(("criteria criterion standard standards guideline guidelines recommendations recommended diagnosis " +
  "diagnostic protocol classification definition minimum technical requirements update consensus statement practice clinical").split(" "));

/** Query → match units: single words, or phrases from the shorthand table. Shorthand is usually
 *  the subject of the question ("CIDP criteria"), so its expansions weigh double. */
function units(q: string): { text: string; weight: number }[] {
  const raw = q.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));
  const seen = new Map<string, number>();
  for (const w of raw) for (const u of SYNONYMS[w] ?? [w]) seen.set(u, Math.max(seen.get(u) ?? 0, SYNONYMS[w] ? 2 : 1));
  return [...seen].map(([text, weight]) => ({ text, weight }));
}

export const tokens = (q: string): string[] => units(q).map((u) => u.text);

const isGeneric = (unit: string) => unit.split(" ").every((w) => GENERIC.has(w));

// Word-prefix match ("standard" finds "standards", "als" doesn't find "potentials"); phrases match in order.
const matcher = (unit: string) => new RegExp("\\b" + unit.split(" ").map((w) => w + "\\w*").join("\\W+(?:\\w+\\W+)?"), "i");

export function rank(
  entries: Entry[], q: string,
  opts: { modalities?: string[]; boostSocieties?: string[] } = {},
): Entry[] {
  const mods = opts.modalities ?? [];
  const pool = mods.length ? entries.filter((e) => e.modalities.some((m) => mods.includes(m))) : entries;
  const us = units(q).map((u) => ({ re: matcher(u.text), generic: isGeneric(u.text), weight: u.weight }));
  const boost = new Set(opts.boostSocieties ?? []);
  if (!us.length) return [...pool].sort((a, b) => b.year - a.year);
  const needsSpecific = us.some((u) => !u.generic);
  return pool
    .map((e) => {
      const tags = [...e.modalities, ...e.societies].join(" ");
      let s = 0, covered = 0;
      for (const u of us) {
        const hit = (u.re.test(e.title) ? 3 : 0) + (u.re.test(tags) ? 2 : 0) + (u.re.test(e.abstract) ? 1 : 0);
        if (hit && !u.generic) covered += u.weight;
        s += hit * (u.generic ? 0.25 : u.weight);
      }
      if (needsSpecific && !covered) return { e, s: 0 };
      s += 10 * covered; // covering more of the question's concepts beats repeating one of them
      if (s && e.societies.some((x) => boost.has(x))) s += 1.5;
      if (e.retired) s *= 0.5;
      return { e, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.e.year - a.e.year)
    .map((x) => x.e);
}
