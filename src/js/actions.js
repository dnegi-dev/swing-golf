/* =========================================================================
   Interaktion
   ========================================================================= */

const ACTIONS = {
  login(){
    const l = state.login;
    if (!credentialsOk(l.user, l.pass)){
      /* Der Benutzername bleibt stehen, das Passwort nicht: fast immer
         hat man sich dort vertippt. */
      l.pass = "";
      l.error = "Benutzername oder Passwort stimmt nicht.";
      return;
    }
    state.unlocked = true;
    state.login = { user: "", pass: "", error: "" };
    saveUnlocked(true);
  },

  logout(){
    state.unlocked = false;
    state.login = { user: "", pass: "", error: "" };
    state.view = "home";
    saveUnlocked(false);
  },

  new(){
    state.draft = makeRound("", todayISO(), [makePlayer(""), makePlayer("")],
      defaultPars(DEFAULT_HOLES), { stableford: false });
    state.showPar = false;
    state.view = "setup";
  },

  home(){
    state.view = "home";
    state.table = false;
    state.dataMsg = "";
  },

  tab(el){
    state.view = el.dataset.view;
    state.table = false;
    state.dataMsg = "";
  },

  go(el){
    state.view = el.dataset.view;
    if (el.dataset.view !== "data") state.dataMsg = "";
  },

  resume(){
    const round = state.rounds.find(r => r.id === state.activeId && !r.completedAt)
      || state.rounds.filter(r => !r.completedAt).slice(-1)[0];
    if (!round) return;
    state.activeId = round.id;
    state.hole = firstOpenHole(round);
    state.table = false;
    state.view = "play";
    persist();
  },

  theme(el){
    state.settings.theme = THEMES.includes(el.dataset.theme) ? el.dataset.theme : "auto";
    applyTheme(state.settings.theme);
    persist();
  },

  print(){
    window.print();
  },

  "save-preset"(){
    const d = state.draft;
    if (!d) return;
    const vorschlag = d.courseName.trim() || `${d.pars.length} Bahnen, Par ${
      d.pars.reduce((a, b) => a + b, 0)}`;
    const name = prompt("Name der Vorlage:", vorschlag);
    if (name === null) return;                       // abgebrochen
    state.presets = upsertPreset(state.presets,
      { name, pars: d.pars.slice(), si: d.si.slice() });
    persist();
  },

  "del-preset"(el){
    const pre = state.presets.find(x => x.id === el.dataset.id);
    if (!pre) return;
    if (!confirm(`Vorlage "${pre.name}" l\u00f6schen?`)) return;
    state.presets = removePreset(state.presets, pre.id);
    persist();
  },

  open(el){
    const round = state.rounds.find(r => r.id === el.dataset.id);
    if (!round) return;
    state.activeId = round.id;
    state.table = false;
    state.hole = firstOpenHole(round);
    state.view = round.completedAt ? "summary" : "play";
    persist();
  },

  del(el){
    const round = state.rounds.find(r => r.id === el.dataset.id);
    if (!round) return;
    const name = round.courseName || "diese Runde";
    if (!isRoundEmpty(round) && !confirm(`"${name}" vom ${fmtDate(round.date)} löschen?`)) return;
    state.rounds = state.rounds.filter(r => r.id !== round.id);
    if (state.activeId === round.id) state.activeId = null;
    persist();
  },

  "add-player"(){
    if (state.draft.players.length >= MAX_PLAYERS) return;
    state.draft.players.push(makePlayer(""));
  },

  "rm-player"(el){
    if (state.draft.players.length <= 1) return;
    state.draft.players = state.draft.players.filter(p => p.id !== el.dataset.id);
  },

  "cycle-par"(el){
    const i = Number(el.dataset.hole);
    state.draft.pars[i] = state.draft.pars[i] >= MAX_PAR ? MIN_PAR : state.draft.pars[i] + 1;
  },

  "cycle-par-live"(el){
    const round = activeRound();
    if (!round) return;
    const i = Number(el.dataset.hole);
    round.pars[i] = round.pars[i] >= MAX_PAR ? MIN_PAR : round.pars[i] + 1;
    persist();
  },

  "reset-par"(){
    state.draft.pars = defaultPars(state.draft.pars.length);
  },

  "reset-si"(){
    state.draft.si = defaultSi(state.draft.pars.length);
  },

  holes(el){
    resizeDraft(state.draft, state.draft.pars.length + Number(el.dataset.delta));
  },

  "holes-set"(el){
    resizeDraft(state.draft, Number(el.dataset.n));
  },

  "toggle-par"(){
    state.showPar = !state.showPar;
  },

  "toggle-stableford"(){
    state.draft.stableford = !state.draft.stableford;
  },

  "use-preset"(el){
    const pre = presetList(state.rounds, state.presets)[Number(el.dataset.i)];
    if (!pre) return;
    state.draft.pars = pre.pars.slice();
    state.draft.si = pre.si.slice();
    // Ein echter Platz bringt seinen Namen mit, eine allgemeine Form nicht.
    if (pre.kind !== "builtin") state.draft.courseName = pre.name;
  },

  "use-player"(el){
    if (state.draft.players.length >= MAX_PLAYERS) return;
    const taken = new Set(state.draft.players.map(p => p.name.trim()).filter(Boolean));
    const person = recentPlayers(state.rounds).filter(p => !taken.has(p.name))[Number(el.dataset.i)];
    if (!person) return;
    // Eine noch leere Zeile fuellen, statt eine weitere danebenzusetzen.
    const empty = state.draft.players.find(p => !p.name.trim());
    if (empty){ empty.name = person.name; empty.hcp = person.hcp; }
    else state.draft.players.push(makePlayer(person.name, person.hcp));
  },

  start(){
    const d = state.draft;
    d.players.forEach((p, i) => { if (!p.name.trim()) p.name = "Spieler " + (i + 1); });
    const round = makeRound(d.courseName.trim(), d.date, d.players, d.pars,
      { si: d.si, stableford: d.stableford });
    state.rounds.push(round);
    state.activeId = round.id;
    state.draft = null;
    state.hole = 0;
    state.table = false;
    state.view = "play";
    persist();
  },

  stroke(el){
    const round = activeRound();
    if (!round) return;
    const id = el.dataset.id;
    const i = state.hole;
    round.strokes[id][i] = bumpStroke(round.strokes[id][i], round.pars[i], Number(el.dataset.delta));
    persist();
  },

  "clear-stroke"(el){
    const round = activeRound();
    if (!round) return;
    round.strokes[el.dataset.id][state.hole] = null;
    persist();
  },

  "prev-hole"(){ state.hole = Math.max(0, state.hole - 1); },
  "next-hole"(){
    const round = activeRound();
    state.hole = Math.min((round ? holeCount(round) : 1) - 1, state.hole + 1);
  },

  "toggle-table"(){
    const round = activeRound();
    if (state.table && round && round.completedAt){ state.view = "summary"; state.table = false; return; }
    state.table = !state.table;
  },

  "show-card"(){ state.table = true; state.view = "play"; },

  summary(){ state.table = false; state.view = "summary"; },

  finish(){
    const round = activeRound();
    if (!round) return;
    const open = holeCount(round) - roundProgress(round);
    if (open > 0 && !confirm(`${open} Bahn${open === 1 ? "" : "en"} ohne Eintrag. Runde trotzdem beenden?`)) return;
    round.completedAt = new Date().toISOString();
    state.table = false;
    state.view = "summary";
    persist();
  },

  reopen(){
    const round = activeRound();
    if (!round) return;
    round.completedAt = null;
    state.hole = firstOpenHole(round);
    state.view = "play";
    persist();
  },

  /* navigator.share braucht eine echte Nutzergeste. Der Klick-Handler ruft
     diese Funktion synchron auf, und share() ist das erste await -- damit
     bleibt die Geste gueltig. */
  async share(){
    const round = activeRound();
    if (!round) return;
    const text = shareText(round);
    try {
      if (navigator.share){
        await navigator.share({ title: round.courseName || "Swing Golf", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      alert("Ergebnis in die Zwischenablage kopiert.");
    } catch (err){
      if (err && err.name === "AbortError") return;   // Nutzer hat abgebrochen
      alert(text);                                     // letzter Ausweg: zum Abschreiben
    }
  },

  "export-json"(){
    const blob = new Blob([serialize(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swing-golf-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    state.dataMsg = `${state.rounds.length} Runde(n) als Datei gesichert.`;
  },

  "import-json"(){
    const input = document.getElementById("importFile");
    if (input) input.click();
  }
};

root.addEventListener("click", ev => {
  const el = ev.target.closest("[data-act]");
  if (!el || !root.contains(el)) return;
  const fn = ACTIONS[el.dataset.act];
  if (!fn) return;
  ev.preventDefault();
  fn(el);
  render();
});

/* Texteingaben aktualisieren das Modell ohne Neuzeichnen -- sonst verliert
   das Feld bei jedem Tastendruck den Fokus. */
root.addEventListener("input", ev => {
  const el = ev.target.closest("[data-field]");
  if (!el) return;
  const field = el.dataset.field;

  if (field === "user" || field === "pass"){
    state.login[field] = el.value;
    return;                         // kein Neuzeichnen, sonst springt der Fokus
  }

  if (!state.draft) return;
  if (field === "player"){
    const p = state.draft.players.find(p => p.id === el.dataset.id);
    if (p) p.name = el.value;
  } else if (field === "hcp"){
    const p = state.draft.players.find(p => p.id === el.dataset.id);
    if (p) p.hcp = clamp(Math.round(Number(el.value) || 0), 0, MAX_HCP);
  } else if (field === "courseName" || field === "date"){
    state.draft[field] = el.value;
  }
});

/* Die Eingabetaste schickt das Formular ab -- auf iOS ist das der
   "Los"-Knopf der Tastatur, und ohne das muesste man ihn wegwischen, um den
   Anmelde-Knopf zu treffen. */
root.addEventListener("submit", ev => {
  ev.preventDefault();
  ACTIONS.login();
  render();
});

/* Auswahlfelder und der Datei-Dialog laufen ueber change, nicht input. */
root.addEventListener("change", ev => {
  const si = ev.target.closest('[data-field="si"]');
  if (si && state.draft){
    state.draft.si[Number(si.dataset.hole)] = Number(si.value);
    render();                       // die Doppelt-Warnung muss mitziehen
    return;
  }

  const file = ev.target.id === "importFile" ? ev.target : null;
  if (!file || !file.files || !file.files[0]) return;

  const reader = new FileReader();
  reader.onerror = () => { state.dataMsg = "Die Datei konnte nicht gelesen werden."; render(); };
  reader.onload = () => {
    let data;
    try { data = JSON.parse(String(reader.result)); }
    catch { state.dataMsg = "Die Datei ist kein g\u00fcltiges JSON."; render(); return; }

    const incoming = Array.isArray(data) ? data
      : (data && Array.isArray(data.rounds) ? data.rounds : null);
    if (!incoming){ state.dataMsg = "In der Datei stehen keine Runden."; render(); return; }

    const merged = mergeRounds(state.rounds, incoming);
    state.rounds = merged.rounds;

    // Vorlagen stecken mit in der Sicherung und gehoeren mit zurueck.
    // Die Darstellung bleibt aussen vor -- die gehoert zum Geraet, nicht zur Datei.
    const vorlagen = mergePresets(state.presets, data && data.presets);
    state.presets = vorlagen.presets;

    persist();
    state.dataMsg = `${merged.added} Runde(n) \u00fcbernommen, ${merged.skipped} `
      + `\u00fcbersprungen (schon vorhanden oder unbrauchbar)`
      + (vorlagen.added ? `, dazu ${vorlagen.added} Vorlage(n).` : ".");
    render();
  };
  reader.readAsText(file.files[0]);
});

