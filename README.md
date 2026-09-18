# Nara MD

**The guideline, before the report is signed.** A search and answer tool for clinical neurophysiologists: EEG, EMG/NCS, evoked potentials, sleep, IONM.

A clinician has just run a study and needs to settle one question before signing the report. Nara searches a curated library of society guidance (IFCN, ACNS, AANEM, ILAE, AASM, EAN/PNS, ISIN…) and the open literature (Europe PMC, which covers MEDLINE/PubMed), and answers with citations and one line they can paste into the report.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # ranking + citability checks
npm run library      # re-resolve data/seeds.json against Europe PMC → data/library.json
```

`ANTHROPIC_API_KEY` is optional. Without it Nara still searches and ranks sources. With it, answers are written by Claude Opus 5 from the retrieved sources only, with citations.

## What's in the MVP

| Piece | Where |
|---|---|
| Guideline library: 43 entries, each resolved to a real DOI/PMID by script. Errata and letters are filtered out, retired guidance is flagged | `data/seeds.json` → `scripts/build-library.mjs` → `data/library.json` |
| Search tuned to the field's shorthand (CTS, LPD, NCSE, MSLT, SSEP…), with results scoped by modality and boosted by region | `lib/search.ts` |
| Answers: curated guidelines plus live Europe PMC results, then a cited answer with report-ready wording | `app/api/ask/route.ts` |
| Per-clinician setup: region, the modalities they read, and their library proxy prefix. Stored in the browser only | `app/page.tsx`, `lib/catalog.ts` |
| Sources, split into **live** (queried by Nara), **via your library** (paywalled DOIs routed through the user's EZproxy/OpenAthens) and **hand-off** (OpenEvidence, Consensus, PubMed, AASM manual) | `lib/catalog.ts` |

## Market sizing (Sept 2026)

Nobody publishes a global headcount for clinical neurophysiologists. The rows below are anchored to published figures where they exist:

| Segment | Anchor | Estimate |
|---|---|---|
| US physicians who interpret EEG/EMG | ABPN active certificates: Clinical Neurophysiology 2,498 · Epilepsy 2,396 · Neuromuscular 978 · Sleep 1,247 (as of 31 Dec 2025, with overlap). AANEM has 7,500+ members (neurology + PM&R doing EDX) | ~12–15k |
| Japan | JSCN has ~3,000 members (physicians and technologists) | ~2–3k physicians |
| Europe | Clinical neurophysiology is its own specialty in Spain, the UK, the Nordics and others. Elsewhere neurologists do the work | ~10–15k |
| China + rest of world | Large EEG/EMG volume, little data. China is its own market (language, access to sources) | ~15–30k |
| **Physicians, global** | | **~40–60k** |
| Technologists / neurodiagnostic scientists (a later expansion) | ASET, ABRET, NHS healthcare scientists | ~2× physicians |

At $150–300 per physician per year, the physician market is roughly **$6–18M ARR**. It's a niche, and that drives three decisions:

1. **Go global from the start.** No single country is big enough.
2. **Sell to departments and hospitals as well as individuals.** Institutions already pay for Embase/Cochrane, and the proxy bridge lets Nara ride on those licences.
3. **Win on depth.** Consensus and OpenEvidence are broad. Nara wins on terminology, regional guidance and the report workflow, and hands broad questions off to them.

Device market for context: global EEG/EMG equipment is estimated at $0.85–1.7B (2025), which gives device makers (Natus, Nihon Kohden, Cadwell, Compumedics) a reason to partner or embed.

## Positioning vs. Consensus / OpenEvidence

- **Consensus** is a general research-paper engine. **OpenEvidence** is a general clinical answer engine, free for US HCPs and funded by ads. Both are strong for broad questions, and Nara links to both.
- **Nara** covers one specialty. It ranks society guidelines first, understands the field's shorthand, shows which society's guidance applies in the user's country, opens scoped to the modalities they actually read (carpal tunnel only, EEG only, or everything), and ends each answer with wording for the report.

## Global vs local

A single global core covers IFCN, ILAE, WFN, ISIN and ISCEV. A region layer boosts local bodies: US (ACNS, AANEM, AASM, ASNM), UK (BSCN), Spain (SENFC), Germany (DGKN), Japan (JSCN), EU (EAN/PNS). The region layer lives in `lib/catalog.ts`, so adding a country means editing data, not code.

## Next

- Add national guidance that isn't in journals (BSCN, SENFC, JSCN and Chinese society documents are mostly PDFs on society sites or in local languages).
- Add normative values (NCS reference tables by age and height) as structured data. This is where most report questions end up.
- Connect paid sources directly (Ovid/EBSCO/Elsevier APIs with institutional tokens) and expose Nara as an MCP server so clinicians can use it from their own assistant.
- Accounts and SSO (OpenAthens/Shibboleth) once there are institutional pilots.

**Privacy:** questions go to Europe PMC and, when a key is set, to Anthropic. Don't enter patient identifiers. Nothing is logged server-side.
