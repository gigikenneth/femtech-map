// Owner-only live activity ping. Reads Vercel's cookieless edge geo headers and
// forwards a coarse event (arrival / page view / tagged-CTA click) to a secret
// ntfy topic, which drives both phone push and the /live page.
// No IP stored, no persistence, no cookies. No-op unless VISITOR_NTFY_TOPIC set.
// Ported from gigikenneth.com's src/pages/api/ping.ts.

const META = {
  arrival: { title: "New visitor", tag: "wave" },
  page: { title: "Page view", tag: "page_facing_up" },
  click: { title: "Click", tag: "point_up_2" },
};

export default async function handler(req, res) {
  const done = (code) => { res.statusCode = code; res.end(); };
  const topic = process.env.VISITOR_NTFY_TOPIC;
  if (!topic) return done(204);

  const h = req.headers;
  const ua = h["user-agent"] || "";
  if (/bot|crawl|spider|preview|monitor|curl|wget|headless|lighthouse/i.test(ua)) return done(204);

  const dec = (v) => { try { return v ? decodeURIComponent(v) : ""; } catch { return v || ""; } };
  const city = dec(h["x-vercel-ip-city"]);
  const region = dec(h["x-vercel-ip-country-region"]);
  const cc = dec(h["x-vercel-ip-country"]);
  let country = cc;
  try { country = new Intl.DisplayNames(["en"], { type: "region" }).of(cc) || cc; } catch {}
  const place = [city, region, country].filter(Boolean).join(", ") || "Somewhere";

  const q = new URL(req.url, "http://x").searchParams;
  const t = q.get("t") || "page";
  const path = (q.get("p") || "/").slice(0, 120);
  const label = (q.get("l") || "").slice(0, 60);
  const meta = META[t] || META.page;

  const device =
    /iPhone/i.test(ua) ? "iPhone"
    : /iPad/i.test(ua) ? "iPad"
    : /Android/i.test(ua) ? (/Mobile/i.test(ua) ? "Android phone" : "Android tablet")
    : /Macintosh|Mac OS X/i.test(ua) ? "Mac"
    : /Windows/i.test(ua) ? "Windows"
    : /Linux/i.test(ua) ? "Linux"
    : /Mobile/i.test(ua) ? "Mobile"
    : "Desktop";

  // Body is " · "-separated: place, device, then details. /live parses on " · ".
  const detail = t === "click" ? [label, path].filter(Boolean) : [path];
  const body = [place, device, ...detail].join(" · ");

  try {
    await fetch(`https://ntfy.sh/${topic}`, {
      method: "POST",
      headers: { Title: meta.title, Tags: meta.tag },
      body,
    });
  } catch { /* never let analytics break a page load */ }

  done(204);
}
