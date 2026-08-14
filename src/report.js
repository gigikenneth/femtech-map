import "./report.css";
import { renderReportBody, reportMeta, renderNotFound, relatedCountries } from "./report-render.js";
import index from "./data/reports/_index.json";

const app = document.getElementById("report");

// slug from the pretty path (/reports/<slug>/) or the legacy ?country= param.
function currentSlug() {
  const q = new URLSearchParams(location.search).get("country");
  if (q) return q.toLowerCase();
  const m = location.pathname.match(/\/reports\/([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]).toLowerCase() : "";
}

// Report JSON, lazily code-split so a page only downloads the country it needs.
const files = import.meta.glob("./data/reports/*.json");
async function loadData(slug) {
  const embedded = document.getElementById("report-data");
  if (embedded) { try { return JSON.parse(embedded.textContent); } catch { /* fall through */ } }
  const key = `./data/reports/${slug}.json`;
  if (files[key]) { const mod = await files[key](); return mod.default || mod; }
  return null;
}

function applyHeadMeta(d) {
  const { title, description, canonical, jsonld } = reportMeta(d);
  document.title = title;
  const upsert = (sel, tag, attrs) => {
    let el = document.head.querySelector(sel);
    if (!el) { el = document.createElement(tag); document.head.appendChild(el); }
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  };
  upsert('meta[name="description"]', "meta", { name: "description", content: description });
  upsert('link[rel="canonical"]', "link", { rel: "canonical", href: canonical });
  for (const [p, c] of [["og:type", "article"], ["og:site_name", "Global Femtech Map"], ["og:title", title], ["og:description", description], ["og:url", canonical]])
    upsert(`meta[property="${p}"]`, "meta", { property: p, content: c });
  upsert('meta[name="twitter:card"]', "meta", { name: "twitter:card", content: "summary_large_image" });
  let s = document.getElementById("rpt-jsonld");
  if (!s) { s = document.createElement("script"); s.id = "rpt-jsonld"; s.type = "application/ld+json"; document.head.appendChild(s); }
  s.textContent = JSON.stringify(jsonld);
}

(async () => {
  const slug = currentSlug();
  const prerendered = app.dataset.prerendered === "true";
  const data = await loadData(slug);

  if (!data) { app.innerHTML = renderNotFound(slug); return; }

  // Prerendered pages already carry the full HTML + head meta; just hydrate.
  if (!prerendered) {
    app.innerHTML = renderReportBody(data, relatedCountries(index, data.meta.slug));
    applyHeadMeta(data);
  }

  wireScrolly();
  wireShare();
})();

function wireScrolly() {
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
