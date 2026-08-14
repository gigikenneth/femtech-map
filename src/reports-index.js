import "./report.css";
import index from "./data/reports/_index.json";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtUpdated = (ym) => {
  const [y, m] = String(ym || "").split("-");
  return m ? `Updated ${MONTHS[+m - 1]} ${y}` : "";
};

// Countries we plan to cover next as the map goes global.
const PLANNED = ["India", "Brazil", "Indonesia", "Pakistan", "Mexico", "Philippines"];

const root = document.getElementById("reports-index");
const published = new Set(index.map((r) => r.name));

const card = (r) => `
  <a class="idx-card" data-name="${esc(r.name.toLowerCase())}" data-focus="${esc((r.focus || []).join(" ").toLowerCase())}" href="/report.html?country=${encodeURIComponent(r.slug)}">
    <span class="flag">${r.flag || ""}</span>
    <span class="cn">${esc(r.name)}</span>
    <p class="hook">${esc(r.hook)}</p>
    ${(r.focus || []).length ? `<div class="idx-tags">${r.focus.map((f) => `<span class="idx-tag">${esc(f)}</span>`).join("")}</div>` : ""}
    <span class="idx-foot"><span class="idx-cta">Read report &rarr;</span><span class="idx-updated">${esc(fmtUpdated(r.lastUpdated))}</span></span>
  </a>`;

const soon = PLANNED.filter((n) => !published.has(n))
  .map((n) => `
  <div class="idx-card idx-soon" data-name="${esc(n.toLowerCase())}" data-focus="">
    <span class="cn">${esc(n)}</span>
    <p class="hook">Report in research.</p>
    <span class="idx-foot"><span class="idx-cta">Coming soon</span></span>
  </div>`)
  .join("");

root.innerHTML = `
  <div class="idx-wrap">
    <div class="idx-head">
      <h1 class="idx-title">Femtech ecosystem reports</h1>
      <p class="idx-sub">Researched, cited country reports on women's health innovation worldwide: the funding, the policy, the founders and the hubs. Deep coverage across Africa first, expanding globally.</p>
      <div class="idx-search">
        <input id="idx-search-input" type="search" placeholder="Search a country…" aria-label="Search countries" autocomplete="off" />
        <span class="idx-count" id="idx-count"></span>
      </div>
    </div>
    <div class="idx-grid" id="idx-grid">
      ${index.map(card).join("")}
      ${soon}
    </div>
    <p class="idx-empty" id="idx-empty" hidden>No country matches that search.</p>
    <p class="rpt-foot" style="padding:40px 0 0">Back to the <a href="/">Global Femtech Map</a>.</p>
  </div>`;

// client-side search filter
const input = document.getElementById("idx-search-input");
const grid = document.getElementById("idx-grid");
const empty = document.getElementById("idx-empty");
const count = document.getElementById("idx-count");
const cards = [...grid.querySelectorAll(".idx-card")];
const setCount = (n) => (count.textContent = `${n} ${n === 1 ? "country" : "countries"}`);
setCount(index.length);

input.addEventListener("input", () => {
  const q = input.value.trim().toLowerCase();
  let shown = 0;
  for (const c of cards) {
    const hit = !q || c.dataset.name.includes(q) || c.dataset.focus.includes(q);
    c.hidden = !hit;
    if (hit && !c.classList.contains("idx-soon")) shown++;
  }
  empty.hidden = cards.some((c) => !c.hidden);
  setCount(q ? shown : index.length);
});
