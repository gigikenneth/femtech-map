import "./style.css";
import { inject } from "@vercel/analytics";
import { ping, trackReportClicks } from "./ping.js";
import { initContribute } from "./contribute.js";
import { geoEquirectangular, geoPath, geoGraticule10 } from "d3-geo";

inject();
ping();
trackReportClicks();
initContribute();
import { select, pointer } from "d3-selection";
import { zoom, zoomIdentity } from "d3-zoom";
import { feature } from "topojson-client";
import worldTopo from "world-atlas/countries-110m.json";
import seed from "./data/initiatives.json";
import more from "./data/more.json";
import podcast from "./data/podcast.json";
import communities from "./data/communities.json";
import programs from "./data/programs.json";
import latam from "./data/latam.json";
import landscapeGlobal from "./data/landscape-global.json";
import { CONTINENT_OF } from "./data/continents.js";
import { meta } from "./data/meta.js";
import { t, LANG, LANGS, setLang, applyStatic } from "./i18n.js";

// Localise static chrome + build the language switcher before anything renders.
applyStatic();
const langSwitch = document.getElementById("lang-switch");
if (langSwitch) {
  langSwitch.innerHTML = Object.entries(LANGS)
    .map(([code, label]) => `<button type="button" data-lang="${code}"${code === LANG ? ' aria-current="true"' : ""}>${label}</button>`)
    .join("");
  langSwitch.addEventListener("click", (e) => {
    const l = e.target.closest("[data-lang]")?.dataset.lang;
    if (l && l !== LANG) setLang(l);
  });
}

// Live community submissions: approved rows served as JSON by an Apps Script web app.
// Set VITE_SUBMISSIONS_URL (Vercel env var / .env) to the web-app URL to enable.
let submissions = [];
const SUBMISSIONS_URL = import.meta.env.VITE_SUBMISSIONS_URL;
if (SUBMISSIONS_URL) {
  try {
    const res = await Promise.race([
      fetch(SUBMISSIONS_URL).then((r) => r.json()),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
    ]);
    if (Array.isArray(res)) {
      submissions = res.filter((d) => d && d.name && typeof d.lat === "number" && typeof d.lng === "number");
    }
  } catch (e) {
    console.warn("Community submissions feed unavailable, showing built-in data only:", e.message);
  }
}

// Merge datasets and drop duplicates by normalized name (seed wins, it carries podcast tags).
const seen = new Set();
const initiatives = [];
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
for (const d of [...seed, ...more, ...podcast, ...communities, ...programs, ...latam, ...landscapeGlobal, ...submissions]) {
  const k = norm(d.name);
  if (seen.has(k)) continue;
  seen.add(k);
  initiatives.push(d);
}

const CATS = {
  menstrual: { label: t("cat.menstrual"), color: "#ec6aa0" },
  maternal: { label: t("cat.maternal"), color: "#f0913f" },
  srh: { label: t("cat.srh"), color: "#b45cc4" },
  diagnostics: { label: t("cat.diagnostics"), color: "#2fb39a" },
  telehealth: { label: t("cat.telehealth"), color: "#4f93d9" },
  funding: { label: t("cat.funding"), color: "#e0a92e" },
};
const TIER = ["#e8e5f0", "#e4e0f7", "#c3b8ee", "#9d89e0", "#7259cf", "#4c33a6"]; // index 0 = no data

// Reconcile world-atlas country names with our data names.
const NAME_ALIAS = {
  "United States of America": "United States",
  "United Republic of Tanzania": "Tanzania",
  "Dem. Rep. Congo": "DRC",
  "Democratic Republic of the Congo": "DRC",
  "Côte d'Ivoire": "Côte d'Ivoire",
  "Ivory Coast": "Côte d'Ivoire",
  "Czechia": "Czech Republic",
  "Bosnia and Herz.": "Bosnia and Herzegovina",
  "Central African Rep.": "Central African Republic",
  "S. Sudan": "South Sudan",
  "Dominican Rep.": "Dominican Republic",
  "Eq. Guinea": "Equatorial Guinea",
  "eSwatini": "Eswatini",
};

