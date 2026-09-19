// Fitness benchmark: real clinician questions in English and Spanish, scored against the documents and facts they should hit.
//   npm run eval                       # against a dev server on :3217
//   BASE=https://neuronara.technoir.cloud npm run eval
//   LANGS=es ONLY=cidp,mslt npm run eval
// NOLLM=1 scores retrieval + literature only (0.67/0.33).
// Score per question = 0.4 retrieval + 0.2 literature + 0.4 answer (0-100). Questions with no gold document
// (the library legitimately has nothing) are scored on honesty instead: no noise, and the answer admits the gap.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3217";
const LANGS = (process.env.LANGS ?? (process.env.SET === "heldout" ? "en,es,de" : "en,es")).split(",");
const ONLY = process.env.ONLY?.split(",");
const NOLLM = process.env.NOLLM === "1"; // retrieval only: run the server with LLM_KEYLESS=off, so this is fast and parallel
const CONC = Number(process.env.CONC ?? (NOLLM ? 6 : 1)); // keyless LLM serves ~1 request at a time
const SET = process.env.SET ?? "questions"; // questions = the set the engine was tuned on; heldout = questions written afterwards
const questions = JSON.parse(readFileSync(new URL(`../evals/${SET}.json`, import.meta.url), "utf8")).filter((q) => !ONLY || ONLY.includes(q.id));

const DE = /\b(der|die|das|und|ist|wie|welche|bei|von|wird|sollen|gilt|für|mit|werden|empfehlungen|schlaf|ableitungen)\b/gi;
const ES = /\b(el|la|los|las|de|del|que|para|con|una|es|se|en|por|criterios|según)\b/gi, EN = /\b(the|of|and|for|with|is|are|in|to|that|criteria|according)\b/gi;
const langOf = (t) => { const e = (t.match(EN) ?? []).length, s = (t.match(ES) ?? []).length, d = (t.match(DE) ?? []).length; return d > e && d > s ? "de" : s > e ? "es" : "en"; };
const ADMITS = /(do(es)? not|no specific|not (?:settle|provide|include|address|specif)|insufficient|not covered|none of the|no (?:explicit|reference|normative)|no se (?:especific|recoge|establece|incluy)|no (?:aparece|hay|figura|proporciona)|no (?:permiten|permite|resuelve))/i;

async function ask(q, lang, i) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/ask`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.9.${i >> 8}.${i & 255}` }, // one bucket per request: don't trip the rate limit
    body: JSON.stringify({ q: q[lang], region: q.region ?? "global", modalities: [] }),
  });
  const out = { sources: [], answer: null, note: null, tSources: null, tAnswer: null };
  const dec = new TextDecoder(); let buf = "";
  for await (const chunk of res.body) {
    buf += dec.decode(chunk, { stream: true });
    for (let nl = buf.indexOf("\n"); nl >= 0; nl = buf.indexOf("\n")) {
      const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
      if (!line.trim()) continue;
      const ev = JSON.parse(line);
      if (ev.type === "sources") { out.sources = ev.sources; out.tSources = (Date.now() - t0) / 1000; }
      if (ev.type === "answer") { out.answer = ev.answer; out.note = ev.note; out.tAnswer = (Date.now() - t0) / 1000; }
    }
  }
  return out;
}

function score(q, lang, r) {
  const guides = r.sources.filter((s) => s.kind === "guideline");
  const lit = r.sources.filter((s) => s.kind === "literature").slice(0, 4);
  const text = (s) => `${s.title} ${s.abstract ?? ""}`;
  const goldIdx = (s) => q.gold.some((g) => new RegExp(g, "i").test(text(s)));
  const pos = guides.findIndex(goldIdx) + 1;
  const found = q.gold.filter((g) => guides.some((s) => new RegExp(g, "i").test(text(s)))).length;
  const R = q.gold.length ? 0.6 * (pos === 1 ? 1 : pos <= 3 && pos ? 0.7 : pos ? 0.4 : 0) + 0.4 * (found / q.gold.length) : 1 - Math.min(1, guides.length / 6);
  const L = lit.length ? lit.filter((s) => new RegExp(q.lit, "i").test(text(s))).length / lit.length : 0;

  const goldN = new Set(guides.filter(goldIdx).map((s) => s.n));
  const cited = new Set([...(r.answer ?? "").matchAll(/\[([\d,\s]+)\]/g)].flatMap((m) => m[1].split(",").map((x) => +x)));
  const parts = {};
  parts.answered = r.answer ? 1 : 0;
  if (r.answer) {
    parts.lang = langOf(r.answer) === lang ? 1 : 0;
    if (q.gold.length) {
      parts.citesGold = [...goldN].some((n) => cited.has(n)) ? 1 : 0;
      parts.facts = q.facts.length ? q.facts.filter((f) => new RegExp(f, "i").test(r.answer)).length / q.facts.length : 1;
    } else parts.admitsGap = ADMITS.test(r.answer) ? 1 : 0;
  }
  const A = Object.values(parts).reduce((a, b) => a + b, 0) / Math.max(1, q.gold.length ? 4 : 3);
  const total = NOLLM ? 0.67 * R + 0.33 * L : 0.4 * R + 0.2 * L + 0.4 * A;
  return { R, L, A: NOLLM ? 0 : A, parts, pos, total: Math.round(100 * total) };
}

const jobs = questions.flatMap((q) => LANGS.filter((lang) => q[lang]).map((lang) => ({ q, lang })));
const results = []; let next = 0;
await Promise.all(Array.from({ length: CONC }, async () => {
  while (next < jobs.length) {
    const i = next++, { q, lang } = jobs[i];
    let r; try { r = await ask(q, lang, i); } catch (e) { r = { sources: [], answer: null, note: String(e) }; }
    results.push({ id: q.id, lang, question: q[lang], ...score(q, lang, r), tSources: r.tSources, tAnswer: r.tAnswer, answer: r.answer, note: r.note, top: r.sources.filter((s) => s.kind === "guideline").slice(0, 3).map((s) => s.title.slice(0, 70)), lit: r.sources.filter((s) => s.kind === "literature").slice(0, 3).map((s) => s.title.slice(0, 70)) });
    process.stderr.write(".");
  }
}));
console.error();

results.sort((a, b) => a.id.localeCompare(b.id) || a.lang.localeCompare(b.lang));
const f = (x) => (x * 100).toFixed(0).padStart(3);
console.log("id".padEnd(16), "lang  R    L    A  pos  tot  first-answer");
for (const r of results) console.log(r.id.padEnd(16), r.lang, " ", f(r.R), f(r.L), f(r.A), String(r.pos || "-").padStart(3), String(r.total).padStart(4), " ", (r.tAnswer ?? "-") + "s", r.answer || NOLLM ? "" : "NO ANSWER");
for (const lang of LANGS.filter((l) => results.some((r) => r.lang === l))) {
  const rs = results.filter((r) => r.lang === lang), avg = (k) => (rs.reduce((a, r) => a + r[k], 0) / rs.length);
  console.log(`\n${lang.toUpperCase()}  total ${avg("total").toFixed(0)}   retrieval ${f(avg("R"))}   literature ${f(avg("L"))}   answer ${f(avg("A"))}   answered ${rs.filter((r) => r.answer).length}/${rs.length}`);
}
mkdirSync("evals/results", { recursive: true });
const file = `evals/results/${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
writeFileSync(file, JSON.stringify(results, null, 1));
console.log("→", file);
