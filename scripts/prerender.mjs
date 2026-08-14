// Post-build: turn each report JSON into a real static HTML page at
// dist/reports/<slug>/index.html, with full content + head meta baked in so
// crawlers and generative engines get the report without running JS.
// Also writes dist/sitemap.xml with the pretty URLs.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  renderReportBody, reportMeta, esc, SITE,
  relatedCountries, renderIndexBody, PLANNED,
} from "../src/report-render.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "src", "data", "reports");
const dist = join(root, "dist");

const template = readFileSync(join(dist, "report.html"), "utf8");
const jsonEscape = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");
const index = JSON.parse(readFileSync(join(dataDir, "_index.json"), "utf8"));

const slugs = [];
for (const f of readdirSync(dataDir)) {
  if (!f.endsWith(".json") || f.startsWith("_")) continue;
  const data = JSON.parse(readFileSync(join(dataDir, f), "utf8"));
  const slug = data.meta.slug;
  const meta = reportMeta(data);
  const body = renderReportBody(data, relatedCountries(index, slug));

  const headExtra =
    `<link rel="canonical" href="${meta.canonical}"/>` +
    `<meta property="og:url" content="${meta.canonical}"/>` +
    `<script type="application/ld+json">${jsonEscape(meta.jsonld)}</script>`;

  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[\s\S]*?("\s*\/?>)/, `$1${esc(meta.description)}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[\s\S]*?("\s*\/?>)/, `$1${esc(meta.title)}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[\s\S]*?("\s*\/?>)/, `$1${esc(meta.description)}$2`)
    .replace("</head>", `${headExtra}</head>`)
    .replace(
      '<main id="report"></main>',
      `<main id="report" data-prerendered="true">${body}</main>` +
        `<script id="report-data" type="application/json">${jsonEscape(data)}</script>`
    );

  const outDir = join(dist, "reports", slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);
  slugs.push({ slug, mod: `${data.meta.lastUpdated || "2026-08"}-01` });
}

// sitemap with pretty URLs
const today = "2026-08-15";
const urls = [
  { loc: `${SITE}/`, pri: "1.0", mod: today },
  { loc: `${SITE}/reports/`, pri: "0.9", mod: today },
  ...slugs.map((s) => ({ loc: `${SITE}/reports/${s.slug}/`, pri: "0.8", mod: s.mod })),
];
const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.mod}</lastmod><priority>${u.pri}</priority></url>`).join("\n") +
  "\n</urlset>\n";
writeFileSync(join(dist, "sitemap.xml"), xml);

// ----- reports index: bake the card grid + ItemList JSON-LD into the shell -----
const itemList = {
  "@context": "https://schema.org", "@type": "ItemList",
  name: "Femtech ecosystem reports by country",
  itemListElement: index.map((r, i) => ({
    "@type": "ListItem", position: i + 1,
    url: `${SITE}/reports/${r.slug}/`, name: `${r.name} femtech report`,
  })),
};
const idxFile = join(dist, "reports", "index.html");
const idxHtml = readFileSync(idxFile, "utf8")
  .replace(
    '<main id="reports-index"></main>',
    `<main id="reports-index">${renderIndexBody(index, PLANNED)}</main>`
  )
  .replace("</head>", `<script type="application/ld+json">${jsonEscape(itemList)}</script></head>`);
writeFileSync(idxFile, idxHtml);

// ----- home: fill the crawlable report-links nav in the hero -----
const heroLinks = index
  .map((r) => `<a href="/reports/${r.slug}/">${esc(r.name)}</a>`)
  .join("");
const homeFile = join(dist, "index.html");
writeFileSync(
  homeFile,
  readFileSync(homeFile, "utf8").replace(
    '<nav id="hero-reports" class="hero-reports" aria-label="Country ecosystem reports"></nav>',
    `<nav id="hero-reports" class="hero-reports" aria-label="Country ecosystem reports"><span class="hr-label">Read the reports:</span>${heroLinks}</nav>`
  )
);

// ----- llms.txt: plain-markdown site map for AI crawlers (GEO) -----
const llms =
  `# Global Femtech Map\n\n` +
  `> Researched, cited country reports on femtech and women's health innovation worldwide: the funding, the policy, the founders and the hubs. ${index.length} countries, deep coverage across Africa, expanding globally. By Gigi Kenneth.\n\n` +
  `Site: ${SITE}\n\n` +
  `## Country reports\n\n` +
  index.map((r) => `- [${r.name}](${SITE}/reports/${r.slug}/): ${r.hook}`).join("\n") +
  `\n\n## Index\n\n- [All reports](${SITE}/reports/)\n- [Interactive map](${SITE}/)\n`;
writeFileSync(join(dist, "llms.txt"), llms);

console.log(`prerendered ${slugs.length} reports + index + sitemap (${urls.length} urls) + llms.txt`);
