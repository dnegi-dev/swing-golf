#!/usr/bin/env node
/* =========================================================================
   Bundler: aus src/ wird eine einzige dist/index.html

   Die App muss als eine Datei lokal laufen -- ohne Server, ohne Netz, von
   iOS aus geoeffnet. Getrennte Quellen waeren dort nicht erreichbar, also
   fuegt dieser Schritt sie zusammen. Keine Abhaengigkeiten: was die App
   nicht braucht, soll auch der Build nicht brauchen.
   ========================================================================= */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "dist", "index.html");

/* Reihenfolge ist Bedeutung: die Dateien sind Abschnitte eines Moduls, kein
   Modulgraph. Definitionen muessen stehen, bevor boot.js sie aufruft. */
const JS_FILES = [
  "js/model.js",
  "js/derive.js",
  "js/settings.js",
  "js/auth.js",
  "js/storage.js",
  "js/state.js",
  "js/render.js",
  "js/actions.js",
  "js/selftest.js",
  "js/boot.js"
];

const fail = msg => { console.error("Build abgebrochen: " + msg); process.exit(1); };
const read = rel => {
  try { return readFileSync(join(SRC, rel), "utf8"); }
  catch { return fail(`${rel} fehlt`); }
};

/* -------------------------------------------------------------------------
   Gate 1: kein Ausbruch aus dem Container.
   Ein "</script>" im JS oder "</style>" im CSS beendet den Block schon im
   Parser -- der Rest der App landete dann als Text im Dokument.
   ------------------------------------------------------------------------- */
function assertNoBreakout(rel, text, closer){
  const i = text.toLowerCase().indexOf(closer);
  if (i !== -1){
    const line = text.slice(0, i).split("\n").length;
    fail(`${rel}:${line} enthaelt "${closer}" -- das bricht den Block auf. ` +
         `Aufteilen, z.B. "<\\/" schreiben.`);
  }
}

/* -------------------------------------------------------------------------
   Gate 2: keine externe Abhaengigkeit.
   Bisher fing das erst der Browser im CI. Hier faellt es schon beim Bauen
   auf, ohne Runner. data:-URIs sind erlaubt: der Namespace in unserem
   Favicon-SVG ist ein Bezeichner, kein Ladevorgang.
   ------------------------------------------------------------------------- */
function assertNoExternalRefs(html){
  const lines = html.split("\n");
  const hits = [];
  lines.forEach((line, n) => {
    /* data:-URIs ausblenden, bevor gesucht wird. Das Favicon traegt den
       SVG-Namespace http://www.w3.org/2000/svg im Inhalt -- ein Bezeichner,
       kein Ladevorgang. Das Anfuehrungszeichen des Attributs begrenzt die
       URI; die einfachen Anfuehrungszeichen darin duerfen nicht abbrechen. */
    const withoutData = line
      .replace(/=(["'])data:.*?\1/g, "")
      .replace(/url\(\s*data:[^)]*\)/g, "");
    const m = withoutData.match(/https?:\/\/[^\s"'<>)]+/g);
    if (m) hits.push(`  Zeile ${n + 1}: ${m.join(", ")}`);
  });
  if (hits.length){
    fail("externe Adresse im Bundle -- die App muss offline aus einer Datei " +
         "laufen:\n" + hits.join("\n"));
  }
}

/* ---------- Zusammensetzen ---------- */
const css = read("styles.css");
assertNoBreakout("styles.css", css, "</style>");

const js = JS_FILES.map(rel => {
  const text = read(rel);
  assertNoBreakout(rel, text, "</script>");
  return text;
}).join("");

let html = read("index.html");

/* Marker sind ganze Zeilen; der ersetzte Text bringt sein Zeilenende mit. */
const fill = (marker, text) => {
  const needle = `<!--build:${marker}-->\n`;
  if (!html.includes(needle)) fail(`Marker <!--build:${marker}--> fehlt in src/index.html`);
  html = html.replace(needle, () => text);
};

fill("css", css);
fill("js", js);
/* Inhaltsbausteine ergeben sich aus dem Geruest, nicht aus einer Liste hier:
   ein neuer Marker im Template zieht die passende Datei nach. */
for (const name of [...html.matchAll(/<!--build:content ([a-z0-9-]+)-->/g)].map(m => m[1])){
  const part = read(`content/${name}.html`);
  assertNoBreakout(`content/${name}.html`, part, "</script>");
  fill(`content ${name}`, part);
}

/* ---------- Gegenproben am Ergebnis ---------- */
const left = html.match(/<!--build:[^>]*-->/g);
if (left) fail("nicht ersetzte Marker: " + left.join(", "));
assertNoExternalRefs(html);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);

const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`dist/index.html geschrieben: ${kb} KB, ${html.split("\n").length - 1} Zeilen`);
