"use strict";

/* =========================================================================
   Modell und reine Rechenfunktionen
   -------------------------------------------------------------------------
   Alles hier ist frei von DOM und localStorage, damit der Selbsttest
   (?selftest=1) es direkt pruefen kann.
   ========================================================================= */

const DEFAULT_HOLES = 18;
const MIN_HOLES = 1;
const MAX_HOLES = 36;
const MIN_STROKES = 1;
const MAX_STROKES = 20;
const MIN_PAR = 3;
const MAX_PAR = 6;
const MAX_PLAYERS = 6;
const MAX_HCP = 54;
// Muster einer 18-Loch-Runde, Summe 72. Fuer andere Bahnenzahlen wird es
// zyklisch fortgesetzt -- irgendeine Vorlage braucht es, und diese ist die
// vertrauteste.
const PAR_PATTERN = [4,4,3,5,4,4,3,4,5, 4,3,4,5,4,4,3,4,5];

function defaultPars(holes){
  return Array.from({ length: holes }, (_, i) => PAR_PATTERN[i % PAR_PATTERN.length]);
}

// Stroke-Index: welche Bahn den wievielten Vorschlag bekommt. Ohne die Angaben
// der Scorekarte ist die Reihenfolge der Bahnen die einzige ehrliche Vorgabe.
function defaultSi(holes){
  return Array.from({ length: holes }, (_, i) => i + 1);
}

/* Die Bahnenzahl steht nicht im Modell, sie ist die Laenge von pars. Ein
   zweites Feld koennte davon abweichen, diese Ableitung nicht. */
function holeCount(round){
  return round.pars.length;
}

/* Out/In nur, wenn sich die Runde sauber halbieren laesst: bei 18 die
   ueblichen 9+9, bei 12 sechs und sechs. Bei 9 Bahnen gibt es keine
   sinnvolle Haelfte -- dann steht nur die Gesamtsumme. 0 heisst "nicht
   teilen". */
function halfPoint(holes){
  return (holes >= 6 && holes % 2 === 0) ? holes / 2 : 0;
}

/* Bringt einen Stroke-Index auf n Bahnen: vorhandene gueltige Werte bleiben
   an ihrer Bahn, alles andere wird mit den fehlenden Zahlen aufgefuellt.
   Ergebnis ist immer eine Permutation von 1..n. */
function resizeSi(si, n){
  const out = new Array(n);
  const used = new Set();
  for (let i = 0; i < n; i++){
    const v = Math.round(Number((si || [])[i]));
    if (v >= 1 && v <= n && !used.has(v)){ out[i] = v; used.add(v); }
  }
  const free = [];
  for (let v = 1; v <= n; v++) if (!used.has(v)) free.push(v);
  for (let i = 0; i < n; i++) if (out[i] == null) out[i] = free.shift();
  return out;
}

/* Das haeufigste Par der bisherigen Bahnen sagt mehr als eine allgemeine
   Vorlage: wer auf einem Platz mit zwoelfmal Par 3 eine Bahn ergaenzt, will
   dort keine Par 5. Gleichstand entscheidet das kleinere Par. */
function commonPar(pars){
  if (!pars.length) return PAR_PATTERN[0];
  const count = new Map();
  for (const v of pars) count.set(v, (count.get(v) || 0) + 1);
  let best = null, bestN = 0;
  for (const [v, n] of count){
    if (n > bestN || (n === bestN && v < best)){ best = v; bestN = n; }
  }
  return best;
}

/* Bahnenzahl einer noch nicht gestarteten Runde aendern. Bereits gesetzte
   Bahnen behalten ihr Par, neue bekommen das haeufigste Par der Runde. */
function resizeDraft(draft, holes){
  const raw = Math.round(Number(holes));
  const n = clamp(Number.isFinite(raw) ? raw : DEFAULT_HOLES, MIN_HOLES, MAX_HOLES);
  const fuellwert = commonPar(draft.pars);
  draft.pars = Array.from({ length: n }, (_, i) =>
    draft.pars[i] != null ? draft.pars[i] : fuellwert);
  draft.si = resizeSi(draft.si, n);
  return draft;
}

