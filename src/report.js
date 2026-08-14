import "./report.css";

// All country reports, bundled at build time. Keyed by slug.
const files = import.meta.glob("./data/reports/*.json", { eager: true });
const reports = {};
for (const [path, mod] of Object.entries(files)) {
  const slug = path.split("/").pop().replace(".json", "");
  if (slug.startsWith("_")) continue;
  reports[slug] = mod.default || mod;
}

const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)"];

const app = document.getElementById("report");
const slug = (new URLSearchParams(location.search).get("country") || "").toLowerCase();
const data = reports[slug];

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const host = (url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };
const srcLink = (url) => (url ? `<a class="src" href="${esc(url)}" target="_blank" rel="noopener">${esc(host(url))}</a>` : "");
const ACRONYMS = { ngo: "NGO", srh: "SRH", govt: "Govt", hub: "Hub", startup: "Startup", investor: "Investor" };
const titleCase = (s) => {
  const k = String(s || "").toLowerCase();
  return ACRONYMS[k] || k.replace(/\b\w/g, (c) => c.toUpperCase());
};

if (!data) {
  app.innerHTML = `
    <div class="rpt-404">
      <h1>No report yet</h1>
      <p>${slug ? `We have not published a femtech report for &ldquo;${esc(slug)}&rdquo; yet.` : "Pick a country to read its report."}</p>
      <a href="/reports/">Browse country reports</a>
    </div>`;
} else {
  render(data);
}

/* ---------- chart primitives (light SVG, no library) ---------- */

// horizontal bars: rows = [{label, value, display, meta, source}]
function hbars(rows, title) {
  const max = Math.max(1, ...rows.map((r) => r.value || 0));
  return `
    ${title ? `<p class="chart-title">${esc(title)}</p>` : ""}
    <div class="hbars">
      ${rows
        .map((r) => `
        <div class="hbar-row">
          <span class="hbar-label">${esc(r.label)}</span>
          <span class="hbar-val">${esc(r.display ?? r.value)}</span>
          <div class="hbar-track"><div class="hbar-fill" style="width:${Math.max(3, Math.round(((r.value || 0) / max) * 100))}%"></div></div>
          ${r.meta ? `<div class="hbar-meta">${esc(r.meta)} ${r.source ? srcLink(r.source) : ""}</div>` : ""}
        </div>`)
        .join("")}
    </div>`;
}

// donut: segs = [{label, value}]. centerNum optional.
function donut(segs, centerNum, centerSub, title) {
  const total = segs.reduce((a, s) => a + s.value, 0) || 1;
  const R = 52, C = 2 * Math.PI * R;
  let offset = 0;
  const rings = segs
    .map((s, i) => {
      const len = (s.value / total) * C;
      const dash = `${len} ${C - len}`;
      const el = `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${SERIES[i % SERIES.length]}" stroke-width="16" stroke-dasharray="${dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 70 70)"/>`;
      offset += len;
      return el;
    })
    .join("");
  const legend = segs
    .map((s, i) => `<div class="legend-item"><span class="legend-dot" style="background:${SERIES[i % SERIES.length]}"></span>${esc(s.label)}<span class="legend-val">${s.value}</span></div>`)
    .join("");
  return `
    ${title ? `<p class="chart-title">${esc(title)}</p>` : ""}
    <div class="donut-wrap">
      <svg class="donut" width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="${esc(title || "breakdown")}">
        ${rings}
        ${centerNum != null ? `<text class="donut-center" x="70" y="70" text-anchor="middle" dominant-baseline="central">${esc(centerNum)}</text>` : ""}
        ${centerSub ? `<text class="donut-sub" x="70" y="90" text-anchor="middle">${esc(centerSub)}</text>` : ""}
      </svg>
      <div class="legend">${legend}</div>
    </div>`;
}

function countBy(items, key, xform = (x) => x) {
  const m = new Map();
  for (const it of items) {
    const k = it[key] || "other";
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label: xform(label), value }));
}

/* ---------- section visual renderers ---------- */

function timelinePanel(heading, items) {
  return `
    <p class="console-eyebrow">${esc(heading)}</p>
    <div class="tl">
      ${items.map((it) => `
        <div class="tl-item">
          <div class="tl-date">${esc(it.date || "")}</div>
          <div class="tl-text">${esc(it.text)}</div>
          ${srcLink(it.source)}
        </div>`).join("")}
    </div>`;
}

function fundingPanel(heading, items) {
  const rows = items.map((it) => ({
    label: it.company,
    value: it.amountUsd || 0,
    display: it.amount || "undisclosed",
    meta: [it.stage, it.date, it.investor].filter(Boolean).join(" · "),
    source: it.source,
  }));
  const stageSegs = countBy(items, "stage");
  return `
    <p class="console-eyebrow">${esc(heading)}</p>
    ${hbars(rows, "Disclosed round size (USD)")}
    <div class="sub-block">${donut(stageSegs, items.length, "rounds", "Rounds by type")}</div>`;
}

