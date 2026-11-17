'use strict';
// Compares the app's drag tables with MEASURED Doppler drag coefficients (tests/validation/measured-doppler.json).
// Read-only. Scope: drag coefficient at about 100 m for .308 bullets. This is measured flight data for drag only. It is not a
// trajectory comparison and does not show the app predicts drop, wind or spin drift. Usage: node tests/tools/compare-measured.js [--json]
const fs = require('fs'), path = require('path');
const { loadSolver } = require('../helpers/load-solver');
const S = loadSolver();
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'validation', 'measured-doppler.json'), 'utf8'));
const tol = D.tolerance.cdRelPct;
const sos = [D.machAssumption.speedOfSoundFps, ...D.machAssumption.sensitivityFps];
const pred = (tbl, bc, row, a) => S.cdOf(tbl, row.v / a) * (row.wt / 7000 / (D.diameterIn * D.diameterIn)) / bc;
const out = { rows: [], twoVelocity: [] };
for (const r of D.rows) for (const [name, tbl, bc] of [['G1', S.G1, r.g1], ['G7', S.G7, r.g7]]) {
  if (bc === null) continue;
  const res = sos.map(a => { const p = pred(tbl, bc, r, a); return { sos: a, mach: Number((r.v / a).toFixed(3)), cdPred: Number(p.toFixed(4)), relPct: Number((100 * (p - r.cdMeasured) / r.cdMeasured).toFixed(2)) }; });
  out.rows.push({ bullet: r.bullet, wt: r.wt, v: r.v, model: name, bc, cdMeasured: r.cdMeasured, runs: res, withinAtNominal: Math.abs(res[0].relPct) <= tol, withinAtAllSos: res.every(x => Math.abs(x.relPct) <= tol) });
}
// Two-velocity check: take the BC fitted at the faster shot, predict Cd at the slower shot. Tests whether one BC holds across speed.
for (const [b, wt, vHi, vLo] of D.twoVelocityCheck) {
  const hi = D.rows.find(r => r.bullet === b && r.wt === wt && r.v === vHi), lo = D.rows.find(r => r.bullet === b && r.wt === wt && r.v === vLo);
  for (const [name, tbl, key] of [['G1', S.G1, 'g1'], ['G7', S.G7, 'g7']]) {
    const p = pred(tbl, hi[key], lo, sos[0]);
    out.twoVelocity.push({ bullet: b, wt, bcFromV: vHi, predictAtV: vLo, model: name, bcUsed: hi[key], cdPred: Number(p.toFixed(4)), cdMeasured: lo.cdMeasured, relPct: Number((100 * (p - lo.cdMeasured) / lo.cdMeasured).toFixed(2)) });
  }
}
if (process.argv.includes('--json')) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
console.log('MEASURED Doppler drag (arXiv 1608.06500), tolerance ' + tol + '% on Cd, nominal speed of sound ' + sos[0] + ' fps');
for (const x of out.rows) console.log((x.withinAtNominal ? 'WITHIN  ' : 'OUTSIDE ') + (x.bullet + ' ' + x.wt + 'gr').padEnd(14) + x.model + ' BC ' + x.bc + '  v ' + x.v + ' fps (Mach ' + x.runs[0].mach + ')  Cd measured ' + x.cdMeasured + ', model ' + x.runs[0].cdPred + ' (' + x.runs[0].relPct + '%)  range over assumed sound speed ' + Math.min(...x.runs.map(r => r.relPct)) + '% to ' + Math.max(...x.runs.map(r => r.relPct)) + '%');
const w = out.rows.filter(x => x.withinAtNominal).length;
console.log('\n' + w + ' of ' + out.rows.length + ' within tolerance at the nominal speed of sound; ' + out.rows.filter(x => x.withinAtAllSos).length + ' within at every assumed speed of sound.');
console.log('\nTwo-velocity check (BC from the faster shot, predict the slower shot):');
for (const x of out.twoVelocity) console.log('  ' + x.bullet + ' ' + x.wt + 'gr ' + x.model + ' BC ' + x.bcUsed + ' from ' + x.bcFromV + ' fps -> Cd at ' + x.predictAtV + ' fps: model ' + x.cdPred + ', measured ' + x.cdMeasured + ' (' + x.relPct + '%)');
console.log('\nThis is measured drag at about 100 m for one paper\'s .308 shots. It is not a trajectory comparison and does not establish physical accuracy of the calculator.');
