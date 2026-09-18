# Design system — "Clinic Calm"

Nara is used between two tasks: the study is done and the report isn't signed yet. The interface should feel calm and trustworthy, and it should get out of the way.

## Research behind it

- **Healthcare conventions.** Medical products tend to use white or very pale backgrounds, one clear accent (usually blue or teal) and deep slate text. Aqua and teal read as clinical and modern. Pastel rose softens the palette without adding alarm. ([Octet HealthTech palettes](https://octet.design/colors/user-interfaces/healthtech-ui-design/), [GEC healthcare palettes](https://gecdesigns.com/color-palettes/healthcare))
- **NHS design system.** Every text colour meets WCAG AA at minimum. One primary colour dominates and secondary colours are used with decreasing emphasis. The typeface is humanist, chosen for legibility at small sizes. ([NHS colour](https://service-manual.nhs.uk/design-system/styles/colour), [NHS accessibility](https://service-manual.nhs.uk/accessibility/design))
- **Apple-style restraint.** One screen and one input. Chrome is translucent, most of the page is white space, and settings are changed in place rather than on a separate settings page.

## Tokens (`app/globals.css`)

| Token | Light | Dark | Use | Contrast |
|---|---|---|---|---|
| `--ink` | `#0f2a33` | `#e8f3f2` | Body text | 15.0 / 16.1 |
| `--muted` | `#587079` | `#93acb0` | Secondary text | 5.2 / 6.7 |
| `--teal` | `#0c7574` | `#5fd4c8` | Primary: actions, links, selected chips | 5.5 on white · 4.9 on `--aqua` |
| `--aqua` | `#e3f5f3` | `#0f3431` | Primary tint: hover, open-access tags, report wording | — |
| `--rose` / `--pink` | `#a8335a` / `#fdecf1` | `#f4a9c1` / `#36192a` | Secondary: society names, guideline tags | 5.6 / 8.5 |
| `--amber` / `--amber-bg` | `#7d4c00` / `#fdf3e1` | — | Warnings (retired guidance) | 6.6 |
| `--wash-a` / `--wash-b` | aqua / rose | deep versions | Decorative gradient at the top of the page | not used behind text |

Colour is never the only signal. Every tag also has a text label.

## Type and shape

- **Font:** Figtree, self-hosted through `next/font` (no request to Google at runtime). It's humanist and very legible at small sizes. System fonts are the fallback.
- **Headline:** weight 800 with tight tracking. Body text is 16.5px with 1.55 line height.
- **Shapes:** pill-shaped controls, 18px radius on cards, 22px on sheets, and soft teal-tinted shadows.

## Interaction rules

1. The search box does two jobs: typing filters the library instantly, and Enter asks across all sources.
2. Modality chips and the region selector take effect immediately and are remembered in the browser. There is no settings screen.
3. The only setting that isn't visible on the main screen is the library proxy prefix. It lives in **Sources**, next to what it affects.
4. Motion is limited to hover states and the loading shimmer. Both turn off under `prefers-reduced-motion`.
5. Focus rings are always visible, the page works with the keyboard alone (<kbd>/</kbd> focuses search) and new answers are announced to screen readers through a live region.
