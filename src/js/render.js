/* =========================================================================
   Rendering
   ========================================================================= */

const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* Vier Ziele unten: spielen, nachschlagen, auswerten, einstellen. Alles
   andere haengt darunter und kommt mit einem Zurueck-Pfeil. */
const TABS = [
  { view: "home",     label: "Spielen",   icon: "flag" },
  { view: "rounds",   label: "Runden",    icon: "list" },
  { view: "stats",    label: "Statistik", icon: "chart" },
  { view: "settings", label: "Mehr",      icon: "sliders" }
];
const TAB_VIEWS = TABS.map(t => t.view);

const SVG = 'viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" '
  + 'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const ICONS = {
  flag:    `<svg ${SVG}><path d="M6 21V4"/><path d="M6 4.5h11l-2.2 3.4L17 11.4H6"/></svg>`,
  list:    `<svg ${SVG}><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/></svg>`,
  chart:   `<svg ${SVG}><path d="M5 20v-6M12 20V5M19 20v-9"/></svg>`,
  sliders: `<svg ${SVG}><path d="M4 8h9M17.5 8H20M4 16h3.5M12 16h8"/><circle cx="15.2" cy="8" r="2.2"/><circle cx="9.7" cy="16" r="2.2"/></svg>`,
  back:    `<svg ${SVG}><path d="M15 5l-7 7 7 7"/></svg>`,
  layers:  `<svg ${SVG}><path d="M12 3l8 4.5-8 4.5-8-4.5L12 3Z"/><path d="M4 12.5 12 17l8-4.5"/><path d="M4 17 12 21.5 20 17"/></svg>`,
  save:    `<svg ${SVG}><path d="M12 3v11"/><path d="m8 10.5 4 4 4-4"/><path d="M4 17.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5"/></svg>`,
  info:    `<svg ${SVG}><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.6h.01"/></svg>`,
  lock:    `<svg ${SVG}><rect x="4.5" y="10.5" width="15" height="10" rx="2.4"/><path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7"/></svg>`
};

function render(){
  /* Vor allem anderen: solange gesperrt, gibt es genau eine Ansicht.
     Impressum und Datenschutz liegen ausserhalb von #app und bleiben
     erreichbar -- sie muessen es sein. */
  if (!state.unlocked){ root.innerHTML = viewGate(); return; }

  const v = state.view;
  let html = "";

  if (state.storageFailed){
    html += `<div class="notice">Diese Runde kann nicht gespeichert werden &ndash; der Browser
      verweigert den Speicher (privater Modus?). Eintragen funktioniert, aber nach dem
      Schlie&szlig;en ist die Runde weg.</div>`;
  }

  if (v === "setup") html += viewSetup();
  else if (v === "play") html += viewPlay();
  else if (v === "summary") html += viewSummary();
  else if (v === "data") html += viewData();
  else if (v === "presets") html += viewPresets();
  else if (v === "rounds") html += viewRounds();
  else if (v === "stats") html += viewStats();
  else if (v === "settings") html += viewSettings();
  else html += viewHome();

  if (TAB_VIEWS.includes(v)) html += tabbar(v);
  root.innerHTML = html;
}

function tabbar(current){
  return `<nav class="tabbar" aria-label="Hauptbereiche"><div class="inner">` +
    TABS.map(t => `<button data-act="tab" data-view="${t.view}"
      ${t.view === current ? 'aria-current="page"' : ""}>
      <span class="ic">${ICONS[t.icon]}</span>${t.label}</button>`).join("") +
    `</div></nav>`;
}

/* Kopfzeile. back: Ziel-Ansicht fuer den Zurueck-Pfeil, sonst ohne. */
function topbar(title, sub, back, right){
  return `<div class="topbar">
    ${back ? `<button data-act="go" data-view="${back}" aria-label="Zur&uuml;ck"
        style="padding:8px 6px">${ICONS.back}</button>` : ""}
    <h1>${esc(title)}${sub ? `<span class="sub">${esc(sub)}</span>` : ""}</h1>
    ${right || ""}
  </div>`;
}

/* ---------- Anmeldung ---------- */

function viewGate(){
  const l = state.login;
  return `<div class="screen plain gate">
    <form class="card gate-card">
      <h1>Swing Golf</h1>
      <p class="sect">Anmeldung</p>
      <div class="stack">
        <input type="text" data-field="user" value="${esc(l.user)}"
          placeholder="Benutzername" autocomplete="username"
          autocapitalize="none" autocorrect="off" spellcheck="false"
          enterkeyhint="next" aria-label="Benutzername">
        <input type="password" data-field="pass" value="${esc(l.pass)}"
          placeholder="Passwort" autocomplete="current-password"
          enterkeyhint="go" aria-label="Passwort">
      </div>
      ${l.error ? `<p class="gate-error" role="alert">${esc(l.error)}</p>` : ""}
      <button class="btn-primary btn-wide" data-act="login" type="submit">Anmelden</button>
    </form>
  </div>`;
}

