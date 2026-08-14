# Country Femtech Reports — Design

Date: 2026-08-14
Status: Approved design, pre-implementation
Branch: `feat/country-reports`

## Goal

Add comprehensive, researched, per-country femtech reports to the femtech-map
site, displayed as a scrollytelling reading experience. Model the content depth
on boro.fi/blog/map (women's health innovation country profiles) but beat it on
sourcing (every claim cited) and African focus. Model the display on
raihankalla.id scrollytelling (sticky visual, scrolling narrative, section nav).

## Scope

- **Content**: researched + verified by us (deep-research skill, cited).
- **Countries**: ecosystem-first, ~15-20 African countries with real femtech
  activity (Nigeria, Kenya, South Africa, Ghana, Uganda, Rwanda, Tanzania,
  Senegal, Zambia, Zimbabwe, Malawi, Namibia, Ethiopia, Egypt, Côte d'Ivoire,
  Cameroon, Morocco, Tunisia, + a few). Long-tail countries stay map-only for now.
- **Entry**: a separate "Reports" section. The existing map is unchanged and
  remains the explore view.
- **First deliverable (this build)**: full system + ONE fully-researched country
  (Nigeria) as the vertical slice. Remaining countries are a later batch against
  the proven format.

Out of scope: changing the existing map behavior; researching all 54 countries;
any backend/DB (site stays static); user accounts; CMS.

## Non-negotiable constraints

- Stay **vanilla JS + Vite**, no framework (matches existing stack).
- **No new runtime dependencies** for scrollytelling — use native
  `position: sticky` + `IntersectionObserver`. Reuse `d3-geo` + `world-atlas`
  already installed for the country-locator visual.
- Respect user palette: pink / purple / blue / black. No yellow / orange / coral.
- No all-caps UI labels (title/sentence case).
- Every factual claim in a report traces to a source URL.

## Architecture

Vite multi-page app. New pages added alongside existing `index.html`:

- `reports/index.html` + `reports/index.js` — country index (card grid).
- `report.html` + `src/report.js` — scrollytelling detail, reads
  `?country=<slug>`.
- Shared `src/report/` modules for rendering sections + visuals.

Existing `index.html` / `src/main.js` (the map) are untouched except adding a
link into the Reports section.

### Data model

One JSON file per country plus a lightweight index:

- `src/data/reports/<slug>.json` — full report (schema below).
- `src/data/reports/_index.json` — array of `{ slug, name, flag, tier, score,
  lastUpdated, hook }` for the index grid (avoids loading every full report).

### Report schema (`<slug>.json`)

```jsonc
{
  "meta": {
    "country": "Nigeria",
    "slug": "nigeria",
    "flag": "🇳🇬",
    "lastUpdated": "2026-08",
    "tier": "growing",              // nascent | emerging | growing | scaling | pioneering
    "score": 6,                      // 0-10
    "subScores": {
      "ecosystem": 2.1,              // /3
      "investment": 1.6,             // /3
      "policy": 1.5,                 // /3
      "strategy": 0.8                // /1
    },
    "scoreBasis": "femtech ventures per capita, dedicated investors, national strategy, clinical guidelines & real-world adoption"
  },
  "overview": "prose paragraph(s)",
  "sections": [
    {
      "id": "news",                  // used for #deep-link + nav
      "heading": "Latest major news",
      "narrative": "prose shown in the scrolling column",
      "visual": {
        "kind": "timeline",          // gauge | timeline | funding | players | investors | list
        "items": [
          { "date": "2026-01", "text": "...", "source": "https://..." }
        ]
      }
    }
    // ... policy, ecosystem, funding, players, investors, whitepapers
  ],
  "sources": [
    { "label": "KEMRI", "url": "https://..." }
  ]
}
```

Section `kind` → visual renderer mapping:

- `gauge` — SVG score gauge + sub-score bars (the rating section).
- `timeline` — dated vertical timeline (news, policy).
- `funding` — horizontal bar chart of round sizes + a details table
  (company, amount, stage, date, investor, purpose).
- `players` — responsive card/logo grid of key players & hubs.
- `investors` — list with HQ + role per investor.
- `list` — generic bulleted list (ecosystem moves, white papers).

All visuals are hand-rolled SVG/HTML except the optional country locator, which
reuses `d3-geo` + `world-atlas`.

### Scrollytelling mechanics

- Two-column layout: narrative (left, scrolls) + visual (right, `sticky`).
- Each `section` renders a narrative step and a matching visual state.
- One `IntersectionObserver` watches narrative steps; when a step enters the
  active zone it sets the pinned visual to that section's state and lights the
  matching progress dot / nav item.
- Progress dots + a section nav give deep-links (`report.html?country=nigeria#funding`).
- Native scrolling only — no scroll hijacking, no smooth-scroll library.
- Mobile: columns stack; visual sits inline above its narrative (no sticky pin
  on narrow screens).

### Reports index page

Card grid: flag, country name, tier badge (palette-colored), score, one-line
hook. Click → `report.html?country=<slug>`. Covered countries come from
`_index.json`.

## Rendering flow

1. `report.js` reads `?country=` → fetches `src/data/reports/<slug>.json`
   (Vite static import or fetch).
2. Renders `meta` hero (country, flag, tier, score gauge).
3. Iterates `sections[]` → for each, renders narrative step + registers visual.
4. Wires `IntersectionObserver` for active-section swapping + nav highlighting.
5. Renders `sources` list at the end.

## Error handling

- Missing/unknown `?country=` slug → friendly "report not found" state with a
  link back to the reports index. No crash.
- A section with an unknown `visual.kind` → render its narrative only, skip the
  visual (defensive default), log a console warning in dev.
- Empty section arrays (e.g. no white papers) → render a "none identified yet"
  placeholder rather than an empty block (matches Boro behavior).

## Testing

- **Schema validity**: a tiny `test-reports.mjs` node check (assert-based, no
  framework) that loads every `src/data/reports/*.json`, validates required
  fields + enum values (tier, visual.kind), and asserts every section/news/
  funding item that makes a factual claim has a non-empty `source`/`url`. This
  is the one runnable check that fails if a report is malformed. Runs in CI-less
  fashion via `node test-reports.mjs`.
- **Manual**: `npm run dev`, open Nigeria report, verify sticky visual swaps per
  section, deep-links work, mobile stacks, "report not found" path.

## Research pipeline (content)

Per country, via deep-research skill:
1. Fan-out web research: ecosystem, funding rounds, policy, key players,
   investors, news (last ~18 months prioritized).
2. Adversarially verify claims; keep only sourced facts.
3. Score the country against the rubric (ecosystem/investment/policy/strategy).
4. Emit a `<slug>.json` conforming to the schema, sources attached.
5. Add its row to `_index.json`.

Nigeria is done first and fully as the template. Look + research quality are
approved before batching the rest.

## Frontend polish

The reading experience (typography scale, pinned-visual transitions, tier color
system within the pink/purple/blue/black palette, spacing, index cards) is built
through the `frontend-design` skill so it reads as intentional, not templated.

## Build order (vertical slice)

1. Schema + `_index.json` + Nigeria `nigeria.json` (researched).
2. `report.html` + `report.js` + section/visual renderers + scrollytelling wiring.
3. `reports/index.html` + index grid.
4. `frontend-design` polish pass.
5. `test-reports.mjs` schema check.
6. Link Reports from the existing map view.
7. Manual verification, then deploy preview.

Later batches: research + add remaining ecosystem countries against this format.