// Shade countries by how many initiatives they hold, density, not a maturity ranking.
const countByCountry = new Map();
initiatives.forEach((d) => {
  if (d.region) return; // regional networks (e.g. LatAm) aren't tied to one country
  countByCountry.set(d.country, (countByCountry.get(d.country) || 0) + 1);
});

// A regional network spans many countries, so show its region, not a city pin-point.
const locLabel = (d) => (d.region ? `${d.region} · ${t("regional")}` : `${d.city}, ${d.country}`);

const AFRICA = new Set([
  "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cameroon",
  "Cape Verde", "Central African Republic", "Chad", "Comoros", "Congo-Brazzaville",
  "Côte d'Ivoire", "DRC", "Djibouti", "Egypt", "Equatorial Guinea", "Eritrea",
  "Eswatini", "Ethiopia", "Gabon", "Gambia", "Ghana", "Guinea", "Guinea-Bissau",
  "Kenya", "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", "Mali",
  "Mauritania", "Mauritius", "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria",
  "Rwanda", "Senegal", "Sierra Leone", "Somalia", "South Africa", "South Sudan",
  "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda", "Zambia", "Zimbabwe",
]);

// Countries with any initiative get one soft highlight; the rest stay neutral.
function shade(n) {
  return n ? TIER[2] : TIER[0];
}

initiatives.forEach((d) => {
  d.isAfrica = AFRICA.has(d.country);
  d.isPodcast = !!d.podcast;
  d.isRegional = !!d.region;
  d.continent = CONTINENT_OF[d.country] || null;
});

// ---------- state ----------
const state = {
  cats: new Set(Object.keys(CATS)),
  podcastOnly: false,
  query: "",
  country: null,
};

// ---------- map setup ----------
const mapEl = document.getElementById("map");
const svg = select(mapEl).append("svg").attr("preserveAspectRatio", "xMidYMid meet");
const g = svg.append("g");
const projection = geoEquirectangular();
const path = geoPath(projection);
const land = feature(worldTopo, worldTopo.objects.countries);
// Fit the map to inhabited land (excluding Antarctica) so it fills the container.
g.append("path").datum(geoGraticule10()).attr("class", "graticule");

const countriesSel = g
  .selectAll("path.country")
  .data(land.features)
  .join("path")
  .attr("class", "country")
  .attr("fill", (d) => shade(countByCountry.get(NAME_ALIAS[d.properties.name] || d.properties.name) || 0))
  .style("cursor", "pointer")
  .on("click", (e, d) => {
    const name = NAME_ALIAS[d.properties.name] || d.properties.name;
    openCountryList(name);
  });
countriesSel.append("title").text((d) => {
  const name = NAME_ALIAS[d.properties.name] || d.properties.name;
  const n = countByCountry.get(name) || 0;
  return n ? `${name} · ${n} initiative${n > 1 ? "s" : ""}` : name;
});

// pins layer
const pinsG = g.append("g").attr("class", "pins");
const tooltip = document.getElementById("tooltip");
const BASE_R = 4.5;

// Project each initiative and spiral-spread any that share a city, so zooming
// apart reveals every dot instead of one stacked pin.
function positionPins() {
  const clusters = new Map();
  initiatives.forEach((d) => {
    const p = projection([d.lng, d.lat]) || [-99, -99];
    d._p = p;
    const key = p[0].toFixed(1) + "," + p[1].toFixed(1);
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(d);
  });
  clusters.forEach((members) => {
    const [cx, cy] = members[0]._p;
    if (members.length === 1) { members[0]._x = cx; members[0]._y = cy; return; }
    members.forEach((d, i) => {
      const ang = i * 2.399963; // golden angle
      const rad = 4 + 2.4 * Math.sqrt(i);
      d._x = cx + Math.cos(ang) * rad;
      d._y = cy + Math.sin(ang) * rad;
    });
  });
  pins.attr("transform", (d) => `translate(${d._x},${d._y})`);
}