/* ---------- Spielen ---------- */

function viewHome(){
  const round = state.rounds.find(r => r.id === state.activeId && !r.completedAt)
    || state.rounds.filter(r => !r.completedAt).slice(-1)[0] || null;

  let html = `<div class="screen tabbed">` + topbar("Swing Golf");

  if (round){
    const n = holeCount(round);
    const played = roundProgress(round);
    const hole = Math.min(played + 1, n);
    const board = leaderboard(round);
    html += `<div class="hero">
      <div class="eyebrow">L&auml;uft gerade</div>
      <div class="title truncate">${esc(round.courseName || "Runde ohne Namen")}</div>
      <div class="meta">${fmtDate(round.date)} &middot; ${round.players.length} Spieler${
        round.stableford ? " &middot; Stableford" : ""}</div>
      <div class="lead"><span class="n">${hole}</span>
        <span class="muted">von ${n} Bahnen</span></div>
      <div class="progress"><span style="width:${Math.round((played / n) * 100)}%"></span></div>
      <div class="stack" style="gap:6px; margin-bottom:16px">`;
    for (const e of board.slice(0, 4)){
      html += `<div class="spread small"><span class="truncate">${esc(e.name)}</span>
        <span class="muted" style="font-variant-numeric:tabular-nums">${
          round.stableford ? `${e.points} Pkt` : (e.played ? fmtToPar(e.toPar) : "&ndash;")}</span></div>`;
    }
    html += `</div>
      <button class="btn-primary btn-wide" data-act="resume">Weiterspielen</button>
    </div>
    <button class="btn-soft btn-wide" data-act="new">Neue Runde</button>`;
  } else {
    const letzte = state.rounds.filter(r => r.completedAt).slice(-1)[0];
    html += `<div class="hero">
      <div class="eyebrow">Bereit</div>
      <div class="title">Neue Runde</div>
      <div class="meta">Vorlage w&auml;hlen, Spieler eintragen, losz&auml;hlen.</div>
      <button class="btn-primary btn-wide" data-act="new">Los geht&rsquo;s</button>
    </div>`;
    if (letzte){
      const top = leaderboard(letzte)[0];
      html += `<button class="round-item" data-act="open" data-id="${letzte.id}">
        <span class="meta">
          <span class="title truncate">Zuletzt: ${esc(letzte.courseName || "Ohne Namen")}</span>
          <span class="small muted">${fmtDate(letzte.date)}${
            top ? ` &middot; ${esc(top.name)} mit ${top.strokes}` : ""}</span>
        </span></button>`;
    }
  }

  return html + `</div>`;
}

/* ---------- Runden ---------- */

function viewRounds(){
  const byDate = (a, b) => (b.date || "").localeCompare(a.date || "");
  const running = state.rounds.filter(r => !r.completedAt).sort(byDate);
  const done = state.rounds.filter(r => r.completedAt).sort(byDate);

  let html = `<div class="screen tabbed">` + topbar("Runden");

  if (!state.rounds.length){
    html += `<div class="card"><div class="empty"><span class="big">${ICONS.flag}</span>
      Noch keine Runde.<br>Fang auf der Startseite eine an.</div></div>`;
    return html + `</div>`;
  }

  if (running.length){
    html += `<p class="sect">Laufend</p><div class="stack" style="margin-bottom:20px">`;
    for (const r of running) html += roundItem(r, true);
    html += `</div>`;
  }
  if (done.length){
    html += `<p class="sect">Abgeschlossen</p><div class="stack">`;
    for (const r of done) html += roundItem(r, false);
    html += `</div>`;
  } else {
    html += `<div class="card"><div class="empty">Noch keine Runde abgeschlossen.</div></div>`;
  }

  return html + `</div>`;
}

