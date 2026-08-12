# Bloom — the global femtech map

A living map of women's health innovation worldwide — built because [an existing map](https://boro.fi/blog/map) left an entire continent blank, showing only Kenya for all of Africa.

This one pins **real femtech initiatives** across the world, with the density Africa was denied: startups, apps, clinics, NGOs and funds building menstrual, maternal, reproductive, diagnostic, telehealth and community solutions. Founders featured on the [Blush & Bloom podcast](https://www.asele.tech/blush-and-bloom-podcast) (hosted by Gigi Kenneth, founder of [Asele](https://www.asele.tech)) carry a 🎙 badge linking their episode.

## Stack

Vanilla JS + [Vite](https://vitejs.dev) + [d3-geo](https://github.com/d3/d3-geo). No backend, no database — data lives in editable JSON.

```bash
npm install
npm run dev      # local preview
npm run build    # production build → dist/
```

## Editing the data

It's meant to be edited. Two files:

- **`src/data/initiatives.json`** — one object per initiative:
  ```json
  {
    "name": "Org name",
    "org_type": "company | ngo | clinic | app | fund | community",
    "country": "Country",
    "city": "City",
    "lat": 0.0, "lng": 0.0,
    "category": "menstrual | maternal | srh | diagnostics | telehealth | funding",
    "description": "one factual sentence",
    "url": "https://…",
    "source": "https://…  (where it was verified)",
    "podcast": { "guest_name": "", "episode_title": "", "episode_number": null, "episode_url": "" }
  }
  ```
  Drop `podcast` for non-podcast entries. `source` is required — every pin cites where it came from.

- **`src/data/countries.json`** — per-country maturity tier (1 Nascent → 5 Pioneering) that shades the map. `continent: "Africa"` drives the "Africa only" filter.

Add a country to `countries.json` to shade it; add an initiative to `initiatives.json` to pin it. That's it.

## Categories

Menstrual & cycle · Maternal & fertility · Sexual & reproductive · Diagnostics & devices · Telehealth · Funding & community.

## A note on the data

Community-sourced and cited, not exhaustive. Spotted a missing initiative or an error? Open a PR — the map is only as inclusive as the people who build it.
