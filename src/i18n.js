// Lightweight UI-chrome i18n. Data (initiative descriptions) stays English for now;
// this only localises the interface. Language is resolved once at boot; switching
// reloads the page (?lang=), so nothing needs live re-rendering. Add a locale by
// adding its dict below + an entry in LANGS.
const DICT = {
  en: {
    "lang.label": "Language",
    "hero.eyebrow": "A living atlas of women's health",
    "hero.title1": "Women's health,",
    "hero.title2": "built everywhere.",
    "hero.sub": "The founders, clinics and communities building better care for women, everywhere in the world.",
    "hero.cta": "Explore the map →",
    "brand.tagline": "Women's health innovation worldwide",
    "thesis": "A map of femtech and women's health innovation around the world, the startups, clinics and communities building better care for women, everywhere.",
    "reports.title": "Country ecosystem reports",
    "reports.sub": "Researched, cited femtech reports. 27 countries live.",
    "search.ph": "Search initiatives, countries…",
    "toggle.podcast": "🎙 Guests on the Blush & Bloom podcast",
    "filter.eyebrow": "Filter by category",
    "hint": "Tip: tap a country to see every initiative mapped there.",
    "mic.note": "🎙 A mic next to a name means Gigi has spoken with that founder on the Blush & Bloom podcast.",
    "submit.link": "+ Suggest an edit or addition",
    "tool.reset": "Reset view",
    "tool.fullscreen": "Fullscreen",
    "tool.hide": "Hide panel",
    "tool.show": "Show panel",
    "panel.close": "Close details",
    "stat.initiatives": "Initiatives",
    "stat.countries": "Countries",
    "stat.continents": "Continents",
    "cat.menstrual": "Menstrual & cycle",
    "cat.maternal": "Maternal & fertility",
    "cat.srh": "Sexual & reproductive",
    "cat.diagnostics": "Diagnostics & devices",
    "cat.telehealth": "Telehealth",
    "cat.funding": "Funding & community",
    "panel.type": "Type",
    "panel.country": "Country",
    "panel.region": "Region",
    "panel.category": "Category",
    "panel.org": "Organization",
    "panel.visit": "Visit {name} →",
    "panel.source": "Source:",
    "pod.featured": "Featured founder",
    "pod.with": "with {name}",
    "pod.listen": "Listen to the episode →",
    "tt.heard": "🎙 As heard on Blush & Bloom",
    "regional": "regional network",
    "empty": "Nothing mapped in {country} yet. This map is community-sourced, so add one.",
    "disclaimer": "A living, community-sourced map. Spotted a missing initiative or an error? It's meant to be edited, open a PR.",
  },
  fr: {
    "lang.label": "Langue",
    "hero.eyebrow": "Un atlas vivant de la santé des femmes",
    "hero.title1": "La santé des femmes,",
    "hero.title2": "construite partout.",
    "hero.sub": "Les fondatrices, cliniques et communautés qui améliorent les soins aux femmes, partout dans le monde.",
    "hero.cta": "Explorer la carte →",
    "brand.tagline": "L'innovation en santé des femmes dans le monde",
    "thesis": "Une carte de la femtech et de l'innovation en santé des femmes dans le monde : les startups, cliniques et communautés qui améliorent les soins aux femmes, partout.",
    "reports.title": "Rapports par pays",
    "reports.sub": "Rapports femtech documentés et sourcés. 27 pays en ligne.",
    "search.ph": "Rechercher des initiatives, des pays…",
    "toggle.podcast": "🎙 Invité·es du podcast Blush & Bloom",
    "filter.eyebrow": "Filtrer par catégorie",
    "hint": "Astuce : touchez un pays pour voir toutes les initiatives qui y sont cartographiées.",
    "mic.note": "🎙 Un micro à côté d'un nom signifie que Gigi a échangé avec cette fondatrice sur le podcast Blush & Bloom.",
    "submit.link": "+ Suggérer une modification ou un ajout",
    "tool.reset": "Réinitialiser la vue",
    "tool.fullscreen": "Plein écran",
    "tool.hide": "Masquer le panneau",
    "tool.show": "Afficher le panneau",
    "panel.close": "Fermer les détails",
    "stat.initiatives": "Initiatives",
    "stat.countries": "Pays",
    "stat.continents": "Continents",
    "cat.menstrual": "Menstruations & cycle",
    "cat.maternal": "Maternité & fertilité",
    "cat.srh": "Santé sexuelle & reproductive",
    "cat.diagnostics": "Diagnostics & dispositifs",
    "cat.telehealth": "Télésanté",
    "cat.funding": "Financement & communauté",
    "panel.type": "Type",
    "panel.country": "Pays",
    "panel.region": "Région",
    "panel.category": "Catégorie",
    "panel.org": "Organisation",
    "panel.visit": "Visiter {name} →",
    "panel.source": "Source :",
    "pod.featured": "Fondatrice à l'honneur",
    "pod.with": "avec {name}",
    "pod.listen": "Écouter l'épisode →",
    "tt.heard": "🎙 Entendu sur Blush & Bloom",
    "regional": "réseau régional",
    "empty": "Rien de cartographié en {country} pour l'instant. Cette carte est communautaire : ajoutez-en une.",
    "disclaimer": "Une carte vivante et communautaire. Une initiative manquante ou une erreur ? Elle est faite pour être corrigée : ouvrez une PR.",
  },
};

export const LANGS = { en: "EN", fr: "FR" };

export function getLang() {
  const u = new URLSearchParams(location.search).get("lang");
  const stored = u || localStorage.getItem("lang") || (navigator.language || "en").slice(0, 2);
  return DICT[stored] ? stored : "en";
}

export const LANG = getLang();

export function t(key, vars) {
  let s = (DICT[LANG] && DICT[LANG][key]) ?? DICT.en[key] ?? key;
  if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, vars[k]);
  return s;
}

export function setLang(l) {
  localStorage.setItem("lang", l);
  const p = new URLSearchParams(location.search);
  p.set("lang", l);
  location.search = p.toString();
}

// Translate static markup: [data-i18n] text, [data-i18n-ph] placeholder,
// [data-i18n-title] title+aria-label. Called once at boot.
export function applyStatic() {
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => el.setAttribute("placeholder", t(el.dataset.i18nPh)));
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.setAttribute("title", t(el.dataset.i18nTitle));
    el.setAttribute("aria-label", t(el.dataset.i18nTitle));
  });
}