function roundItem(round, isRunning){
  const board = leaderboard(round);
  const top = board[0];
  const played = roundProgress(round);
  const n = holeCount(round);
  const title = round.courseName || "Ohne Platznamen";
  const sub = isRunning
    ? `${fmtDate(round.date)} &middot; Bahn ${Math.min(played + 1, n)} von ${n}`
    : `${fmtDate(round.date)} &middot; ${n} Bahnen${top ? ` &middot; ${esc(top.name)}` : ""}`;

  return `<div class="row" style="gap:8px">
    <button class="round-item grow" data-act="open" data-id="${round.id}">
      <span class="meta">
        <span class="title truncate">${esc(title)}</span>
        <span class="small muted truncate">${sub}</span>
      </span>
      ${top && played ? `<span class="score">${
        round.stableford ? `${top.points}<span class="muted small"> Pkt</span>`
                         : `${top.strokes} <span class="muted small">${fmtToPar(top.toPar)}</span>`
      }</span>` : ""}
      ${isRunning ? `<span class="badge">weiter</span>` : ""}
    </button>
    <button class="btn-danger" data-act="del" data-id="${round.id}"
      aria-label="Runde l&ouml;schen" style="flex:0 0 46px; padding:0; min-height:56px">&#10005;</button>
  </div>`;
}

/* ---------- Einstellungen ---------- */

function viewSettings(){
  const t = state.settings.theme;
  let html = `<div class="screen tabbed">` + topbar("Mehr");

  html += `<div class="card">
    <p class="sect">Darstellung</p>
    <div class="segment" role="group" aria-label="Darstellung">` +
    THEMES.map(k => `<button data-act="theme" data-theme="${k}"
      aria-pressed="${k === t}">${THEME_LABELS[k]}</button>`).join("") +
    `</div>
    <p class="hint">Automatisch folgt der Einstellung des Ger&auml;ts.</p>
  </div>`;

  html += `<div class="stack" style="margin-bottom:var(--gap)">
    <button class="link-row" data-act="go" data-view="presets">
      <span class="ic">${ICONS.layers}</span>
      <span class="t"><b>Vorlagen</b><span>${state.presets.length} gespeichert</span></span>
      <span class="arrow">&rsaquo;</span></button>
    <button class="link-row" data-act="go" data-view="data">
      <span class="ic">${ICONS.save}</span>
      <span class="t"><b>Daten</b><span>Sichern und zur&uuml;ckholen</span></span>
      <span class="arrow">&rsaquo;</span></button>
    <a class="link-row" href="#impressum">
      <span class="ic">${ICONS.info}</span>
      <span class="t"><b>Impressum</b><span>Angaben nach &sect; 5 DDG</span></span>
      <span class="arrow">&rsaquo;</span></a>
    <a class="link-row" href="#datenschutz">
      <span class="ic">${ICONS.info}</span>
      <span class="t"><b>Datenschutz</b><span>Was gespeichert wird und wo</span></span>
      <span class="arrow">&rsaquo;</span></a>
    <button class="link-row" data-act="logout">
      <span class="ic">${ICONS.lock}</span>
      <span class="t"><b>Abmelden</b><span>Zur&uuml;ck zur Anmeldung</span></span>
      <span class="arrow">&rsaquo;</span></button>
  </div>`;

  html += `<p class="hint" style="text-align:center">Alle Runden liegen nur auf diesem
    Ger&auml;t. Nichts wird hochgeladen.</p>`;
  return html + `</div>`;
}

/* ---------- Vorlagen verwalten ---------- */

function viewPresets(){
  let html = `<div class="screen plain">` + topbar("Vorlagen", null, "settings");

  if (!state.presets.length){
    html += `<div class="card"><div class="empty"><span class="big">${ICONS.layers}</span>
      Noch keine eigene Vorlage.<br>Beim Anlegen einer Runde lassen sich Bahnen,
      Par und Stroke-Index als Vorlage sichern.</div></div>`;
  } else {
    html += `<div class="stack">`;
    for (const pre of state.presets){
      const total = pre.pars.reduce((a, b) => a + b, 0);
      html += `<div class="row" style="gap:8px">
        <span class="round-item grow" style="cursor:default">
          <span class="meta">
            <span class="title truncate">${esc(pre.name)}</span>
            <span class="small muted">${pre.pars.length} Bahnen &middot; Par ${total}</span>
          </span></span>
        <button class="btn-danger" data-act="del-preset" data-id="${pre.id}"
          aria-label="Vorlage l&ouml;schen" style="flex:0 0 46px; padding:0; min-height:56px">&#10005;</button>
      </div>`;
    }
    html += `</div>`;
  }

  html += `<p class="hint">Gespielte Pl&auml;tze schlage ich ohnehin vor &ndash; gespeicherte
    Vorlagen stehen dar&uuml;ber und bleiben auch dann, wenn du die Runde l&ouml;schst.</p>`;
  return html + `</div>`;
}

