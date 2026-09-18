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
