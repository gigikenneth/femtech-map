// Pure report HTML generation. NO browser or Vite dependencies, so this module
// is imported by both the client (report.js) and the Node prerender script.

export const SITE = "https://femtech.asele.tech";

const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)"];

export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const host = (url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };
const srcLink = (url) => (url ? `<a class="src" href="${esc(url)}" target="_blank" rel="noopener">${esc(host(url))}</a>` : "");
const ACRONYMS = { ngo: "NGO", srh: "SRH", govt: "Govt", hub: "Hub", startup: "Startup", investor: "Investor" };
const titleCase = (s) => {
  const k = String(s || "").toLowerCase();
  return ACRONYMS[k] || k.replace(/\b\w/g, (c) => c.toUpperCase());
};

/* ---------- chart primitives (light SVG, no library) ---------- */

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

function typeIndex(segs, type) {
  const i = segs.findIndex((s) => s.label.toLowerCase() === String(type).toLowerCase());
  return `--s${(i % 6) + 1}`;
}

function playersPanel(heading, items) {
  const typeSegs = countBy(items, "type", titleCase);
  const grid = items
    .map((it) => `
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
    default: return `<p class="console-eyebrow">${esc(section.heading)}</p><p class="console-empty">No visual for this section.</p>`;
  }
}

/* ---------- full report body + head metadata ---------- */

export function renderReportBody(d, related = []) {
  const m = d.meta;
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
  const railHTML = steps.map((s) => `<button class="rail-dot" data-index="${steps.indexOf(s)}" aria-label="${esc(s.heading)}"><span class="rail-label">${esc(s.heading)}</span></button>`).join("");

  const focusHTML = (m.focusAreas || []).map((f) => `<span class="focus-tag">${esc(f)}</span>`).join("");
  const statsHTML = (m.stats || [])
    .map((s) => `<div class="stat"><div class="stat-value">${esc(s.value)}</div><p class="stat-label">${esc(s.label)} ${srcLink(s.source)}</p></div>`)
    .join("");

  const sourcesHTML = (d.sources || [])
    .map((s) => `<a class="src-card" href="${esc(s.url)}" target="_blank" rel="noopener"><span class="n">${esc(s.label)}</span><span class="u">${esc(host(s.url))}</span></a>`)
    .join("");

  return `
    <div class="rpt-topbar">
      <a class="rpt-back" href="/reports/">&larr; All reports</a>
      <span class="rpt-topbar-title">Femtech ecosystem report</span>
      <button class="rpt-suggest" type="button" data-contribute data-country="${esc(m.country)}">Suggest an edit</button>
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
    ${renderRelatedStrip(related)}
    <footer class="rpt-foot">
      Researched and compiled for the <a href="/">Global Femtech Map</a> by Gigi Kenneth. Figures reflect public reporting as of ${esc(m.lastUpdated)}. Spotted something off? <button class="rpt-foot-link" type="button" data-contribute data-country="${esc(m.country)}">Suggest an edit or correction</button>.
    </footer>`;
}

export function reportMeta(d) {
  const m = d.meta;
  const canonical = `${SITE}/reports/${m.slug}/`;
  const title = `${m.country}: femtech and women's health innovation report`;
  const description = String(d.overview || "").replace(/\s+/g, " ").slice(0, 155).trim();
  const jsonld = {
    "@context": "https://schema.org", "@type": "Article", headline: title, description, inLanguage: "en",
    about: { "@type": "Country", name: m.country },
    datePublished: `${m.lastUpdated}-01`, dateModified: `${m.lastUpdated}-01`,
    author: { "@type": "Person", name: "Gigi Kenneth" },
    publisher: { "@type": "Organization", name: "Global Femtech Map" },
    mainEntityOfPage: canonical,
    keywords: ["femtech", `${m.country} women's health`, "maternal health", "reproductive health", "digital health"].concat(m.focusAreas || []),
  };
  return { title, description, canonical, jsonld };
}

/* ---------- related countries (internal linking, shared client + prerender) ---------- */

// Pick n other countries sharing the most focus areas; ties fall back to list order.
export function relatedCountries(index, slug, n = 4) {
  const cur = index.find((r) => r.slug === slug);
  const focus = new Set((cur?.focus || []).map((f) => f.toLowerCase()));
  return index
    .filter((r) => r.slug !== slug)
    .map((r) => ({ r, overlap: (r.focus || []).filter((f) => focus.has(f.toLowerCase())).length }))
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, n)
    .map((s) => s.r);
}

