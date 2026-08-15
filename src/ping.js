// Fire-and-forget visit + click pings to the live-activity feed (/live). No
// cookies, no PII: api/ping reads only Vercel's coarse geo headers. No-op in dev
// / when the VISITOR_NTFY_TOPIC env var is unset (the function returns 204).

function sendPing(t, p, l) {
  try {
    let url = `/api/ping?t=${t}&p=${encodeURIComponent(p)}`;
    if (l) url += `&l=${encodeURIComponent(l)}`;
    if (navigator.sendBeacon) navigator.sendBeacon(url);
    else fetch(url, { method: "POST", keepalive: true });
  } catch { /* never let a ping break the page */ }
}

export function ping() {
  let sameOrigin = false;
  try { sameOrigin = document.referrer && new URL(document.referrer).host === location.host; } catch {}
  sendPing(sameOrigin ? "page" : "arrival", location.pathname.slice(0, 120));
}

// Delegated: any click on a per-country report link (/reports/<slug>/) anywhere
// on the page, including links added later by hydration. The index link
// (/reports/ with no slug) is ignored.
export function trackReportClicks() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href*="/reports/"]');
    if (!a) return;
    const m = (a.getAttribute("href") || "").match(/\/reports\/([^/?#]+)/);
    if (!m || !m[1]) return;
    const slug = decodeURIComponent(m[1]);
    const label = (a.textContent || slug).trim().replace(/\s+/g, " ").slice(0, 60);
    sendPing("click", `/reports/${slug}/`, label);
  }, { capture: true });
}
