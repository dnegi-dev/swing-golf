/* =========================================================================
   Einstellungen
   ========================================================================= */

const THEMES = ["auto", "light", "dark"];
const THEME_LABELS = { auto: "Automatisch", light: "Hell", dark: "Dunkel" };

function normalizeSettings(raw){
  const s = raw && typeof raw === "object" ? raw : {};
  return { theme: THEMES.includes(s.theme) ? s.theme : "auto" };
}

/* "auto" heisst: dem Geraet folgen. Die Stylesheet-Regeln haengen an
   data-theme, deshalb wird das Attribut immer gesetzt -- auch fuer auto,
   damit die Media Query greift. */
function applyTheme(theme){
  document.documentElement.setAttribute("data-theme",
    THEMES.includes(theme) ? theme : "auto");
}

