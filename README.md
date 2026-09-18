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

Written answers need one LLM key in `.env.local` (see `.env.example`). With neither key, NaraMD still searches and ranks sources:

| Key | Model | When |
|---|---|---|
| `OPENROUTER_API_KEY` | Free OpenRouter models, tried in order (DeepSeek V4 Flash → Gemma 4 31B → Qwen 3.8). Override the list with `OPENROUTER_MODELS` | MVP default, costs nothing |
| `ANTHROPIC_API_KEY` | Claude Opus 5 | Best answers. Takes precedence when set |

## How it works

```
question ─┬─ lib/search.ts ───────── curated library (data/library.json), jargon-aware, scoped by modality, boosted by region
          └─ lib/connectors/europepmc.ts ── live literature (title + abstract)
                     │
          app/api/ask/route.ts ── numbered sources ──► lib/llm.ts (OpenRouter free / Claude) ──► answer [n] + "Bottom line"
```

| Path | Role |
|---|---|
| `app/page.tsx` | `/`: the home page *is* the tool. The search is the hero; the marketing below it (`components/Marketing.tsx`) shows only while idle. `/search` redirects here |
| `components/Home.tsx` | Tool state: typing filters, Enter or an example asks, and chips/region/theme apply instantly and persist. The logo returns to idle |
| `lib/llm.ts` | Answer synthesis: chooses between Anthropic, OpenRouter and none, depending on which key is set |
| `components/` | `ThemeToggle`, `Answer` (citations, copyable bottom line, hand-offs), `GuidelineList`, `SourcesSheet` (sources + library proxy) |
| `app/api/ask/route.ts` | Retrieval and synthesis. Validates input, rate-limits per IP, and never logs the question |
| `lib/search.ts` | Token ranking with a table of field shorthand (CTS, LPD, NCSE, MSLT, SSEP…) |
| `lib/catalog.ts` | Modalities, regions and their societies, connectors, citation links. **Adding a country or a source only means editing this data** |
| `lib/connectors/` | One file per live source. Add new connectors here |
| `data/seeds.json` → `scripts/build-library.mjs` → `data/library.json` | The library pipeline. Seeds are titles plus tags. The script resolves each one against Europe PMC to get a real DOI/PMID, drops errata and letters, and flags retired guidance. Run it with `npm run library` |
| `app/tokens.css`, `docs/DESIGN.md` | Design standard: primitive and semantic colour tokens (Sterile Aqua + blush), measured contrast, type, layout, voice |
| `DEPLOYMENT.md`, `scripts/deploy.sh` | Production on the Hostinger VPS |

### Adding a guideline

Add `{"q": "<exact title>", "soc": ["ACNS"], "mod": ["EEG"]}` to `data/seeds.json`, then run `npm run library` followed by `npm test`. The script prints any seed it can't match with confidence.

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

## Roadmap

- National guidance published outside journals: BSCN, SENFC, JSCN and Chinese society documents, often PDFs or not in English.
- NCS normative values by age and height as structured data. This is where most report questions end up.
- Direct connectors for paid sources (Ovid/EBSCO/Elsevier APIs with institutional tokens), and NaraMD exposed as an MCP server.
- Accounts and institutional SSO (OpenAthens/Shibboleth) once institutional pilots start.

## Privacy

Questions go to Europe PMC and, when a key is set, to the LLM provider. Free OpenRouter models may keep prompts. Nothing is stored or logged server-side, and preferences stay in the browser. Don't enter patient identifiers.
