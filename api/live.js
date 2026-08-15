// Private live activity feed for the owner. Gated by a secret key; the ntfy
// topic is only sent to the client when the key matches, so it never appears in
// public source. Served as a Vercel function (the static site can't gate it) at
// /live via a rewrite in vercel.json. Ported from gigikenneth.com's live.astro.

const page = (topic) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Live activity</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root{
      --accent:#6d4bc9;--accent2:#c9407e;--ink:#1c1633;--slate:#575072;
      --line:#e7e3f0;--card:#fff;--paper:#faf9ff;--tint:#efeafb;--berry:#fbe9f1;
      --radius:16px;--display:"Bricolage Grotesque",sans-serif;
    }
    *{box-sizing:border-box}
    body{margin:0;background:radial-gradient(120% 120% at 30% 0%,#fbfaff,#efeaf8);
      color:var(--ink);font-family:"Hanken Grotesk",system-ui,sans-serif;font-size:15px;line-height:1.55;
      -webkit-font-smoothing:antialiased}
    .serif-i{font-style:italic}
    .wrap{max-width:700px;margin:0 auto;padding:72px 24px 140px}
    .head{animation:rise .7s cubic-bezier(.34,1.45,.5,1) both}
    .eyebrow{display:inline-flex;align-items:center;gap:9px;font-weight:700;font-size:13px;
      letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}
    .pulse{width:9px;height:9px;border-radius:50%;background:var(--accent);
      box-shadow:0 0 0 0 rgba(109,75,201,.55);animation:pulse 2.1s infinite}
    @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(109,75,201,.55)}70%{box-shadow:0 0 0 11px rgba(109,75,201,0)}100%{box-shadow:0 0 0 0 rgba(109,75,201,0)}}
    .head h1{font-family:var(--display);font-weight:800;font-size:clamp(34px,7vw,62px);
      letter-spacing:-.025em;line-height:.98;margin:16px 0 16px}
    .sub{color:var(--slate);font-size:18px;line-height:1.6;max-width:54ch;margin:0}
    .stat{display:flex;align-items:center;gap:20px;flex-wrap:wrap;
      margin:44px 0 34px;padding-bottom:30px;border-bottom:1px solid var(--line)}
    .stat-num{font-family:var(--display);font-weight:800;font-size:clamp(52px,13vw,104px);
      line-height:.82;letter-spacing:-.03em;color:var(--ink)}
    .stat-num.pop{animation:numbop .5s cubic-bezier(.34,1.7,.4,1)}
    @keyframes numbop{0%{transform:scale(1)}45%{transform:scale(1.18)}100%{transform:scale(1)}}
    .stat-lab{color:var(--slate);font-size:15px;line-height:1.6}
    #tally{font-variant-numeric:tabular-nums}
    #status{color:var(--accent);font-weight:600}
    .empty{padding:34px 28px;text-align:left;background:var(--card);border:1px solid var(--line);border-radius:var(--radius)}
    .empty-t{font-family:var(--display);font-weight:700;font-size:22px;margin:0 0 6px;color:var(--ink)}
    .empty-s{color:var(--slate);font-size:15px;margin:0}
    .feed{display:flex;flex-direction:column;gap:12px;margin-top:12px}
    .row{display:flex;align-items:center;gap:12px;padding:15px 20px;flex-wrap:wrap;
      background:var(--card);border:1px solid var(--line);border-radius:var(--radius)}
    .row.fresh{animation:rise .6s cubic-bezier(.34,1.45,.5,1) both}
    .row.hot{background:var(--tint);border-color:transparent;box-shadow:0 0 0 1.5px var(--accent)}
    .badge{font-family:var(--display);font-weight:700;font-size:10px;text-transform:uppercase;
      letter-spacing:.12em;padding:5px 10px;border-radius:100px;white-space:nowrap;flex:none}
    .badge.arrival{background:var(--tint);color:var(--accent)}
    .badge.page{background:#edf1f7;color:var(--slate)}
    .badge.click{background:var(--berry);color:var(--accent2)}
    .place{font-family:var(--display);font-weight:700;font-size:16px;color:var(--ink);line-height:1.3}
    .place .serif-i{font-weight:400;font-size:18px}
    .chip{font-size:12px;font-weight:600;color:var(--slate);background:#edf1f7;
      padding:4px 10px;border-radius:100px;white-space:nowrap}
    .chip.cta{background:var(--berry);color:var(--accent2)}
    .chip.device{background:transparent;border:1px solid var(--line);color:var(--slate)}
    .time{margin-left:auto;color:var(--slate);font-size:13px;white-space:nowrap;font-variant-numeric:tabular-nums}
    .toasts{position:fixed;right:20px;bottom:20px;display:flex;flex-direction:column;gap:12px;z-index:20;max-width:320px}
    .toast{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);
      padding:14px 18px;box-shadow:0 18px 44px rgba(28,22,51,.16);animation:slide .4s cubic-bezier(.34,1.5,.5,1) both}
    .toast .k{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.13em;margin-bottom:5px}
    .toast.arrival .k{color:var(--accent)}
    .toast.click .k{color:var(--accent2)}
    .toast .v{font-family:var(--display);font-weight:700;font-size:15px;color:var(--ink)}
    .toast .v .serif-i{font-weight:400;font-size:17px}
    .toast .v .lite{color:var(--slate);font-weight:600}
    @keyframes rise{from{opacity:0;transform:translateY(16px) scale(.98)}to{opacity:1;transform:none}}
    @keyframes slide{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
    @media(prefers-reduced-motion:reduce){*{animation:none!important}}
  </style>
</head>
<body data-topic="${topic}">
  <div class="wrap">
    <header class="head">
      <span class="eyebrow"><span class="pulse" aria-hidden="true"></span> Live</span>
      <h1>What&rsquo;s happening <span class="serif-i">right now</span></h1>
      <p class="sub">Visitors arriving, the pages they move through, and the CTAs they click. Coarse location only, no cookies.</p>
    </header>
    <div class="stat">
      <span class="stat-num" id="count">0</span>
      <span class="stat-lab">
        <span class="serif-i">visitors</span> in the last few hours<br />
        <span id="tally">0 pages &middot; 0 clicks</span> &middot; <span id="status">connecting&hellip;</span>
      </span>
    </div>
    <div class="empty" id="empty">
      <p class="empty-t">Nothing&rsquo;s happening <span class="serif-i">yet</span>.</p>
      <p class="empty-s">Arrivals, page views, and clicks will stream in here live. Leave it open.</p>
    </div>
    <div class="feed" id="feed"></div>
  </div>
  <div class="toasts" id="toasts" aria-live="polite"></div>
  <script>
    const topic = document.body.dataset.topic;
    const feed = document.getElementById('feed');
    const empty = document.getElementById('empty');
    const toasts = document.getElementById('toasts');
    const status = document.getElementById('status');
    const countEl = document.getElementById('count');
    const tallyEl = document.getElementById('tally');
    const counts = { arrival: 0, page: 0, click: 0 };
    const TYPES = {
      'New visitor': { key: 'arrival', badge: 'Visitor' },
      'Page view': { key: 'page', badge: 'Page' },
      'Click': { key: 'click', badge: 'Click' },
    };
    const fmt = (unix) => {
      const d = unix ? new Date(unix * 1000) : new Date();
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    function placeInto(node, place, lite) {
      const parts = String(place || '').split(', ');
      const country = parts.length > 1 ? parts.pop() : '';
      const main = document.createElement('span');
      if (lite) main.className = 'lite';
      main.textContent = country ? parts.join(', ') + ', ' : (parts.join(', ') || 'Somewhere');
      node.appendChild(main);
      if (country) {
        const s = document.createElement('span');
        s.className = 'serif-i';
        s.textContent = country;
        node.appendChild(s);
      }
    }
    function chip(text, cta) {
      const c = document.createElement('span');
      c.className = 'chip' + (cta ? ' cta' : '');
      c.textContent = text;
      return c;
    }
    function add(title, message, time) {
      const type = TYPES[title] || TYPES['Page view'];
      const isLive = !time || (Date.now() / 1000 - time) < 20;
      empty.style.display = 'none';
      counts[type.key]++;
      countEl.textContent = String(counts.arrival);
      if (isLive) { countEl.classList.remove('pop'); void countEl.offsetWidth; countEl.classList.add('pop'); }
      tallyEl.textContent = counts.page + ' pages \\u00b7 ' + counts.click + ' clicks';
      const parts = String(message || '').split(' \\u00b7 ');
      const place = parts[0];
      const hasDevice = parts[1] && !parts[1].startsWith('/');
      const device = hasDevice ? parts[1] : '';
      const details = parts.slice(hasDevice ? 2 : 1);
      const row = document.createElement('div');
      row.className = 'row fresh' + (isLive ? ' hot' : '');
      const badge = document.createElement('span');
      badge.className = 'badge ' + type.key;
      badge.textContent = type.badge;
      row.appendChild(badge);
      const placeEl = document.createElement('span');
      placeEl.className = 'place';
      placeInto(placeEl, place);
      row.appendChild(placeEl);
      if (device) { const dc = chip(device); dc.classList.add('device'); row.appendChild(dc); }
      details.forEach((d, i) => row.appendChild(chip(d, type.key === 'click' && i === 0)));
      const t = document.createElement('span');
      t.className = 'time';
      t.textContent = fmt(time);
      row.appendChild(t);
      feed.prepend(row);
      if (isLive) setTimeout(() => row.classList.remove('hot'), 4500);
      if (type.key === 'page' || !isLive) return;
      const toast = document.createElement('div');
      toast.className = 'toast ' + type.key;
      const k = document.createElement('span');
      k.className = 'k';
      k.textContent = type.key === 'click' ? ('Clicked ' + (details[0] || '')) : 'New visitor';
      const v = document.createElement('span');
      v.className = 'v';
      placeInto(v, place, false);
      toast.append(k, v);
      toasts.appendChild(toast);
      setTimeout(() => toast.remove(), 6500);
    }
    const es = new EventSource('https://ntfy.sh/' + topic + '/sse?since=6h');
    es.onopen = () => (status.textContent = 'live');
    es.onerror = () => (status.textContent = 'reconnecting\\u2026');
    es.onmessage = (e) => {
      let d; try { d = JSON.parse(e.data); } catch { return; }
      if (d.event !== 'message') return;
      add(d.title, d.message, d.time);
    };
  </script>
</body>
</html>`;

export default function handler(req, res) {
  const key = new URL(req.url, "http://x").searchParams.get("key");
  const expected = process.env.LIVE_PAGE_KEY;
  const topic = process.env.VISITOR_NTFY_TOPIC;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("x-robots-tag", "noindex, nofollow");
  if (!expected || !topic || key !== expected) {
    res.statusCode = 404;
    return res.end("Not found");
  }
  res.statusCode = 200;
  res.end(page(topic));
}
