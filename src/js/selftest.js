/* =========================================================================
   Selbsttest: index.html?selftest=1
   ========================================================================= */

function runSelfTest(){
  const results = [];
  const check = (name, fn) => {
    try {
      const detail = fn();
      results.push({ name, ok: true, detail: detail || "" });
    } catch (err){
      results.push({ name, ok: false, detail: String(err && err.message || err) });
    }
  };
  const eq = (actual, expected, what) => {
    const a = JSON.stringify(actual), b = JSON.stringify(expected);
    if (a !== b) throw new Error(`${what || ""} erwartet ${b}, war ${a}`);
  };

  const demo = () => {
    const r = makeRound("Testplatz", "2026-05-01",
      [{ id: "a", name: "Anna" }, { id: "b", name: "Ben" }], defaultPars(18));
    // Anna: Bahn 1 Birdie (3 auf Par 4), Bahn 2 Par, Bahn 3 Doppelbogey (5 auf Par 3)
    r.strokes.a[0] = 3; r.strokes.a[1] = 4; r.strokes.a[2] = 5;
    // Ben: Bahn 1 Bogey, Bahn 2 offen, Bahn 3 Par
    r.strokes.b[0] = 5; r.strokes.b[2] = 3;
    return r;
  };

  check("Par-Vorlage: 18 Bahnen, Summe 72", () => {
    eq(defaultPars(18).length, 18, "Anzahl Bahnen");
    eq(sum(defaultPars(18), 0, 18), 72, "Par gesamt");
    eq(sum(defaultPars(9), 0, 9), 36, "neun Bahnen ergeben 36");
    eq(defaultPars(20).slice(18), PAR_PATTERN.slice(0, 2), "wird zyklisch fortgesetzt");
    return "Out " + sum(defaultPars(18), 0, 9) + " / In " + sum(defaultPars(18), 9, 18);
  });

  check("makeRound legt 18 leere Bahnen je Spieler an", () => {
    const r = makeRound("X", "2026-01-01", [makePlayer("A")], defaultPars(18));
    const s = r.strokes[r.players[0].id];
    eq(s.length, 18, "Bahnen");
    eq(s.every(v => v === null), true, "alle leer");
  });

  check("totalStrokes ignoriert leere Bahnen", () => {
    eq(totalStrokes(demo(), "a"), 12, "Anna");
    eq(totalStrokes(demo(), "b"), 8, "Ben");
  });

  check("toPar rechnet nur gespielte Bahnen", () => {
    const r = demo();
    // Anna: 12 Schlaege auf Par 4+4+3 = 11  ->  +1
    eq(toPar(r, "a"), 1, "Anna");
    // Ben: 8 Schlaege auf Par 4+3 = 7  ->  +1
    eq(toPar(r, "b"), 1, "Ben");
    eq(holesPlayed(r, "b"), 2, "Bens gespielte Bahnen");
  });

  check("Out + In = Gesamt", () => {
    const r = demo();
    for (const p of r.players){
      const out = totalStrokes(r, p.id, 0, 9);
      const inn = totalStrokes(r, p.id, 9, 18);
      eq(out + inn, totalStrokes(r, p.id), p.name);
    }
  });

  check("scoreLabel bildet alle Faelle ab", () => {
    eq(scoreLabel(1, 4).key, "ace", "Hole-in-One");
    eq(scoreLabel(1, 3).key, "ace", "Ass auf Par 3");
    eq(scoreLabel(2, 5).key, "eagle", "Albatros");
    eq(scoreLabel(3, 5).key, "eagle", "Eagle");
    eq(scoreLabel(3, 4).key, "birdie", "Birdie");
    eq(scoreLabel(4, 4).key, "par", "Par");
    eq(scoreLabel(5, 4).key, "bogey", "Bogey");
    eq(scoreLabel(6, 4).key, "double", "Doppelbogey");
    eq(scoreLabel(9, 4).key, "double", "Triple+");
    eq(scoreLabel(null, 4).key, "none", "leer");
  });

  check("scoreCounts zaehlt je Kategorie", () => {
    eq(scoreCounts(demo(), "a"), { ace: 0, eagle: 0, birdie: 1, par: 1, bogey: 0, double: 1 });
    eq(scoreCounts(demo(), "b"), { ace: 0, eagle: 0, birdie: 0, par: 1, bogey: 1, double: 0 });
  });

  check("leaderboard sortiert nach ToPar, dann Schlaegen", () => {
    const r = demo();
    // Gleichstand bei +1 -> weniger Schlaege zuerst -> Ben (8) vor Anna (12)
    eq(leaderboard(r).map(e => e.name), ["Ben", "Anna"], "Reihenfolge bei Gleichstand");
    r.strokes.a[3] = 3;                       // Bahn 4 ist Par 5 -> Eagle, Anna auf -1
    eq(leaderboard(r)[0].name, "Anna", "Anna fuehrt nach Eagle");
    eq(leaderboard(r)[0].toPar, -1, "Annas Stand");
  });

  check("bumpStroke: erster Tipp landet auf Par, Grenzen halten", () => {
    eq(bumpStroke(null, 4, 1), 4, "leer + 1");
    eq(bumpStroke(null, 4, -1), 3, "leer - 1");
    eq(bumpStroke(4, 4, 1), 5, "hoch");
    eq(bumpStroke(1, 4, -1), 1, "Untergrenze");
    eq(bumpStroke(MAX_STROKES, 4, 1), MAX_STROKES, "Obergrenze");
    eq(bumpStroke(null, MIN_PAR, -1), MIN_STROKES + 1, "leer - 1 auf Par 3");
  });

  check("fmtToPar formatiert E / + / -", () => {
    eq(fmtToPar(0), "E"); eq(fmtToPar(3), "+3"); eq(fmtToPar(-2), "-2");
  });

  check("normalizeRound repariert kaputte Daten", () => {
    const pars = defaultPars(18);
    pars[1] = 99; pars[2] = "3"; pars[5] = null;            // Unsinn, String, Loch
    const r = normalizeRound({
      id: "r1", courseName: "Alt", date: "2026-02-02",
      pars,
      players: [{ id: "a", name: "Anna" }, { id: "x" }],     // Name fehlt
      strokes: { a: [4, 0, "5", -2, null, 1000] }           // zu kurz, 0, String, negativ
    });
    eq(r.pars.length, 18, "Par-Laenge");
    eq(r.pars[1], MAX_PAR, "99 auf Maximum geklemmt");
    eq(r.pars[2], 3, "String zu Zahl");
    eq(r.pars[5], defaultPars(18)[5], "fehlende Bahn aus Vorlage");
    eq(r.strokes.a.slice(0, 6), [4, null, 5, null, null, MAX_STROKES], "Schlaege bereinigt");
    eq(r.strokes.a.length, 18, "auf die Bahnenzahl aufgefuellt");
    eq(r.strokes.x.length, 18, "Spieler ohne Eintraege bekommt Array");
    eq(r.players[1].name, "", "fehlender Name wird leer");
  });

  check("normalizeRound verwirft Muell", () => {
    eq(normalizeRound(null), null, "null");
    eq(normalizeRound({ players: [] }), null, "ohne Spieler");
  });

  check("Runde ueberlebt Serialisieren und Zurueckladen", () => {
    const r = demo();
    r.pars[0] = 5;
    const back = deserialize(serialize({ rounds: [r], activeId: r.id }));
    eq(back.rounds.length, 1, "eine Runde");
    eq(back.activeId, r.id, "aktive Runde");
    eq(back.rounds[0], r, "identischer Inhalt");
  });

  check("deserialize haelt Schrott aus", () => {
    eq(deserialize(null).rounds, [], "leer");
    eq(deserialize("{kein json").rounds, [], "kaputtes JSON");
    eq(deserialize('{"rounds":"nein"}').rounds, [], "falscher Typ");
    eq(deserialize('{"rounds":[],"activeId":"weg"}').activeId, null, "verwaiste activeId");
  });

  check("localStorage-Runde ueberlebt Speichern und Laden", () => {
    const r = demo();
    const ok = saveState({ rounds: [r], activeId: r.id });
    if (!ok) return "uebersprungen: Browser erlaubt kein Schreiben";
    const back = loadState();
    eq(back.rounds[0].strokes.a[0], 3, "Annas Bahn 1");
    localStorage.removeItem(STORAGE_KEY);
    return "gespeichert und zurueckgelesen";
  });

  check("firstOpenHole findet die erste offene Bahn", () => {
    const r = demo();
    eq(firstOpenHole(r), 1, "Ben fehlt auf Bahn 2");
    r.strokes.b[1] = 4;
    eq(firstOpenHole(r), 3, "danach Bahn 4");
  });

  check("roundProgress zaehlt die weiteste Bahn", () => {
    eq(roundProgress(demo()), 3, "Anna hat 3");
    eq(isRoundEmpty(makeRound("X", "2026-01-01", [makePlayer("A")], defaultPars(18))), true, "leere Runde");
  });

  check("strokesReceived verteilt nach Stroke-Index", () => {
    const si = defaultSi(18);
    eq(defaultSi(18).map((_, i) => strokesReceived(0, si, i)).reduce((a, b) => a + b, 0), 0, "Vorgabe 0");
    eq(defaultSi(18).map((_, i) => strokesReceived(18, si, i)), new Array(18).fill(1), "Vorgabe 18");
    eq(strokesReceived(5, si, 0), 1, "SI 1 bei Vorgabe 5");
    eq(strokesReceived(5, si, 4), 1, "SI 5 bei Vorgabe 5");
    eq(strokesReceived(5, si, 5), 0, "SI 6 bei Vorgabe 5");
    eq(strokesReceived(20, si, 1), 2, "Vorgabe 20, SI 2");
    eq(strokesReceived(20, si, 2), 1, "Vorgabe 20, SI 3");
    eq(strokesReceived(999, si, 0), strokesReceived(MAX_HCP, si, 0), "ueber Maximum geklemmt");
  });

  check("stablefordPoints: Par netto = 2, nie negativ", () => {
    eq(stablefordPoints(4, 4, 0), 2, "Par");
    eq(stablefordPoints(3, 4, 0), 3, "Birdie");
    eq(stablefordPoints(2, 4, 0), 4, "Eagle");
    eq(stablefordPoints(5, 4, 0), 1, "Bogey");
    eq(stablefordPoints(6, 4, 0), 0, "Doppelbogey");
    eq(stablefordPoints(9, 4, 0), 0, "Triple+ bleibt 0");
    eq(stablefordPoints(5, 4, 1), 2, "Bogey mit einem Vorschlag = Par netto");
    eq(stablefordPoints(null, 4, 0), null, "leere Bahn");
  });

  check("Punkte der Runde zaehlen mit Vorgabe", () => {
    const r = makeRound("P", "2026-05-01",
      [{ id: "a", name: "Anna", hcp: 18 }, { id: "b", name: "Ben", hcp: 0 }],
      defaultPars(18), { stableford: true });
    for (let i = 0; i < 18; i++){ r.strokes.a[i] = r.pars[i] + 1; r.strokes.b[i] = r.pars[i]; }
    // Anna: jede Bahn ein Vorschlag, Bogey brutto -> Par netto -> 2 Punkte
    eq(totalPoints(r, "a"), 36, "Anna");
    eq(totalPoints(r, "b"), 36, "Ben");
    eq(holePoints(r, "a", 0), 2, "Annas Bahn 1");
    eq(leaderboard(r)[0].points, 36, "Spitze");
  });

  check("leaderboard sortiert bei Stableford nach Punkten", () => {
    const r = makeRound("P", "2026-05-01",
      [{ id: "a", name: "Anna" }, { id: "b", name: "Ben" }],
      defaultPars(18), { stableford: true });
    r.strokes.a[0] = 6;                 // 0 Punkte
    r.strokes.b[0] = 3;                 // Birdie, 3 Punkte
    eq(leaderboard(r).map(e => e.name), ["Ben", "Anna"], "nach Punkten");
    r.stableford = false;
    eq(leaderboard(r).map(e => e.name), ["Ben", "Anna"], "brutto gleiche Reihenfolge");
  });

  check("normalizeRound repariert Stroke-Index und Vorgabe", () => {
    const base = { id: "x", players: [{ id: "a", name: "A", hcp: 99 }], strokes: { a: [] } };
    eq(normalizeRound(Object.assign({}, base, { si: [1, 2, 3] })).si, defaultSi(18), "zu kurz");
    eq(normalizeRound(Object.assign({}, base, { si: new Array(18).fill(1) })).si, defaultSi(18), "alles gleich");
    const gut = defaultSi(18).slice().reverse();
    eq(normalizeRound(Object.assign({}, base, { si: gut })).si, gut, "gueltige Permutation bleibt");
    eq(normalizeRound(base).players[0].hcp, MAX_HCP, "Vorgabe geklemmt");
    eq(normalizeRound(base).stableford, false, "Stableford default aus");
  });

  check("statsFor buendelt ueber Runden nach Namen", () => {
    const mk = (date, strokes, fertig) => {
      const r = makeRound("Platz", date, [{ id: "a", name: "Anna" }], defaultPars(18));
      for (let i = 0; i < 18; i++) r.strokes.a[i] = strokes[i];
      if (fertig) r.completedAt = date + "T12:00:00Z";
      return r;
    };
    const parRunde = defaultPars(18).slice();
    const schlecht = defaultPars(18).map(v => v + 1);
    const s = statsFor([mk("2026-01-01", parRunde, true), mk("2026-02-01", schlecht, true),
                        mk("2026-03-01", schlecht, false)]);
    eq(s.length, 1, "ein Spieler");
    eq(s[0].rounds, 2, "offene Runde zaehlt nicht");
    eq(s[0].holes, 36, "Bahnen");
    eq(s[0].strokes, 72 + 90, "Schlaege");
    eq(s[0].best.strokes, 72, "beste Runde");
    eq(s[0].best.toPar, 0, "beste Runde zu Par");
    eq(s[0].counts.par, 18, "Pars");
    eq(s[0].counts.bogey, 18, "Bogeys");
    // 4 Par-3-Bahnen, zwei Runden: 4x Par (3) + 4x Bogey (4) = 28 Schlaege
    eq(s[0].byPar[3].holes, 8, "Par-3-Bahnen ueber beide Runden");
    eq(s[0].byPar[3].strokes, 28, "Schlaege auf Par 3");
  });

  check("statsFor ignoriert Spieler ohne Eintrag", () => {
    const r = makeRound("P", "2026-01-01", [makePlayer("A"), makePlayer("B")], defaultPars(18));
    r.strokes[r.players[0].id][0] = 4;
    r.completedAt = "2026-01-01T12:00:00Z";
    eq(statsFor([r]).map(e => e.name), ["A"], "nur wer gespielt hat");
  });

  check("Vorschlaege: zuletzt benutzte Spieler und Plaetze", () => {
    const alt = makeRound("Alter Platz", "2026-01-01", [makePlayer("Anna", 12)], defaultPars(18));
    const neu = makeRound("Neuer Platz", "2026-02-01",
      [makePlayer("Ben"), makePlayer("Anna", 10)], defaultPars(18).map(v => 3));
    eq(recentPlayers([alt, neu]).map(p => p.name), ["Ben", "Anna"], "neueste zuerst, ohne Dubletten");
    eq(recentPlayers([alt, neu])[1].hcp, 10, "juengste Vorgabe gewinnt");
    eq(recentCourses([alt, neu]).map(c => c.name), ["Neuer Platz", "Alter Platz"], "Plaetze");
    eq(recentCourses([alt, neu])[0].pars[0], 3, "Par-Vorlage kommt mit");
  });

  check("mergePresets ergaenzt, ohne Namen zu doppeln", () => {
    const a = normalizePreset({ name: "Heim", pars: defaultPars(9) });
    const b = normalizePreset({ name: "Weg", pars: defaultPars(18) });
    eq(mergePresets([a], [b]).added, 1, "fremde Vorlage kommt dazu");
    eq(mergePresets([a], [b]).presets.map(p => p.name), ["Heim", "Weg"], "angehaengt");
    eq(mergePresets([a], [{ name: "heim", pars: defaultPars(12) }]).added, 0, "gleicher Name bleibt");
    eq(mergePresets([], [null, { name: "" }, b]).added, 1, "Muell faellt raus");
    eq(mergePresets([a], null).presets.length, 1, "ohne Eingabe unveraendert");
  });

  check("mergeRounds ergaenzt, ohne zu doppeln", () => {
    const a = demo(); const b = demo();
    const m1 = mergeRounds([a], [b]);
    eq(m1.added, 1, "fremde Runde kommt dazu");
    const m2 = mergeRounds([a], [a]);
    eq([m2.added, m2.skipped], [0, 1], "gleiche id wird uebersprungen");
    const m3 = mergeRounds([], [null, { players: [] }, a]);
    eq([m3.added, m3.skipped], [1, 2], "Muell faellt raus");
  });

  check("shareText nennt Platz, Rang und Ergebnis", () => {
    const r = demo();
    r.completedAt = "2026-05-01T12:00:00Z";
    const t = shareText(r);
    if (!t.includes("Testplatz")) throw new Error("Platz fehlt");
    if (!t.includes("1. Ben")) throw new Error("Rang fehlt: " + t);
    if (!t.includes("Par 72")) throw new Error("Par-Summe fehlt");
    r.stableford = true;
    if (!shareText(r).includes("Punkte")) throw new Error("Punkte fehlen bei Stableford");
  });

  check("Bahnenzahl kommt aus pars, nicht aus einer Konstanten", () => {
    const r9 = makeRound("Neun", "2026-01-01", [makePlayer("A")], defaultPars(9));
    eq(holeCount(r9), 9, "neun Bahnen");
    eq(r9.si, defaultSi(9), "Index passt sich an");
    eq(r9.strokes[r9.players[0].id].length, 9, "neun Eintraege");
    for (let i = 0; i < 9; i++) r9.strokes[r9.players[0].id][i] = r9.pars[i];
    eq(totalStrokes(r9, r9.players[0].id), 36, "Summe ueber neun Bahnen");
    eq(toPar(r9, r9.players[0].id), 0, "genau auf Par");
  });

  check("normalizeRound blaest kurze Runden nicht auf", () => {
    const r = normalizeRound({ id: "n", pars: defaultPars(9),
      players: [{ id: "a", name: "A" }], strokes: { a: [3] } });
    eq(r.pars.length, 9, "bleibt bei neun");
    eq(r.si.length, 9, "Index bleibt bei neun");
    eq(r.strokes.a.length, 9, "Schlaege bleiben bei neun");
    eq(normalizeRound({ id: "n", pars: new Array(99).fill(4),
      players: [{ id: "a", name: "A" }], strokes: {} }).pars.length, MAX_HOLES, "auf Maximum geklemmt");
    eq(normalizeRound({ id: "n", players: [{ id: "a", name: "A" }], strokes: {} }).pars.length,
      DEFAULT_HOLES, "ohne pars die Vorgabe");
  });

  check("halfPoint teilt nur, wo es Sinn ergibt", () => {
    eq(halfPoint(18), 9, "18 -> 9+9");
    eq(halfPoint(12), 6, "12 -> 6+6");
    eq(halfPoint(9), 0, "9 laesst sich nicht halbieren");
    eq(halfPoint(4), 0, "zu kurz zum Teilen");
    eq(halfPoint(6), 3, "6 -> 3+3");
  });

  check("tableColumns setzt die Summenspalten richtig", () => {
    const cols = n => tableColumns(makeRound("X", "2026-01-01", [makePlayer("A")], defaultPars(n)))
      .map(c => c.sum ? c.label : "#");
    eq(cols(18).filter(c => c !== "#"), ["Out", "In", "Ges"], "18 Bahnen");
    eq(cols(18).length, 18 + 3, "Spaltenzahl 18");
    eq(cols(12).filter(c => c !== "#"), ["Out", "In", "Ges"], "12 Bahnen");
    eq(cols(9).filter(c => c !== "#"), ["Ges"], "9 Bahnen nur Gesamt");
    eq(cols(9).length, 9 + 1, "Spaltenzahl 9");
    eq(cols(18).indexOf("Out"), 9, "Out steht nach Bahn 9");
  });

  check("commonPar nimmt das haeufigste Par", () => {
    eq(commonPar(defaultPars(18)), 4, "Standardrunde: zehnmal Par 4");
    eq(commonPar(new Array(12).fill(3)), 3, "Swingolf: Par 3");
    eq(commonPar([3, 3, 5, 5]), 3, "Gleichstand entscheidet das kleinere");
    eq(commonPar([]), PAR_PATTERN[0], "ohne Bahnen die Vorlage");
  });

  check("resizeSi ergibt immer eine Permutation", () => {
    eq(resizeSi(defaultSi(18), 9), defaultSi(9), "kuerzen");
    eq(resizeSi([3, 1, 2], 5).slice().sort((a, b) => a - b), [1, 2, 3, 4, 5], "erweitern");
    eq(resizeSi([3, 1, 2], 5).slice(0, 3), [3, 1, 2], "vorhandene bleiben an ihrer Bahn");
    eq(resizeSi([9, 9, 9], 3).slice().sort((a, b) => a - b), [1, 2, 3], "Dubletten werden ersetzt");
    eq(resizeSi(null, 4), defaultSi(4), "aus dem Nichts");
    eq(resizeSi([1, 2, 3], 2), [1, 2], "abgeschnittene Werte fallen weg");
  });

  check("resizeDraft zieht Par und Index mit", () => {
    const d = makeRound("X", "2026-01-01", [makePlayer("A")], defaultPars(18));
    d.pars[0] = 6;
    resizeDraft(d, 9);
    eq(d.pars.length, 9, "auf neun gekuerzt");
    eq(d.pars[0], 6, "eigenes Par bleibt");
    eq(d.si, defaultSi(9), "Index neu");
    resizeDraft(d, 12);
    eq(d.pars.length, 12, "wieder erweitert");
    eq(d.pars[0], 6, "eigenes Par ueberlebt beides");
    eq(d.pars[10], 4, "neue Bahn bekommt das haeufigste Par (10x 4 im Muster)");
    eq(new Set(d.si).size, 12, "Index bleibt eindeutig");
    resizeDraft(d, 999);
    eq(d.pars.length, MAX_HOLES, "Obergrenze");
    resizeDraft(d, 0);
    eq(d.pars.length, MIN_HOLES, "Untergrenze");
  });

  check("strokesReceived rechnet mit der tatsaechlichen Bahnenzahl", () => {
    const si9 = defaultSi(9);
    eq(si9.map((_, i) => strokesReceived(9, si9, i)), new Array(9).fill(1), "Vorgabe 9 auf 9 Bahnen");
    eq(strokesReceived(4, si9, 3), 1, "SI 4 bei Vorgabe 4");
    eq(strokesReceived(4, si9, 4), 0, "SI 5 bei Vorgabe 4");
    eq(strokesReceived(10, si9, 0), 2, "Vorgabe 10 auf 9 Bahnen");
  });

  check("presetList: eigene, dann gespielte, dann mitgelieferte", () => {
    const gespielt = makeRound("Isartal", "2026-01-01", [makePlayer("A")], defaultPars(9));
    const eigen = normalizePreset({ name: "Heimplatz", pars: new Array(12).fill(3) });

    const list = presetList([gespielt], [eigen]);
    eq(list.map(x => x.kind).slice(0, 2), ["saved", "played"], "Reihenfolge der Quellen");
    eq([list[0].name, list[1].name], ["Heimplatz", "Isartal"], "Namen");
    eq([list[0].pars.length, list[1].pars.length], [12, 9], "je eigene Bahnenzahl");
    eq(list.slice(2).map(x => x.pars.length), [18, 9, 12, 9], "danach die mitgelieferten");
    eq(list.every(x => x.si.length === x.pars.length), true, "jede Vorlage hat einen passenden Index");
    eq(presetList([], [])[0].name, BUILTIN_PRESETS[0].name, "ohne alles nur Vorlagen");
    eq(sum(BUILTIN_PRESETS[2].pars, 0, 12), 36, "Swingolf 12 x Par 3");
  });

  check("presetList: gleicher Name kommt nur einmal, die obere Quelle gewinnt", () => {
    const gespielt = makeRound("Isartal", "2026-01-01", [makePlayer("A")], defaultPars(18));
    const eigen = normalizePreset({ name: "isartal", pars: new Array(9).fill(3) });
    const list = presetList([gespielt], [eigen]);
    eq(list.filter(x => x.name.toLowerCase() === "isartal").length, 1, "keine Dublette");
    eq([list[0].kind, list[0].pars.length], ["saved", 9], "die eigene Fassung steht");
  });

  check("normalizePreset raeumt auf und verwirft Unbrauchbares", () => {
    eq(normalizePreset(null), null, "null");
    eq(normalizePreset({ name: "  ", pars: defaultPars(9) }), null, "ohne Namen");
    eq(normalizePreset({ name: "X", pars: [] }), null, "ohne Bahnen");

    const pre = normalizePreset({ name: "  Platz  ", pars: [4, 99, null, "5"], si: [9, 9, 9, 9] });
    eq(pre.name, "Platz", "Name getrimmt");
    eq(pre.pars, [4, MAX_PAR, defaultPars(4)[2], 5], "Par bereinigt, Loch aus der Vorlage");
    eq(pre.si.slice().sort((a, b) => a - b), [1, 2, 3, 4], "Index zur Permutation repariert");
    eq(typeof pre.id, "string", "bekommt eine id");
    eq(normalizePreset({ name: "Y", pars: new Array(99).fill(4) }).pars.length, MAX_HOLES, "geklemmt");
  });

  check("upsertPreset ersetzt bei gleichem Namen, removePreset loescht", () => {
    let list = [];
    list = upsertPreset(list, { name: "Heim", pars: defaultPars(9) });
    list = upsertPreset(list, { name: "Weg", pars: defaultPars(18) });
    eq(list.map(p => p.name), ["Weg", "Heim"], "neueste zuerst");

    list = upsertPreset(list, { name: "heim", pars: new Array(12).fill(3) });
    eq(list.length, 2, "kein zweiter Eintrag gleichen Namens");
    eq([list[0].name, list[0].pars.length], ["heim", 12], "die neue Fassung steht oben");

    eq(upsertPreset(list, { name: "", pars: [] }).length, 2, "Unbrauchbares aendert nichts");
    eq(removePreset(list, list[0].id).map(p => p.name), ["Weg"], "loeschen");
    eq(removePreset(list, "gibtsnicht").length, 2, "unbekannte id ist harmlos");
  });

  check("normalizeSettings faellt auf auto zurueck", () => {
    eq(normalizeSettings(null).theme, "auto", "ohne alles");
    eq(normalizeSettings({ theme: "dark" }).theme, "dark", "gueltig");
    eq(normalizeSettings({ theme: "neon" }).theme, "auto", "unbekannt");
    eq(THEMES, ["auto", "light", "dark"], "die drei Moeglichkeiten");
  });

  check("Vorlagen und Einstellungen ueberleben das Speichern", () => {
    const r = demo();
    const pre = normalizePreset({ name: "Heim", pars: new Array(12).fill(3) });
    const back = deserialize(serialize({
      rounds: [r], activeId: r.id, presets: [pre], settings: { theme: "dark" }
    }));
    eq(back.presets, [pre], "Vorlage identisch zurueck");
    eq(back.settings.theme, "dark", "Einstellung zurueck");
    eq(back.rounds[0], r, "Runde unberuehrt");
  });

  check("Version-1-Daten laden ohne Vorlagen und Einstellungen", () => {
    const r = demo();
    const alt = JSON.stringify({ version: 1, rounds: [r], activeId: r.id });
    const back = deserialize(alt);
    eq(back.rounds.length, 1, "Runde kommt mit");
    eq(back.presets, [], "keine Vorlagen");
    eq(back.settings.theme, "auto", "Einstellung auf Vorgabe");
  });

  check("credentialsOk nimmt genau ein Paar an", () => {
    eq(credentialsOk("admin", "admin"), true, "das richtige Paar");
    eq(credentialsOk("  admin ", "admin"), true, "Leerzeichen am Namen stoeren nicht");
    eq(credentialsOk("Admin", "admin"), false, "Gross-/Kleinschreibung zaehlt");
    eq(credentialsOk("admin", "Admin"), false, "auch im Passwort");
    eq(credentialsOk("admin", " admin"), false, "Leerzeichen im Passwort ist Absicht");
    eq(credentialsOk("admin", ""), false, "leeres Passwort");
    eq(credentialsOk("", ""), false, "gar nichts");
    eq(credentialsOk(null, undefined), false, "auch ohne Werte kein Absturz");
    return "geprueft: 8 Kombinationen";
  });

  check("Anmeldung liegt neben den Runden, nicht darin", () => {
    // Das Flag darf nicht in der JSON-Sicherung landen: die gibt man weiter.
    const r = demo();
    const roh = serialize({ rounds: [r], activeId: r.id, presets: [],
                            settings: normalizeSettings(null), unlocked: true });
    eq(roh.includes("unlocked"), false, "kein Flag im Export");
    eq(roh.includes(AUTH_KEY), false, "auch nicht der Schluessel");
    eq(AUTH_KEY === STORAGE_KEY, false, "eigener Speicherschluessel");
  });

  check("loadUnlocked faellt auf gesperrt zurueck", () => {
    const vorher = localStorage.getItem(AUTH_KEY);
    try {
      localStorage.removeItem(AUTH_KEY);
      eq(loadUnlocked(), false, "ohne Eintrag gesperrt");
      localStorage.setItem(AUTH_KEY, "ja");
      eq(loadUnlocked(), false, "nur \"1\" zaehlt");
      localStorage.setItem(AUTH_KEY, "1");
      eq(loadUnlocked(), true, "mit \"1\" offen");
    } finally {
      if (vorher === null) localStorage.removeItem(AUTH_KEY);
      else localStorage.setItem(AUTH_KEY, vorher);
    }
  });

  const failed = results.filter(r => !r.ok).length;
  root.innerHTML = `<div class="screen">
    ${topbar("Selbsttest", `${results.length - failed} von ${results.length} bestanden`)}
    <div class="card" style="padding:0; overflow:hidden">
      ${results.map(r => `<div class="test ${r.ok ? "pass" : "fail"}">
        <span class="mark">${r.ok ? "✓" : "✗"}</span>
        <span class="grow">${esc(r.name)}${r.detail ? `<code>${esc(r.detail)}</code>` : ""}</span>
      </div>`).join("")}
    </div>
    <p class="${failed ? "" : "muted"}" style="text-align:center; font-weight:700">
      ${failed ? failed + " FEHLGESCHLAGEN" : "Alles grün"}</p>
    <div class="stack"><a href="?" style="text-align:center">Zur App</a></div>
  </div>`;
  document.title = failed ? `Selbsttest: ${failed} fehlgeschlagen` : "Selbsttest: alles gruen";
  return failed;
}

