/**
 * Global Femtech Map — submissions endpoint.
 *
 * Serves APPROVED Google Form submissions as JSON in the map's schema, geocoding
 * each "City, Country" to coordinates so submitters never enter lat/lng.
 *
 * Setup (see docs/submissions-setup.md):
 *   1. Create the Google Form (fields below) and link it to a responses Sheet.
 *   2. Add an "Approved" checkbox column to the responses tab.
 *   3. Extensions ▸ Apps Script, paste this file.
 *   4. Deploy ▸ New deployment ▸ Web app ▸ Execute as: Me ▸ Who has access: Anyone.
 *   5. Copy the /exec URL into VITE_SUBMISSIONS_URL (Vercel env + local .env), redeploy.
 *
 * Expected column headers (case-insensitive; extra columns are ignored):
 *   Timestamp | Organization name | Type | Country | City | Category |
 *   Description | Website | Source URL | Email | Approved
 */

const SHEET_NAME = 'Form Responses 1'; // rename if your responses tab differs

const CATEGORY_MAP = {
  'menstrual & cycle': 'menstrual',
  'maternal & fertility': 'maternal',
  'sexual & reproductive health': 'srh',
  'diagnostics & devices': 'diagnostics',
  'telehealth': 'telehealth',
  'funding & community': 'funding',
};

function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map((h) => String(h).trim().toLowerCase());
  const col = (name) => headers.indexOf(name);

  const idx = {
    name: col('organization name'),
    type: col('type'),
    country: col('country'),
    city: col('city'),
    category: col('category'),
    description: col('description'),
    website: col('website'),
    source: col('source url'),
    approved: col('approved'),
  };

  const out = [];
  for (const row of values) {
    if (idx.approved === -1 || !isTrue(row[idx.approved])) continue;

    const name = str(row[idx.name]);
    const country = str(row[idx.country]);
    const city = str(row[idx.city]);
    if (!name || !country || !city) continue;

    const coords = geocode(city + ', ' + country);
    if (!coords) continue;

    out.push({
      name: name,
      org_type: (str(row[idx.type]) || 'company').toLowerCase(),
      country: country,
      city: city,
      lat: coords.lat,
      lng: coords.lng,
      category: CATEGORY_MAP[str(row[idx.category]).toLowerCase()] || 'srh',
      description: str(row[idx.description]) || (name + ' — community-submitted initiative.'),
      url: str(row[idx.website]),
      source: str(row[idx.source]) || str(row[idx.website]),
      confidence: 'community',
    });
  }

  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function geocode(query) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(query);
  if (cached) return JSON.parse(cached);
  try {
    const res = Maps.newGeocoder().geocode(query);
    if (res.status === 'OK' && res.results.length) {
      const loc = res.results[0].geometry.location;
      const coords = { lat: loc.lat, lng: loc.lng };
      cache.put(query, JSON.stringify(coords), 21600); // 6h
      return coords;
    }
  } catch (e) {
    // geocode quota or transient error — skip this row this cycle
  }
  return null;
}

function str(v) {
  return String(v == null ? '' : v).trim();
}

function isTrue(v) {
  const s = String(v).trim().toLowerCase();
  return v === true || s === 'true' || s === 'yes' || s === '✓' || s === 'x';
}
