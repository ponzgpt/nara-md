# NaraMD design standard

NaraMD helps clinical neurophysiologists work out which standard, criterion or protocol applies. The interface should feel clinical, calm and trustworthy. The question is the product, so everything else stays out of the way.

## 1. Colour

**Source of truth:** `app/tokens.css`. Components use **semantic tokens only**. A hex value anywhere else is a bug.

**Palette:** *Sterile Aqua* from [media.io medical palettes](https://www.media.io/color-palette/medical-color-palette.html), with blush from *Neonatal Hush* as the soft secondary. Chosen over Calm Pulse (aqua only), Pediatric Cheer (pink + sky) and Clinic Calm (blue).

### 1.1 Primitives (raw palette — never used by components)

| Token | Hex | Origin |
|---|---|---|
| `--p-white` | `#FFFFFF` | — |
| `--p-aqua-50` | `#F5FBFD` | derived, half-step lighter |
| `--p-aqua-100` | `#EAF7FB` | Sterile Aqua |
| `--p-aqua-200` | `#BFEAF2` | Sterile Aqua |
| `--p-aqua-400` | `#63C9D6` | Sterile Aqua |
| `--p-aqua-700` | `#1A6F7A` | Sterile Aqua `#1E7F8C` darkened to pass AA |
| `--p-aqua-800` | `#155A63` | derived hover |
| `--p-slate-900` | `#20343A` | Sterile Aqua ink |
| `--p-slate-500` | `#56707A` | derived muted ink |
| `--p-slate-200` | `#DCEBEF` | derived divider |
| `--p-blush-100` | `#FBE7F1` | Neonatal Hush |
| `--p-rose-700` | `#9C3D66` | derived text on blush |
| `--p-amber-100` / `-800` | `#FDF3E1` / `#7D4C00` | warning pair |
| dark: `--p-night-950/900/800/700`, `--p-mist-300`, `--p-blush-900`, `--p-rose-300` | `#0F1E22` `#18292E` `#173B42` `#24444B` `#9DB6BD` `#3A2330` `#F2B8D0` | derived for dark theme |

### 1.2 Semantic tokens (what components use)

| Token | Role | Light | Dark |
|---|---|---|---|
| `--bg` | Page | white | night-950 |
| `--surface` | Cards, lists, sheets | white | night-900 |
| `--tint` | Selected/hover fills, callouts, steps | aqua-100 | night-800 |
| `--tint-soft` | Row hover, inputs | aqua-50 | night-900 |
| `--border` | Control outlines (search, chips, selects) | aqua-200 | night-700 |
| `--divider` | Hairlines between rows | slate-200 | night-700 |
| `--text` | Body and headings | slate-900 | aqua-100 |
| `--text-muted` | Secondary text | slate-500 | mist-300 |
| `--primary` | Actions, links, focus ring, selected chips | aqua-700 | aqua-400 |
| `--primary-hover` | Hover on primary | aqua-800 | aqua-200 |
| `--on-primary` | Text on primary | white | night-950 |
| `--accent` | **Decoration only**: gradients, rules, large icons | aqua-400 | aqua-400 |
| `--blush` / `--on-blush` | Secondary: society names, kicker, guideline tags, "MD" in the wordmark | blush-100 / rose-700 | blush-900 / rose-300 |
| `--warn-bg` / `--warn` | Retired guidance | amber | amber |
| `--wash-a` / `--wash-b` | Hero background wash | aqua-200 / blush-100 | night-800 / blush-900 |

### 1.3 Contrast (WCAG 2.2, measured)

| Pair | Light | Dark |
|---|---|---|
| text / bg | 13.0 | 15.6 |
| text / tint | 11.9 | — |
| text-muted / bg | 5.3 | 7.1 (on surface) |
| primary / bg | 5.8 | 8.8 |
| primary / tint | 5.3 | 6.2 |
| on-primary / primary | 5.8 | 8.8 |
| on-blush / blush | 5.4 | 8.6 |
| warn / warn-bg | 6.6 | 9.9 |

**Rules**
- Body text needs at least 4.5:1. `--accent` (1.9:1 on white) must never carry text.
- Colour is never the only signal. Every tag also has a word.
- Aqua means *act* (primary). Blush means *who said it* (societies, provenance). Amber means *careful* (retired guidance). Don't mix these roles.

## 2. Type

- **Figtree**, self-hosted through `next/font`, with a system-font fallback. It's humanist and legible at small sizes.
- **Scale:** hero 2.3–3.9rem / 800. Section headings 1.7–2.4rem / 700. Body 16.5px / 1.55. Meta text 0.8rem.
- **Wordmark:** "Nara" in `--text` plus "MD" in `--on-blush`, set as one word, **NaraMD**. The product is never called "Nara" on its own or "Nara MD".

## 3. Shape and depth

`--radius` 18px for cards and lists, `--radius-lg` 22px for sheets and the preview, `--radius-pill` for buttons, chips and search. Shadows are soft and tinted with the primary colour. In dark mode a 1px outline replaces the shadow.

## 4. Layout and behaviour

1. **Home is the tool.** `/` shows the search box as the hero, like OpenEvidence. The marketing sections sit below and show only while idle. Typing, asking or picking a modality switches to results. Clicking the logo returns to idle.
2. **Headline:** "Every standard in clinical neurophysiology. / One question away." There is one sentence per line, broken by meaning and not by container width, and `text-wrap: balance` handles lines that still have to wrap. The second line, the promise, is set in `--primary`. There is no audience kicker: visitors are neurophysiologists and neurologists, and the headline already names the field.
3. **Metrics under the headline** are real counts: documents per type from `data/library.json`, the number of societies, and the Europe PMC record count (fetched live, cached for a day). Don't round up and don't pad the numbers.
4. **Examples rotate** three at a time every 6 s. They pause on hover or focus and stay still under `prefers-reduced-motion`. Clicking one asks it straight away. `lib/search.test.ts` fails if any example stops finding a document.
5. **Results follow an ontology** of the question the clinician is trying to settle:
   - **Answer**, when an LLM is configured: at most 5 sentences, then a **Bottom line**.
   - **Standards** (left): curated society documents grouped by what they settle: *Criteria & grading*, *Terminology, classification & scoring*, *Technical standards*, *Practice guidelines & consensus*.
   - **Literature** (right): Europe PMC.
   - **Elsewhere**: hand-offs to PubMed, OpenEvidence and Consensus, at the foot of the literature column.

   The two columns sit side by side at 960px and wider, and stack below that. Numbered badges match the `[n]` citations in the answer.
6. **Header controls are one family:** Sources (pill), region (pill that opens a menu) and theme (round). All three are 36px high with the same border, a tint on hover and a press scale. On narrow screens, Sources collapses to its icon.
7. Modality chips, region and theme apply immediately and persist in the browser. There is no settings page. The library proxy lives in **Sources**.
8. The page is light by default whatever the OS says. Dark is opt-in and applied before first paint.
9. Motion is limited to hover states, the menu pop, the example fade and the loading shimmer, and all of them respect `prefers-reduced-motion`. Focus is always visible, <kbd>/</kbd> focuses search, the region menu works with the arrow keys and Escape, and results are announced through a live region.

## 5. Voice

UK English and plain words. Sound like a colleague, not a brochure: short sentences, concrete examples (Awaji vs Gold Coast, ACNS 2012 vs 2021), and honesty about limits ("If the sources don't settle it, NaraMD says so"). The core promise is **clarity between standards, criteria and protocols**. Reports, papers and teaching are downstream uses, not the headline.