// Cover-fit the sphere so the map fills the container top-to-bottom, trimming
// only the (ocean) horizontal overflow — no letterbox bands.
const sphere = { type: "Sphere" };
function fitCover(w, h) {
  projection.fitSize([w, h], sphere);
  const b = path.bounds(sphere);
  const k = Math.max(w / (b[1][0] - b[0][0]), h / (b[1][1] - b[0][1]));
  projection.scale(projection.scale() * k);
  const b2 = path.bounds(sphere);
  const t = projection.translate();
  projection.translate([
    t[0] + (w - (b2[0][0] + b2[1][0])) / 2,
    t[1] + (h - (b2[0][1] + b2[1][1])) / 2,
  ]);
}

// Size the projection to the container and redraw; called on load and on resize.
function layout() {
  const w = Math.max(320, Math.floor(mapEl.clientWidth));
  const h = Math.max(320, Math.floor(mapEl.clientHeight));
  svg.attr("viewBox", `0 0 ${w} ${h}`);
  fitCover(w, h);
  g.select("path.graticule").attr("d", path);
  countriesSel.attr("d", path);
  positionPins();
  rescale(curK);
}

const pins = pinsG
  .selectAll("g.pin")
  .data(initiatives)
  .join("g")
  .attr("class", (d) => "pin" + (d.isPodcast ? " podcast" : "") + (d.isRegional ? " regional" : ""))
  .attr("transform", (d) => `translate(${d._x},${d._y})`)
  .on("mouseenter", showTip)
  .on("mousemove", moveTip)
  .on("mouseleave", hideTip)
  .on("click", (e, d) => openPanel(d));

// Regional networks get a dashed halo + a label so they read as a region, not a place.
const regional = pins.filter((d) => d.isRegional);
regional.append("circle").attr("class", "region-ring").attr("r", 14);
regional
  .append("text")
  .attr("class", "region-label")
  .attr("y", -19)
  .attr("text-anchor", "middle")
  .text((d) => d.region);

pins.filter((d) => d.isPodcast).append("circle").attr("class", "ring").attr("r", 8);
pins.append("circle").attr("class", "halo").attr("r", 9).attr("fill", (d) => CATS[d.category]?.color || "#ccc");
pins
  .append("circle")
  .attr("class", "core")
  .attr("r", 0)
  .attr("fill", (d) => CATS[d.category]?.color || "#ccc");

// bloom-in animation (staggered) unless reduced motion
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
pins.select("circle.core").each(function (d, i) {
  if (reduce) { this.setAttribute("r", BASE_R); return; }
  this.style.transition = "r 0.5s cubic-bezier(.22,1,.36,1)";
  setTimeout(() => this.setAttribute("r", BASE_R), 250 + i * 10);
});

// ---------- zoom: keep pins small and strokes crisp as you zoom in ----------
let curK = 1;
function rescale(k) {
  const s = 1 / k;
  pinsG.selectAll("circle.core").attr("r", BASE_R * s).attr("stroke-width", 1.1 * s);
  pinsG.selectAll("circle.halo").attr("r", 9 * s);
  pinsG.selectAll("circle.ring").attr("r", 8 * s).attr("stroke-width", 1.6 * s);
  pinsG.selectAll("circle.region-ring").attr("r", 14 * s).attr("stroke-width", 1.4 * s);
  pinsG.selectAll("text.region-label").attr("transform", `scale(${s})`);
  g.selectAll("path.country").attr("stroke-width", 0.4 * s);
  g.select("path.graticule").attr("stroke-width", 0.3 * s);
}
const zoomer = zoom().scaleExtent([1, 16]).on("zoom", (e) => {
  g.attr("transform", e.transform);
  if (e.transform.k !== curK) { curK = e.transform.k; rescale(curK); }
});
svg.call(zoomer);
document.getElementById("reset").onclick = () =>
  svg.transition().duration(500).call(zoomer.transform, zoomIdentity);

// Fullscreen the whole map experience; icon flips to a collapse glyph when active.
const fsBtn = document.getElementById("fullscreen");
const fsTarget = document.getElementById("app");
fsBtn.onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else fsTarget.requestFullscreen?.();
};
document.addEventListener("fullscreenchange", () => {
  const on = !!document.fullscreenElement;
  fsBtn.textContent = on ? "⤡" : "⤢";
  fsBtn.title = on ? "Exit fullscreen" : "Fullscreen";
});

