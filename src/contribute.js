// Unified "suggest an edit or addition" modal, shared by the map and the
// reports. Opened by any [data-contribute] element (optionally carrying
// data-country to prefill context). Posts the form to a Google Apps Script
// (VITE_CONTRIBUTE_URL) which appends a row to a review Sheet. No-op when the
// env var is unset: triggers stay hidden (see contribute.css).
import "./contribute.css";

const URL_ = import.meta.env.VITE_CONTRIBUTE_URL;

const modalHTML = `
  <div class="cb-modal" role="dialog" aria-modal="true" aria-labelledby="cb-title">
    <button class="cb-close" type="button" aria-label="Close">&times;</button>
    <div class="cb-body">
      <p class="cb-eyebrow">Contribute</p>
      <h2 class="cb-title" id="cb-title">Suggest an edit or addition</h2>
      <p class="cb-sub">Spotted something wrong, missing, or out of date<span class="cb-ctx-wrap"> in <span class="cb-ctx"></span></span>? Send it over with a source and it gets reviewed before anything changes.</p>
      <form class="cb-form">
        <div class="cb-field">
          <span class="cb-label">This is a</span>
          <div class="cb-seg">
            <input type="radio" name="cb-type" id="cb-t-cor" value="Correction" checked /><label for="cb-t-cor">Correction</label>
            <input type="radio" name="cb-type" id="cb-t-add" value="Addition" /><label for="cb-t-add">Addition</label>
            <input type="radio" name="cb-type" id="cb-t-oth" value="Other" /><label for="cb-t-oth">Other</label>
          </div>
        </div>
        <div class="cb-field">
          <label class="cb-label" for="cb-subject">Organisation or subject <span class="cb-opt">(optional)</span></label>
          <input class="cb-input" id="cb-subject" type="text" maxlength="120" placeholder="e.g. an initiative, a founder, a figure" />
        </div>
        <div class="cb-field">
          <label class="cb-label" for="cb-message">What should change or be added?</label>
          <textarea class="cb-textarea" id="cb-message" maxlength="1500" required placeholder="Describe the correction or addition."></textarea>
        </div>
        <div class="cb-field">
          <label class="cb-label" for="cb-source">Source URL <span class="cb-opt">(optional, but it helps)</span></label>
          <input class="cb-input" id="cb-source" type="url" maxlength="300" placeholder="https://" />
        </div>
        <div class="cb-field">
          <label class="cb-label" for="cb-email">Your email <span class="cb-opt">(optional, for follow-up)</span></label>
          <input class="cb-input" id="cb-email" type="email" maxlength="150" placeholder="you@example.com" />
        </div>
        <button class="cb-submit" type="submit">Send suggestion</button>
        <p class="cb-error" role="alert"></p>
        <p class="cb-foot">Coarse review by a human. Nothing publishes automatically.</p>
      </form>
    </div>
    <div class="cb-done" hidden>
      <div class="cb-done-mark">&checkmark;</div>
      <p class="cb-done-t">Thank you</p>
      <p class="cb-done-s">Your suggestion is in. It gets reviewed before anything on the site changes.</p>
      <button class="cb-submit cb-done-close" type="button">Close</button>
    </div>
  </div>`;

export function initContribute() {
  if (!URL_) return; // triggers stay hidden
  document.body.classList.add("cb-on");

  const overlay = document.createElement("div");
  overlay.className = "cb cb-overlay";
  overlay.innerHTML = modalHTML;
  document.body.appendChild(overlay);

  const q = (s) => overlay.querySelector(s);
  const form = q(".cb-form");
  const ctxWrap = q(".cb-ctx-wrap");
  const ctxEl = q(".cb-ctx");
  const bodyEl = q(".cb-body");
  const doneEl = q(".cb-done");
  const errEl = q(".cb-error");
  const submitBtn = q(".cb-submit");
  let country = "";
  let lastFocus = null;

  const close = () => {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  };
  const open = (trigger) => {
    lastFocus = trigger || document.activeElement;
    country = (trigger && trigger.dataset.country) || "";
    if (country) { ctxEl.textContent = country; ctxWrap.hidden = false; }
    else ctxWrap.hidden = true;
    // reset to the form view each open
    bodyEl.hidden = false; doneEl.hidden = true;
    form.reset(); errEl.textContent = ""; submitBtn.disabled = false;
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    q("#cb-message").focus();
  };

  // delegated trigger opening (covers links added by hydration)
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest("[data-contribute]");
    if (!t) return;
    e.preventDefault();
    open(t);
  });

  q(".cb-close").addEventListener("click", close);
  q(".cb-done-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && overlay.classList.contains("open")) close(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = q("#cb-message").value.trim();
    if (!message) { q("#cb-message").focus(); return; }
    submitBtn.disabled = true; submitBtn.textContent = "Sending…"; errEl.textContent = "";

    const payload = {
      type: overlay.querySelector('input[name="cb-type"]:checked').value,
      country: country || "General",
      subject: q("#cb-subject").value.trim(),
      message,
      source: q("#cb-source").value.trim(),
      email: q("#cb-email").value.trim(),
      url: location.href,
    };
    try {
      // text/plain keeps this a "simple" request (no CORS preflight); Apps
      // Script parses JSON from the body. Response is opaque, so we confirm
      // optimistically and only surface genuine network failures.
      await fetch(URL_, {
        method: "POST",
        mode: "no-cors", // Apps Script sets no CORS headers; opaque response is expected
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      bodyEl.hidden = true; doneEl.hidden = false;
      q(".cb-done-close").focus();
    } catch {
      errEl.textContent = "Couldn't send just now. Check your connection and try again.";
      submitBtn.disabled = false; submitBtn.textContent = "Send suggestion";
    }
  });
}
