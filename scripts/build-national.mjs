// National society documents that aren't in Europe PMC (mostly PDFs on society sites).
// For each seed in data/national-seeds.json this script:
//   1. downloads the PDF and fails loudly if it's gone, so the library can't silently rot;
//   2. reads the first page with `pdftotext` (poppler) and stores an excerpt, which is what search
//      and the answer model see for German and Spanish documents;
//   3. writes data/national.json.
// Run: npm run library:national   (needs poppler: brew install poppler)
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const seeds = JSON.parse(readFileSync("data/national-seeds.json", "utf8"));
const dir = mkdtempSync(join(tmpdir(), "nara-"));
// Some society sites (SENFC) refuse requests that don't look like a browser navigating from their own page.
const UA = "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/126 Safari/537.36";

const out = [], failed = [];
for (const s of seeds) {
  const file = join(dir, `${s.key}.pdf`);
  try {
    const res = await fetch(s.url, { headers: { "user-agent": UA, referer: new URL(s.url).origin + "/", accept: "application/pdf,*/*" }, signal: AbortSignal.timeout(45_000) });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("pdf")) throw new Error(`HTTP ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    const text = execFileSync("pdftotext", ["-l", "2", file, "-"], { encoding: "utf8" });
    const excerpt = text.replace(/\s+/g, " ").trim().slice(0, 2600);
    if (excerpt.length < 200) throw new Error("no extractable text");
    out.push({
      id: s.key, title: s.title, titleEn: s.titleEn, authors: s.source, journal: s.source, year: s.year, approxYear: s.approxYear,
      doi: null, pmid: null, pmcid: null, url: s.url, openAccess: true, lang: s.lang,
      abstract: excerpt, societies: s.soc, modalities: s.mod, type: s.type, retired: false,
    });
  } catch (e) {
    failed.push(`${s.key}: ${e.message}`);
  }
}
writeFileSync("data/national.json", JSON.stringify(out, null, 1));
console.log(`${out.length}/${seeds.length} verified → data/national.json`);
if (failed.length) { console.error("FAILED:\n  " + failed.join("\n  ")); process.exit(1); }