function playersPanel(heading, items) {
  const typeSegs = countBy(items, "type", titleCase);
  const grid = items
    .map((it, i) => `
      <div class="player">
        <div class="player-name">${esc(it.name)}</div>
        ${it.type ? `<span class="player-type" style="background:${SERIES[typeIndex(typeSegs, it.type)]}">${esc(titleCase(it.type))}</span>` : ""}
        ${it.note ? `<p class="player-note">${esc(it.note)} ${srcLink(it.source)}</p>` : ""}
      </div>`)
    .join("");
  return `
    <p class="console-eyebrow">${esc(heading)}</p>
    ${donut(typeSegs, items.length, "orgs", "Ecosystem by organisation type")}
    <div class="sub-block players">${grid}</div>`;
}
function typeIndex(segs, type) {
  const i = segs.findIndex((s) => s.label.toLowerCase() === String(type).toLowerCase());
  return `--s${(i % 6) + 1}`;
}

function investorsPanel(heading, items) {
  const hqRows = countBy(items, "hq").map((r) => ({ ...r, display: r.value }));
  const list = items
    .map((it) => `
      <div class="inv-row">
        <div>
          <div class="inv-name">${esc(it.name)}</div>
          <div class="inv-role">${esc(it.role)} ${srcLink(it.source)}</div>
        </div>
        ${it.hq ? `<div class="inv-hq">${esc(it.hq)}</div>` : ""}
      </div>`)
    .join("");
  return `
    <p class="console-eyebrow">${esc(heading)}</p>
    ${hbars(hqRows, "Active investors by headquarters")}
    <div class="sub-block inv">${list}</div>`;
}

function listPanel(heading, items) {
  if (!items || !items.length) return `<p class="console-eyebrow">${esc(heading)}</p><p class="console-empty">None identified yet.</p>`;
  return `
    <p class="console-eyebrow">${esc(heading)}</p>
    <div class="clist">
      ${items.map((it) => `<div class="clist-item"><span class="marker">▸</span><span>${esc(it.text)} ${srcLink(it.source)}</span></div>`).join("")}
    </div>`;
}

function renderVisual(section) {
  const v = section.visual || {};
  const items = v.items || [];
  switch (v.kind) {
    case "timeline": return timelinePanel(section.heading, items);
    case "funding": return fundingPanel(section.heading, items);
    case "players": return playersPanel(section.heading, items);
    case "investors": return investorsPanel(section.heading, items);
    case "list": return listPanel(section.heading, items);
    default:
      if (import.meta.env.DEV) console.warn("Unknown visual kind:", v.kind, "in", section.id);
      return `<p class="console-eyebrow">${esc(section.heading)}</p><p class="console-empty">No visual for this section.</p>`;
  }
}

/* ---------- page render ---------- */

const SITE = "https://femtech-map.vercel.app";

function applySEO(d) {
  const m = d.meta;
  const url = `${SITE}/report.html?country=${m.slug}`;
  const title = `${m.country}: femtech and women's health innovation report`;
  const desc = String(d.overview || "").replace(/\s+/g, " ").slice(0, 155).trim();
  document.title = title;
  const upsert = (sel, tag, attrs) => {
    let el = document.head.querySelector(sel);
    if (!el) { el = document.createElement(tag); document.head.appendChild(el); }
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  };
  upsert('meta[name="description"]', "meta", { name: "description", content: desc });
  upsert('link[rel="canonical"]', "link", { rel: "canonical", href: url });
  for (const [p, c] of [["og:type", "article"], ["og:site_name", "Global Femtech Map"], ["og:title", title], ["og:description", desc], ["og:url", url]])
    upsert(`meta[property="${p}"]`, "meta", { property: p, content: c });
  upsert('meta[name="twitter:card"]', "meta", { name: "twitter:card", content: "summary_large_image" });
  const ld = {
    "@context": "https://schema.org", "@type": "Article", headline: title, description: desc, inLanguage: "en",
    about: { "@type": "Country", name: m.country },
    datePublished: `${m.lastUpdated}-01`, dateModified: `${m.lastUpdated}-01`,
    author: { "@type": "Person", name: "Gigi Kenneth" },
    publisher: { "@type": "Organization", name: "Global Femtech Map" },
    mainEntityOfPage: url,
    keywords: ["femtech", `${m.country} women's health`, "maternal health", "reproductive health", "digital health"].concat(m.focusAreas || []),
  };
  let s = document.getElementById("rpt-jsonld");
  if (!s) { s = document.createElement("script"); s.id = "rpt-jsonld"; s.type = "application/ld+json"; document.head.appendChild(s); }
  s.textContent = JSON.stringify(ld);
}

