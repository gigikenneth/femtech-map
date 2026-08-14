// Schema + citation check for country reports. Run: node test-reports.mjs
// Fails (non-zero exit) if any report is malformed or makes an unsourced claim.
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const dir = join(dirname(fileURLToPath(import.meta.url)), "src", "data", "reports");
const KINDS = ["timeline", "funding", "players", "investors", "list"];
let failures = 0;
const bad = (f, msg) => { console.error(`✗ ${f}: ${msg}`); failures++; };
const isUrl = (u) => typeof u === "string" && /^https?:\/\//.test(u);

const files = readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
if (!files.length) bad("(dir)", "no report files found");

for (const f of files) {
  let d;
  try { d = JSON.parse(readFileSync(join(dir, f), "utf8")); }
  catch (e) { bad(f, "invalid JSON: " + e.message); continue; }

  const m = d.meta || {};
  if (!m.country || !m.slug || !m.flag) bad(f, "meta missing country/slug/flag");
  if (f !== `${m.slug}.json`) bad(f, `filename must match slug (${m.slug}.json)`);
  if (!d.overview) bad(f, "missing overview");
  // hero stats, when present, must be sourced
  for (const s of m.stats || []) if (!isUrl(s.source)) bad(f, `stat without valid source: ${s.value}`);

  for (const s of d.sections || []) {
    if (!s.id || !s.heading) bad(f, "section missing id/heading");
    const kind = s.visual?.kind;
    if (!KINDS.includes(kind)) { bad(f, `section ${s.id}: bad visual.kind ${kind}`); continue; }
    for (const it of s.visual.items || []) {
      // every factual item must cite a source (whitepapers/news/funding/etc.)
      if (!isUrl(it.source)) bad(f, `section ${s.id}: item without valid source → ${it.text || it.company || it.name}`);
    }
  }

  if (!Array.isArray(d.sources) || !d.sources.length) bad(f, "missing sources[]");
  for (const s of d.sources || []) if (!isUrl(s.url)) bad(f, `source without valid url: ${s.label}`);
}

if (failures) { console.error(`\n${failures} problem(s) found.`); process.exit(1); }
console.log(`✓ ${files.length} report(s) valid, all claims sourced.`);
