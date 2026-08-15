# Contributions setup (suggest an edit or addition)

The site has a **Contribute** modal on the map and every report ("Suggest an edit", "Suggest an edit or correction", "Suggest an edit or addition"). Submissions land in a Google Sheet you review by hand. Nothing publishes automatically. Free, no backend.

**Flow:** modal → POST to an Apps Script `/exec` → a row appended to your Sheet → you read it and apply changes.

Until `VITE_CONTRIBUTE_URL` is set, the Contribute buttons stay hidden, so the site works fine without this.

---

## 1. Create the Sheet + Apps Script

1. New Google Sheet (any name).
2. **Extensions ▸ Apps Script**. Delete the placeholder, paste the contents of [`apps-script/contributions.gs`](../apps-script/contributions.gs), save. (It creates a `Contributions` tab with headers on first submission.)

## 2. Deploy as a web app

**Deploy ▸ New deployment ▸ Web app.**
- Execute as: **Me**
- Who has access: **Anyone**

Authorize when prompted (Spreadsheet scope). Copy the **Web app URL** — it ends in `/exec`.

Test it: open the `/exec` URL in a browser — it should return `{"ok":true,"service":"femtech-contributions"}`.

## 3. Point the site at it

Set one environment variable (Vercel dashboard ▸ Project ▸ Settings ▸ Environment Variables, and your local `.env`):

```
VITE_CONTRIBUTE_URL=<the Apps Script /exec URL>
```

Redeploy once (read at build time). After that the Contribute buttons appear and submissions flow into the `Contributions` tab:

| Received | Type | Country / context | Subject | Message | Source URL | Email | Page | Status |
|----------|------|-------------------|---------|---------|-----------|-------|------|--------|

Work the queue by filtering **Status = New**; set it to something else once handled.

## Notes

- The browser POSTs JSON as `text/plain` (a "simple" CORS request, so no preflight and no CORS headers needed on the script). The response is opaque to the page, so the modal confirms optimistically; genuine network failures still surface an error.
- Spam: low risk at this scale, no captcha. If it starts, add a honeypot field or a shared secret checked in `doPost`.