export function renderRelatedStrip(related) {
  if (!related || !related.length) return "";
  return `
    <section class="rpt-related" aria-label="Related countries">
      <h2>Related country reports</h2>
      <div class="rpt-related-grid">
        ${related
          .map((r) => `
          <a class="rpt-related-card" href="/reports/${encodeURIComponent(r.slug)}/">
            <span class="rc-flag" aria-hidden="true">${r.flag || ""}</span>
            <span class="rc-name">${esc(r.name)}</span>
            <span class="rc-hook">${esc(r.hook || "")}</span>
          </a>`)
          .join("")}
      </div>
    </section>`;
}

/* ---------- reports index (shared client + prerender) ---------- */

// Countries we plan to cover next as the map goes global. Shown as "coming soon"
// on the reports index (deduped against published reports at render time).
// Grouped by region for a spread across underrepresented places; each has real
// femtech / women's-health-tech or strong maternal/SRH programme activity.
export const PLANNED = [
  // Africa (beyond the 27 already published)
  "Algeria", "Sudan", "Somalia", "Togo", "Guinea", "Mauritius", "Eswatini", "Lesotho",
  // Asia
  "India", "Bangladesh", "Indonesia", "Pakistan", "Philippines", "Vietnam", "Nepal", "Sri Lanka", "Thailand", "Kazakhstan",
  // Middle East
  "Jordan", "Saudi Arabia", "United Arab Emirates", "Lebanon",
  // Europe (underrepresented, not the usual hubs)
  "Poland", "Ukraine", "Turkey", "Romania", "Portugal",
  // Latin America
  "Brazil", "Mexico", "Colombia", "Argentina", "Peru",
];

const IDX_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtUpdated = (ym) => {
  const [y, m] = String(ym || "").split("-");
  return m ? `Updated ${IDX_MONTHS[+m - 1]} ${y}` : "";
};

const indexCard = (r) => `
  <a class="idx-card" data-name="${esc(r.name.toLowerCase())}" data-focus="${esc((r.focus || []).join(" ").toLowerCase())}" href="/reports/${encodeURIComponent(r.slug)}/">
    <span class="flag">${r.flag || ""}</span>
    <span class="cn">${esc(r.name)}</span>
    <p class="hook">${esc(r.hook)}</p>
    ${(r.focus || []).length ? `<div class="idx-tags">${r.focus.map((f) => `<span class="idx-tag">${esc(f)}</span>`).join("")}</div>` : ""}
    <span class="idx-foot"><span class="idx-cta">Read report &rarr;</span><span class="idx-updated">${esc(fmtUpdated(r.lastUpdated))}</span></span>
  </a>`;

// Full index body innerHTML, identical output for prerender and client hydrate.
export function renderIndexBody(index, planned = []) {
  const published = new Set(index.map((r) => r.name));
  const soon = planned
    .filter((n) => !published.has(n))
    .map((n) => `
  <div class="idx-card idx-soon" data-name="${esc(n.toLowerCase())}" data-focus="">
    <span class="cn">${esc(n)}</span>
    <p class="hook">Report in research.</p>
    <span class="idx-foot"><span class="idx-cta">Coming soon</span></span>
  </div>`)
    .join("");
  return `
  <div class="idx-wrap">
    <div class="idx-topbar">
      <a class="rpt-back" href="/">&larr; Back to the map</a>
      <button class="rpt-suggest" type="button" data-contribute>Suggest an edit or addition</button>
    </div>
    <div class="idx-head">
      <h1 class="idx-title">Femtech ecosystem reports</h1>
      <p class="idx-sub">Researched, cited country reports on women's health innovation worldwide: the funding, the policy, the founders and the hubs. Deep coverage across Africa first, expanding globally.</p>
      <div class="idx-search">
        <input id="idx-search-input" type="search" placeholder="Search a country…" aria-label="Search countries" autocomplete="off" />
        <span class="idx-count" id="idx-count"></span>
      </div>
    </div>
    <div class="idx-grid" id="idx-grid">
      ${index.map(indexCard).join("")}
      ${soon}
    </div>
    <p class="idx-empty" id="idx-empty" hidden>No country matches that search.</p>
    <p class="rpt-foot" style="padding:40px 0 0">Back to the <a href="/">Global Femtech Map</a>. Missing a country or spotted an error? <button class="rpt-foot-link" type="button" data-contribute>Suggest an edit or addition</button>.</p>
  </div>`;
}

export function renderNotFound(slug) {
  return `
    <div class="rpt-404">
      <h1>No report yet</h1>
      <p>${slug ? `We have not published a femtech report for &ldquo;${esc(slug)}&rdquo; yet.` : "Pick a country to read its report."}</p>
      <a href="/reports/">Browse country reports</a>
    </div>`;
}
