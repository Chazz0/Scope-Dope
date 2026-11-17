'use strict';
// Read-only analysis. Replays the OLD weight-field arithmetic (each keystroke rescaled the coefficient from the
// previous keystroke and rounded to 3 places) and compares it with the correct one-step scaling.
// It changes nothing and reads no saved data. Run: node tests/tools/coefficient-exposure.js
const PRESETS = [[3240,0.243,55],[2950,0.379,95],[2710,0.610,140],[3060,0.409,130],[2650,0.462,168],[2910,0.415,150],[2900,0.533,190],[2960,0.625,143]];
const oldType = (bc0, wt0, typed) => {   // user selects the whole field and types the new weight
  let last = wt0, b = bc0;
  for (let i = 1; i <= typed.length; i++) { const nw = parseFloat(typed.slice(0, i)); if (isFinite(nw) && nw > 0) { b = parseFloat((b * nw / last).toFixed(3)); last = nw; } }
  return b;
};
const oldBackspaceType = (bc0, wt0, typed) => {  // user deletes one digit then types (e.g. 168 -> 16 -> 160)
  let last = wt0, b = bc0; const steps = [String(wt0).slice(0, -1), typed];
  for (const s of steps) { const nw = parseFloat(s); if (isFinite(nw) && nw > 0) { b = parseFloat((b * nw / last).toFixed(3)); last = nw; } }
  return b;
};
const finals = [55, 62, 69, 75, 77, 90, 100, 110, 120, 130, 140, 143, 147, 150, 155, 168, 175, 180, 190, 200, 208, 220, 250, 300];
const rows = [];
for (const [, bc0, wt0] of PRESETS) for (const w of finals) {
  if (w === wt0) continue;
  const want = bc0 * w / wt0;
  rows.push({ mode: 'select all and type', wt0, bc0, w, err: (oldType(bc0, wt0, String(w)) - want) / want });
  rows.push({ mode: 'delete one digit, then type', wt0, bc0, w, err: (oldBackspaceType(bc0, wt0, String(w)) - want) / want });
}
for (const mode of ['select all and type', 'delete one digit, then type']) {
  const r = rows.filter(x => x.mode === mode), a = r.map(x => Math.abs(x.err));
  const pct = (t) => (100 * a.filter(v => v > t).length / a.length).toFixed(0) + '%';
  console.log(mode.padEnd(28), 'cases', r.length, '| error > 1%:', pct(0.01), '| > 5%:', pct(0.05), '| worst', (100 * Math.max(...a)).toFixed(1) + '%', '| median', (100 * a.sort((x, y) => x - y)[a.length >> 1]).toFixed(1) + '%');
}
const ex = rows.find(x => x.mode === 'select all and type' && x.wt0 === 168 && x.w === 190);
console.log('example 168 -> 190 gr:', 'old', oldType(0.462, 168, '190'), 'correct', (0.462 * 190 / 168).toFixed(4));
