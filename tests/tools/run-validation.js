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
      const w = reading.rows[r];
      if (w === null) { results.push({ kind: 'notObtained', id: c.id, reading: name, range: r }); continue; }
      const d = S.dopeAt(M, inp, r);
      const vDiff = pct(d.vFps, w.v);
      const dDiff = d.dropIn - w.drop;
      const dTol = Math.max(T.dropIn.minAbs, Math.abs(w.drop) * T.dropIn.pct / 100);
      results.push({ kind: 'trajectory', id: c.id, reading: name, range: r,
        vPub: w.v, vOurs: Number(d.vFps.toFixed(1)), vPct: Number(vDiff.toFixed(2)), vPass: Math.abs(vDiff) <= T.velocityPct.value,
        dropPub: w.drop, dropOurs: Number(d.dropIn.toFixed(2)), dropDiff: Number(dDiff.toFixed(2)), dropTol: Number(dTol.toFixed(2)), dropPass: Math.abs(dDiff) <= dTol });
    }
  }
}

// Labeled sensitivity, not a validation and not a correction: the Hornady LE 6.5 CM case re-run in the Aberdeen atmosphere.
// The ICAO run above stays the primary pre-registered assumption. BC and solver are unchanged. Neither atmosphere is selected.
for (const c of R.trajectoryCases) {
  const a = c.assumptions, pub = c.inputsPublished, ab = R.atmospheres.HORNADY_ABERDEEN;
  for (const [name, reading] of Object.entries(c.readings)) {
    const inp = baseInputs({ v0: pub.v0Fps, bc: pub.bcG1, wt: pub.weightGr, diam: a.diamIn, h: a.sightHeightIn, zero: reading.zeroYd, tempF: ab.tempF, pressInHg: ab.pressInHg, humidity: ab.humidity, altFt: ab.altFt, model: 'G1' });
    const ranges = Object.keys(reading.rows).map(Number);
    const M = S.buildModel(inp, Math.max(...ranges) * 1.05);
    for (const r of ranges) {
      const w = reading.rows[r]; if (w === null) continue;
      const d = S.dopeAt(M, inp, r), vDiff = pct(d.vFps, w.v), dDiff = d.dropIn - w.drop, dTol = Math.max(T.dropIn.minAbs, Math.abs(w.drop) * T.dropIn.pct / 100);
      results.push({ kind: 'sensitivity', id: c.id, reading: name, atmosphere: 'HORNADY_ABERDEEN', range: r, vPub: w.v, vOurs: Number(d.vFps.toFixed(1)), vPct: Number(vDiff.toFixed(2)), dropPub: w.drop, dropOurs: Number(d.dropIn.toFixed(2)), dropDiff: Number(dDiff.toFixed(2)), pass: Math.abs(vDiff) <= T.velocityPct.value && Math.abs(dDiff) <= dTol });
    }
  }
}

// Second-manufacturer and worked-example datasets. Each is run under every atmosphere listed for it and all results are
// reported. No atmosphere is selected as correct and no BC is changed.
for (const d of R.datasets || []) {
  for (const an of d.atmospheresRun) {
    const atm = an === 'STATED_CONDITIONS' ? d.statedConditions : R.atmospheres[an];
    const bc = an === 'STATED_CONDITIONS' ? d.bcUncorrected : d.bc;
    const inp = baseInputs({ v0: d.muzzle.v, bc, wt: d.weightGr || 150, diam: d.diamIn || 0.308, h: d.sightHeightIn, zero: d.zeroYd,
      tempF: atm.tempF, pressInHg: atm.pressInHg, humidity: atm.humidity, altFt: atm.altFt, model: d.model });
    const ranges = Object.keys(d.rows).map(Number);
    const M = S.buildModel(inp, Math.max(...ranges) * 1.05);
    for (const r of ranges) {
      const w = d.rows[r];
      const x = S.dopeAt(M, inp, r);
      const row = { kind: 'dataset', id: d.id, atmosphere: an, bcUsed: bc, range: r };
      let pass = true;
      if (w.v !== null) { const vd = pct(x.vFps, w.v); Object.assign(row, { vPub: w.v, vOurs: Number(x.vFps.toFixed(1)), vPct: Number(vd.toFixed(2)), vPass: Math.abs(vd) <= T.velocityPct.value }); pass = pass && row.vPass; }
      if (w.drop !== null) { const dd = x.dropIn - w.drop, tol = Math.max(T.dropIn.minAbs, Math.abs(w.drop) * T.dropIn.pct / 100); Object.assign(row, { dropPub: w.drop, dropOurs: Number(x.dropIn.toFixed(2)), dropDiff: Number(dd.toFixed(2)), dropTol: Number(tol.toFixed(2)), dropPass: Math.abs(dd) <= tol }); pass = pass && row.dropPass; }
      row.pass = pass;
      results.push(row);
    }
  }
}

