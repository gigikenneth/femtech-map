import "./report.css";

// All country reports, bundled at build time. Keyed by slug.
const files = import.meta.glob("./data/reports/*.json", { eager: true });
const reports = {};
for (const [path, mod] of Object.entries(files)) {
  const slug = path.split("/").pop().replace(".json", "");
  if (slug.startsWith("_")) continue; // skip _index.json
  reports[slug] = mod.default || mod;
}

const TIER_LABEL = {
  nascent: "Nascent",
  emerging: "Emerging",
  growing: "Growing",
  scaling: "Scaling",
  pioneering: "Pioneering",
};
const TIER_RANGE = {
  nascent: "1–2",
  emerging: "3–4",
  growing: "5–6",
  scaling: "7–8",
  pioneering: "9–10",
};

const app = document.getElementById("report");
const params = new URLSearchParams(location.search);
const slug = (params.get("country") || "").toLowerCase();
const data = reports[slug];

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const host = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
};
const srcLink = (url) => (url ? `<a class="src" href="${esc(url)}" target="_blank" rel="noopener">${esc(host(url))}</a>` : "");

if (!data) {
  app.innerHTML = `
    <div class="rpt-404">
      <h1>No report yet</h1>
      <p>${slug ? `We haven't published a femtech report for “${esc(slug)}” yet.` : "Pick a country to read its report."}</p>
      <a href="/reports/">Browse country reports</a>
    </div>`;
} else {
  render(data);
}

/* ---------- visual renderers (return HTML for the dark console) ---------- */

function gaugeSVG(score) {
  // semicircle arc, 0..10 -> 180deg
  const r = 92, cx = 105, cy = 112;
  const frac = Math.max(0, Math.min(1, score / 10));
  const a0 = Math.PI, a1 = Math.PI - frac * Math.PI;
  const p = (a) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  const [sx, sy] = p(Math.PI), [ex, ey] = p(0), [fx, fy] = p(a1);
  const large = frac > 0.5 ? 1 : 0;
  return `
    <svg class="gauge-svg" viewBox="0 0 210 128" role="img" aria-label="Innovation score ${score} out of 10">
      <defs>
        <linearGradient id="gg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#4f8fd9"/><stop offset="0.55" stop-color="#8a5bd0"/><stop offset="1" stop-color="#e5548f"/>
        </linearGradient>
      </defs>
      <path d="M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="12" stroke-linecap="round"/>
      <path d="M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${fx} ${fy}" fill="none" stroke="url(#gg)" stroke-width="12" stroke-linecap="round"/>
    </svg>`;
}

function ratingPanel(meta) {
  const subs = [
    ["Ecosystem & startups", meta.subScores.ecosystem, 3],
    ["Investment & capital", meta.subScores.investment, 3],
    ["Policy & guidelines", meta.subScores.policy, 3],
    ["National strategy", meta.subScores.strategy, 1],
  ];
  return `
    <p class="console-eyebrow">Innovation rating</p>
    <div class="gauge-wrap">
      ${gaugeSVG(meta.score)}
      <div class="gauge-score">${meta.score}<span>/10</span></div>
      <div class="gauge-tier">${TIER_LABEL[meta.tier] || meta.tier}</div>
    </div>
    <div class="subscores">
      ${subs
        .map(
          ([label, v, max]) => `
        <div>
          <div class="subscore-label"><span>${label}</span><span class="v">${v}/${max}</span></div>
          <div class="subscore-track"><div class="subscore-fill" style="width:${Math.round((v / max) * 100)}%"></div></div>
        </div>`
        )
        .join("")}
    </div>
    <p class="score-basis">Scored on: ${esc(meta.scoreBasis)}.</p>`;
}

function timelinePanel(heading, items) {
  return `
    <p class="console-eyebrow">${esc(heading)}</p>
    <div class="tl">
      ${items
        .map(
          (it) => `
        <div class="tl-item">
          <div class="tl-date">${esc(it.date || "")}</div>
          <div class="tl-text">${esc(it.text)}</div>
          ${srcLink(it.source)}
        </div>`
        )
        .join("")}
    </div>`;
}

function fundingPanel(heading, items) {
  const max = Math.max(1, ...items.map((i) => i.amountUsd || 0));
  return `
    <p class="console-eyebrow">${esc(heading)}</p>
    <div class="fund">
      ${items
        .map((it) => {
          const w = it.amountUsd ? Math.max(6, Math.round((it.amountUsd / max) * 100)) : 0;
          return `
        <div class="fund-row">
          <div class="fund-co">${esc(it.company)}</div>
          <div class="fund-amt">${esc(it.amount || "undisclosed")}</div>
          <div class="fund-bar"><span style="width:${w}%"></span></div>
          <div class="fund-meta">${esc([it.stage, it.date, it.investor].filter(Boolean).join(" · "))}${it.source ? " " + srcLink(it.source) : ""}</div>
        </div>`;
        })
        .join("")}
    </div>`;
}

function playersPanel(heading, items) {
  return `
    <p class="console-eyebrow">${esc(heading)}</p>
    <div class="players">
      ${items
        .map(
          (it) => `
        <div class="player">
          <div class="player-name">${esc(it.name)}</div>
          ${it.type ? `<span class="player-type">${esc(it.type)}</span>` : ""}
          ${it.note ? `<p class="player-note">${esc(it.note)} ${srcLink(it.source)}</p>` : ""}
        </div>`
        )
        .join("")}
    </div>`;
}

function investorsPanel(heading, items) {
  return `
    <p class="console-eyebrow">${esc(heading)}</p>
    <div class="inv">
      ${items
        .map(
          (it) => `
        <div class="inv-row">
          <div>
            <div class="inv-name">${esc(it.name)}</div>
            <div class="inv-role">${esc(it.role)} ${srcLink(it.source)}</div>
          </div>
          ${it.hq ? `<div class="inv-hq">${esc(it.hq)}</div>` : ""}
        </div>`
        )
        .join("")}
    </div>`;
}

function listPanel(heading, items) {
  if (!items || !items.length) return `<p class="console-eyebrow">${esc(heading)}</p><p class="console-empty">None identified yet.</p>`;
  return `
    <p class="console-eyebrow">${esc(heading)}</p>
    <div class="clist">
      ${items
        .map(
          (it) => `<div class="clist-item"><span class="marker">▸</span><span>${esc(it.text)} ${srcLink(it.source)}</span></div>`
        )
        .join("")}
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
      return `<p class="console-eyebrow">${esc(section.heading)}</p><p class="console-empty">—</p>`;
  }
}

