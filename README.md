# NaraMD

**Every standard in your field, one question away.** NaraMD helps clinical neurophysiologists find their way through the standards, criteria, terminology and protocols of EEG, EMG/NCS, evoked potentials, sleep and IONM.

**Live:** https://naramd.technoir.cloud

Awaji or Gold Coast? ACNS terminology from 2012 or 2021? Whose minimum EEG standard applies? The answers are scattered across societies, journals and decades. NaraMD searches a curated library of society guidance (IFCN, ACNS, AANEM, ILAE, AASM, EAN/PNS, ISIN…) and the open literature (Europe PMC, which includes MEDLINE/PubMed). It says which standard applies, where they differ and where each comes from, and ends with a one-line bottom line. Reports, protocols, audits and teaching are the downstream uses.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # ranking, scoping and library-integrity checks
```

Answers are written by the first available provider, so NaraMD works with no setup and improves as you add keys (`.env.local`, see `.env.example`):

| Provider | Setup | Notes |
|---|---|---|
| Claude Opus 5 | `ANTHROPIC_API_KEY` | Best answers. Takes precedence when set |
| Free OpenRouter models | `OPENROUTER_API_KEY` (free key from [openrouter.ai/keys](https://openrouter.ai/keys)). Models tried in order: DeepSeek V4 Flash → Gemma 4 31B → Qwen 3.8; override with `OPENROUTER_MODELS` | Free, but needs the key |
| Pollinations (keyless) | Nothing. It's the fallback when no key is set. `LLM_KEYLESS=off` disables it | Anonymous third-party service, so treat it as a stopgap, not a dependency |

**Speed:** Claude and OpenRouter answer in a few seconds. The keyless tier is a single anonymous reasoning model and takes 10 to 35 s, whatever the settings (measured). The page shows the sources first and says so while the answer is pending, but for a real launch, set a key.

Whatever the provider, the server checks the answer before showing it (`lib/answer.ts`): plain text only, every claim carries a `[n]` that points to a real source, and any sentence without one is dropped. If nothing survives, NaraMD says it couldn't write a cited answer and shows the sources. Small free models do skip citations and add claims of their own, which is why this is enforced in code rather than trusted to the prompt.

## How it works

```
question ─┬─ lib/search.ts ───────── curated library (data/library.json), jargon-aware, scoped by modality, boosted by region
          └─ lib/connectors/europepmc.ts ── live literature (title + abstract)
                     │
          app/api/ask/route.ts ── streams: sources (~1 s) ──► then lib/llm.ts (OpenRouter free / Claude) ──► answer [n] + "Bottom line"
