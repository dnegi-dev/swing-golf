# Swing Golf

Scorecard für 18 Bahnen. Eine einzige HTML-Datei, kein Server, kein Build-Schritt,
keine Anmeldung, keine externen Requests. Alle Runden liegen im `localStorage`
des Geräts.

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

`index.html` per AirDrop, Mail oder Messenger aufs Gerät schicken, in der
Dateien-App ablegen und von dort öffnen. Am Desktop reicht ein Doppelklick.

Zwei Dinge, die man dabei wissen sollte:

- **Kein Home-Screen-Icon.** iOS bietet *Teilen → Zum Home-Bildschirm* nur für
  Seiten an, die über http(s) geladen wurden, nicht für lokale Dateien.
- **Die Historie ist nicht garantiert.** Safari räumt den Speicher von
  `file://`-Seiten unzuverlässig auf. Die laufende Runde übersteht das Schließen
  der App in der Regel, aber verlassen sollte man sich darauf nicht.

Wer beides braucht, legt die Datei auf irgendeinen https-Host (GitHub Pages,
Netlify, eigener Webspace) und öffnet sie von dort. Dann gibt es ein Icon, die
App startet ohne Safari-Leiste und die Runden bleiben stabil liegen. Ein
Deploy-Workflow liegt bewusst nicht bei — das Repo ist privat, und Pages würde
die Seite öffentlich stellen.

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
