// node --test lib/   — fails if jargon expansion, modality scoping or ranking breaks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rank, type Entry } from "./search.ts";

const lib: Entry[] = JSON.parse(readFileSync(new URL("../data/library.json", import.meta.url), "utf8"));

test("every entry is citable", () => {
  for (const e of lib) assert.ok(e.doi || e.pmid, `no DOI/PMID: ${e.title}`);
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
  assert.deepEqual(missingLocal("uk", lib), ["BSCN"]); // flips the day a BSCN document is added
});