```

| Path | Role |
|---|---|
| `app/page.tsx` | `/`: the home page *is* the tool. The search is the hero; the marketing below it (`components/Marketing.tsx`) shows only while idle. `/search` redirects here |
| `components/Home.tsx` | Tool state and hero: headline, live metrics, search, rotating examples, modality chips. Keeps what's *typed* (`q`) apart from what was *asked* (`asked`), reads the streamed response, and re-asks when region or scope change. The logo returns to idle |
| `components/Suggestions.tsx`, `AnswerPending.tsx` | The typing dropdown ("↵ Ask…" + matching standards) and the answer placeholder with timer |
| `components/Results.tsx` | Answer, then **Standards** (grouped by document type) and **Literature** side by side, then hand-offs. Numbers match the `[n]` citations |
| `lib/llm.ts`, `lib/answer.ts` | Answer synthesis (Anthropic, OpenRouter or keyless) and the citation check that every answer must pass |
| `components/` | `Answer`, `StandardsList`, `RegionMenu`, `ThemeToggle`, `SourcesSheet` (sources + library proxy) |
| `app/api/ask/route.ts` | Retrieval and synthesis. Validates input, rate-limits per IP, and never logs the question |
| `lib/search.ts` | Ranking. Shorthand (CIDP, LPD, MSLT…) expands to phrases and weighs double. Generic words ("criteria", "standards") refine a match but can't make one. Documents covering more of the question's concepts win |
| `lib/catalog.ts` | Modalities, regions and their societies, document types (the results ontology), rotating examples, connectors, citation links. **Adding a country or a source only means editing this data** |
| `lib/connectors/` | One file per live source. Add new connectors here |
| `lib/library.ts` | The full library: journal papers plus national society documents |
| `data/seeds.json` → `scripts/build-library.mjs` → `data/library.json` | The library pipeline. Seeds are titles plus tags. The script resolves each one against Europe PMC to get a real DOI/PMID, drops errata and letters, and flags retired guidance. Run it with `npm run library` |
| `data/national-seeds.json` → `scripts/build-national.mjs` → `data/national.json` | Society documents that aren't in Europe PMC (BSCN/ANS, DGKN, SENFC). The script downloads every PDF, fails if one has disappeared, and stores an excerpt of its text. Run with `npm run library:national` (needs `poppler`) |
| `app/tokens.css`, `docs/DESIGN.md` | Design standard: primitive and semantic colour tokens (Sterile Aqua + blush), measured contrast, type, layout, voice |
| `DEPLOYMENT.md`, `scripts/deploy.sh` | Production on the Hostinger VPS |

### Adding a guideline

Add `{"q": "<exact title>", "soc": ["ACNS"], "mod": ["EEG"], "type": "criteria|terminology|technical|practice"}` to `data/seeds.json`, then run `npm run library` followed by `npm test`. The script prints any seed it can't match with confidence.

### Why filtering runs in the browser

The curated library ships with the page as about 60 KB of JSON. Search, modality scope and region ordering run client-side, instantly and with no request, using the same `lib/search.ts` the server uses to pick the answer's sources. The server is called only to search the literature and write the answer. Move library filtering behind an API when either (a) the library reaches thousands of documents, or (b) it includes licensed content that can't be shipped to the browser, which will happen with the paid connectors.

## Sources and access

| Kind | Sources | How |
|---|---|---|
| Live | NaraMD library, Europe PMC | Queried on every question |
| Via your library | Cochrane, Embase, MEDLINE Complete | Paywalled DOIs open through the clinician's EZproxy/OpenAthens prefix (set in **Sources**) |
| Hand-off | PubMed, OpenEvidence, Consensus, AASM Scoring Manual | Opened with the question prefilled where the site supports it. OpenEvidence has no public API |

## Market and positioning

Nobody publishes a global headcount. These anchors are published figures:

- **ABPN active certificates (31 Dec 2025):** Clinical Neurophysiology 2,498 · Epilepsy 2,396 · Neuromuscular 978 · Sleep 1,247.
- **AANEM:** more than 7,500 members.
- **JSCN (Japan):** about 3,000 members.

Estimate: about **40–60k physicians** worldwide read neurophysiology, plus roughly twice as many technologists. At $150–300 per physician per year that is **about $6–18M ARR**. Three decisions follow from how small that is:

1. **Global from day one.** No single country is big enough.
2. **Sell to departments and institutions**, not only to individuals. The proxy bridge lets NaraMD ride on the Embase/Cochrane licences they already pay for.
3. **Win on depth, not breadth.** NaraMD focuses on society guidance, criteria, terminology and regional differences. Reports and papers are second-order uses. Broad questions are handed off to Consensus and OpenEvidence rather than competing with them.

**Global vs local:** a global core (IFCN, ILAE, WFN, ISIN, ISCEV) plus a region layer that ranks local bodies higher: US (ACNS, AANEM, AASM, ASNM), UK (BSCN), Spain (SENFC), Germany (DGKN), Japan (JSCN), EU (EAN/PNS).

## National coverage (audited Sept 2026)

Regions only mean something if the library has that region's documents. Each society's own guideline index was checked, and every document below was downloaded and read before being added:

| Region | Society | In library | Notes |
|---|---|---|---|
| UK | BSCN / ANS | 7 | The full ANS-BSCN practice recommendations (v14, dated 31 Jan 2024 inside the PDF although the index says "2026"), the referral guidance (2025), and the EEG technical guidelines (hyperventilation, photic stimulation, melatonin, video-EEG telemetry, NEAD standards). Skipped: a health-service policy note that isn't a clinical standard |
| Germany | DGKN | 13 | The clinical recommendations: EEG (adults, children, montages, reporting, long-term, ambulatory, sleep deprivation, anaesthesia, telemedicine), intraoperative monitoring, brain-death diagnosis, sleep diagnostics, CJD needle handling. **In German**, shown with an English gloss and searchable in English. Skipped: about 20 training curricula and certification rules |
| Spain | SENFC | 3 | SENFC-GEER consensus on intraoperative monitoring in spine surgery, informed-consent recommendations (2019), on-call care (2024). Skipped: COVID-19 notes (out of date) and a statement about a company |
| Japan, China, Latin America | JSCN, others | 0 | No verifiable guideline index found. Nothing was invented. The region notice says so and links out |

Years marked "c." come from the PDF's metadata because the document prints no date. Adding a country is: find its index, add entries to `data/national-seeds.json`, run `npm run library:national`.

## Roadmap

- More national guidance: JSCN (Japan), Chinese societies, and Latin American bodies (none verifiable yet), plus the DGKN evoked-potential and IONM training documents if wanted.
- NCS normative values by age and height as structured data. This is where most report questions end up.
- Direct connectors for paid sources (Ovid/EBSCO/Elsevier APIs with institutional tokens), and NaraMD exposed as an MCP server.
- Accounts and institutional SSO (OpenAthens/Shibboleth) once institutional pilots start.

## Privacy

Questions go to Europe PMC and, when a key is set, to the LLM provider. Free OpenRouter models may keep prompts. Nothing is stored or logged server-side, and preferences stay in the browser. Don't enter patient identifiers.