// Diagnostic only, never a validation: the G1 BC that would make the engine's velocity equal each published velocity.
// If these differ a lot from the published BC, the published numbers and the published BC are not describing the same
// calculation (or the numbers were not transcribed correctly). It does not say which one is wrong.
if (process.argv.includes('--diagnose')) {
  for (const c of R.trajectoryCases) for (const [name, reading] of Object.entries(c.readings)) for (const [r, w] of Object.entries(reading.rows)) {
    if (!w) continue;
    const a = c.assumptions, pub = c.inputsPublished;
    const vAt = (bc) => { const inp = baseInputs({ v0: pub.v0Fps, bc, wt: pub.weightGr, diam: a.diamIn, h: a.sightHeightIn, zero: reading.zeroYd, tempF: a.tempF, pressInHg: a.pressInHg, humidity: a.humidity, altFt: a.altFt, model: 'G1' }); const M = S.buildModel(inp, Number(r) * 1.05); return S.dopeAt(M, inp, Number(r)).vFps; };
    let lo = 0.05, hi = 1.5; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (vAt(mid) < w.v) lo = mid; else hi = mid; }
    console.log('DIAGNOSTIC ' + c.id + ' ' + r + ' yd: velocity ' + w.v + ' fps needs G1 BC ' + ((lo + hi) / 2).toFixed(3) + ' in this engine (published BC ' + pub.bcG1 + ')');
  }
  process.exit(0);
}
if (process.argv.includes('--json')) { console.log(JSON.stringify(results, null, 1)); process.exit(0); }
for (const x of results) {
  if (x.kind === 'table') console.log((x.pass ? 'MATCH   ' : 'DIFFERS ') + x.id + '  ' + x.what + '  published ' + x.published + '  ours ' + x.ours + '  diff ' + x.diff + '  (tolerance ' + x.tol + ')');
  else if (x.kind === 'notObtained') console.log('NOT OBTAINED ' + x.id + ' [' + x.reading + '] ' + x.range + ' yd  no usable published value for this row (missing or placeholder in the source), so no comparison was made');
  else if (x.kind === 'sensitivity') console.log('SENSITIVITY ' + x.id + ' [' + x.atmosphere + ', not a validation] ' + x.range + ' yd  velocity ' + x.vPub + ' vs ' + x.vOurs + ' (' + x.vPct + '%)  drop ' + x.dropPub + ' vs ' + x.dropOurs + ' in (diff ' + x.dropDiff + ')');
  else if (x.kind === 'dataset') console.log((x.pass ? 'MATCH   ' : 'DIFFERS ') + x.id + ' [' + x.atmosphere + ', BC ' + x.bcUsed + '] ' + x.range + ' yd  ' + (x.vPub !== undefined ? 'velocity ' + x.vPub + ' vs ' + x.vOurs + ' (' + x.vPct + '%)  ' : '') + (x.dropPub !== undefined ? 'drop ' + x.dropPub + ' vs ' + x.dropOurs + ' in (diff ' + x.dropDiff + ', tol ' + x.dropTol + ')' : ''));
  else console.log((x.vPass && x.dropPass ? 'MATCH   ' : 'DIFFERS ') + x.id + ' [' + x.reading + '] ' + x.range + ' yd  velocity ' + x.vPub + ' vs ' + x.vOurs + ' (' + x.vPct + '%)  drop ' + x.dropPub + ' vs ' + x.dropOurs + ' in (diff ' + x.dropDiff + ', tol ' + x.dropTol + ')');
}
const n = results.filter(x => x.kind !== 'notObtained' && x.kind !== 'sensitivity').length, m = results.filter(x => x.kind === 'notObtained' ? false : (x.kind === 'table' || x.kind === 'dataset' ? x.pass : (x.vPass && x.dropPass))).length;
console.log('\n' + m + ' of ' + n + ' comparisons within tolerance. This is not proof of accuracy.');
