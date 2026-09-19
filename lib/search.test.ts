// node --test lib/   — fails if jargon expansion, modality scoping or ranking breaks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rank, type Entry } from "./search.ts";

const read = (f: string): Entry[] => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
const lib: Entry[] = [...read("library.json"), ...read("national.json")];

test("every entry is citable", () => {
  for (const e of lib) assert.ok(e.doi || e.pmid || e.url, `no DOI, PMID or URL: ${e.title}`);
});

test("jargon resolves to the right guideline", () => {
  assert.match(rank(lib, "CTS NCS")[0].title, /carpal tunnel/i);
  assert.match(rank(lib, "LPD LRDA terminology")[0].title, /Critical Care EEG Terminology/i);
  assert.match(rank(lib, "MSLT")[0].title, /multiple sleep latency/i);
});

test("modality scope hides everything else", () => {
  const r = rank(lib, "", { modalities: ["PSG/Sleep"] });
  assert.ok(r.length > 0 && r.every((e) => e.modalities.includes("PSG/Sleep")));
});

test("retired guidance ranks below current guidance on the same topic", () => {
  const r = rank(lib, "carpal tunnel");
  assert.ok(!r[0].retired);
});

test("no errata or letters slipped into the library", () => {
  for (const e of lib) assert.doesNotMatch(e.title, /\b(erratum|corrigendum)\b|^(response|reply|comment)/i, e.title);
});

test("criteria questions find the criteria papers", () => {
  const top = rank(lib, "Awaji vs Gold Coast").slice(0, 2).map((e) => e.title).join(" | ");
  assert.match(top, /criteria for diagnosis of ALS/);
  assert.match(top, /new diagnostic criteria for ALS/);
  assert.match(rank(lib, "EEG minimum standards", {})[0].title, /minimum/i);
});

test("generic words alone never make a match", () => {
  assert.equal(rank(lib, "fnd criteria").length, 0);
  assert.ok(rank(lib, "criteria").length > 0); // but a purely generic query still browses
});

test("every rotating example finds a document", async () => {
  const { EXAMPLES } = await import("./catalog.ts");
  for (const ex of EXAMPLES) assert.ok(rank(lib, ex).length > 0, `no match for example "${ex}"`);
});

test("every entry has a document type", () => {
  for (const e of lib) assert.ok(["criteria", "terminology", "technical", "practice"].includes(e.type), e.title);
});

test("the document covering more of the question wins", () => {
  assert.match(rank(lib, "CIDP electrodiagnostic criteria")[0].title, /chronic inflammatory demyelinating/i);
});

test("region tiers: own societies local, IFCN international, others other", async () => {
  const { tierOf, missingLocal } = await import("./catalog.ts");
  assert.equal(tierOf(["ACNS"], "us"), "local");
  assert.equal(tierOf(["IFCN"], "us"), "international");
  assert.equal(tierOf(["ACNS"], "uk"), "other");
  assert.deepEqual(missingLocal("uk", lib), []);      // BSCN/ANS documents are in the library
  assert.deepEqual(missingLocal("jp", lib), ["JSCN"]); // flips the day a JSCN document is added
});

test("national documents are found by English queries and rank first in their region", async () => {
  const { boostFor } = await import("./catalog.ts");
  const q = (text: string, region: string) => rank(lib, text, boostFor(region))[0];
  assert.match(q("EEG montages", "de").id, /^de-montages$/);          // German document, English query
  assert.match(q("photic stimulation", "uk").id, /^uk-photic$/);
  assert.match(q("intraoperative monitoring spine surgery", "es").id, /^es-geer$/);
  assert.match(q("brain death", "de").id, /^de-braindeath$/);          // DGKN over WFN for a German clinician
});

