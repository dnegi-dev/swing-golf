/* =========================================================================
   Statistik, Vorschlaege, Teilen, Export
   ========================================================================= */

const EMPTY_COUNTS = { ace: 0, eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0 };

/* Fasst ueber alle abgeschlossenen Runden zusammen, gebuendelt nach
   Spielernamen -- Spieler-IDs sind pro Runde neu, der Name ist die einzige
   Klammer ueber mehrere Runden hinweg. */
function statsFor(rounds){
  const byName = new Map();

  for (const r of rounds){
    if (!r.completedAt) continue;
    for (const p of r.players){
      const played = holesPlayed(r, p.id);
      if (!played) continue;

      const e = byName.get(p.name) || {
        name: p.name, rounds: 0, fullRounds: 0, holes: 0, strokes: 0, par: 0,
        best: null, counts: Object.assign({}, EMPTY_COUNTS),
        byPar: { 3: { holes: 0, strokes: 0 }, 4: { holes: 0, strokes: 0 },
                 5: { holes: 0, strokes: 0 }, 6: { holes: 0, strokes: 0 } }
      };

      e.rounds++;
      e.holes += played;
      e.strokes += totalStrokes(r, p.id);
      e.par += playedPar(r, p.id);

      const counts = scoreCounts(r, p.id);
      for (const k in counts) e.counts[k] += counts[k];

      const s = r.strokes[p.id];
      for (let i = 0; i < holeCount(r); i++){
        if (s[i] == null) continue;
        const bucket = e.byPar[r.pars[i]];
        if (bucket){ bucket.holes++; bucket.strokes += s[i]; }
      }

      // Nur vollstaendige Runden sind untereinander vergleichbar.
      if (played === holeCount(r)){
        e.fullRounds++;
        const tot = totalStrokes(r, p.id);
        if (!e.best || tot < e.best.strokes){
          e.best = { strokes: tot, toPar: toPar(r, p.id), course: r.courseName, date: r.date };
        }
      }

      byName.set(p.name, e);
    }
  }

  return [...byName.values()]
    .sort((a, b) => b.rounds - a.rounds || a.name.localeCompare(b.name, "de"));
}

/* Zuletzt benutzte Namen und Plaetze, neueste zuerst. */
function recentPlayers(rounds){
  const seen = new Map();
  for (let i = rounds.length - 1; i >= 0; i--){
    for (const p of rounds[i].players){
      const name = p.name.trim();
      if (name && !seen.has(name)) seen.set(name, { name, hcp: p.hcp });
    }
  }
  return [...seen.values()];
}

/* Mitgelieferte Vorlagen. Eine Runde faengt mit einer Form an, nicht mit 18
   leeren Feldern -- welche Form, ist die erste Frage auf dem Platz. */
const BUILTIN_PRESETS = [
  { name: "Golfplatz, 18 Loch", pars: defaultPars(18) },
  { name: "Golfplatz, 9 Loch",  pars: defaultPars(9) },
  { name: "Swingolf, 12 Bahnen", pars: new Array(12).fill(3) },
  { name: "Swingolf, 9 Bahnen",  pars: new Array(9).fill(3) }
];

/* Eine gespeicherte Vorlage. Der Name ist die Identitaet -- zwei Vorlagen
   gleichen Namens waeren im Auswahlmenue nicht auseinanderzuhalten. */
function normalizePreset(raw){
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name || "").trim();
  if (!name) return null;

  const rawPars = Array.isArray(raw.pars) ? raw.pars : [];
  if (rawPars.length < MIN_HOLES) return null;
  const holes = clamp(rawPars.length, MIN_HOLES, MAX_HOLES);
  const fallback = defaultPars(holes);
  const pars = Array.from({ length: holes }, (_, i) => {
    const v = Number(rawPars[i]);
    return Number.isFinite(v) && v > 0 ? clamp(Math.round(v), MIN_PAR, MAX_PAR) : fallback[i];
  });

  return { id: String(raw.id || uid()), name: name.slice(0, 60), pars, si: resizeSi(raw.si, holes) };
}

/* Speichern ersetzt eine Vorlage gleichen Namens, statt eine zweite
   danebenzulegen. Neueste zuerst. */
function upsertPreset(presets, raw){
  const clean = normalizePreset(raw);
  if (!clean) return presets.slice();
  const key = clean.name.toLowerCase();
  return [clean].concat(presets.filter(p => p.name.toLowerCase() !== key));
}

function removePreset(presets, id){
  return presets.filter(p => p.id !== id);
}

/* Vorlagen zur Auswahl: eigene gespeicherte zuerst, dann gespielte Plaetze,
   zuletzt die mitgelieferten Formen. Gleiche Namen fallen weg -- die weiter
   oben stehende Quelle gewinnt. */
function presetList(rounds, presets){
  const out = [];
  const seen = new Set();
  const add = (name, pars, si, kind) => {
    const key = String(name).trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ name, pars: pars.slice(), si: si.slice(), kind });
  };

  for (const p of (presets || [])) add(p.name, p.pars, p.si, "saved");
  for (const c of recentCourses(rounds)) add(c.name, c.pars, c.si, "played");
  for (const b of BUILTIN_PRESETS) add(b.name, b.pars, defaultSi(b.pars.length), "builtin");
  return out;
}

function recentCourses(rounds){
  const seen = new Map();
  for (let i = rounds.length - 1; i >= 0; i--){
    const r = rounds[i];
    const name = r.courseName.trim();
    if (name && !seen.has(name)){
      seen.set(name, { name, pars: r.pars.slice(), si: r.si.slice() });
    }
  }
  return [...seen.values()];
}

function shareText(round){
  const board = leaderboard(round);
  const lines = [`${round.courseName || "Runde"} \u00b7 ${fmtDate(round.date)}`];
  board.forEach((e, i) => {
    lines.push(round.stableford
      ? `${i + 1}. ${e.name} \u2014 ${e.points} Punkte (${e.strokes} Schl\u00e4ge)`
      : `${i + 1}. ${e.name} \u2014 ${e.strokes} Schl\u00e4ge (${fmtToPar(e.toPar)})`);
  });
  lines.push(`Par ${sum(round.pars, 0, holeCount(round))}, ${holeCount(round)} Bahnen`);
  return lines.join("\n");
}

/* Vorlagen aus einer Sicherung dazunehmen. Ein bereits belegter Name bleibt
   unangetastet -- die Fassung auf diesem Geraet ist die juengere. */
function mergePresets(existing, incoming){
  const known = new Set(existing.map(p => p.name.toLowerCase()));
  const added = [];
  for (const raw of (incoming || [])){
    const pre = normalizePreset(raw);
    if (pre && !known.has(pre.name.toLowerCase())){ known.add(pre.name.toLowerCase()); added.push(pre); }
  }
  return { presets: existing.concat(added), added: added.length };
}

/* Fuehrt importierte Runden mit den vorhandenen zusammen. Gleiche id heisst
   gleiche Runde -- lieber ueberspringen als doppelt in der Historie. */
function mergeRounds(existing, incoming){
  const known = new Set(existing.map(r => r.id));
  const added = [];
  for (const raw of incoming){
    const r = normalizeRound(raw);
    if (r && !known.has(r.id)){ known.add(r.id); added.push(r); }
  }
  return { rounds: existing.concat(added), added: added.length,
           skipped: incoming.length - added.length };
}

