/* =========================================================================
   App-Zustand
   ========================================================================= */

const state = {
  view: "home",        // Tabs: home | rounds | stats | settings
                       // darunter: setup | play | summary | data | presets
  rounds: [],
  presets: [],
  settings: { theme: "auto" },
  activeId: null,
  draft: null,         // Runde im Aufbau (noch nicht in rounds)
  hole: 0,             // 0-basierter Bahnindex
  table: false,        // Scorekarte statt Bahn-Eingabe
  showPar: false,      // Par-Raster im Setup aufgeklappt
  dataMsg: "",         // Rueckmeldung nach Export/Import
  storageFailed: false
};

const root = document.getElementById("app");

function activeRound(){
  return state.rounds.find(r => r.id === state.activeId) || null;
}

function persist(){
  const ok = saveState(state);
  state.storageFailed = !ok;
}

function firstOpenHole(round){
  const n = holeCount(round);
  for (let i = 0; i < n; i++){
    if (round.players.some(p => round.strokes[p.id][i] == null)) return i;
  }
  return n - 1;
}