test("national documents are verifiable and honest about their year", () => {
  for (const e of lib.filter((x) => x.url)) {
    assert.match(e.url!, /^https?:\/\//);
    assert.ok(e.abstract.length >= 200, `${e.id} has no extracted text`);
    assert.ok(e.year >= 2010 && e.year <= new Date().getFullYear(), `${e.id} year`);
  }
});

test("cleanAnswer keeps cited, supported plain text and rejects the rest", async () => {
  const { cleanAnswer } = await import("./answer.ts");
  const texts = ["Gold Coast criteria (2020) are more sensitive than Awaji. AANEM.", "Awaji 2008 requires fasciculation potentials.", "Unrelated."];
  const ok = cleanAnswer("**Direct answer**\n\nGold Coast is more sensitive [1][2].\n\n**Bottom line:** Use Gold Coast [1].", texts)!;
  assert.doesNotMatch(ok, /\*\*|Direct answer/);
  assert.match(ok, /\[1, 2\]/);
  assert.match(ok, /\n\nBottom line: Use Gold Coast \[1\]\./);
  assert.equal(cleanAnswer("Gold Coast is more sensitive.", texts), null);         // no citations
  assert.equal(cleanAnswer("Gold Coast is more sensitive [9].", texts), null);      // cites a source that doesn't exist
  assert.equal(cleanAnswer("Fine [1]. Also [9].", texts), "Fine [1].");             // fake ref removed, its sentence dropped
  const mixed = cleanAnswer("Sourced claim [1]. Invented claim with no source. Another sourced one [2].\n\nBottom line: No cite here.", texts)!;
  assert.equal(mixed, "Sourced claim [1]. Another sourced one [2].");              // uncited sentences and uncited bottom line dropped
  // Invented specifics under a real citation: numbers and acronyms must appear in the cited source.
  assert.equal(cleanAnswer("Gold Coast has 4 grades [1].", texts), null);           // "4" isn't in source 1
  assert.equal(cleanAnswer("It measures the CMAP amplitude [1].", texts), null);    // "CMAP" isn't in source 1
  assert.match(cleanAnswer("Published in 2020 by AANEM [1].", texts)!, /2020 by AANEM/); // both are in source 1
  assert.match(cleanAnswer("Awaji dates from 2008 [2]. Gold Coast dates from 2020 [1].", texts)!, /2008.*2020/);
  assert.match(cleanAnswer("Awaji dates from 2020 [2]. Gold Coast dates from 2020 [1].", texts)!, /^Gold Coast dates from 2020 \[1\]\.$/); // right year, wrong source: dropped
});


test("language detection and glossary", async () => {
  const { detectLang, translate, cognate } = await import("./lang.ts");
  assert.equal(detectLang("¿Cómo se gradúa el túnel carpiano?"), "es");
  assert.equal(detectLang("Wie sollen EEG-Ableitungen bei Kindern durchgeführt werden?"), "de");
  assert.equal(detectLang("Awaji vs Gold Coast"), "en");
  assert.equal(detectLang("How should I grade carpal tunnel severity?"), "en");
  assert.deepEqual(translate("How do I grade carpal tunnel?"), []);              // English input is never "translated"
  assert.ok(translate("túnel carpiano").flat().includes("carpal tunnel"));        // accents optional
  assert.ok(translate("tunel carpiano").flat().includes("carpal tunnel"));
  const vocab = ["magnetoencephalography", "demyelinating", "standardized", "electroencephalography"];
  assert.equal(cognate("magnetoencefalografía", vocab), "magnetoencephalography"); // Latin/Greek cognates need no glossary entry
  assert.equal(cognate("desmielinizante", vocab), "demyelinating");
  assert.equal(cognate("estandarizado", vocab), "standardized");
  assert.equal(cognate("piernas", vocab), null);                                  // short or unrelated words are left alone
});

test("Spanish and English questions reach the same document", () => {
  const first = (q: string) => rank(lib, q)[0]?.title ?? "";
  const pairs: [string, string, RegExp][] = [
    ["How should I grade carpal tunnel severity?", "¿Cómo se gradúa la gravedad del túnel carpiano?", /Grading the Severity of Carpal Tunnel/],
    ["hypopnea scoring 3% or 4%", "¿Cómo puntúo las hipopneas al 3% o 4%?", /respiratory events/],
    ["multiple sleep latency test criteria", "criterios del test de latencia múltiple del sueño", /multiple sleep latency/],
    ["status epilepticus definition ILAE", "definición de estatus epiléptico según la ILAE", /status epilepticus/],
    ["magnetoencephalography guidelines", "recomendaciones para la magnetoencefalografía", /magnetoencephalography/],
  ];
  for (const [en, es, re] of pairs) { assert.match(first(en), re, en); assert.match(first(es), re, es); }
});

test("questions the library can't answer return nothing instead of neighbours", () => {
  assert.equal(rank(lib, "What is the recommended insulin regimen for type 2 diabetes?").length, 0);
  assert.equal(rank(lib, "¿Qué papel tiene el EEG en el diagnóstico de la enfermedad de Alzheimer?").length, 0);
});

test("literature queries carry English concepts only, never the question's filler", async () => {
  const { literatureAttempts } = await import("./search.ts");
  const flat = (q: string) => literatureAttempts(q)[0].flat().join(" ");
  assert.doesNotMatch(flat("How should I structure an EEG report?"), /structure|should/);
  assert.match(flat("¿Cuál es la clasificación de las epilepsias de la ILAE?"), /epilepsy/);
  assert.doesNotMatch(flat("¿Cuál es la clasificación de las epilepsias de la ILAE?"), /clasificaci|epilepsias/); // no Spanish leaks to Europe PMC
});
