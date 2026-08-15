/**
 * Global Femtech Map — contributions endpoint.
 *
 * Receives "suggest an edit or addition" submissions from the site's contribute
 * modal (map + reports) and appends each as a row to a review Sheet. You read
 * the Sheet and apply changes by hand; nothing publishes automatically.
 *
 * Setup (see docs/contributions-setup.md):
 *   1. New Google Sheet. Extensions ▸ Apps Script, paste this file, save.
 *   2. Deploy ▸ New deployment ▸ Web app ▸ Execute as: Me ▸ Who has access: Anyone.
 *   3. Copy the /exec URL into VITE_CONTRIBUTE_URL (Vercel env + local .env), redeploy.
 *
 * The site POSTs JSON as text/plain (a "simple" CORS request, no preflight):
 *   { type, country, subject, message, source, email, url }
 */

const TAB = 'Contributions';
const HEADERS = ['Received', 'Type', 'Country / context', 'Subject', 'Message', 'Source URL', 'Email', 'Page', 'Status'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(TAB);
  if (!sh) {
    sh = ss.insertSheet(TAB);
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const clip = (v, n) => String(v == null ? '' : v).slice(0, n);
    const message = clip(d.message, 1500).trim();
    if (!message) return json_({ ok: false, error: 'empty' });

    sheet_().appendRow([
      new Date(),
      clip(d.type, 30) || 'Other',
      clip(d.country, 80) || 'General',
      clip(d.subject, 120),
      message,
      clip(d.source, 300),
      clip(d.email, 150),
      clip(d.url, 300),
      'New',
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// Health check: open the /exec URL in a browser, should say ok.
function doGet() {
  return json_({ ok: true, service: 'femtech-contributions' });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
