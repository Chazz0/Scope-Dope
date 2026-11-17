'use strict';
// Stage 13 guards: reference data extended to a published 300 Win Mag 200 gr factory table. Solver, version, tolerances, drag tables and earlier data unchanged.
// Physical accuracy remains NOT DEMONSTRATED: the new data is a manufacturer's calculated table, not measured flight.
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { withoutRound3 } = require('./helpers/refs-pin');
const { loadAssess } = require('./helpers/load-assess');
const { baseInputs } = require('./helpers/load-solver');
const root = path.join(__dirname, '..');
const MAIN = '3955600';
const show = (rev, f) => execFileSync('git', ['show', rev + ':' + f], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const solverBlock = (t) => t.slice(t.indexOf('/*SOLVER_START*/'), t.indexOf('/*SOLVER_END*/') + '/*SOLVER_END*/'.length);
const refs = JSON.parse(read('tests/validation/references.json'));
const r3 = refs.datasets.filter(d => d.registeredRound === 3);

test('the solver block is byte-identical to the released commit and the model version is 1.0.0', () => {
  const now = solverBlock(read('index.html')); assert.ok(now.length > 5000);
  assert.strictEqual(now, solverBlock(show(MAIN, 'index.html')));
  assert.match(now, /const MODEL_VERSION = '1\.0\.0';/);
});
test('tolerances, tables, cases, atmospheres, every earlier dataset, golden baseline and helpers are unchanged', () => {
  assert.deepStrictEqual(withoutRound3(read('tests/validation/references.json')), withoutRound3(show(MAIN, 'tests/validation/references.json')));
  assert.deepStrictEqual(refs.tolerances, JSON.parse(show(MAIN, 'tests/validation/references.json')).tolerances);
  for (const f of ['tests/golden/baseline.json', 'tests/golden/cases.js', 'tests/helpers/load-solver.js', 'tests/validation/measured-doppler.json'])
    assert.strictEqual(read(f), show(MAIN, f), f);
});
test('four round-3 datasets were registered in the commit before any result existed, and each runs under both atmospheres', () => {
  assert.strictEqual(r3.length, 4);
  assert.deepStrictEqual(r3.map(d => d.id).sort(), ['HORNADY-PH-300WM-200-ELDX-G1-.588', 'HORNADY-PH-300WM-200-ELDX-G1-.597', 'HORNADY-PH-300WM-200-ELDX-G7-.295', 'HORNADY-PH-300WM-200-ELDX-G7-.301']);
  for (const d of r3) { assert.strictEqual(d.weightGr, 200); assert.strictEqual(d.diamIn, 0.308); assert.deepStrictEqual(d.atmospheresRun, ['ICAO', 'HORNADY_ABERDEEN']); }
  const msg = execFileSync('git', ['log', '--format=%s', '--', 'tests/validation/references.json'], { cwd: root, encoding: 'utf8' });
  assert.match(msg, /register four 300 Win Mag 200 gr ELD-X reference datasets BEFORE running/);
});
test('the compared span covers 200 gr only because the data does, and the 200 gr warning disappears only for loads inside it', () => {
  const { VALIDATED, assessResult } = loadAssess();
  assert.deepStrictEqual(VALIDATED.weightGr, [130, 200]);
  const run = (o) => assessResult({ ...baseInputs(), v0nom: 2860, windMph: 0, headMph: 0, diam: 0.308, wt: 200, model: 'G1', bc: 0.597, ...o }, { rangeYd: 400 }).findings.map(f => f.id);
  assert.ok(!run({}).includes('caliber')); assert.ok(!run({}).includes('noref'));
  assert.ok(run({ wt: 201 }).includes('caliber'));     // still flagged beyond the data
  assert.ok(run({ wt: 250 }).includes('noref'));
  assert.ok(run({ bc: 0.7 }).includes('bc'));
  assert.ok(run({ diam: 0.338 }).includes('caliber'));
  assert.ok(run({ v0nom: 3100 }).includes('muzzle'));
});
test('the report states the two misses, the limits of the comparison and that accuracy is not demonstrated', () => {
  const d = read('docs/STAGE13_REFERENCE_EXTENSION_200GR.md');
  assert.match(d, /NOT DEMONSTRATED/); assert.match(d, /-1\.24%/); assert.match(d, /-1\.27%/); assert.match(d, /calculated/i);
  assert.match(d, /no solver|solver[^.]{0,40}unchanged/i);
  assert.ok(!/\b(is|are|was|were) (physically )?(accurate|verified|proven|guaranteed|safe)\b/i.test(d.replace(/not (been )?(shown to be )?(physically )?(accurate|verified)/gi, '')));
});
