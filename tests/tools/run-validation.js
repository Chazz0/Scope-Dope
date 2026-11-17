'use strict';
// Compares the engine with published reference data in tests/validation/references.json.
// Read-only. It prints every comparison, including failures. A pass here means the engine agrees
// with that one published number within the stated tolerance. It does not show the engine is
// accurate in general, and a software test passing is not evidence of ballistic accuracy.
const fs = require('fs');
const path = require('path');
const { loadSolver, baseInputs } = require('../helpers/load-solver');

const S = loadSolver();
const R = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'validation', 'references.json'), 'utf8'));
const T = R.tolerances;
const results = [];
const pct = (a, b) => 100 * (a - b) / b;

for (const p of R.tablePoints) {
  const ours = S.cdOf(p.model === 'G7' ? S.G7 : S.G1, p.mach);
  const diff = ours - p.published;
  results.push({ kind: 'table', id: p.id, what: p.model + ' Cd at Mach ' + p.mach, published: p.published, ours: Number(ours.toFixed(4)), diff: Number(diff.toFixed(4)), tol: T.tableCd.abs, pass: Math.abs(diff) <= T.tableCd.abs });
}

for (const c of R.trajectoryCases) {
  const a = c.assumptions, pub = c.inputsPublished;
  for (const [name, reading] of Object.entries(c.readings)) {
    const inp = baseInputs({ v0: pub.v0Fps, bc: pub.bcG1, wt: pub.weightGr, diam: a.diamIn, h: a.sightHeightIn, zero: reading.zeroYd,
      tempF: a.tempF, pressInHg: a.pressInHg, humidity: a.humidity, altFt: a.altFt, model: 'G1' });
    const ranges = Object.keys(reading.rows).map(Number);
    const M = S.buildModel(inp, Math.max(...ranges) * 1.05);
    for (const r of ranges) {
      const d = S.dopeAt(M, inp, r), w = reading.rows[r];
      const vDiff = pct(d.vFps, w.v);
      const dDiff = d.dropIn - w.drop;
      const dTol = Math.max(T.dropIn.minAbs, Math.abs(w.drop) * T.dropIn.pct / 100);
      results.push({ kind: 'trajectory', id: c.id, reading: name, range: r,
        vPub: w.v, vOurs: Number(d.vFps.toFixed(1)), vPct: Number(vDiff.toFixed(2)), vPass: Math.abs(vDiff) <= T.velocityPct.value,
        dropPub: w.drop, dropOurs: Number(d.dropIn.toFixed(2)), dropDiff: Number(dDiff.toFixed(2)), dropTol: Number(dTol.toFixed(2)), dropPass: Math.abs(dDiff) <= dTol });
    }
  }
}

if (process.argv.includes('--json')) { console.log(JSON.stringify(results, null, 1)); process.exit(0); }
for (const x of results) {
  if (x.kind === 'table') console.log((x.pass ? 'MATCH   ' : 'DIFFERS ') + x.id + '  ' + x.what + '  published ' + x.published + '  ours ' + x.ours + '  diff ' + x.diff + '  (tolerance ' + x.tol + ')');
  else console.log((x.vPass && x.dropPass ? 'MATCH   ' : 'DIFFERS ') + x.id + ' [' + x.reading + '] ' + x.range + ' yd  velocity ' + x.vPub + ' vs ' + x.vOurs + ' (' + x.vPct + '%)  drop ' + x.dropPub + ' vs ' + x.dropOurs + ' in (diff ' + x.dropDiff + ', tol ' + x.dropTol + ')');
}
const n = results.length, m = results.filter(x => x.kind === 'table' ? x.pass : (x.vPass && x.dropPass)).length;
console.log('\n' + m + ' of ' + n + ' comparisons within tolerance. This is not proof of accuracy.');
