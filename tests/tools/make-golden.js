'use strict';
// Regenerates tests/golden/baseline.json from the CURRENT engine. Run this only on purpose,
// when a calculation change has been reviewed and approved. The test suite never writes it.
const fs = require('fs');
const path = require('path');
const { loadSolver } = require('../helpers/load-solver');
const { cases, FIELDS } = require('../golden/cases');

const S = loadSolver();
const out = { generatedBy: 'tests/tools/make-golden.js', node: process.version, note: 'Current behavior at the baseline commit. Not evidence of accuracy.', cases: {} };
for (const c of cases) {
  const M = S.buildModel(c.inp, Math.max(...c.ranges) * 1.05);
  const rows = {};
  for (const r of c.ranges) {
    const d = S.dopeAt(M, c.inp, r);
    rows[r] = d ? Object.fromEntries(FIELDS.map(f => [f, Number(d[f].toPrecision(12))])) : null;
  }
  out.cases[c.id] = { theta: Number(M.theta.toPrecision(12)), rho: Number(M.p.rho.toPrecision(12)), sos: Number(M.p.sos.toPrecision(12)), rows };
}
fs.writeFileSync(path.join(__dirname, '..', 'golden', 'baseline.json'), JSON.stringify(out, null, 1) + '\n');
console.log('wrote baseline.json with', Object.keys(out.cases).length, 'cases');
