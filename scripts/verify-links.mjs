// Verifies that every external link Neuronara shows is what it claims to be. Run: npm run verify:links
// Checks, live:
//   1. society + database sites: reachable AND the page names the right organisation (SITE_IDENTITY / connector identity)
//   2. national society PDFs: reachable and really a PDF
//   3. every DOI in the library is registered (doi.org handle API)
// Exit 1 on a wrong page or a dead link. Network trouble (timeouts) only warns, so a flaky connection can't block a deploy,
// but a site answering with someone else's page always does.
import { readFileSync } from "node:fs";
import { SITE_IDENTITY, SOCIETY_SITES, CONNECTORS, VERIFIED_BY_HAND } from "../lib/catalog.ts";

const UA = "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/126 Safari/537.36";
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const fails = [], warns = [], ok = [];
const daysOld = (d) => (Date.now() - new Date(d)) / 864e5;

const sites = [
  ...Object.entries(SOCIETY_SITES).map(([k, url]) => ({ k, url, identity: SITE_IDENTITY[k] })),
  ...CONNECTORS.filter((c) => c.url).map((c) => ({ k: c.id, url: c.url.replace(/\?.*$/, ""), identity: c.identity })),
];

async function get(url, accept) {
  return fetch(url, { redirect: "follow", headers: { "user-agent": UA, accept: accept ?? "text/html,*/*", referer: new URL(url).origin + "/" }, signal: AbortSignal.timeout(25_000) });
}

await Promise.all(sites.map(async ({ k, url, identity }) => {
  if (!identity) return fails.push(`${k}: no identity check defined for ${url}`);
  try {
    const res = await get(url);
    if ([403, 429, 503].includes(res.status)) {
      const when = VERIFIED_BY_HAND[k];
      if (!when) return fails.push(`${k}: ${url} blocks scripts (${res.status}) and has no manual verification recorded`);
      return (daysOld(when) > 180 ? warns : ok).push(`${k}: blocks scripts; verified by hand ${when}${daysOld(when) > 180 ? " (STALE, open it again)" : ""}`);
    }
    if (res.status >= 400) return fails.push(`${k}: ${url} answers ${res.status}`);
    const page = norm((await res.text()).slice(0, 300_000));
    const title = (page.match(/<title[^>]*>([^<]*)/)?.[1] ?? "").replace(/\s+/g, " ").trim().slice(0, 70);
    identity.test(page) ? ok.push(`${k}: ${new URL(res.url).host} "${title}"`) : fails.push(`${k}: ${url} is the WRONG SITE. It says "${title}" and never mentions ${identity}`);
  } catch (e) { warns.push(`${k}: could not reach ${url} (${e.cause?.code ?? e.message})`); }
}));

for (const e of JSON.parse(readFileSync("data/national.json", "utf8"))) {
  try {
    const res = await get(e.url, "application/pdf,*/*");
    (res.ok && (res.headers.get("content-type") ?? "").includes("pdf") ? ok : fails).push(`${e.id}: ${res.ok ? "pdf" : `${res.status}`} ${e.url.slice(0, 60)}`);
  } catch (err) { warns.push(`${e.id}: could not reach PDF (${err.cause?.code ?? err.message})`); }
}

const dois = [...new Set(JSON.parse(readFileSync("data/library.json", "utf8")).map((e) => e.doi).filter(Boolean))];
let doiOk = 0;
for (let i = 0; i < dois.length; i += 8) await Promise.all(dois.slice(i, i + 8).map(async (doi) => {
  try {
    const r = await (await fetch(`https://doi.org/api/handles/${encodeURIComponent(doi).replace(/%2F/g, "/")}`, { signal: AbortSignal.timeout(15_000) })).json();
    r.responseCode === 1 ? doiOk++ : fails.push(`DOI ${doi} is not registered`);
  } catch { warns.push(`DOI ${doi}: could not check`); }
}));

console.log(`sites/databases/pdfs OK: ${ok.length}   DOIs registered: ${doiOk}/${dois.length}`);
for (const w of warns) console.log("  warn  ", w);
for (const f of fails) console.log("  FAIL  ", f);
if (process.env.VERBOSE) for (const o of ok.sort()) console.log("  ok    ", o);
process.exit(fails.length ? 1 : 0);
