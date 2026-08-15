# Global Femtech Map

An interactive world map of **femtech and women's health innovation** — the startups, apps, clinics, NGOs, funds and communities building better care for women, everywhere.

It began as a response to women's-health maps that leave most of the world blank. This one aims for the opposite: **339 cited initiatives across 154 countries**, with deep, deliberate coverage of Africa and the Global South that most maps overlook, and every continent represented.

Founders featured on the [Blush & Bloom podcast](https://www.asele.tech/blush-and-bloom-podcast) carry a 🎙 badge linking their episode.

> Built by Gigi Kenneth — founder of [Asele](https://www.asele.tech) and host of Blush & Bloom.

---

## What's on the map

- **339 initiatives · 154 countries · 6 continents**
- Six categories: **menstrual & cycle**, **maternal & fertility**, **sexual & reproductive health**, **diagnostics & devices**, **telehealth**, and **funding & community**
- Real startups where they exist; where a country has no verifiable femtech company, its national **UNFPA women's-health programme** stands in, so no country with active work sits empty
- Every single pin cites a **source URL**

## Features

- **Explore by country** — click any country to focus the map to it and list every initiative mapped there; the stat cards recalculate to that country
- **Click a pin** for a detail panel: description, category, location, link, source, and (for podcast guests) the episode
- **Filter** by category, search initiatives/countries, or isolate the 🎙 Blush & Bloom founders
- **Zoom** spreads out dense city clusters so individual dots stay legible
- Editorial landing hero, accessible colour/typography, responsive down to mobile (detail panel becomes a bottom sheet)

## Tech stack

Plain **Vanilla JS + [Vite](https://vitejs.dev) + [d3-geo](https://github.com/d3/d3-geo)**. No backend, no database — an art-directed SVG world map with data in editable JSON files.

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/ (also prerenders reports + SEO files)
npm run preview  # preview the production build
```

---

## Country reports

Beyond the map, the site publishes **researched, cited country ecosystem reports** at [`/reports/`](https://femtech.asele.tech/reports/) — scrollytelling deep-dives on femtech and women's-health innovation per country (funding, policy, founders, hubs), each claim linking to a public source. No scoring or tiers; reports are qualitative.

- **Data:** one JSON per country in `src/data/reports/<slug>.json`, plus `_index.json` (the grid + coming-soon list).
- **Render:** `src/report-render.js` is a pure module (no browser/Vite deps) shared by the client hydrator (`src/report.js`, `src/reports-index.js`) and the Node prerender.
- **Prerender:** `scripts/prerender.mjs` runs inside `npm run build`. For every report it bakes full HTML + head meta (title, description, canonical, OG, Article JSON-LD) into static pages at pretty URLs `/reports/<slug>/`, plus a "related countries" strip. It also bakes the `/reports/` index grid (with `ItemList` JSON-LD), fills the home page's crawlable report links, and writes `sitemap.xml` + `llms.txt`.
- **Validate:** `node test-reports.mjs` checks every report's schema and that all claims are sourced. Run before deploy.

To add a country, see the recipe in [`docs/NEXT-STEPS.md`](docs/NEXT-STEPS.md).

## SEO / GEO

Everything crawlers and AI engines need is generated at build time, no server:

- **`sitemap.xml`** — all pages, pretty URLs.
- **`robots.txt`** — allows general crawlers plus named AI crawlers (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended) so the reports can be cited in AI answers.
- **`llms.txt`** — a markdown summary + report index for AI crawlers (GEO), auto-generated from `_index.json`.
- **Structured data** — `Article` per report, `ItemList` on the reports index.
- **Internal linking** — home links to every report; each report links to related countries.

Live at [femtech.asele.tech](https://femtech.asele.tech) (Vercel; canonical points here). Verified in Google Search Console with the sitemap submitted.

---

## Contributing

**This map is community-sourced and open to contributions.** Spotted a missing initiative, a wrong location, a broken link, or an error in a country report? There are two ways in:

- **Suggest an edit** (no GitHub needed) — the **"Suggest an edit or addition"** button on the map, and **"Suggest an edit"** on every report, open an in-site form. Submissions land in a review Google Sheet; corrections are applied by hand (nothing publishes automatically). Maintainer setup: [`docs/contributions-setup.md`](docs/contributions-setup.md). (The older approved-to-map-live initiative form still works too: [`docs/submissions-setup.md`](docs/submissions-setup.md).)
- **Open a pull request** — edit the JSON directly (below). The map is only as inclusive as the people who build it.

### Add or fix an initiative

All data lives in JSON files under `src/data/`. To add an initiative, add one object to the appropriate file (see [Data model](#data-model) below). Fields:

```json
{
  "name": "Organization name",
  "org_type": "company | app | clinic | ngo | fund | community",
  "country": "Country",
  "city": "City",
  "lat": 6.5244,
  "lng": 3.3792,
  "category": "menstrual | maternal | srh | diagnostics | telehealth | funding",
  "description": "One factual sentence, 140 characters or fewer.",
  "url": "https://official-website.example",
  "source": "https://where-you-verified-this.example",
  "confidence": "high | medium",
  "podcast": {
    "guest_name": "Founder name",
    "episode_title": "Episode title",
    "episode_number": 17,
    "episode_url": "https://…"
  }
}
```

- `source` is **required** — every pin must cite where it came from. No unsourced entries.
- Drop the `podcast` block for anything that isn't a Blush & Bloom guest.
- `lat`/`lng` are the decimal coordinates of the org's city (any maps service gives these).
- Categories map to pin colours; pick the closest fit.

### Guidelines

- **Real, verifiable organizations only.** If you can't cite a source, don't add it.
- One object per initiative. Keep descriptions factual and short.
- Names are de-duplicated case- and punctuation-insensitively, so you won't create an accidental double.
- Run `npm run build` before opening the PR to confirm the JSON parses.

---

## Data model

Data is split into layers, all merged and de-duplicated by name at runtime in `src/main.js`:

| File | What it holds |
|------|---------------|
| `src/data/initiatives.json` | Core/seed set of well-known global femtech companies |
| `src/data/more.json` | Regional deep-scrape results and gap fills |
| `src/data/podcast.json` | Blush & Bloom guest-founder organizations (🎙) |
| `src/data/communities.json` | Femtech ecosystem networks, associations and accelerators |
| `src/data/programs.json` | National UNFPA / UN women's-health programmes that fill otherwise-empty countries |
| `src/data/continents.js` | Country → continent lookup (drives the click-to-explore behaviour) |
| `src/data/meta.js` | Small UI copy/config |

Add a real startup to `more.json`; add a podcast guest to `podcast.json`; the rest are mostly maintained by the project.

## A note on the data

The dataset was compiled from public sources and is cited but not exhaustive or infallible. Some entries are `medium` confidence, and a few placeholders (national UNFPA programmes) stand in for countries where no femtech company could be verified. Corrections and additions are always welcome — that's the point.

---

## Categories

Menstrual & cycle · Maternal & fertility · Sexual & reproductive health · Diagnostics & devices · Telehealth · Funding & community

## License

Code is available for reuse. The dataset is community-contributed and provided as-is for reference; please keep source attributions intact if you build on it.
