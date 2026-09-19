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

test("cleanAnswer keeps cited plain text and rejects uncited or fake-cited answers", async () => {
  const { cleanAnswer } = await import("./answer.ts");
  const ok = cleanAnswer("**Direct answer**\n\nGold Coast is more sensitive [1][2].\n\n**Bottom line:** Use Gold Coast [1].", 3)!;
  assert.doesNotMatch(ok, /\*\*|Direct answer/);
  assert.match(ok, /\[1, 2\]/);
  assert.match(ok, /\n\nBottom line: Use Gold Coast \[1\]\./);
  assert.equal(cleanAnswer("Gold Coast is more sensitive.", 3), null);        // no citations
  assert.equal(cleanAnswer("Gold Coast is more sensitive [9].", 3), null);     // cites a source that doesn't exist
  assert.equal(cleanAnswer("Fine [1]. Also [9].", 3), "Fine [1].");           // fake ref removed, its sentence dropped
  const mixed = cleanAnswer("Sourced claim [1]. Invented claim with no source. Another sourced one [2].\n\nBottom line: No cite here.", 3)!;
  assert.equal(mixed, "Sourced claim [1]. Another sourced one [2].");         // uncited sentences and uncited bottom line dropped
});
