'use strict';
// Stage 11 (measured-trajectory validation) comparison. READ-ONLY with respect to the app: it loads the solver from index.html
// exactly as the app runs it and compares its output with the measured values in tests/validation/stage11/datasets.json.
// Inputs the sources do not give are NOT guessed: each is varied across a stated envelope and every case is kept in the output.
// Nothing is tuned and no case is dropped. Writes only tests/validation/stage11/results.json (the OUT path).
// Run: node tests/tools/stage11-compare.js
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const { loadSolver, baseInputs } = require(path.join(ROOT, 'tests', 'helpers', 'load-solver.js'));
const S = loadSolver();
const dir = path.join(ROOT, 'tests', 'validation', 'stage11');
const OUT = path.join(dir, 'results.json');
const D = JSON.parse(fs.readFileSync(path.join(dir, 'datasets.json'), 'utf8'));
const r3 = (x) => Math.round(x * 1000) / 1000, r2 = (x) => Math.round(x * 100) / 100;
const out = { generatedBy: 'tests/tools/stage11-compare.js', modelVersion: S.MODEL_VERSION, conventions: 'error = predicted hold minus measured hold (positive: model needs more elevation than was measured). inches = mil * range_yd * 0.036; MOA = mil * 3.43775.', datasets: {} };

function predict(ds, bc, atm, zero, h, range) {
  const inp = baseInputs({ model: bc.model, bc: bc.value, v0: ds.mv, wt: ds.bullet.wt, diam: ds.bullet.diam, twist: ds.twist || 10, zero, h, tempF: atm.tempF, altFt: atm.altFt });
  const M = S.buildModel(inp, Math.max(1700, range + 100));
  const d = S.dopeAt(M, inp, range);
  return { holdMil: d.elevMil, holdMoa: d.elevMoa, vFps: d.vFps, mach: d.mach, inputs: { model: bc.model, bc: bc.value, v0: ds.mv, wt: ds.bullet.wt, diam: ds.bullet.diam, twist: ds.twist || 10, zero, h, tempF: atm.tempF, altFt: atm.altFt, humidity: 0, pressInHg: null } };
}
function err(pred, measMil, range) { const e = pred - measMil; return { errMil: r3(e), errMoa: r2(e * 3.43775), errIn: r2(e * range * 0.036) }; }

