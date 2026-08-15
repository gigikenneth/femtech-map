# Femtech Map, handoff and next steps

Snapshot for continuing in a new session. Written 2026-08-15, updated 2026-08-15 after the SEO/GEO push.

## Current state

- **Repo:** `~/femtech-map` (git, branch `main`, clean + deployed).
- **Live:** https://femtech.asele.tech (canonical custom domain). Also resolves at `femtech-map.vercel.app` (every page's canonical points to the asele.tech domain).
- **What exists:**
  - A **map** at `/` (vanilla JS + Vite + d3-geo, global femtech/women's-health pins). Unchanged core product. Now also carries a crawlable list of report links in the hero.
  - **27 country reports** (scrollytelling, cited, no scoring), statically pre-rendered at pretty URLs `/reports/<slug>/`, each with a "related countries" strip.
  - A **reports index** at `/reports/` with country search + per-card "last updated", now **prerendered** (card grid + `ItemList` JSON-LD baked into the HTML, client hydrates only the search).
  - **SEO/GEO files:** `sitemap.xml` (29 urls), `robots.txt` (AI crawlers allowed), `llms.txt` (report index for AI engines), all generated at build.
- **Domain:** asele.tech DNS is at **Wix**. Subdomain added via a Wix DNS record: CNAME `femtech` -> `cname.vercel-dns.com`. Apex asele.tech + the Asele site are untouched.
- **Search Console:** `femtech.asele.tech` is a **URL-prefix property under the Asele Google account (`aseleinfo@gmail.com`)**, verified via the HTML-tag meta in `index.html` (`google-site-verification` = `Gj9dve3IZLEL3Bb7lCYIsJTiGcqJ1F3xavIxURUvMDM`, do not remove). Sitemap submitted (29 pages, Success). A Domain-property attempt on `femtech.asele.tech` failed and is a dead end: DNS TXT can't sit on the `femtech` host because it's a CNAME. There's a stray apex TXT (`4QgPP3…`) from that attempt, harmless, delete anytime.
- **Bing:** skipped. Wix used to feed Bing for asele.tech via its own integration; there's no standalone Bing Webmaster account, and Bing's Google-OAuth sign-in kept erroring. Not needed, Bing auto-crawls via the `robots.txt` sitemap directive. Set up later with Microsoft sign-in if the dashboard is wanted.

## Deploy / commit conventions

- Deploy prod: `vercel --prod --yes --scope gigikenneths-projects`
- Commits use email `gigikenneth7@gmail.com` (GitHub-linked; else Vercel blocks deploys).
- End commit messages with the Claude co-author trailer.
- **No em dashes** anywhere (copy, comments, CSS). Scan before deploy: `grep -rl "—" src/ index.html report.html reports/index.html`.
- Palette: pink / purple / blue / black only. No yellow / orange / coral. No all-caps UI.

## How the reports system works

- **Data:** one JSON per country in `src/data/reports/<slug>.json` + `_index.json` (grid data). Schema: `meta` (country, slug, flag, lastUpdated, focusAreas, stats[]) + `overview` + `sections[]` (news/policy/ecosystem/funding/players/investors/whitepapers, each with a typed `visual`) + `sources[]`. Every factual item carries a `source` URL.
- **Render logic:** `src/report-render.js` is a PURE module (no browser/Vite deps) shared by client + Node prerender. It exports `renderReportBody`, `reportMeta`, `renderNotFound`, `esc`, `host`, `SITE`.
- **Client:** `src/report.js` is a thin hydrator, reads embedded `#report-data` JSON on prerendered pages, derives slug from the path, lazy per-country code-split for the `?country=` fallback, wires scrollytelling + share.
- **Prerender:** `scripts/prerender.mjs` runs in `npm run build` (after `vite build`). For each report JSON it injects body + head meta (title, description, canonical, OG, JSON-LD) + a related-countries strip into the built `dist/report.html` template and writes `dist/reports/<slug>/index.html` + embeds the JSON. It also bakes the `/reports/` index grid + `ItemList` JSON-LD into `dist/reports/index.html`, fills the home hero's crawlable report links in `dist/index.html`, and writes `dist/sitemap.xml` + `dist/llms.txt`. Shared render helpers (`renderIndexBody`, `renderRelatedStrip`, `relatedCountries`, `PLANNED`) live in the pure `src/report-render.js` so client and prerender stay in sync.
- **Vercel:** `vercel.json` sets `buildCommand: npm run build`, `outputDirectory: dist`, `cleanUrls: true`.
- **Check:** `node test-reports.mjs` validates every report schema + that all claims are sourced. Run before deploy.

### To ADD a country (the whole recipe)

1. Research it (parallel web-research subagent per country worked well; see the pattern below). Return one JSON matching the schema, every item cited, no scoring, no em dashes, plain `&` not `&amp;`.
2. Save to `src/data/reports/<slug>.json`. Multi-word slugs seen: `cote-divoire`, `south-africa`, `sierra-leone`, `dr-congo`, `burkina-faso`.
3. Sanitize entities: `sed -i '' -e 's/&amp;/\&/g' -e 's/&gt;/>/g' -e 's/&lt;/</g' src/data/reports/*.json` (agents HTML-escape ampersands).
4. Add a row to `src/data/reports/_index.json` (slug, name, flag, lastUpdated, focus[], hook).
5. Update the sidebar count in `index.html` (".rl-sub ... N countries live") and the `PLANNED` coming-soon list in `src/reports-index.js` if needed.
6. `node test-reports.mjs && npm run build` (prerender auto-generates the new page + adds it to sitemap).
7. Commit + deploy.

Research-agent prompt shape that worked: dispatch 6 parallel `general-purpose` agents, each told to return ONLY raw JSON in the exact schema, prioritize last ~18 months, cite every claim via real WebSearch/WebFetch results, omit what it cannot verify, do NOT pad thin ecosystems (lean on govt/NGO programs where startups are absent), English output for Francophone/Lusophone/Arabic countries.

## Open next steps

### SEO / GEO

**Done (2026-08-15 push):**
- ✅ Search Console: verified under the Asele account + sitemap submitted (see Current state). Bing skipped.
- ✅ Prerendered the `/reports/` index (card grid + `ItemList` JSON-LD baked in; client hydrates search only).
- ✅ Crawlable report links in the home hero (`#hero-reports`, filled by prerender).
- ✅ "Related countries" strip per report (focus-area overlap, in `renderReportBody`).
- ✅ `llms.txt` generated from `_index.json`; `robots.txt` allows GPTBot / ClaudeBot / PerplexityBot / OAI-SearchBot / Google-Extended.

**Still open:**
4. **OG images per report** (social + AI preview cards). Options: generate static PNGs at build, or `@vercel/og`. Then set `og:image` / `twitter:image` per report in `reportMeta` + prerender. (Decision needed: static PNG vs `@vercel/og`.)
5. **Richer structured data:** breadcrumbs (BreadcrumbList), a `Dataset` schema for the funding tables, and an FAQ block per country (great for GEO / AI answers).
8. Default `og:image`, `twitter:image`, and a favicon/apple-touch-icon pass.

_Indexing takes days-to-weeks. Track in GSC → Pages (indexed count) and Performance (impressions); first data usually 3-7 days out._

### Content
- Next country wave (coming-soon shown on index): **India, Brazil, Indonesia, Pakistan, Mexico, Philippines** (site is going global, not Africa-only). Africa is essentially covered for real ecosystems.
- Consider a freshness cadence (reports say "Updated Aug 2026"); set a re-research schedule so they do not go stale.

### Product / polish
- Reports index: optional filters by focus area or region, sort by last-updated.
- Link map pins to their country report (currently map and reports are separate experiences).
- Analytics (Vercel Analytics or Plausible) to see which reports get traffic.
- Optional: redirect `femtech-map.vercel.app` -> `femtech.asele.tech` (currently both serve; canonical already handles duplicate-content).

## Gotchas learned
- Research agents HTML-escape ampersands (`&amp;`) and occasionally emit garbled URL artifacts (saw `2entity25`, zero-width chars in UNFPA links). Sanitize + spot-check sources.
- `.idx-card` uses `display:flex`, which overrides the `[hidden]` attribute; search filter needs the explicit `.idx-card[hidden]{display:none}` rule (already in `report.css`).
- Scoring/tiers were explicitly rejected (Nigeria vs Cape Verde not comparable). Keep reports qualitative.
- The gradient sidebar "reports" banner on the map (`.reports-link`) is wanted, do not restyle/remove it.
- `vercel.json` has `cleanUrls: true`, which 308-redirects `/foo.html` -> `/foo`. So Google Search Console's **HTML-file** verification method is unreliable here (the verifier hits the `.html` URL and gets a redirect). Use the **HTML-tag** (meta) method instead, served on the 200 home page. GSC **Domain** properties don't help either: they need the TXT on the `femtech` host, which is a CNAME (can't hold a TXT). URL-prefix + meta tag is the working combo.
