import "./style.css";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { select, pointer } from "d3-selection";
import { zoom, zoomIdentity } from "d3-zoom";
import { feature } from "topojson-client";
import worldTopo from "world-atlas/countries-110m.json";
import seed from "./data/initiatives.json";
import more from "./data/more.json";
import podcast from "./data/podcast.json";
import { meta } from "./data/meta.js";

// Merge datasets and drop duplicates by normalized name (seed wins, it carries podcast tags).
const seen = new Set();
const initiatives = [];
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
for (const d of [...seed, ...more, ...podcast]) {
  const k = norm(d.name);
  if (seen.has(k)) continue;
  seen.add(k);
  initiatives.push(d);
}

const CATS = {
  menstrual: { label: "Menstrual & cycle", color: "#ec6aa0" },
  maternal: { label: "Maternal & fertility", color: "#f0913f" },
  srh: { label: "Sexual & reproductive", color: "#b45cc4" },
  diagnostics: { label: "Diagnostics & devices", color: "#2fb39a" },
  telehealth: { label: "Telehealth", color: "#4f93d9" },
  funding: { label: "Funding & community", color: "#e0a92e" },
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
initiatives.forEach((d) => countByCountry.set(d.country, (countByCountry.get(d.country) || 0) + 1));

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

function shade(n) {
  if (!n) return TIER[0];
  if (n >= 8) return TIER[5];
  if (n >= 5) return TIER[4];
  if (n >= 3) return TIER[3];
  if (n >= 2) return TIER[2];
  return TIER[1];
}

initiatives.forEach((d) => {
  d.isAfrica = AFRICA.has(d.country);
  d.isPodcast = !!d.podcast;
});

// ---------- state ----------
const state = {
  cats: new Set(Object.keys(CATS)),
  podcastOnly: false,
  query: "",
};

// ---------- map setup ----------
const mapEl = document.getElementById("map");
const svg = select(mapEl).append("svg").attr("viewBox", "0 0 960 500").attr("preserveAspectRatio", "xMidYMid meet");
const g = svg.append("g");
const projection = geoNaturalEarth1().scale(175).translate([480, 250]);
const path = geoPath(projection);
const land = feature(worldTopo, worldTopo.objects.countries);

g.append("path").datum(geoGraticule10()).attr("class", "graticule").attr("d", path);

g.selectAll("path.country")
  .data(land.features)
  .join("path")
  .attr("class", "country")
  .attr("d", path)
  .attr("fill", (d) => {
    const name = NAME_ALIAS[d.properties.name] || d.properties.name;
    return shade(countByCountry.get(name) || 0);
  })
  .append("title")
  .text((d) => {
    const name = NAME_ALIAS[d.properties.name] || d.properties.name;
    const n = countByCountry.get(name) || 0;
    return n ? `${name}, ${n} initiative${n > 1 ? "s" : ""}` : name;
  });

// pins layer
const pinsG = g.append("g").attr("class", "pins");
const tooltip = document.getElementById("tooltip");
const BASE_R = 4.5;

// Project each initiative, then spiral-spread any that share a city so zooming
// apart reveals every dot instead of a single stacked one.
const clusters = new Map();
initiatives.forEach((d) => {
  const p = projection([d.lng, d.lat]) || [-99, -99];
  const key = p[0].toFixed(1) + "," + p[1].toFixed(1);
  if (!clusters.has(key)) clusters.set(key, []);
  clusters.get(key).push({ d, p });
});
clusters.forEach((members) => {
  const [cx, cy] = members[0].p;
  if (members.length === 1) { members[0].d._x = cx; members[0].d._y = cy; return; }
  members.forEach(({ d }, i) => {
    const ang = i * 2.399963; // golden angle
    const rad = 4 + 2.4 * Math.sqrt(i);
    d._x = cx + Math.cos(ang) * rad;
    d._y = cy + Math.sin(ang) * rad;
  });
});

const pins = pinsG
  .selectAll("g.pin")
  .data(initiatives)
  .join("g")
  .attr("class", (d) => "pin" + (d.isPodcast ? " podcast" : ""))
  .attr("transform", (d) => `translate(${d._x},${d._y})`)
  .on("mouseenter", showTip)
  .on("mousemove", moveTip)
  .on("mouseleave", hideTip)
  .on("click", (e, d) => openPanel(d));

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

// ---------- tooltip ----------
function showTip(e, d) {
  tooltip.innerHTML =
    `<div class="tt-name">${d.name}</div>` +
    `<div class="tt-meta">${CATS[d.category]?.label || ""} · ${d.city}, ${d.country}</div>` +
    (d.isPodcast ? `<div class="tt-pod">🎙 As heard on Blush &amp; Bloom</div>` : "");
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
         <div class="pp-title">${d.podcast.episode_title || "Featured founder"}</div>
         ${d.podcast.guest_name ? `<div style="font-size:13px;color:var(--ink-soft)">with ${d.podcast.guest_name}</div>` : ""}
         ${d.podcast.episode_url ? `<a href="${d.podcast.episode_url}" target="_blank" rel="noopener">Listen to the episode →</a>` : ""}
       </div>`
    : "";
  document.getElementById("panel-body").innerHTML = `
    <span class="p-cat" style="background:${cat.color}33;color:var(--ink)"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:${cat.color}"></span>${cat.label}</span>
    <h2 class="p-name">${d.name}</h2>
    <p class="p-loc">${d.city}, ${d.country}</p>
    <p class="p-desc">${d.description}</p>
    ${pod}
    <div class="p-meta">
      <div class="row"><span>Type</span><span>${d.org_type || ", "}</span></div>
      <div class="row"><span>Country</span><span>${d.country}</span></div>
      <div class="row"><span>Category</span><span>${cat.label}</span></div>
    </div>
    ${d.url ? `<a class="p-visit" href="${d.url}" target="_blank" rel="noopener">Visit ${d.name} →</a>` : ""}
    ${d.source ? `<span class="p-source">Source: <a href="${d.source}" target="_blank" rel="noopener">${new URL(d.source).hostname}</a></span>` : ""}
  `;
  hideTip();
  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
}
function closePanel() {
  panel.classList.remove("open");
  panel.setAttribute("aria-hidden", "true");
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
  const africaShown = initiatives.filter((d) => d.isAfrica && visible(d)).length;
  countsEl.innerHTML = `
    <div class="count-card"><div class="count-num">${shown}</div><div class="count-label">Initiatives</div></div>
    <div class="count-card"><div class="count-num">${countryCount}</div><div class="count-label">Countries</div></div>
    <div class="count-card accent"><div class="count-num">${africaShown}</div><div class="count-label">In Africa</div></div>
  `;
}

// disclaimer / meta
document.getElementById("disclaimer").textContent = meta.disclaimer;

apply();