/* ---------- page render ---------- */

function render(d) {
  const m = d.meta;
  const tierColor = `var(--tier-${m.tier})`;
  document.title = `${m.country} — Femtech report`;

  // Rating is step 0 (its narrative is the overview context), then the researched sections.
  const ratingStep = {
    id: "rating",
    heading: "Innovation rating",
    narrative: `${m.country} rates <strong>${TIER_LABEL[m.tier]}</strong> — ${m.score} out of 10 — on our women's-health-innovation scale (tiers run Nascent to Pioneering). The score weighs ecosystem depth, dedicated capital, policy, and national strategy.`,
    _panel: ratingPanel(m),
  };
  const steps = [ratingStep, ...d.sections];

  const stepsHTML = steps
    .map(
      (s, i) => `
    <section class="step" data-index="${i}" id="step-${esc(s.id)}">
      <div class="step-num"><span class="bar"></span>${String(i + 1).padStart(2, "0")} / ${String(steps.length).padStart(2, "0")}</div>
      <h2 class="step-heading">${esc(s.heading)}</h2>
      <p class="step-narrative">${s.narrative}</p>
    </section>`
    )
    .join("");

  const panelsHTML = steps
    .map((s, i) => `<div class="console-panel" data-index="${i}">${s._panel || renderVisual(s)}</div>`)
    .join("");

  const railHTML = steps
    .map(
      (s, i) =>
        `<button class="rail-dot" data-index="${i}" aria-label="${esc(s.heading)}"><span class="rail-label">${esc(s.heading)}</span></button>`
    )
    .join("");

  const sourcesHTML = (d.sources || [])
    .map(
      (s) =>
        `<a class="src-card" href="${esc(s.url)}" target="_blank" rel="noopener"><span class="n">${esc(s.label)}</span><span class="u">${esc(host(s.url))}</span></a>`
    )
    .join("");

  app.style.setProperty("--tier-color", tierColor);
  app.innerHTML = `
    <div class="rpt-topbar">
      <a class="rpt-back" href="/reports/">← All reports</a>
      <span class="rpt-topbar-title">Femtech ecosystem dossier</span>
      <button class="rpt-share" id="rpt-share">Copy link</button>
    </div>

    <header class="rpt-hero">
      <p class="rpt-eyebrow">Women's health innovation · ${esc(m.country)}</p>
      <div class="rpt-hero-grid">
        <div>
          <div class="rpt-flag">${m.flag || ""}</div>
          <h1 class="rpt-title">${esc(m.country)}</h1>
          <p class="rpt-overview">${esc(d.overview)}</p>
        </div>
        <div class="rpt-hero-side">
          <span class="tier-badge" style="--tier-color:${tierColor}"><span class="tier-dot"></span>${TIER_LABEL[m.tier]} · ${m.score}/10</span>
        </div>
      </div>
    </header>
    <div class="rpt-herometa">
      <span>Tier range <b>${TIER_RANGE[m.tier] || "—"}</b></span>
      <span>Updated <b>${esc(m.lastUpdated)}</b></span>
      <span>Sources <b>${(d.sources || []).length}</b></span>
      <span>Sections <b>${d.sections.length}</b></span>
    </div>

    <div class="rpt-scrolly">
      <div class="rpt-narrative">${stepsHTML}</div>
      <div class="rpt-console-col"><div class="rpt-console">${panelsHTML}</div></div>
    </div>

    <nav class="rpt-rail" aria-label="Report sections">${railHTML}</nav>

    <section class="rpt-sources">
      <h2>Sources & references</h2>
      <p class="sub">Every claim above traces back here</p>
      <div class="src-grid">${sourcesHTML}</div>
    </section>
    <footer class="rpt-foot">
      Researched and compiled for the <a href="/">Global Femtech Map</a> by Gigi Kenneth. Figures reflect public reporting as of ${esc(m.lastUpdated)}; corrections welcome.
    </footer>`;

  wireScrolly(steps.length);
  wireShare();
}

