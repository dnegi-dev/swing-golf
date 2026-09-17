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

**Mit Home-Screen-Icon.** Die Pages-Adresse in Safari öffnen, dann
*Teilen → Zum Home-Bildschirm*. Danach startet die App ohne Safari-Leiste, läuft
offline und behält ihre Runden zuverlässig. Jeder Push auf `main` wird
automatisch dorthin deployt.

Die Adresse steht nach dem ersten erfolgreichen Deploy unter *Settings → Pages*
und in der Ausgabe des `Pages`-Jobs; sie hat die Form
`https://<owner>.github.io/<repo>/`. Voraussetzung ist einmalig
*Settings → Pages → Build and deployment → Source: **GitHub Actions***. Für
private Repos braucht Pages GitHub Pro — bei einem öffentlichen Repo geht es auf
jedem Plan.

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
