# Live visitor feed setup (`/live`)

An owner-only real-time view of who's on the site right now: arrivals, the pages they move through, and report-link clicks, with coarse location and device. Cookieless, no database, effectively free. Ported from gigikenneth.com.

**Live:** `https://femtech.asele.tech/live?key=<LIVE_PAGE_KEY>` (keep the key private).

---

## How it works

```
page load ──► src/ping.js ──► POST /api/ping ──► ntfy topic ──► /api/live (SSE)  ──► the /live page
                                    │                    └────────► ntfy phone app (push)
                             (Vercel geo headers,
                              no IP stored, no cookie)
```

- **`src/ping.js`** runs on every page (imported by `main.js`, `report.js`, `reports-index.js`). On load it POSTs `t=arrival` (or `t=page` for same-origin navigations) to `/api/ping`. `trackReportClicks()` also fires `t=click` with the country label when a `/reports/<slug>/` link is clicked. Uses `navigator.sendBeacon`, so it survives navigation.
- **`api/ping.js`** reads Vercel's cookieless edge geo headers (`x-vercel-ip-city` / `-country-region` / `-country`) plus a coarse device from the UA, and forwards a `" · "`-separated line to a secret ntfy topic. Bots (curl/crawlers/headless) are filtered out. No-op (204) if `VISITOR_NTFY_TOPIC` is unset.
- **`api/live.js`** serves the `/live` page (via a `vercel.json` rewrite `/live → /api/live`). It checks `?key=` against `LIVE_PAGE_KEY`; a mismatch returns 404 and the topic is never sent to the client. On success the page opens an `EventSource` to `https://ntfy.sh/<topic>/sse?since=6h` and renders events live.
- **ntfy** is both the transport and the "last few hours" buffer. Subscribing the ntfy app to the topic gives phone push per visit.

## Config (Vercel env vars)

| Var | What | Notes |
|-----|------|-------|
| `VISITOR_NTFY_TOPIC` | The secret ntfy topic visits are posted to | Anyone who knows it can watch the feed — keep it unguessable and private |
| `LIVE_PAGE_KEY` | The `?key=` value that unlocks `/live` | Gates the web page |

Set both in the Vercel project (Settings ▸ Environment Variables, Production) and redeploy. Both are already set for this project. If neither is set, `/api/ping` no-ops and `/live` returns 404 — the site is unaffected.

## Watch it

- **Web:** open `https://femtech.asele.tech/live?key=<LIVE_PAGE_KEY>` and leave it running.
- **Phone push:** install the ntfy app, **Subscribe**, paste the topic (or open `https://ntfy.sh/<topic>` in a browser).

## Rotating a secret

Change the env var in Vercel and redeploy. For `VISITOR_NTFY_TOPIC`, also re-subscribe the ntfy app to the new topic. For `LIVE_PAGE_KEY`, just use the new key in the URL.

## Privacy

No IP is stored, no cookie is set, and location is coarse (city/region/country from Vercel's edge, which the visitor's browser already exposes to the network). The feed is ephemeral — ntfy only holds recent messages.
