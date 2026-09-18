/* =========================================================================
   Speicherung
   ========================================================================= */

const STORAGE_KEY = "swing-golf:v1";

function serialize(state){
  return JSON.stringify({
    version: 2,
    rounds: state.rounds,
    activeId: state.activeId,
    presets: state.presets,
    settings: state.settings
  });
}

function deserialize(raw){
  const empty = () => ({ rounds: [], activeId: null, presets: [], settings: normalizeSettings(null) });
  if (!raw) return empty();
  let data;
  try { data = JSON.parse(raw); } catch { return empty(); }
  if (!data || !Array.isArray(data.rounds)) return empty();

  const rounds = data.rounds.map(normalizeRound).filter(Boolean);
  return {
    rounds,
    activeId: rounds.some(r => r.id === data.activeId) ? data.activeId : null,
    // Version 1 kannte weder Vorlagen noch Einstellungen -- beides faellt
    // auf die Vorgabe zurueck, ohne dass die Runden darunter leiden.
    presets: (Array.isArray(data.presets) ? data.presets : []).map(normalizePreset).filter(Boolean),
    settings: normalizeSettings(data.settings)
  };
}

function loadState(){
  try { return deserialize(localStorage.getItem(STORAGE_KEY)); }
  catch { return deserialize(null); }
}

/* Gibt false zurueck, wenn nicht geschrieben werden konnte (privater Modus,
   volles Kontingent). Die App laeuft dann weiter, nur ohne Historie. */
function saveState(state){
  try { localStorage.setItem(STORAGE_KEY, serialize(state)); return true; }
  catch { return false; }
}

