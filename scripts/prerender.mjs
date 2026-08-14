// Post-build: turn each report JSON into a real static HTML page at
// dist/reports/<slug>/index.html, with full content + head meta baked in so
// crawlers and generative engines get the report without running JS.
// Also writes dist/sitemap.xml with the pretty URLs.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { renderReportBody, reportMeta, esc, SITE } from "../src/report-render.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "src", "data", "reports");
const dist = join(root, "dist");

const template = readFileSync(join(dist, "report.html"), "utf8");
const jsonEscape = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");

const slugs = [];
for (const f of readdirSync(dataDir)) {
  if (!f.endsWith(".json") || f.startsWith("_")) continue;
  const data = JSON.parse(readFileSync(join(dataDir, f), "utf8"));
  const slug = data.meta.slug;
  const meta = reportMeta(data);
  const body = renderReportBody(data);

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

console.log(`prerendered ${slugs.length} report pages + sitemap (${urls.length} urls)`);
