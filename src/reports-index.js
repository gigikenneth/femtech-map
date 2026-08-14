import "./report.css";
import index from "./data/reports/_index.json";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Ecosystem countries we plan to cover next, shown dimmed until published.
const PLANNED = ["Kenya", "South Africa", "Ghana", "Uganda", "Rwanda", "Tanzania", "Senegal", "Egypt"];

const root = document.getElementById("reports-index");
const published = new Set(index.map((r) => r.name));

const cards = index
  .map((r) => `
  <a class="idx-card" href="/report.html?country=${encodeURIComponent(r.slug)}">
    <span class="flag">${r.flag || ""}</span>
    <span class="cn">${esc(r.name)}</span>
    <p class="hook">${esc(r.hook)}</p>
    ${(r.focus || []).length ? `<div class="idx-tags">${r.focus.map((f) => `<span class="idx-tag">${esc(f)}</span>`).join("")}</div>` : ""}
    <span class="idx-cta">Read report &rarr;</span>
  </a>`)
  .join("");

const soon = PLANNED.filter((n) => !published.has(n))
  .map((n) => `
  <div class="idx-card idx-soon">
    <span class="cn">${esc(n)}</span>
    <p class="hook">Report in research.</p>
    <span class="idx-cta">Coming soon</span>
  </div>`)
  .join("");

root.innerHTML = `
  <div class="idx-wrap">
    <div class="idx-head">
      <h1 class="idx-title">Femtech ecosystem reports</h1>
      <p class="idx-sub">Researched, cited country reports on women's health innovation across Africa: the funding, the policy, the founders and the hubs. Starting with the deepest ecosystems and expanding.</p>
    </div>
    <div class="idx-grid">
      ${cards || `<div class="idx-empty">No reports published yet.</div>`}
      ${soon}
    </div>
    <p class="rpt-foot" style="padding:40px 0 0">Back to the <a href="/">Global Femtech Map</a>.</p>
  </div>`;