function uid(){
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function todayISO(){
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

function makePlayer(name, hcp){
  return { id: uid(), name: name || "", hcp: clamp(Math.round(hcp || 0), 0, MAX_HCP) };
}

function makeRound(courseName, date, players, pars, opts){
  const o = opts || {};
  const round = {
    id: uid(),
    courseName: courseName || "",
    date: date || todayISO(),
    pars: (pars && pars.length ? pars : defaultPars(DEFAULT_HOLES)).slice(0, MAX_HOLES),
    si: [],
    stableford: !!o.stableford,
    players: players.map(p => ({
      id: p.id || uid(),
      name: p.name,
      hcp: clamp(Math.round(p.hcp || 0), 0, MAX_HCP)
    })),
    strokes: {},
    completedAt: null
  };
  round.si = resizeSi(o.si, round.pars.length);
  for (const p of round.players) round.strokes[p.id] = new Array(round.pars.length).fill(null);
  return round;
}

/* Gleicht eine geladene Runde an das erwartete Format an: fehlende Bahnen
   auffuellen, zu lange Arrays kappen, Muell zu null machen. Laeuft ueber
   alles, was aus dem localStorage kommt -- da steht potentiell eine aeltere
   Version der App drin. */
function normalizeRound(raw){
  if (!raw || typeof raw !== "object") return null;

  /* Die Bahnenzahl kommt aus den gespeicherten Daten, nicht aus einer
     Konstanten -- sonst wuerde eine 9-Loch-Runde beim Laden auf 18
     aufgeblasen. */
  const rawPars = Array.isArray(raw.pars) ? raw.pars : [];
  const holes = clamp(rawPars.length || DEFAULT_HOLES, MIN_HOLES, MAX_HOLES);
  const fallback = defaultPars(holes);

  const pars = new Array(holes);
  for (let i = 0; i < holes; i++){
    const v = Number(rawPars[i]);
    pars[i] = Number.isFinite(v) && v > 0 ? clamp(Math.round(v), MIN_PAR, MAX_PAR) : fallback[i];
  }

  /* Stroke-Index: jede Zahl 1..18 genau einmal. Alles andere (fehlend, doppelt,
     Unsinn) faellt auf die Vorgabe zurueck -- ein halb kaputter Index verteilt
     Vorschlaege falsch, und das faellt niemandem auf. */
  let si = Array.isArray(raw.si) ? raw.si.map(v => Math.round(Number(v))) : [];
  const seen = new Set(si);
  if (si.length !== holes || seen.size !== holes || si.some(v => !(v >= 1 && v <= holes))){
    si = defaultSi(holes);
  }

  const players = Array.isArray(raw.players)
    ? raw.players.filter(p => p && p.id).map(p => ({
        id: String(p.id),
        name: String(p.name || ""),
        hcp: Number.isFinite(Number(p.hcp)) ? clamp(Math.round(Number(p.hcp)), 0, MAX_HCP) : 0
      }))
    : [];
  if (!players.length) return null;

  const strokes = {};
  for (const p of players){
    const src = raw.strokes && Array.isArray(raw.strokes[p.id]) ? raw.strokes[p.id] : [];
    const out = new Array(holes);
    for (let i = 0; i < holes; i++){
      const v = Number(src[i]);
      out[i] = Number.isFinite(v) && v > 0 ? clamp(Math.round(v), MIN_STROKES, MAX_STROKES) : null;
    }
    strokes[p.id] = out;
  }

  return {
    id: String(raw.id || uid()),
    courseName: String(raw.courseName || ""),
    date: String(raw.date || todayISO()),
    pars, si,
    stableford: !!raw.stableford,
    players, strokes,
    completedAt: raw.completedAt ? String(raw.completedAt) : null
  };
}

function clamp(n, lo, hi){ return Math.min(hi, Math.max(lo, n)); }

/* Erster Tipp auf "+" setzt direkt auf Par -- das ist der haeufigste Wert
   und spart auf der Bahn drei bis vier Tipper. */
function bumpStroke(current, par, delta){
  if (current == null) return clamp(delta > 0 ? par : par - 1, MIN_STROKES, MAX_STROKES);
  return clamp(current + delta, MIN_STROKES, MAX_STROKES);
}

function holesPlayed(round, playerId){
  return (round.strokes[playerId] || []).filter(v => v != null).length;
}

function totalStrokes(round, playerId, from = 0, to = holeCount(round)){
  let sum = 0;
  const s = round.strokes[playerId] || [];
  for (let i = from; i < to; i++) if (s[i] != null) sum += s[i];
  return sum;
}

/* Par nur der tatsaechlich gespielten Bahnen -- sonst steht man nach Bahn 1
   mit -68 da. */
function playedPar(round, playerId, from = 0, to = holeCount(round)){
  let sum = 0;
  const s = round.strokes[playerId] || [];
  for (let i = from; i < to; i++) if (s[i] != null) sum += round.pars[i];
  return sum;
}

function toPar(round, playerId, from = 0, to = holeCount(round)){
  return totalStrokes(round, playerId, from, to) - playedPar(round, playerId, from, to);
}

function scoreLabel(strokes, par){
  if (strokes == null) return { key: "none", label: "", cls: "s-none" };
  if (strokes === 1) return { key: "ace", label: "Hole-in-One", cls: "s-ace" };
  const d = strokes - par;
  if (d <= -3) return { key: "eagle", label: "Albatros", cls: "s-eagle" };
  if (d === -2) return { key: "eagle", label: "Eagle", cls: "s-eagle" };
  if (d === -1) return { key: "birdie", label: "Birdie", cls: "s-birdie" };
  if (d === 0)  return { key: "par", label: "Par", cls: "s-par" };
  if (d === 1)  return { key: "bogey", label: "Bogey", cls: "s-bogey" };
  if (d === 2)  return { key: "double", label: "Doppelbogey", cls: "s-double" };
  return { key: "double", label: "+" + d, cls: "s-double" };
}

function scoreCounts(round, playerId){
  const counts = { ace: 0, eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0 };
  const s = round.strokes[playerId] || [];
  for (let i = 0; i < holeCount(round); i++){
    if (s[i] == null) continue;
    counts[scoreLabel(s[i], round.pars[i]).key]++;
  }
  return counts;
}

/* Vorschlaege nach Spielvorgabe: erst jede Bahn einmal, der Rest nach
   Stroke-Index. Bei Vorgabe 0 kommt 0 heraus, dann ist Stableford brutto. */
function strokesReceived(hcp, si, holeIdx){
  const holes = si.length;
  const h = clamp(Math.round(hcp || 0), 0, MAX_HCP);
  return Math.floor(h / holes) + (si[holeIdx] <= (h % holes) ? 1 : 0);
}

function stablefordPoints(strokes, par, received){
  if (strokes == null) return null;
  return Math.max(0, 2 - ((strokes - received) - par));
}

function holePoints(round, playerId, i){
  const player = round.players.find(p => p.id === playerId);
  if (!player) return null;
  return stablefordPoints(
    round.strokes[playerId][i], round.pars[i],
    strokesReceived(player.hcp, round.si, i)
  );
}

function totalPoints(round, playerId, from = 0, to = holeCount(round)){
  let sum = 0;
  for (let i = from; i < to; i++){
    const p = holePoints(round, playerId, i);
    if (p != null) sum += p;
  }
  return sum;
}

function leaderboard(round){
  return round.players
    .map(p => ({
      id: p.id,
      name: p.name,
      hcp: p.hcp,
      strokes: totalStrokes(round, p.id),
      toPar: toPar(round, p.id),
      points: totalPoints(round, p.id),
      played: holesPlayed(round, p.id)
    }))
    .sort((a, b) =>
      (round.stableford ? b.points - a.points : a.toPar - b.toPar) ||
      a.strokes - b.strokes ||
      b.played - a.played ||
      a.name.localeCompare(b.name, "de")
    );
}

function roundProgress(round){
  return Math.max(0, ...round.players.map(p => holesPlayed(round, p.id)));
}

function isRoundEmpty(round){
  return roundProgress(round) === 0;
}

function fmtToPar(n){
  if (n === 0) return "E";
  return (n > 0 ? "+" : "-") + Math.abs(n);
}

function fmtDate(iso){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? m[3] + "." + m[2] + "." + m[1] : (iso || "");
}

