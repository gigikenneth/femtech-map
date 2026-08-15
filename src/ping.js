// Fire-and-forget visit ping to the live-activity feed (/live). No cookies, no
// PII: api/ping reads only Vercel's coarse geo headers. No-op in dev / when the
// VISITOR_NTFY_TOPIC env var is unset (the function returns 204).
export function ping() {
  try {
    const sameOrigin = document.referrer && new URL(document.referrer).host === location.host;
    const t = sameOrigin ? "page" : "arrival";
    const url = `/api/ping?t=${t}&p=${encodeURIComponent(location.pathname.slice(0, 120))}`;
    if (navigator.sendBeacon) navigator.sendBeacon(url);
    else fetch(url, { method: "POST", keepalive: true });
  } catch { /* never let a ping break the page */ }
}
