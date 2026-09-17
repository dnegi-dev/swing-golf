# Swing Golf

Scorecard für 18 Bahnen. Eine einzige HTML-Datei, kein Server, keine Anmeldung,
keine externen Requests. Alle Runden liegen im `localStorage` des Geräts.

## Was die App kann

- **Runde anlegen** — Platzname, Datum, 1–6 Spieler, Par je Bahn (Standard 72,
  jede Bahn per Tipp auf 3/4/5/6 änderbar).
- **Bahn für Bahn zählen** — großes −/+ je Spieler, Par der Bahn, laufender Stand
  gegen Par. Der erste Tipp auf `+` setzt direkt auf Par; das ist der häufigste
  Wert und spart unterwegs ein paar Tipper.
- **Scorekarte** — vollständige Karte mit Out/In/Gesamt, Schläge nach Birdie,
  Par, Bogey eingefärbt. Par lässt sich hier auch mitten in der Runde korrigieren.
- **Endstand** — Platzierung nach Schlägen zu Par, dazu die Zählung von
  Hole-in-One bis Doppelbogey.
- **Historie** — gespielte Runden bleiben auf dem Gerät und lassen sich wieder
  öffnen oder löschen.

Nicht dabei: Handicap/Netto, Stableford, Abgleich zwischen mehreren Geräten.

## Aufs iPhone bringen

**Mit App-Icon (empfohlen).** Die Datei muss einmal über https erreichbar sein —
dafür liegt `.github/workflows/pages.yml` bei. In den Repo-Einstellungen unter
*Pages → Source: GitHub Actions* einschalten, dann die veröffentlichte Adresse in
Safari öffnen und *Teilen → Zum Home-Bildschirm*. Danach läuft die App offline,
startet ohne Safari-Leiste und behält ihre Runden.

**Ohne Icon.** `index.html` per AirDrop oder Mail aufs Gerät schicken, in der
Dateien-App ablegen und von dort öffnen. Funktioniert, hat aber zwei Haken: iOS
bietet *Zum Home-Bildschirm* für lokale Dateien nicht an, und es räumt den
Speicher von `file://`-Seiten unzuverlässig auf — die Rundenhistorie kann
verschwinden. Wer die Historie braucht, nimmt den Weg über Pages.

Am Desktop reicht ein Doppelklick auf die Datei.

## Entwicklung

Es gibt keinen Build-Schritt und keine Abhängigkeiten. `index.html` im Editor
ändern, Datei im Browser neu laden, fertig.

Die Rechenfunktionen (`totalStrokes`, `toPar`, `scoreLabel`, `leaderboard`,
`normalizeRound`, Serialisierung) prüft ein eingebauter Selbsttest:

```
index.html?selftest=1
```

Er rendert statt der App eine Liste der Prüfungen und färbt Fehlschläge rot;
der Seitentitel meldet das Ergebnis, sodass sich das auch headless auswerten
lässt. Der Selbsttest gehört bewusst in dieselbe Datei — eine zweite Datei hätte die
eine Bedingung gebrochen, unter der die App aufs Telefon kommt.
