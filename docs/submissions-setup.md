# Community submissions setup

Let anyone submit an initiative through a Google Form. You approve it in a Sheet, and it appears on the map live — no code change, no redeploy. Built on Google Forms + Sheets + Apps Script (all free).

**Flow:** Form → Sheet (you tick "Approved") → Apps Script serves approved rows as JSON → the map fetches and merges them.

---

## 1. Create the Google Form

New Google Form with these questions (order doesn't matter, but the **titles must match**, since the Apps Script reads columns by header):

| Question title | Type | Notes |
|----------------|------|-------|
| Organization name | Short answer | required |
| Type | Multiple choice | company, app, clinic, ngo, fund, community |
| Country | Short answer | required |
| City | Short answer | required (used to geocode coordinates) |
| Category | Multiple choice | Menstrual & cycle · Maternal & fertility · Sexual & reproductive health · Diagnostics & devices · Telehealth · Funding & community |
| Description | Paragraph | one factual sentence |
| Website | Short answer | the org's site |
| Source URL | Short answer | where the org can be verified |
| Email | Short answer | optional, for follow-up |

In the Form's **Responses** tab, click the Sheets icon to create/link a responses spreadsheet.

## 2. Add the approval column

In the linked Sheet, on the responses tab (default name `Form Responses 1`), add a new column with the header **`Approved`** and format it as a checkbox (Insert ▸ Checkbox). Only rows you tick will reach the map.

## 3. Add the Apps Script

In the Sheet: **Extensions ▸ Apps Script**. Delete the placeholder, paste the contents of [`apps-script/submissions.gs`](../apps-script/submissions.gs), and save.

(If your responses tab isn't named `Form Responses 1`, update `SHEET_NAME` at the top of the script.)

## 4. Deploy as a web app

**Deploy ▸ New deployment ▸ Web app.**
- Execute as: **Me**
- Who has access: **Anyone**

Authorize when prompted (it needs the Maps geocoding + Spreadsheet scopes). Copy the **Web app URL** — it ends in `/exec`.

Test it: open the `/exec` URL in a browser. With nothing approved it returns `[]`; approve a row, wait a few seconds, refresh, and you should see that row as JSON.

## 5. Point the map at it

Set two environment variables (Vercel dashboard ▸ Project ▸ Settings ▸ Environment Variables, and your local `.env`):

```
VITE_SUBMIT_URL=<your public Google Form link>
VITE_SUBMISSIONS_URL=<the Apps Script /exec URL>
```

Redeploy once (these are read at build time). After that:

- The **"Suggest an initiative"** button appears in the sidebar and links to your Form.
- The map fetches approved submissions on every load and merges them with the built-in data.
- **Approving a new row shows it on the map with no redeploy** — the feed is fetched live.

## Notes

- Coordinates are geocoded from `City, Country` by the Apps Script (cached 6h), so submitters never enter lat/lng.
- Submissions are tagged `confidence: "community"`.
- Duplicate names (case/punctuation-insensitive) are dropped, and built-in entries win, so a submission can't overwrite a curated one.
- If the feed is ever slow or down, the map times out after 4s and shows built-in data only.
- Moderation is entirely the `Approved` checkbox — nothing appears until you tick it.