function viewSetup(){
  const d = state.draft;
  const n = d.pars.length;
  const parTotal = d.pars.reduce((a, b) => a + b, 0);
  const presets = presetList(state.rounds, state.presets);
  const taken = new Set(d.players.map(p => p.name.trim()).filter(Boolean));
  const people = recentPlayers(state.rounds).filter(p => !taken.has(p.name));

  let html = `<div class="screen plain">` + topbar("Neue Runde", null, "home");

  /* Mehrere Vorlagen koennen dieselbe Form haben (ein gespielter 18-Loch-Platz
     und "Golfplatz, 18 Loch"). Dann bekommt nur die erste den Haken, sonst
     sieht es aus, als waeren zwei gewaehlt. Die Markierung haengt an den
     Werten, nicht an einem gemerkten Namen -- wer danach das Par aendert,
     verliert sie automatisch. */
  const passt = pre => pre.pars.length === n && pre.pars.every((v, k) => v === d.pars[k]);
  const aktivIdx = presets.findIndex(passt);

  html += `<div class="card"><p class="sect">Vorlage</p><div class="stack">`;
  presets.slice(0, 8).forEach((pre, i) => {
    const total = pre.pars.reduce((a, b) => a + b, 0);
    const aktiv = i === aktivIdx;
    html += `<button class="preset${aktiv ? " on" : ""}" data-act="use-preset" data-i="${i}">
      <span class="grow">
        <span class="title truncate">${esc(pre.name)}${
          pre.kind === "saved" ? `<span class="tag">eigene</span>`
          : pre.kind === "played" ? `<span class="tag">gespielt</span>` : ""}</span>
        <span class="small muted">${pre.pars.length} Bahnen &middot; Par ${total}</span>
      </span>
      ${aktiv ? `<span class="tick" aria-label="gew&auml;hlt">&#10003;</span>` : ""}
    </button>`;
  });
  html += `</div><p class="small muted" style="margin:10px 0 0">Alles darunter
    l&auml;sst sich danach noch einzeln &auml;ndern.</p></div>`;

  html += `<div class="card"><p class="sect">Platz</p><div class="stack">
    <input type="text" data-field="courseName" value="${esc(d.courseName)}"
      placeholder="Platzname" autocomplete="off" enterkeyhint="done">
    <input type="date" data-field="date" value="${esc(d.date)}">
  </div></div>`;

  html += `<div class="card"><p class="sect">Spieler</p><div class="stack">`;
  d.players.forEach((p, i) => {
    html += `<div class="row">
      <input class="grow" type="text" data-field="player" data-id="${p.id}"
        value="${esc(p.name)}" placeholder="Spieler ${i + 1}" autocomplete="off" enterkeyhint="done">
      <input type="number" data-field="hcp" data-id="${p.id}" value="${p.hcp}"
        min="0" max="${MAX_HCP}" step="1" aria-label="Spielvorgabe f&uuml;r Spieler ${i + 1}"
        style="flex:0 0 76px; text-align:center">
      <button class="btn-danger" data-act="rm-player" data-id="${p.id}"
        aria-label="Spieler entfernen" style="flex:0 0 46px; padding:0"
        ${d.players.length <= 1 ? "disabled" : ""}>&#10005;</button>
    </div>`;
  });
  html += `<p class="small muted" style="margin:0">Das schmale Feld ist die Spielvorgabe
    (0 = ohne). Sie z&auml;hlt nur f&uuml;r Stableford.</p>`;
  if (people.length){
    html += `<div class="chips-row">` + people.slice(0, 8).map((p, i) =>
      `<button class="chip-btn" data-act="use-player" data-i="${i}">+ ${esc(p.name)}</button>`
    ).join("") + `</div>`;
  }
  if (d.players.length < MAX_PLAYERS){
    html += `<button data-act="add-player">+ Spieler hinzuf&uuml;gen</button>`;
  } else {
    html += `<p class="small muted" style="margin:0">Maximal ${MAX_PLAYERS} Spieler.</p>`;
  }
  html += `</div></div>`;

  html += `<div class="card" style="padding:0; overflow:hidden">
    <button class="switch" data-act="toggle-stableford" aria-pressed="${d.stableford}"
      style="border:none; border-radius:0">
      <span class="box" aria-hidden="true">${d.stableford ? "&#10003;" : ""}</span>
      <span class="lbl"><b>Stableford z&auml;hlen</b>
        <span>Punkte statt Schl&auml;ge, netto nach Spielvorgabe</span></span>
    </button>
  </div>`;

  html += `<div class="card">
    <p class="sect">Bahnen</p>
    <div class="stepper" style="margin:0 0 10px">
      <button class="step" data-act="holes" data-delta="-1"
        aria-label="Eine Bahn weniger" ${n <= MIN_HOLES ? "disabled" : ""}>&minus;</button>
      <div class="value"><span class="n">${n}</span>
        <span class="lbl">Bahnen</span></div>
      <button class="step" data-act="holes" data-delta="1"
        aria-label="Eine Bahn mehr" ${n >= MAX_HOLES ? "disabled" : ""}>+</button>
    </div>
    <div class="chips-row">` +
      [6, 9, 12, 18].map(v =>
        `<button class="chip-btn${v === n ? " on" : ""}" data-act="holes-set" data-n="${v}">${v}</button>`
      ).join("") + `</div>
    <p class="small muted" style="margin:8px 0 0">${MIN_HOLES} bis ${MAX_HOLES} Bahnen.
      Vorhandene Bahnen behalten ihr Par, neue bekommen das h&auml;ufigste Par
      dieser Runde.</p>
  </div>`;

  /* Wer eine Vorlage nimmt, will das Par nicht Bahn fuer Bahn sehen. Es
     steht als eine Zeile da und klappt nur auf, wenn jemand es braucht. */
  html += `<div class="card">
    <button class="switch" data-act="toggle-par" aria-expanded="${state.showPar}"
      style="padding:0; background:none">
      <span class="lbl"><b>Par je Bahn</b>
        <span>Gesamt ${parTotal} &middot; ${n} Bahnen</span></span>
      <span class="muted" style="font-size:20px">${state.showPar ? "&minus;" : "+"}</span>
    </button>`;
  if (state.showPar){
    html += `<div class="par-grid" style="margin-top:14px">`;
    d.pars.forEach((par, i) => {
      html += `<button class="par-cell" data-act="cycle-par" data-hole="${i}"
        aria-label="Bahn ${i + 1}, Par ${par}, tippen zum &Auml;ndern">
        <span class="hole">${i + 1}</span><span class="val">${par}</span></button>`;
    });
    html += `</div>
      <div class="row" style="margin-top:10px">
        <button class="btn-soft small grow" data-act="reset-par">Standard-Par</button>
      </div>
      <p class="hint">Tippen schaltet ${MIN_PAR}&rarr;${MAX_PAR}&rarr;${MIN_PAR} weiter.</p>`;
  }
  html += `</div>`;

  html += `<button class="btn-soft btn-wide" data-act="save-preset"
    style="margin-bottom:var(--gap)">Als Vorlage sichern</button>`;

  if (d.stableford){
    const valid = new Set(d.si).size === n;
    html += `<div class="card">
      <p class="sect">Stroke-Index</p>
      <p class="small muted" style="margin:-4px 0 10px">Welche Bahn den wievielten
        Vorschlag bekommt &ndash; steht auf der Scorekarte des Platzes. Jede Zahl
        von 1 bis ${n} genau einmal.</p>
      <div class="si-grid">`;
    d.si.forEach((v, i) => {
      html += `<label class="si-cell">${i + 1}
        <select data-field="si" data-hole="${i}" aria-label="Stroke-Index Bahn ${i + 1}">` +
        defaultSi(n).map(k => `<option value="${k}"${k === v ? " selected" : ""}>${k}</option>`).join("") +
        `</select></label>`;
    });
    html += `</div>`;
    if (!valid){
      html += `<p class="small" style="color:var(--danger); margin:10px 0 0">
        Jede Zahl darf nur einmal vorkommen &ndash; sonst wird beim Start die
        Bahnreihenfolge verwendet.</p>`;
    }
    html += `<div class="row" style="margin-top:10px">
      <button class="btn-soft small grow" data-act="reset-si">Bahnreihenfolge wiederherstellen</button>
    </div></div>`;
  }

  html += `<button class="btn-primary" data-act="start" style="width:100%">Runde starten</button>`;
  return html + `</div>`;
}

/* ---------- Bahn-Eingabe und Scorekarte ---------- */

function viewPlay(){
  const round = activeRound();
  if (!round){ state.view = "home"; return viewHome(); }
  return state.table ? playTable(round) : playHole(round);
}

function playHole(round){
  const i = state.hole;
  const par = round.pars[i];

  let html = `<div class="screen plain">` + topbar(
    round.courseName || "Runde", fmtDate(round.date), "home",
    `<button data-act="toggle-table">Karte</button>`);

  html += `<div class="hole-head">
    <div class="no">Bahn ${i + 1} von ${holeCount(round)}</div>
    <div class="par">Par ${par}</div>
  </div>`;

  for (const p of round.players){
    const v = round.strokes[p.id][i];
    const lbl = scoreLabel(v, par);
    const recv = round.stableford ? strokesReceived(p.hcp, round.si, i) : 0;
    const pts = round.stableford ? holePoints(round, p.id, i) : null;
    const running = round.stableford
      ? `${totalPoints(round, p.id)} Pkt`
      : fmtToPar(toPar(round, p.id));
    html += `<div class="player-card">
      <div class="name"><span class="truncate">${esc(p.name)}</span>
        ${recv ? `<span class="small muted">+${recv}</span>` : ""}
        <span class="running">Runde ${running}</span></div>
      <div class="stepper">
        <button class="step" data-act="stroke" data-id="${p.id}" data-delta="-1"
          aria-label="Ein Schlag weniger f&uuml;r ${esc(p.name)}">&minus;</button>
        <div class="value">
          <span class="n ${lbl.cls}">${v == null ? "&ndash;" : v}</span>
          <span class="lbl ${lbl.cls}">${lbl.label}${
            pts != null ? ` &middot; ${pts} Pkt` : ""}</span>
        </div>
        <button class="step" data-act="stroke" data-id="${p.id}" data-delta="1"
          aria-label="Ein Schlag mehr f&uuml;r ${esc(p.name)}">+</button>
        <button class="clear" data-act="clear-stroke" data-id="${p.id}"
          aria-label="Eintrag f&uuml;r ${esc(p.name)} l&ouml;schen"
          ${v == null ? "disabled" : ""}>&#8635;</button>
      </div>
    </div>`;
  }

  const last = i === holeCount(round) - 1;
  html += `<div class="navbar">
    <button data-act="prev-hole" ${i === 0 ? "disabled" : ""}>&larr; Bahn</button>
    <span class="pos">${i + 1}/${holeCount(round)}</span>
    ${last
      ? `<button class="btn-primary" data-act="finish">Runde beenden</button>`
      : `<button data-act="next-hole">Bahn &rarr;</button>`}
  </div>`;
  return html + `</div>`;
}

function playTable(round){
  const cols = tableColumns(round);

  let html = `<div class="screen plain">` + topbar(
    round.courseName || "Runde", "Scorekarte", "home",
    `<button data-act="toggle-table">${round.completedAt ? "Ergebnis" : "Bahn"}</button>`);

  html += printHead(round);

  const head = cols.map(c => c.sum
    ? `<th>${c.label}</th>`
    : `<th>${c.hole + 1}</th>`).join("");

  const parCells = cols.map(c => c.sum
    ? `<td class="sum">${sum(round.pars, c.sum[0], c.sum[1])}</td>`
    : parCell(round, c.hole)).join("");

  let body = "";
  for (const p of round.players){
    const s = round.strokes[p.id];
    const cells = cols.map(c => c.sum
      ? `<td class="sum">${totalStrokes(round, p.id, c.sum[0], c.sum[1]) || "&middot;"}</td>`
      : strokeCell(s[c.hole], round.pars[c.hole])).join("");
    body += `<tr><th class="name-col" scope="row">${esc(p.name)}</th>${cells}</tr>`;
  }

  html += `<div class="table-wrap"><table class="card-table">
    <thead><tr><th class="name-col">Bahn</th>${head}</tr></thead>
    <tbody>
      <tr class="par-row"><th class="name-col" scope="row">Par</th>${parCells}</tr>
      ${body}
    </tbody></table></div>`;

  html += `<div class="card" style="margin-top:12px"><div class="stack">`;
  for (const e of leaderboard(round)){
    html += `<div class="spread"><span class="truncate">${esc(e.name)}</span>
      <span style="font-variant-numeric:tabular-nums">${
        round.stableford
          ? `<strong>${e.points}</strong> <span class="muted small">Pkt &middot; ${e.strokes || 0} Schl&auml;ge</span>`
          : `<strong>${e.strokes || 0}</strong> <span class="muted small">${e.played ? fmtToPar(e.toPar) : "&ndash;"}</span>`
      }</span></div>`;
  }
  html += `</div></div>`;
  html += `<p class="hint">Seitlich wischen f&uuml;r die hinteren Bahnen und die Summen.
    Par antippen, um ihn zu korrigieren.</p>`;

  html += `<div class="navbar">
    <button class="btn-soft" data-act="print">Drucken</button>
    ${round.completedAt
      ? `<button data-act="summary">Zur Auswertung</button>`
      : `<button class="btn-primary" data-act="finish">Runde beenden</button>`}
  </div>`;
  return html + `</div>`;
}

/* Spaltenfolge der Karte: die Bahnen, dazwischen Out, am Ende In und Gesamt.
   Laesst sich die Runde nicht halbieren, entfaellt Out/In und es bleibt die
   Gesamtsumme. */
/* Steht nur im Ausdruck: Platz, Datum und Besetzung als Kopf der Karte.
   Am Bildschirm sagt das die Kopfzeile, die beim Drucken verschwindet. */
function printHead(round){
  const n = holeCount(round);
  return `<div class="print-head">
    <div class="t">${esc(round.courseName || "Swing Golf")}</div>
    <div class="m">${fmtDate(round.date)} &middot; ${n} Bahnen &middot; Par ${
      sum(round.pars, 0, n)}${round.stableford ? " &middot; Stableford" : ""}
      &middot; ${round.players.map(p => esc(p.name)).join(", ")}</div>
  </div>`;
}

function tableColumns(round){
  const n = holeCount(round);
  const half = halfPoint(n);
  const cols = [];
  for (let i = 0; i < n; i++){
    cols.push({ hole: i });
    if (half && i + 1 === half) cols.push({ sum: [0, half], label: "Out" });
  }
  if (half) cols.push({ sum: [half, n], label: "In" });
  cols.push({ sum: [0, n], label: "Ges" });
  return cols;
}

function parCell(round, i){
  return `<td class="par-editable" data-act="cycle-par-live" data-hole="${i}">${round.pars[i]}</td>`;
}

function strokeCell(v, par){
  if (v == null) return `<td class="empty-cell">&middot;</td>`;
  return `<td class="${scoreLabel(v, par).cls}"><strong>${v}</strong></td>`;
}

function sum(arr, from, to){
  let s = 0;
  for (let i = from; i < to; i++) s += arr[i];
  return s;
}

/* ---------- Auswertung ---------- */

const COUNT_LABELS = [
  ["ace", "Hole-in-One"], ["eagle", "Eagle"], ["birdie", "Birdie"],
  ["par", "Par"], ["bogey", "Bogey"], ["double", "Doppelbogey+"]
];

const SCORE_CLASS = {
  ace: "s-ace", eagle: "s-eagle", birdie: "s-birdie",
  par: "s-par", bogey: "s-bogey", double: "s-double"
};

function viewSummary(){
  const round = activeRound();
  if (!round){ state.view = "home"; return viewHome(); }
  const board = leaderboard(round);

  let html = `<div class="screen plain">` + topbar(
    round.courseName || "Runde", fmtDate(round.date), "home");

  html += printHead(round);

  html += `<div class="card"><p class="sect">Endstand</p>`;
  board.forEach((e, idx) => {
    const counts = scoreCounts(round, e.id);
    const chips = COUNT_LABELS
      .filter(([k]) => counts[k] > 0)
      .map(([k, label]) => `<span class="chip">${counts[k]}&times; ${label}</span>`)
      .join("");
    html += `<div class="rank${idx === 0 ? " win" : ""}">
      <span class="pos">${idx + 1}</span>
      <span class="who">
        <span class="n truncate">${esc(e.name)}</span>
        <span class="small muted">${e.played} von ${holeCount(round)} Bahnen${
          round.stableford && e.hcp ? ` &middot; Vorgabe ${e.hcp}` : ""}</span>
        ${chips ? `<span class="chips">${chips}</span>` : ""}
      </span>
      <span class="tot">${
        round.stableford
          ? `<span class="strokes">${e.points}</span>
             <span class="rel">Pkt &middot; ${e.strokes} Schl&auml;ge</span>`
          : `<span class="strokes">${e.strokes}</span>
             <span class="rel">${fmtToPar(e.toPar)}</span>`
      }</span>
    </div>`;
  });
  html += `</div>`;

  html += `<div class="stack">
    <button data-act="share">Ergebnis teilen</button>
    <button data-act="show-card">Scorekarte ansehen</button>
    <button data-act="reopen">Runde wieder &ouml;ffnen</button>
    <button class="btn-soft" data-act="print">Drucken</button>
    <button class="btn-primary" data-act="home">Fertig</button>
  </div>`;
  return html + `</div>`;
}

/* ---------- Statistik ---------- */

function fmtAvg(n, digits = 1){
  return Number.isFinite(n) ? n.toFixed(digits).replace(".", ",") : "&ndash;";
}

/* Wie fmtToPar, nur mit Nachkommastellen: genau auf Par bleibt "E". */
function fmtRelAvg(n){
  if (!Number.isFinite(n)) return "&ndash;";
  const s = fmtAvg(Math.abs(n), 2);
  if (Number(s.replace(",", ".")) === 0) return "E";
  return (n > 0 ? "+" : "\u2212") + s;
}

function viewStats(){
  const rows = statsFor(state.rounds);

  let html = `<div class="screen tabbed">` + topbar("Statistik",
    "\u00fcber alle abgeschlossenen Runden");

  if (!rows.length){
    html += `<div class="card"><div class="empty"><span class="big">${ICONS.chart}</span>
      Noch nichts zu z&auml;hlen.<br>Schlie&szlig;e erst eine Runde ab.</div></div>`;
    return html + `</div>`;
  }

  for (const e of rows){
    const perHole = e.strokes / e.holes;
    const parPerHole = (e.strokes - e.par) / e.holes;

    html += `<div class="card">
      <div class="spread"><span class="stat-name">${esc(e.name)}</span>
        <span class="small muted">${e.rounds} Runde${e.rounds === 1 ? "" : "n"}</span></div>
      <div class="stat-grid">
        <div class="stat"><div class="v">${fmtAvg(perHole, 2)}</div>
          <div class="k">Schl&auml;ge je Bahn</div></div>
        <div class="stat"><div class="v">${fmtRelAvg(parPerHole)}</div>
          <div class="k">zu Par je Bahn</div></div>
        <div class="stat"><div class="v">${e.best ? e.best.strokes : "&ndash;"}</div>
          <div class="k">${e.best
            ? `beste Runde (${fmtToPar(e.best.toPar)})`
            : "keine volle Runde"}</div></div>
        <div class="stat"><div class="v">${e.holes}</div>
          <div class="k">Bahnen gez&auml;hlt</div></div>
      </div>`;

    if (e.best && e.best.course){
      html += `<p class="small muted" style="margin:0 0 8px">Beste Runde:
        ${esc(e.best.course)}, ${fmtDate(e.best.date)}</p>`;
    }

    const max = Math.max(1, ...COUNT_LABELS.map(([k]) => e.counts[k]));
    html += `<div class="bars">`;
    for (const [k, label] of COUNT_LABELS){
      const n = e.counts[k];
      if (!n) continue;
      const pct = Math.round((n / e.holes) * 100);
      html += `<div class="bar">
        <span class="${SCORE_CLASS[k]}">${label}</span>
        <span class="track"><span class="fill" style="width:${(n / max) * 100}%"></span></span>
        <span class="n">${n}</span>
      </div>`;
    }
    html += `</div>`;

    const pars = [3, 4, 5, 6].filter(x => e.byPar[x].holes > 0);
    if (pars.length){
      html += `<p class="small muted" style="margin:10px 0 0">Schnitt je Bahnart: ` +
        pars.map(x => `Par ${x} <strong>${fmtAvg(e.byPar[x].strokes / e.byPar[x].holes, 2)}</strong>`)
            .join(" &middot; ") + `</p>`;
    }
    html += `</div>`;
  }

  return html + `</div>`;
}

/* ---------- Daten: Export und Import ---------- */

function viewData(){
  const n = state.rounds.length;
  let html = `<div class="screen plain">` + topbar("Daten", "Sichern und zur\u00fcckholen",
    "settings");

  html += `<div class="card">
    <p class="sect">Auf diesem Ger&auml;t</p>
    <p style="margin:0 0 12px">${n} Runde${n === 1 ? "" : "n"} gespeichert.
      Sie liegen ausschlie&szlig;lich hier im Browser &ndash; ein anderes Ger&auml;t,
      ein anderer Browser oder gel&ouml;schte Website-Daten hei&szlig;t: weg.</p>
    <div class="stack">
      <button data-act="export-json" ${n ? "" : "disabled"}>Als JSON sichern</button>
      <button data-act="import-json">JSON laden</button>
    </div>
    <input type="file" id="importFile" accept="application/json,.json" hidden>
    <p class="hint">Gesichert werden Runden und Vorlagen. Beim Laden wird
      erg&auml;nzt, nicht ersetzt &ndash; schon Vorhandenes bleibt unangetastet.
      Die Darstellung geh&ouml;rt zum Ger&auml;t und wandert nicht mit.</p>
  </div>`;

  if (state.dataMsg){
    html += `<div class="card"><p style="margin:0">${esc(state.dataMsg)}</p></div>`;
  }

  return html + `</div>`;
}


