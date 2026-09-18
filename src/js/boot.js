/* =========================================================================
   Start
   ========================================================================= */

if (new URLSearchParams(location.search).has("selftest")){
  runSelfTest();
} else {
  const stored = loadState();
  state.rounds = stored.rounds;
  state.presets = stored.presets;
  state.settings = stored.settings;
  state.activeId = stored.activeId;
  applyTheme(state.settings.theme);
  const active = activeRound();
  /* Direkt zurueck in die laufende Runde: iOS entlaedt die Seite zwischen
     zwei Schlaegen regelmaessig, da will niemand jedes Mal neu navigieren. */
  if (active && !active.completedAt){
    state.hole = firstOpenHole(active);
    state.view = "play";
  }
  render();
}