// Collapse the sidebar to see just the map.
const stBtn = document.getElementById("sidebar-toggle");
stBtn.onclick = () => {
  const hidden = document.getElementById("app").classList.toggle("sidebar-hidden");
  stBtn.textContent = hidden ? "»" : "«";
  stBtn.title = hidden ? t("tool.show") : t("tool.hide");
  stBtn.setAttribute("aria-label", stBtn.title);
};

// Initial fit + refit whenever the map container resizes.
layout();
if (window.ResizeObserver) {
  new ResizeObserver(() => layout()).observe(mapEl);
} else {
  window.addEventListener("resize", layout);
}

// ---------- tooltip ----------
function showTip(e, d) {
  tooltip.innerHTML =
    `<div class="tt-name">${d.name}</div>` +
    `<div class="tt-meta">${CATS[d.category]?.label || ""} · ${locLabel(d)}</div>` +
    (d.isPodcast ? `<div class="tt-pod">${t("tt.heard")}</div>` : "");
  tooltip.classList.add("show");
  moveTip(e);
}
function moveTip(e) {
  const wrap = document.getElementById("map-wrap").getBoundingClientRect();
  tooltip.style.left = e.clientX - wrap.left + 14 + "px";
  tooltip.style.top = e.clientY - wrap.top + 14 + "px";
}
function hideTip() { tooltip.classList.remove("show"); }

// ---------- detail panel ----------
const panel = document.getElementById("panel");
document.getElementById("panel-close").onclick = closePanel;
function openPanel(d) {
  const cat = CATS[d.category] || { label: d.category, color: "#ccc" };
  const pod = d.podcast
    ? `<div class="p-podcast">
         <div class="pp-badge">🎙 BLUSH &amp; BLOOM${d.podcast.episode_number ? " · EP " + d.podcast.episode_number : ""}</div>
         <div class="pp-title">${d.podcast.episode_title || t("pod.featured")}</div>
         ${d.podcast.guest_name ? `<div style="font-size:13px;color:var(--ink-soft)">${t("pod.with", { name: d.podcast.guest_name })}</div>` : ""}
         ${d.podcast.episode_url ? `<a href="${d.podcast.episode_url}" target="_blank" rel="noopener">${t("pod.listen")}</a>` : ""}
       </div>`
    : "";
  document.getElementById("panel-body").innerHTML = `
    <span class="p-cat" style="background:${cat.color}33;color:var(--ink)"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:${cat.color}"></span>${cat.label}</span>
    <h2 class="p-name">${d.name}</h2>
    <p class="p-loc">${locLabel(d)}</p>
    <p class="p-desc">${d.description}</p>
    ${pod}
    <div class="p-meta">
      <div class="row"><span>${t("panel.type")}</span><span>${d.org_type || t("panel.org")}</span></div>
      <div class="row"><span>${d.isRegional ? t("panel.region") : t("panel.country")}</span><span>${d.isRegional ? d.region : d.country}</span></div>
      <div class="row"><span>${t("panel.category")}</span><span>${cat.label}</span></div>
    </div>
    ${d.url ? `<a class="p-visit" href="${d.url}" target="_blank" rel="noopener">${t("panel.visit", { name: d.name })}</a>` : ""}
    ${d.source ? `<span class="p-source">${t("panel.source")} <a href="${d.source}" target="_blank" rel="noopener">${new URL(d.source).hostname}</a></span>` : ""}
  `;
  hideTip();
  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
}
// Clicking a country lists every initiative in that country.
function openCountryList(country) {
  state.country = country;
  apply();
  const items = initiatives
    .filter(visible)
    .sort((a, b) => a.name.localeCompare(b.name));
  const rows = items
    .map((d) => {
      const c = CATS[d.category] || { color: "#ccc" };
      return `<button class="list-row" data-name="${encodeURIComponent(d.name)}">
        <span class="lr-dot" style="background:${c.color}"></span>
        <span class="lr-text">
          <span class="lr-name">${d.name}${d.isPodcast ? ' <span class="lr-mic">🎙</span>' : ""}</span>
          <span class="lr-loc">${d.city} · ${CATS[d.category]?.label || d.category}</span>
        </span>
      </button>`;
    })
    .join("");
  document.getElementById("panel-body").innerHTML = `
    <span class="p-cat" style="background:#ece8f6;color:var(--ink)">Country</span>
    <h2 class="p-name">${country}</h2>
    <p class="p-loc">${items.length} initiative${items.length !== 1 ? "s" : ""} mapped here</p>
    ${items.length ? `<div class="list">${rows}</div>` : `<p class="p-desc">${t("empty", { country })}</p>`}
  `;
  panel.querySelectorAll(".list-row").forEach((btn) => {
    btn.onclick = () => {
      const d = initiatives.find((x) => x.name === decodeURIComponent(btn.dataset.name));
      if (d) openPanel(d);
    };
  });
  hideTip();
  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
}
function closePanel() {
  panel.classList.remove("open");
  panel.setAttribute("aria-hidden", "true");
  if (state.country) { state.country = null; apply(); }
}
document.addEventListener("keydown", (e) => e.key === "Escape" && closePanel());