function wireScrolly(n) {
  const stepEls = [...document.querySelectorAll(".step")];
  const panelEls = [...document.querySelectorAll(".console-panel")];
  const dotEls = [...document.querySelectorAll(".rail-dot")];
  let active = -1;

  const setActive = (i) => {
    if (i === active || i < 0) return;
    active = i;
    stepEls.forEach((el, k) => el.classList.toggle("is-active", k === i));
    panelEls.forEach((el, k) => el.classList.toggle("is-active", k === i));
    dotEls.forEach((el, k) => el.classList.toggle("is-active", k === i));
  };

  const io = new IntersectionObserver(
    (entries) => {
      // pick the entry nearest the viewport middle among those intersecting
      const vis = entries.filter((e) => e.isIntersecting);
      if (!vis.length) return;
      const mid = window.innerHeight / 2;
      let best = null, bestDist = Infinity;
      for (const el of stepEls) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDist) { bestDist = d; best = el; }
      }
      if (best) setActive(+best.dataset.index);
    },
    { rootMargin: "-40% 0px -40% 0px", threshold: [0, 0.5, 1] }
  );
  stepEls.forEach((el) => io.observe(el));

  // also recompute on plain scroll (covers fast scrolls / short steps)
  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const mid = window.innerHeight / 2;
        let best = null, bestDist = Infinity;
        for (const el of stepEls) {
          const r = el.getBoundingClientRect();
          const d = Math.abs(r.top + r.height / 2 - mid);
          if (d < bestDist) { bestDist = d; best = el; }
        }
        if (best) setActive(+best.dataset.index);
        ticking = false;
      });
    },
    { passive: true }
  );

  dotEls.forEach((dot) =>
    dot.addEventListener("click", () => {
      stepEls[+dot.dataset.index]?.scrollIntoView({ behavior: "smooth", block: "center" });
    })
  );

  setActive(0);
}

function wireShare() {
  const btn = document.getElementById("rpt-share");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      btn.textContent = "Copied ✓";
      setTimeout(() => (btn.textContent = "Copy link"), 1600);
    } catch {
      btn.textContent = location.href;
    }
  });
}
