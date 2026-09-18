// Lexical ranking over the curated library. Shared by the page (instant filtering) and /api/ask (retrieval).
// ponytail: plain token scoring + a jargon synonym table. Fine for a few hundred guidelines;
// swap for embeddings (or Europe PMC's own ranking) once the library is in the thousands.

export type Entry = {
  id: string; title: string; authors: string; journal: string; year: number;
  doi: string | null; pmid: string | null; pmcid: string | null; openAccess: boolean;
  abstract: string; societies: string[]; modalities: string[]; retired?: boolean;
};

// Field shorthand → the words guideline titles actually use.
const SYNONYMS: Record<string, string> = {
  cts: "carpal tunnel", ncs: "nerve conduction electrodiagnostic", emg: "electromyography electrodiagnostic",
  edx: "electrodiagnostic", une: "ulnar neuropathy elbow", sfemg: "single fiber",
  als: "amyotrophic lateral sclerosis als", mnd: "motor neuron amyotrophic als",
  cidp: "chronic inflammatory demyelinating polyradiculoneuropathy", gbs: "guillain barre",
  mmn: "multifocal motor neuropathy", dsp: "distal symmetric polyneuropathy",
  ceeg: "continuous eeg critically ill", icu: "critical care critically ill",
  ncse: "nonconvulsive status epilepticus", se: "status epilepticus",
  lpd: "periodic discharges critical care terminology", gpd: "periodic discharges critical care terminology",
  lrda: "rhythmic delta critical care terminology", iiic: "ictal interictal continuum critical care",
  ied: "interictal epileptiform discharges", score: "standardized organized reporting",
  psg: "sleep polysomnography", osa: "obstructive sleep apnea", mslt: "multiple sleep latency",
  mwt: "maintenance wakefulness", rls: "restless legs", plm: "periodic limb movement",
  ep: "evoked potentials", sep: "somatosensory evoked", ssep: "somatosensory evoked",
  vep: "visual evoked", baep: "auditory brainstem evoked", mep: "motor evoked",
  ionm: "intraoperative monitoring", tms: "transcranial magnetic stimulation", rtms: "repetitive transcranial magnetic",
  meg: "magnetoencephalography", dnc: "brain death neurologic criteria", nmus: "neuromuscular ultrasound",
};

const STOP = new Set("the of and for in on a an to with by what is are how which when does do".split(" "));

export function tokens(q: string): string[] {
  const raw = q.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w));
  return raw.flatMap((w) => (SYNONYMS[w] ? SYNONYMS[w].split(" ") : [w])).filter((w) => w.length > 1);
}

export function rank(
  entries: Entry[], q: string,
  opts: { modalities?: string[]; boostSocieties?: string[] } = {},
): Entry[] {
  const mods = opts.modalities ?? [];
  const pool = mods.length ? entries.filter((e) => e.modalities.some((m) => mods.includes(m))) : entries;
  const t = tokens(q);
  const boost = new Set(opts.boostSocieties ?? []);
  if (!t.length) return [...pool].sort((a, b) => b.year - a.year);
  return pool
    .map((e) => {
      const title = e.title.toLowerCase(), abs = e.abstract.toLowerCase();
      const tags = [...e.modalities, ...e.societies].join(" ").toLowerCase();
      let s = 0;
      for (const w of t) s += (title.includes(w) ? 3 : 0) + (tags.includes(w) ? 2 : 0) + (abs.includes(w) ? 1 : 0);
      if (s && e.societies.some((x) => boost.has(x))) s += 1.5;
      if (e.retired) s *= 0.5;
      return { e, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.e.year - a.e.year)
    .map((x) => x.e);
}
