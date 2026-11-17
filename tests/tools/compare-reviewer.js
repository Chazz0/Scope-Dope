'use strict';
// Compares a reviewer's own transcription of the Hornady table with (1) the project's copy and (2) the engine.
// Read-only. The reviewer's numbers, not the project's, are what the engine is compared with here, so an error in the
// project's copy cannot hide. Usage: node tests/tools/compare-reviewer.js <reviewer-file.json>
// A file counts as an INDEPENDENT review only if the reviewer put their name, said they are independent of the project,
// and said they did not see the project's values before transcribing. Anything else is labeled NOT AN INDEPENDENT REVIEW.
// Even an independent review would only check the reference data. It would not show physical accuracy.
const fs = require('fs');
const path = require('path');
const { loadSolver, baseInputs } = require('../helpers/load-solver');

const file = process.argv[2];
if (!file) { console.error('Usage: node tests/tools/compare-reviewer.js <reviewer-file.json>'); process.exit(2); }
let rv; try { rv = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error('Could not read that file as JSON.'); process.exit(2); }
const R = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'validation', 'references.json'), 'utf8'));
const c = R.trajectoryCases[0], T = R.tolerances, A = c.assumptions;

const missing = [];
if (!rv.reviewer || !String(rv.reviewer.name || '').trim()) missing.push('reviewer.name');
if (!rv.reviewer || typeof rv.reviewer.independent !== 'boolean') missing.push('reviewer.independent (true or false)');
if (typeof rv.sawProjectValuesBeforeTranscribing !== 'boolean') missing.push('sawProjectValuesBeforeTranscribing (true or false)');
if (!rv.source || !String(rv.source.accessedOn || '').trim()) missing.push('source.accessedOn');
if (!rv.published || !(rv.published.muzzleVelocityFps > 0) || !(rv.published.bulletWeightGr > 0) || !(rv.published.bcG1 > 0)) missing.push('published muzzle velocity, bullet weight and G1 BC');
const cols = ['Muzzle', '50', '100', '200', '300', '400', '500'];
for (const k of cols) if (!rv.table || !rv.table[k] || !String(rv.table[k].rawText || '').trim()) missing.push('table.' + k + '.rawText');
if (missing.length) { console.error('The reviewer file is incomplete (not filled in): ' + missing.join('; ')); process.exit(3); }

const independent = rv.reviewer.independent === true && rv.sawProjectValuesBeforeTranscribing === false && !/fixture/i.test(rv.reviewer.name);
console.log(independent ? 'INDEPENDENT REVIEW by ' + rv.reviewer.name + ' (' + rv.reviewer.relationshipToProject + ')'
  : 'NOT AN INDEPENDENT REVIEW. It does not count as reproduction of the reference data. (reviewer: ' + rv.reviewer.name + '; says independent: ' + rv.reviewer.independent + '; saw project values first: ' + rv.sawProjectValuesBeforeTranscribing + ')');

// 1. Reviewer copy against project copy, cell by cell.
const proj = { Muzzle: { v: c.inputsPublished.v0Fps, e: c.inputsPublished.muzzleEnergyFtLb, d: c.inputsPublished.muzzleTrajectoryIn } };
for (const [r, w] of Object.entries(c.readings.confirmed_distances.rows)) proj[r] = w ? { v: w.v, e: w.e, d: w.drop } : { v: null, e: null, d: null };
let diffs = 0;
for (const k of cols) {
  const got = { v: rv.table[k].velocityFps, e: rv.table[k].energyFtLb, d: rv.table[k].trajectoryIn };
  for (const f of ['v', 'e', 'd']) {
    if (got[f] !== proj[k][f]) { diffs++; console.log('DIFFERS FROM PROJECT COPY  ' + k + ' ' + { v: 'velocity', e: 'energy', d: 'trajectory' }[f] + ': reviewer ' + got[f] + ', project ' + proj[k][f] + '  (reviewer rawText: "' + rv.table[k].rawText + '")'); }
  }
}
console.log(diffs + (diffs === 1 ? ' difference' : ' differences') + ' from the project copy.');

// 2. Engine against the REVIEWER's numbers. Assumptions are the project's, fixed in references.json before any comparison.
const S = loadSolver();
const zeroCols = cols.filter(k => k !== 'Muzzle' && rv.table[k].trajectoryIn === 0);
const sight = -rv.table.Muzzle.trajectoryIn;
if (zeroCols.length !== 1 || !(sight > 0)) { console.log('Zero range or sight height cannot be determined from the reviewer table, so no engine comparison was made.'); process.exit(0); }
const zero = Number(zeroCols[0]);
const pct = (a, b) => 100 * (a - b) / b;
let n = 0, ok = 0;
for (const k of cols) {
  const w = rv.table[k]; if (k === 'Muzzle' || w.velocityFps === null || w.trajectoryIn === null) continue;
  const r = Number(k);
  const inp = baseInputs({ v0: rv.published.muzzleVelocityFps, bc: rv.published.bcG1, wt: rv.published.bulletWeightGr, diam: A.diamIn, h: sight, zero, tempF: A.tempF, pressInHg: A.pressInHg, humidity: A.humidity, altFt: A.altFt, model: 'G1' });
  const M = S.buildModel(inp, 520 * 1.05), d = S.dopeAt(M, inp, r);
  const vd = pct(d.vFps, w.velocityFps), dd = d.dropIn - w.trajectoryIn, dt = Math.max(T.dropIn.minAbs, Math.abs(w.trajectoryIn) * T.dropIn.pct / 100);
  const pass = Math.abs(vd) <= T.velocityPct.value && Math.abs(dd) <= dt; n++; if (pass) ok++;
  console.log((pass ? 'MATCH   ' : 'DIFFERS ') + r + ' yd  velocity ' + w.velocityFps + ' vs ' + d.vFps.toFixed(1) + ' (' + vd.toFixed(2) + '%)  trajectory ' + w.trajectoryIn + ' vs ' + d.dropIn.toFixed(2) + ' in (diff ' + dd.toFixed(2) + ', tol ' + dt.toFixed(2) + ')');
}
console.log(ok + ' of ' + n + ' engine comparisons within tolerance (against the reviewer\'s numbers; zero ' + zero + ' yd, sight height ' + sight + ' in). This checks the reference data. It is not proof of physical accuracy.');