// ---------- filters UI ----------
const filtersEl = document.getElementById("filters");
Object.entries(CATS).forEach(([key, { label, color }]) => {
  const b = document.createElement("button");
  b.className = "chip";
  b.setAttribute("aria-pressed", "true");
  b.style.setProperty("--chip", color);
  b.innerHTML = `<span class="dot"></span>${label}`;
  b.onclick = () => {
    if (state.cats.has(key)) state.cats.delete(key);
    else state.cats.add(key);
    b.setAttribute("aria-pressed", state.cats.has(key));
    apply();
  };
  filtersEl.appendChild(b);
});

document.querySelectorAll(".toggle").forEach((btn) => {
  btn.onclick = () => {
    state.podcastOnly = !state.podcastOnly;
    btn.setAttribute("aria-pressed", state.podcastOnly);
    apply();
  };
});

document.getElementById("search").addEventListener("input", (e) => {
  state.query = e.target.value.trim().toLowerCase();
  apply();
});

// ---------- apply filters ----------
function visible(d) {
  if (!state.cats.has(d.category)) return false;
  if (state.country && d.country !== state.country) return false;
  if (state.podcastOnly && !d.isPodcast) return false;
  if (state.query) {
    const hay = `${d.name} ${d.country} ${d.city} ${CATS[d.category]?.label}`.toLowerCase();
    if (!hay.includes(state.query)) return false;
  }
  return true;
}
function apply() {
  let shown = 0;
  const countries = new Set();
  pins.classed("dimmed", (d) => {
    const v = visible(d);
    if (v) { shown++; countries.add(d.country); }
    return !v;
  });
  updateCounts(shown, countries.size);
}

// ---------- counts ----------
const countsEl = document.getElementById("counts");
function updateCounts(shown, countryCount) {
  countsEl.innerHTML = `
    <div class="count-card"><div class="count-num">${shown}</div><div class="count-label">${t("stat.initiatives")}</div></div>
    <div class="count-card accent"><div class="count-num">${countryCount}</div><div class="count-label">${t("stat.countries")}</div></div>
  `;
}

// disclaimer / meta
document.getElementById("disclaimer").textContent = t("disclaimer");

// ---------- hero ----------
const heroStats = [
  [initiatives.length, t("stat.initiatives")],
  [new Set(initiatives.map((d) => d.country)).size, t("stat.countries")],
  [new Set(initiatives.map((d) => d.continent).filter(Boolean)).size, t("stat.continents")],
];
document.getElementById("hero-stats").innerHTML = heroStats
  .map(([n, l]) => `<div class="hero-stat"><div class="hs-num">${n}</div><div class="hs-label">${l}</div></div>`)
  .join("");
const hero = document.getElementById("hero");
document.getElementById("hero-cta").onclick = () => hero.classList.add("hidden");

apply();
