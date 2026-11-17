'use strict';
// Diagnostic only. Not a validation, not a correction. For every comparison that is outside tolerance it reports the
// published value, the calculated value, the difference, and the tolerance. It then fits the BC (and for the G7 sets, the
// equivalent G1 BC) that would reproduce the published velocities, to show whether the stated BC and the published table
// describe the same calculation. Nothing here changes the engine, references, BCs or tolerances.
const fs = require('fs'), path = require('path');
const { loadSolver, baseInputs } = require('../helpers/load-solver');
const S = loadSolver();
const R = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'validation', 'references.json'), 'utf8'));
const T = R.tolerances, pct = (a, b) => 100 * (a - b) / b;
const run = (d, atm, bc, model) => {
  const inp = baseInputs({ v0: d.muzzle.v, bc, wt: d.weightGr || 150, diam: d.diamIn || 0.308, h: d.sightHeightIn, zero: d.zeroYd, tempF: atm.tempF, pressInHg: atm.pressInHg, humidity: atm.humidity, altFt: atm.altFt, model });
  const ranges = Object.keys(d.rows).map(Number), M = S.buildModel(inp, Math.max(...ranges) * 1.05);
  return ranges.map(r => ({ r, x: S.dopeAt(M, inp, r), w: d.rows[r] }));
};
const sse = (d, atm, bc, model) => run(d, atm, bc, model).filter(o => o.w.v !== null).reduce((s, o) => s + Math.pow(pct(o.x.vFps, o.w.v), 2), 0);
const fit = (d, atm, model, lo, hi) => { for (let i = 0; i < 60; i++) { const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3; if (sse(d, atm, a, model) < sse(d, atm, b, model)) hi = b; else lo = a; } return (lo + hi) / 2; };
const out = [];
const ok = x => x.pass;
const rv = JSON.parse(require('child_process').execFileSync('node', [path.join(__dirname, 'run-validation.js'), '--json'], { encoding: 'utf8', maxBuffer: 1 << 26 }));
const fails = rv.filter(x => x.kind === 'dataset' && !ok(x));
for (const f of fails) {
  const row = { id: f.id, atmosphere: f.atmosphere, range: f.range, publishedV: f.vPub, calcV: f.vOurs, vPct: f.vPct, vTolPct: T.velocityPct.value, publishedDrop: f.dropPub, calcDrop: f.dropOurs, dropDiff: f.dropDiff, dropTol: f.dropTol };
  out.push(row);
}
const groups = [...new Set(fails.filter(f => f.vPub !== undefined).map(f => f.id + '|' + f.atmosphere))];
const dropOnly = [...new Set(fails.filter(f => f.vPub === undefined).map(f => f.id))];
const fits = groups.map(g => {
  const [id, an] = g.split('|'); const d = R.datasets.find(x => x.id === id); const atm = R.atmospheres[an];
  const model = d.model, bcFit = fit(d, atm, model, d.bc * 0.7, d.bc * 1.5);
  return { id, atmosphere: an, model, statedBC: d.bc, fittedBC: Number(bcFit.toFixed(4)), fittedVsStatedPct: Number(pct(bcFit, d.bc).toFixed(2)) };
});
// Does a G1 BC reproduce the G7-labelled table? Fit G1 on the same rows.
const cross = groups.filter(g => g.includes('G7')).map(g => {
  const [id, an] = g.split('|'); const d = R.datasets.find(x => x.id === id); const atm = R.atmospheres[an];
  const b = fit(d, atm, 'G1', 0.3, 0.7), rows = run(d, atm, b, 'G1').filter(o => o.w.v !== null).map(o => Number(pct(o.x.vFps, o.w.v).toFixed(2)));
  return { id, atmosphere: an, fittedG1BC: Number(b.toFixed(4)), residualVelocityPct: rows };
});
if (process.argv.includes('--json')) console.log(JSON.stringify({ out, fits, cross }, null, 1));
else {
  for (const r of out) console.log(JSON.stringify(r));
  console.log('\nFitted BC that reproduces the published velocities (diagnostic only):');
  for (const f of fits) console.log(JSON.stringify(f));
  console.log('\nG1 BC fitted to the G7-labelled tables, with residual velocity % at each row:');
  for (const c of cross) console.log(JSON.stringify(c));
  console.log('\nDrop-only failures (no velocity row, so no BC fit): ' + dropOnly.join(', '));
  const sib = rv.filter(x => x.kind === 'dataset' && /^FEDERAL-GM308M-168-G1/.test(x.id));
  console.log('Same ammunition, G1 BC .462 variants: ' + sib.filter(ok).length + ' of ' + sib.length + ' comparisons within tolerance (ICAO and Aberdeen).');
  console.log('\nThe fit shows what BC would match the numbers. It is not a correction and was not applied.');
}