for (const ds of D.datasets) {
  if (!ds.status.startsWith('usable')) { out.datasets[ds.id] = { status: ds.status, excludedBecause: ds.excludedBecause || ds.circularityNote || ds.status, predictionsMade: false }; continue; }
  const res = { status: ds.status, uncertaintyMil: ds.measured.uncertaintyMil, rows: [], allCases: [] };
  for (const [range, measRaw] of ds.measured.rows) {
    const meas = Math.abs(measRaw);
    const row = { rangeYd: range, measuredMil: meas, measuredIn: r2(meas * range * 0.036), uncertaintyMil: ds.measured.uncertaintyMil, byBc: [] };
    for (const bc of ds.bc) {
      const cases = [];
      const env = ds.envelope;
      for (const zero of env.zero) for (const h of env.h) for (const atm of env.atm) {
        const p = predict(ds, bc, atm, zero, h, range);
        const c = Object.assign({ zero, h, atm: atm.id, holdMil: r3(p.holdMil), vFps: Math.round(p.vFps), mach: r3(p.mach) }, err(p.holdMil, meas, range));
        cases.push(c); res.allCases.push(Object.assign({ rangeYd: range, bc: bc.model + ' ' + bc.value }, c));
      }
      const pr = cases.find(c => c.zero === ds.primary.zero && c.h === ds.primary.h && c.atm === ds.primary.atm);
      const errs = cases.map(c => c.errMil);
      row.byBc.push({ bc: bc.model + ' ' + bc.value, bcOrigin: bc.origin, primary: pr, envelopeErrMil: [Math.min(...errs), Math.max(...errs)], envelopeErrMoa: [r2(Math.min(...errs) * 3.43775), r2(Math.max(...errs) * 3.43775)], envelopeErrIn: [r2(Math.min(...errs) * range * 0.036), r2(Math.max(...errs) * range * 0.036)], casesWithinMeasUncertainty: cases.filter(c => Math.abs(c.errMil) <= (ds.measured.uncertaintyMil == null ? 0 : ds.measured.uncertaintyMil)).length, caseCount: cases.length });
    }
    res.rows.push(row);
  }
  out.datasets[ds.id] = res;
}
// ---- Diagnostics (sensitivity only; nothing here is a fit and no input is adopted) ----
out.diagnostics = {};
const prim = (id, bcIdx) => { const ds = D.datasets.find(d => d.id === id); const a = ds.envelope.atm.find(x => x.id === ds.primary.atm); return { ds, a, bc: ds.bc[bcIdx] }; };
{ // DS-D: altitude (density) sweep, std temperature
  const { ds, bc } = prim('DS-D', 0); out.diagnostics['DS-D-altitude'] = { note: 'held at 59 F, no humidity; altitude is NOT stated by the source', rows: [] };
  for (const alt of [0, 3000, 5000, 7000, 10000]) for (const [range, m] of ds.measured.rows) { const p = predict(ds, bc, { tempF: 59, altFt: alt }, ds.zero, 1.5, range); out.diagnostics['DS-D-altitude'].rows.push(Object.assign({ altFt: alt, rangeYd: range, measuredMil: m, holdMil: r3(p.holdMil) }, err(p.holdMil, m, range))); }
}
{ // muzzle velocity sensitivity for DS-A (G1 .505), DS-D and DS-E (first BC); +/- 1% of MV
  out.diagnostics['mv-sensitivity'] = [];
  for (const [id, bi, range] of [['DS-A', 0, 1000], ['DS-A', 0, 1323], ['DS-D', 0, 1000], ['DS-D', 0, 1220], ['DS-E', 0, 1000]]) {
    const { ds, a, bc } = prim(id, bi); const z = ds.zero || ds.primary.zero, h = ds.h || ds.primary.h;
    const base = predict(ds, bc, a, z, h, range).holdMil;
    const up = predict(Object.assign({}, ds, { mv: ds.mv * 1.01 }), bc, a, z, h, range).holdMil, dn = predict(Object.assign({}, ds, { mv: ds.mv * 0.99 }), bc, a, z, h, range).holdMil;
    out.diagnostics['mv-sensitivity'].push({ id, rangeYd: range, mv: ds.mv, holdMil: r3(base), holdMilAtMvPlus1pct: r3(up), holdMilAtMvMinus1pct: r3(dn), changePerPctMil: r3((dn - up) / 2) });
  }
}
{ // vertical Coriolis the solver would add, if the test site/azimuth were known (they are not): lat 30/45/60, shooting east and west
  out.diagnostics['coriolis-vertical'] = [];
  for (const [id, range] of [['DS-A', 1323], ['DS-D', 1220], ['DS-E', 1000]]) {
    const { ds, a, bc } = prim(id, 0); const z = ds.zero || ds.primary.zero, h = ds.h || ds.primary.h;
    for (const lat of [30, 45, 60]) for (const az of [90, 270]) {
      const inp = baseInputs({ model: bc.model, bc: bc.value, v0: ds.mv, wt: ds.bullet.wt, diam: ds.bullet.diam, twist: ds.twist || 10, zero: z, h, tempF: a.tempF, altFt: a.altFt, latDeg: lat, azimuth: az });
      const M = S.buildModel(inp, range + 100); const d = S.dopeAt(M, inp, range);
      out.diagnostics['coriolis-vertical'].push({ id, rangeYd: range, latDeg: lat, azimuth: az, corVIn: r2(d.corVIn), corVMil: r3(d.corVIn / (range * 0.036)), corHIn: r2(d.corHIn) });
    }
  }
}
{ // DS-A: how much of the model-minus-measured gap at 300 yd is the zero distance (100 vs 200 yd), G1 .505, std atmosphere, h 1.5
  const { ds, a, bc } = prim('DS-A', 0); out.diagnostics['DS-A-zero'] = [];
  for (const z of [50, 100, 150, 200, 300]) for (const [range, m] of ds.measured.rows) { const p = predict(ds, bc, a, z, 1.5, range); out.diagnostics['DS-A-zero'].push(Object.assign({ zero: z, rangeYd: range, measuredMil: Math.abs(m), holdMil: r3(p.holdMil) }, err(p.holdMil, Math.abs(m), range))); }
}
// DS-F: existing measured-drag comparison (drag only; circular BC) summarised from the existing read-only tool.
const f = JSON.parse(execFileSync('node', [path.join(ROOT, 'tests', 'tools', 'compare-measured.js'), '--json'], { encoding: 'utf8', maxBuffer: 1 << 26 }));
const tol = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'validation', 'measured-doppler.json'), 'utf8')).tolerance.cdRelPct;
out.datasets['DS-F'] = { status: 'drag-only-not-a-trajectory', toleranceCdRelPct: tol, rows: f.rows.length, withinAtNominal: f.rows.filter(x => x.withinAtNominal).length, withinAtAllSos: f.rows.filter(x => x.withinAtAllSos).length,
  outside: f.rows.filter(x => !x.withinAtNominal).map(x => ({ bullet: x.bullet, wt: x.wt, v: x.v, model: x.model, bc: x.bc, relPct: x.runs[0].relPct })), predictionsMade: false, note: 'drag coefficients only; BC fitted from the same shots' };
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
// Console summary
for (const [id, r] of Object.entries(out.datasets)) {
  console.log('\n' + id + ' ' + r.status);
  if (!r.rows || !r.rows[0] || !r.rows[0].byBc) { console.log('  ' + (r.excludedBecause || ('drag rows ' + r.rows + ', within tolerance ' + r.withinAtNominal))); continue; }
  for (const row of r.rows) for (const b of row.byBc) console.log('  ' + String(row.rangeYd).padStart(5) + ' yd  meas ' + row.measuredMil.toFixed(2) + ' mil  ' + b.bc.padEnd(10) + ' primary err ' + b.primary.errMil.toFixed(2) + ' mil (' + b.primary.errIn.toFixed(1) + ' in, ' + b.primary.errMoa.toFixed(2) + ' MOA)  envelope ' + b.envelopeErrMil[0].toFixed(2) + '..' + b.envelopeErrMil[1].toFixed(2) + ' mil');
}
console.log('\nwrote tests/validation/stage11/results.json (model ' + out.modelVersion + ')');