function render(d) {
  const m = d.meta;
  applySEO(d);

  const steps = d.sections;

  const stepsHTML = steps
    .map((s, i) => `
    <section class="step" data-index="${i}" id="step-${esc(s.id)}">
      <div class="step-kicker"><span class="bar"></span>${String(i + 1).padStart(2, "0")} of ${String(steps.length).padStart(2, "0")}</div>
      <h2 class="step-heading">${esc(s.heading)}</h2>
      <p class="step-narrative">${s.narrative}</p>
    </section>`)
    .join("");

  const panelsHTML = steps.map((s, i) => `<div class="console-panel" data-index="${i}">${renderVisual(s)}</div>`).join("");
  const railHTML = steps.map((s, i) => `<button class="rail-dot" data-index="${i}" aria-label="${esc(s.heading)}"><span class="rail-label">${esc(s.heading)}</span></button>`).join("");

  const focusHTML = (m.focusAreas || []).map((f) => `<span class="focus-tag">${esc(f)}</span>`).join("");
  const statsHTML = (m.stats || [])
    .map((s) => `<div class="stat"><div class="stat-value">${esc(s.value)}</div><p class="stat-label">${esc(s.label)} ${srcLink(s.source)}</p></div>`)
    .join("");

  const sourcesHTML = (d.sources || [])
    .map((s) => `<a class="src-card" href="${esc(s.url)}" target="_blank" rel="noopener"><span class="n">${esc(s.label)}</span><span class="u">${esc(host(s.url))}</span></a>`)
    .join("");

  app.innerHTML = `
    <div class="rpt-topbar">
      <a class="rpt-back" href="/reports/">&larr; All reports</a>
      <span class="rpt-topbar-title">Femtech ecosystem report</span>
      <button class="rpt-share" id="rpt-share">Copy link</button>
    </div>

    <header class="rpt-hero">
      <p class="rpt-eyebrow">Women's health innovation, ${esc(m.country)}</p>
      <div class="rpt-flag">${m.flag || ""}</div>
      <h1 class="rpt-title">${esc(m.country)}</h1>
      <p class="rpt-overview">${esc(d.overview)}</p>
      ${focusHTML ? `<div class="rpt-focus">${focusHTML}</div>` : ""}
    </header>
    ${statsHTML ? `<div class="rpt-stats">${statsHTML}</div>` : ""}

    <div class="rpt-scrolly">
      <div class="rpt-narrative">${stepsHTML}</div>
      <div class="rpt-console-col"><div class="rpt-console">${panelsHTML}</div></div>
    </div>

    <nav class="rpt-rail" aria-label="Report sections">${railHTML}</nav>

    <section class="rpt-sources">
      <h2>Sources and references</h2>
      <p class="sub">Every figure and claim above links back to a public source. ${(d.sources || []).length} references, updated ${esc(m.lastUpdated)}.</p>
      <div class="src-grid">${sourcesHTML}</div>
    </section>
    <footer class="rpt-foot">
      Researched and compiled for the <a href="/">Global Femtech Map</a> by Gigi Kenneth. Figures reflect public reporting as of ${esc(m.lastUpdated)}. Corrections welcome.
    </footer>`;

  wireScrolly(steps.length);
  wireShare();
}

function wireScrolly(n) {
  const stepEls = [...document.querySelectorAll(".step")];
  const panelEls = [...document.querySelectorAll(".console-panel")];
  const dotEls = [...document.querySelectorAll(".rail-dot")];

  // Mobile: no sticky pin. Move each chart panel inline, right under its own
  // narrative step, so graphics get full width and height instead of a cramped box.
  if (window.matchMedia("(max-width: 920px)").matches) {
    stepEls.forEach((step, i) => {
      const panel = panelEls[i];
      if (panel) { panel.classList.add("inline"); step.after(panel); }
    });
    document.querySelector(".rpt-console-col")?.remove();
    return;
  }

  let active = -1;

  const setActive = (i) => {
    if (i === active || i < 0) return;
    active = i;
    stepEls.forEach((el, k) => el.classList.toggle("is-active", k === i));
    panelEls.forEach((el, k) => el.classList.toggle("is-active", k === i));
    dotEls.forEach((el, k) => el.classList.toggle("is-active", k === i));
  };

  const nearestCenter = () => {
    const mid = window.innerHeight / 2;
    let best = null, bestDist = Infinity;
    for (const el of stepEls) {
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestDist) { bestDist = d; best = el; }
    }
    if (best) setActive(+best.dataset.index);
  };

  const io = new IntersectionObserver(() => nearestCenter(), { rootMargin: "-40% 0px -40% 0px", threshold: [0, 0.5, 1] });
  stepEls.forEach((el) => io.observe(el));

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { nearestCenter(); ticking = false; });
  }, { passive: true });

  dotEls.forEach((dot) => dot.addEventListener("click", () => stepEls[+dot.dataset.index]?.scrollIntoView({ behavior: "smooth", block: "center" })));
  setActive(0);
}

function wireShare() {
  const btn = document.getElementById("rpt-share");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(location.href); btn.textContent = "Copied"; setTimeout(() => (btn.textContent = "Copy link"), 1600); }
    catch { btn.textContent = location.href; }
  });
}
