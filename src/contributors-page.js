import "./style.css";
import contributors from "./data/contributors.json";
import { t, applyStatic } from "./i18n.js";

applyStatic();

const el = document.getElementById("contributors-page");
const rows = contributors
  .map((c) => {
    const name = c.url ? `<a href="${c.url}" target="_blank" rel="noopener">${c.name}</a>` : c.name;
    return `<li><span class="cw-name">${name}</span>${c.note ? `<span class="cw-note">${c.note}</span>` : ""}</li>`;
  })
  .join("");

el.innerHTML = `
  <div class="cw-wrap">
    <a class="cw-back" href="/">← ${t("back.map")}</a>
    <h1 class="cw-title">${t("contrib.title")}</h1>
    <p class="cw-intro">${t("contrib.intro")}</p>
    <ul class="cw-list">${rows}</ul>
  </div>`;
