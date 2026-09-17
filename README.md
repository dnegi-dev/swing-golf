# Swing Golf

**→ https://dnegi-dev.github.io/swing-golf/**

Scorecard für 6 bis 36 Bahnen. Eine einzige HTML-Datei, kein Server, kein Build-Schritt,
keine Anmeldung, keine externen Requests. Alle Runden liegen im `localStorage`
des Geräts.

## Was die App kann

- **Startseite, die eine Sache zeigt** — läuft eine Runde, steht sie oben mit
  Bahn, Fortschritt und Stand; sonst nur der Weg in eine neue. Alles andere
  liegt hinter der Navigationsleiste unten: *Spielen · Runden · Statistik · Mehr*.
- **Vorlage wählen** — zuerst die Form: *Golfplatz 18/9 Loch*, *Swingolf 12/9
  Bahnen*, oder ein Platz, den du schon gespielt hast. Der bringt Bahnenzahl,
  Par und Stroke-Index mit.
- **Bahnenzahl frei** — 1 bis 36, per −/+ oder Schnellwahl 6/9/12/18. Vorhandene
  Bahnen behalten ihr Par, neue bekommen das häufigste Par dieser Runde: wer auf
  einem Platz mit zwölfmal Par 3 eine Bahn ergänzt, will dort keine Par 5.
- **Runde anlegen** — Platzname, Datum, 1–6 Spieler, Par je Bahn per Tipp auf
  3/4/5/6 änderbar.
- **Bahn für Bahn zählen** — großes −/+ je Spieler, Par der Bahn, laufender Stand
  gegen Par. Der erste Tipp auf `+` setzt direkt auf Par; das ist der häufigste
  Wert und spart unterwegs ein paar Tipper.
- **Scorekarte** — vollständige Karte mit Out/In/Gesamt, Schläge nach Birdie,
  Par, Bogey eingefärbt. Out/In erscheinen nur, wenn sich die Runde halbieren
  lässt — bei 18 die üblichen 9+9, bei 12 sechs und sechs, bei 9 Bahnen bleibt
  die Gesamtsumme. Par lässt sich hier auch mitten in der Runde korrigieren.
- **Endstand** — Platzierung nach Schlägen zu Par, dazu die Zählung von
  Hole-in-One bis Doppelbogey.
- **Historie** — gespielte Runden bleiben auf dem Gerät und lassen sich wieder
  öffnen oder löschen.
- **Stableford** — pro Runde zuschaltbar. Punkte netto nach Spielvorgabe, verteilt
  über den Stroke-Index des Platzes (1 bis Bahnenzahl, jede Zahl einmal). Par netto sind 2 Punkte, unter null geht es
  nicht.
- **Statistik** — über alle abgeschlossenen Runden, gebündelt nach Spielernamen:
  Schläge je Bahn, ±Par je Bahn, beste Runde, Score-Verteilung, Schnitt je Par-3,
  -4 und -5.
- **Vorschläge** — Namen, Spielvorgaben und Platz-Vorlagen der letzten Runden
  lassen sich beim Anlegen antippen statt neu einzutippen.
- **Teilen und Sichern** — Ergebnis als Text über den iOS-Teilen-Dialog, alle
  Runden als JSON exportieren und wieder einlesen. Beim Import werden Runden
  ergänzt, nie ersetzt.
- **Vorlagen sichern** — Bahnenzahl, Par und Stroke-Index einer Runde lassen
  sich unter einem Namen speichern und stehen beim nächsten Mal ganz oben. Sie
  überleben das Löschen der Runde und wandern mit dem Export mit.
- **Druckansicht** — *Drucken* auf der Scorekarte oder im Endstand gibt eine
  saubere Seite: Platz, Datum und Besetzung als Kopf, die volle Karte mit
  Out/In/Gesamt, keine Bedienelemente. Leere Bahnen bleiben leer zum Eintragen
  von Hand.
- **Darstellung** — unter *Mehr*: Automatisch (folgt dem Gerät), Hell oder
  Dunkel. Die Wahl bleibt gespeichert, gehört aber zum Gerät und wandert nicht
  in den Export.
- **Impressum** — erreichbar über *Mehr*. Die Felder sind **Platzhalter**
  und müssen ausgefüllt werden, bevor die Seite weitergegeben wird.

Nicht dabei: Brutto-Netto-Wertung außerhalb von Stableford, Abgleich zwischen
mehreren Geräten.

## Aufs iPhone bringen

**Mit Home-Screen-Icon.** Die Pages-Adresse in Safari öffnen, dann
*Teilen → Zum Home-Bildschirm*. Danach startet die App ohne Safari-Leiste, läuft
offline und behält ihre Runden zuverlässig. Jeder Push auf `main` wird
automatisch dorthin deployt.

Die Adresse ist **https://dnegi-dev.github.io/swing-golf/**. Jeder Push auf
`main` deployt dorthin, sobald der Selbsttest grün ist.

Eingerichtet ist das über *Settings → Pages → Build and deployment → Source:
GitHub Actions*. Für ein privates Repo bräuchte Pages GitHub Pro; dieses Repo ist
öffentlich, damit geht es auf jedem Plan.

**Ohne Icon.** `index.html` per AirDrop, Mail oder Messenger aufs Gerät schicken,
in der Dateien-App ablegen und von dort öffnen. Am Desktop reicht ein
Doppelklick. Zwei Haken:

- iOS bietet *Teilen → Zum Home-Bildschirm* nur für Seiten an, die über http(s)
  geladen wurden, nicht für lokale Dateien.
- Safari räumt den Speicher von `file://`-Seiten unzuverlässig auf. Die laufende
  Runde übersteht das Schließen der App in der Regel, aber verlassen sollte man
  sich darauf nicht.

## Download

Die fertige Datei hängt an jedem [Release](../../releases) als
`swing-golf.html`. Ein neues Release entsteht, sobald ein Tag gepusht wird:

```bash
git tag v1.0 && git push origin v1.0
```

Release- und Pages-Job laufen beide erst, wenn der Selbsttest grün ist — eine
kaputte Datei kommt weder zum Download noch auf die veröffentlichte Seite.

## Entwicklung

Es gibt keinen Build-Schritt und keine Abhängigkeiten. `index.html` im Editor
ändern, Datei im Browser neu laden, fertig.

Die Rechenfunktionen (`totalStrokes`, `toPar`, `scoreLabel`, `leaderboard`,
`strokesReceived`, `stablefordPoints`, `statsFor`, `mergeRounds`,
`normalizeRound`, Serialisierung) prüft ein eingebauter Selbsttest:

```
index.html?selftest=1
```

Er rendert statt der App eine Liste der Prüfungen und färbt Fehlschläge rot.
Der Selbsttest gehört bewusst in dieselbe Datei — eine zweite Datei hätte die
eine Bedingung gebrochen, unter der die App aufs Telefon kommt.

`.github/workflows/ci.yml` fährt denselben Test bei jedem Push headless in
Chromium und prüft zusätzlich zwei Versprechen der App:

- **keine JS-Fehler** in der Konsole,
- **keine externen Requests** — schlägt ein Skript oder eine Schrift von einem
  CDN in die Datei, wird der Build rot, auch wenn alle Rechentests grün sind.
