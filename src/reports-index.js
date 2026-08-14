import "./report.css";
import index from "./data/reports/_index.json";
import { renderIndexBody, PLANNED } from "./report-render.js";

const root = document.getElementById("reports-index");

// Prerendered pages already carry the grid HTML; only hydrate if it's an empty shell.
if (!root.querySelector(".idx-wrap")) root.innerHTML = renderIndexBody(index, PLANNED);

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
