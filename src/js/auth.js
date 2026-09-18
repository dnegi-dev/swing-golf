/* =========================================================================
   Anmeldung
   -------------------------------------------------------------------------
   Das hier ist eine Huerde, keine Zugangskontrolle. Benutzername und
   Passwort stehen unveraendert im Quelltext der ausgelieferten Datei, und
   die Datei kann jeder abrufen. Wer hineinsehen will, sieht hinein. Fuer
   echten Schutz muesste die Datei gar nicht erst oeffentlich liegen.

   Der Vergleich selbst ist frei von DOM und Speicher, damit der Selbsttest
   ihn direkt pruefen kann.
   ========================================================================= */

const AUTH_KEY = "swing-golf:auth";
const AUTH_USER = "admin";
const AUTH_PASS = "admin";

/* Beim Benutzernamen fliegen Leerzeichen raus -- iOS haengt beim Autofill
   gern eines an. Das Passwort bleibt, wie es getippt wurde: ein Leerzeichen
   darin waere Absicht. */
function credentialsOk(user, pass){
  return String(user == null ? "" : user).trim() === AUTH_USER
      && String(pass == null ? "" : pass) === AUTH_PASS;
}

/* Eigener Schluessel, absichtlich neben den Runden statt darin: serialize()
   wandert per "Als JSON sichern" in eine Datei, die man weitergibt. Ein
   Anmelde-Flag hat dort nichts verloren. */
function loadUnlocked(){
  try { return localStorage.getItem(AUTH_KEY) === "1"; }
  catch { return false; }
}

function saveUnlocked(on){
  try {
    if (on) localStorage.setItem(AUTH_KEY, "1");
    else localStorage.removeItem(AUTH_KEY);
    return true;
  } catch { return false; }
}
