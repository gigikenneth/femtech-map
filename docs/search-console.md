# Search Console & search indexing

How `femtech.asele.tech` is set up for Google Search, and the traps worth remembering.

## What's live

- **Google Search Console:** verified as a **URL-prefix property** for `https://femtech.asele.tech/` under the **Asele Google account (`aseleinfo@gmail.com`)**. Sitemap `sitemap.xml` submitted (29 URLs, Success).
- **Bing:** skipped. Bing auto-crawls via the `Sitemap:` line in `robots.txt`, so it indexes without a Webmaster account.

## Verifying in Search Console (the way that works here)

Use **URL prefix** + **HTML tag** (meta) verification:

1. Search Console ▸ Add property ▸ **URL prefix** ▸ `https://femtech.asele.tech/`.
2. Choose **HTML tag** ▸ copy the `content` token.
3. Add it to `index.html` `<head>` as `<meta name="google-site-verification" content="…" />`, commit, deploy.
4. Click **Verify**. Leave the meta tag in place permanently (removing it un-verifies the property).

The current token is committed in `index.html`.

### Gotchas (why the other methods fail here)

- **HTML file method breaks.** `vercel.json` has `cleanUrls: true`, which 308-redirects `/google….html` → `/google…`. Search Console's file check hits the `.html` URL and gets a redirect, so it fails. Use the meta tag instead (served on the 200 home page).
- **Domain property can't verify.** A GSC Domain property needs a DNS `TXT` record on the `femtech` host, but `femtech` is a `CNAME` (→ Vercel) and DNS rules forbid a `TXT` alongside a `CNAME`. Adding one at the apex verifies `asele.tech`, not the subdomain. URL-prefix + meta tag is the working combo.
- **Account matters.** The property lives under the Asele account, separate from `asele.tech`'s own GSC property. Sign in as `aseleinfo@gmail.com`.

## Submitting the sitemap

Search Console ▸ Sitemaps ▸ enter `sitemap.xml` ▸ Submit. It's regenerated on every build by `scripts/prerender.mjs`, so new report pages get added automatically — no need to resubmit.

## What's in the SEO/GEO layer

Generated at build (see the README's SEO / GEO section):

- `sitemap.xml`, `robots.txt` (allows GPTBot / ClaudeBot / PerplexityBot / OAI-SearchBot / Google-Extended), `llms.txt`.
- `Article` JSON-LD per report, `ItemList` on the reports index.
- Home links to every report; each report links to related countries.

## Checking progress

Indexing takes days to weeks. Track in Search Console:

- **Pages** — indexed count climbing.
- **Performance** — impressions, clicks, queries, positions (first data usually 3–7 days out).

For total traffic (not just search), see Vercel Web Analytics and the `/live` feed ([`live-feed-setup.md`](live-feed-setup.md)).
