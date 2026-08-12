import "./style.css";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { select, pointer } from "d3-selection";
import { zoom, zoomIdentity } from "d3-zoom";
import { feature } from "topojson-client";
import worldTopo from "world-atlas/countries-110m.json";
import initiatives from "./data/initiatives.json";
import countryData from "./data/countries.json";
import { meta } from "./data/meta.js";

const CATS = {
  menstrual: { label: "Menstrual & cycle", color: "#f5a3be" },
  maternal: { label: "Maternal & fertility", color: "#f6b98a" },
  srh: { label: "Sexual & reproductive", color: "#c3aee6" },
  diagnostics: { label: "Diagnostics & devices", color: "#9fd5be" },
  telehealth: { label: "Telehealth", color: "#a6c9e8" },
  funding: { label: "Funding & community", color: "#f2d888" },
};
const TIER = ["#efe3e8", "#f7dfe6", "#f0bcd0", "#e592b7", "#c76a9f", "#8f4576"]; // index 0 = no data

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

const tierByCountry = new Map(countryData.map((c) => [c.country, c.tier]));
const noteByCountry = new Map(countryData.map((c) => [c.country, c.note]));

const AFRICA = new Set(
  countryData.filter((c) => c.continent === "Africa").map((c) => c.country)
);
// also treat any initiative whose country is African-tagged
initiatives.forEach((d) => {
  d.isAfrica = AFRICA.has(d.country);
  d.isPodcast = !!d.podcast;
});

// ---------- state ----------
const state = {
  cats: new Set(Object.keys(CATS)),
  africaOnly: false,
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
    const t = tierByCountry.get(name);
    return t ? TIER[t] : TIER[0];
  })
  .append("title")
  .text((d) => {
    const name = NAME_ALIAS[d.properties.name] || d.properties.name;
    const note = noteByCountry.get(name);
    return note ? `${name} — ${note}` : name;
  });

// pins layer
const pinsG = g.append("g").attr("class", "pins");
const tooltip = document.getElementById("tooltip");

const pins = pinsG
  .selectAll("g.pin")
  .data(initiatives)
  .join("g")
  .attr("class", (d) => "pin" + (d.isPodcast ? " podcast" : ""))
  .attr("transform", (d) => {
    const p = projection([d.lng, d.lat]);
    return p ? `translate(${p[0]},${p[1]})` : "translate(-99,-99)";
  })
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
  const c = select(this);
  if (reduce) { c.attr("r", 4.5); return; }
  setTimeout(() => c.transition ? c.attr("r", 4.5) : null, 0);
  // simple CSS-free stagger via setTimeout scaling
  const node = this;
  node.style.transition = "r 0.5s cubic-bezier(.22,1,.36,1)";
  setTimeout(() => node.setAttribute("r", 4.5), 250 + i * 12);
});

// ---------- zoom ----------
const zoomer = zoom().scaleExtent([1, 9]).on("zoom", (e) => g.attr("transform", e.transform));
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
      <div class="row"><span>Type</span><span>${d.org_type || "—"}</span></div>
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
  b.style.background = color + "26";
  b.innerHTML = `<span class="dot" style="background:${color}"></span>${label}`;
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
    const k = btn.dataset.toggle === "africa" ? "africaOnly" : "podcastOnly";
    state[k] = !state[k];
    btn.setAttribute("aria-pressed", state[k]);
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
  if (state.africaOnly && !d.isAfrica) return false;
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
