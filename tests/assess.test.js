'use strict';
// Stage 6 (safety and transparency) tests. Written before the app change.
// The assessment is advisory text. It must never change a calculation, and it must never call a result accurate or verified.
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { loadAssess } = require('./helpers/load-assess');
const { baseInputs } = require('./helpers/load-solver');
const root = path.join(__dirname, '..');
const refs = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'validation', 'references.json'), 'utf8'));
const { VALIDATED, assessResult } = loadAssess();
const ids = (r) => r.findings.map(f => f.id);
const base = (o) => ({ ...baseInputs(), v0nom: 2650, windMph: 0, headMph: 0, ...(o || {}) });
const run = (o, ctx) => assessResult(base(o), { rangeYd: 400, ...(ctx || {}) });

test('the validated envelope is derived from the reference data, not typed in', () => {
  const ds = refs.datasets, le = refs.trajectoryCases[0].inputsPublished;
  const span = (a) => [Math.min(...a), Math.max(...a)];
  const rng = []; for (const d of ds) rng.push(...Object.keys(d.rows).map(Number));
  rng.push(...Object.keys(refs.trajectoryCases[0].readings.confirmed_distances.rows).map(Number));
  assert.deepStrictEqual(VALIDATED.rangeYd, span(rng));
  assert.deepStrictEqual(VALIDATED.muzzleFps, span([...ds.map(d => d.muzzle.v), le.v0Fps]));
  assert.deepStrictEqual(VALIDATED.bcG1, span([...ds.filter(d => d.model === 'G1').map(d => d.bc), le.bcG1]));
  assert.deepStrictEqual(VALIDATED.bcG7, span(ds.filter(d => d.model === 'G7').map(d => d.bc)));
  assert.deepStrictEqual(VALIDATED.weightGr, span([...ds.map(d => d.weightGr).filter(Boolean), le.weightGr]));
  assert.deepStrictEqual(VALIDATED.diameters.slice().sort(), [...new Set([...ds.map(d => d.diamIn).filter(Boolean), refs.trajectoryCases[0].assumptions.diamIn])].sort());
  const atm = [...Object.values(refs.atmospheres), ...ds.map(d => d.statedConditions).filter(Boolean), refs.trajectoryCases[0].assumptions];
  assert.deepStrictEqual(VALIDATED.tempF, span(atm.map(a => a.tempF)));
  assert.deepStrictEqual(VALIDATED.pressInHg, span(atm.map(a => a.pressInHg)));
  assert.deepStrictEqual(VALIDATED.humidityPct, span(atm.map(a => a.humidity)));
});

test('a load inside the compared conditions gets no warning, only the standing label', () => {
  const r = run();
  assert.deepStrictEqual(r.findings.filter(f => f.level === 'warning'), []);
  assert.match(r.badge, /Calculated estimate/); assert.match(r.badge, /not independently verified/i);
  assert.strictEqual(r.refCovered, true);
});

test('each out-of-envelope input produces a named warning', () => {
  assert.ok(ids(run({}, { rangeYd: 800 })).includes('range'));
  assert.ok(!ids(run({}, { rangeYd: 500 })).includes('range'));
  assert.ok(ids(run({ v0: 1100, v0nom: 1100 })).includes('muzzle'));
  assert.ok(ids(run({ v0: 3300, v0nom: 3300 })).includes('muzzle'));
  assert.ok(ids(run({ bc: 0.9 })).includes('bc'));
  assert.ok(ids(run({ model: 'G7', bc: 0.4 })).includes('bc'));
  assert.ok(ids(run({ diam: 0.284 })).includes('caliber'));
  assert.ok(ids(run({ wt: 55, diam: 0.224 })).includes('caliber'));
  assert.ok(ids(run({ tempF: 100 })).includes('temp'));
  assert.ok(ids(run({ tempF: -10 })).includes('temp'));
  assert.ok(ids(run({ altFt: 8000 })).includes('pressure'));       // estimated pressure far below the compared range
  assert.ok(!ids(run({ altFt: 8000, pressInHg: 29.9 })).includes('pressure')); // user-entered pressure inside the range
  assert.ok(ids(run({ humidity: 95 })).includes('humidity'));
});

test('a load no reference data covers says so', () => {
  const r = run({ diam: 0.284, wt: 150, bc: 0.5 });
  assert.strictEqual(r.refCovered, false);
  assert.ok(ids(r).includes('noref'));
  assert.match(r.findings.find(f => f.id === 'noref').text, /No reference comparison covers this load/);
});

test('effects with no reference comparison are named when they are in use', () => {
  assert.ok(ids(run({ windMph: 10 })).includes('wind'));
  assert.ok(!ids(run({ windMph: 0, headMph: 0 })).includes('wind'));
  assert.ok(ids(run({ twist: 10 })).includes('spin'));
  assert.ok(!ids(run({ twist: 0 })).includes('spin'));
  assert.ok(ids(run({ latDeg: 40 })).includes('coriolis'));
  assert.ok(ids(run({ angleDeg: 15 })).includes('angle'));
  assert.ok(ids(run({ v0: 2680, v0nom: 2650 })).includes('vtemp'));
});

test('incomplete inputs are reported as what the result leaves out or assumes', () => {
  assert.ok(ids(run({ pressInHg: null })).includes('pressureEst'));
  assert.ok(!ids(run({ pressInHg: 29.92 })).includes('pressureEst'));
  assert.ok(ids(run({ latDeg: null })).includes('noLat'));
  assert.ok(!ids(run({ latDeg: 40 })).includes('noLat'));
  assert.ok(ids(run({ twist: 0 })).includes('noTwist'));
});

test('the model limitations are always listed', () => {
  const f = run().findings.find(x => x.id === 'limits');
  assert.ok(f); assert.match(f.text, /point-mass/i); assert.match(f.text, /not verified/i); assert.match(f.text, /measured bullet flight/i);
});

test('no message calls a result accurate, verified, guaranteed or safe; "verified" appears only negated', () => {
  const all = [run(), run({}, { rangeYd: 900 }), run({ diam: 0.284 }), run({ windMph: 10, latDeg: 40, twist: 10, angleDeg: 5, pressInHg: null })];
  for (const r of all) for (const t of [r.badge, ...r.findings.map(f => f.text)]) {
    assert.doesNotMatch(t, /\b(guarantee|guaranteed|safe|precise|proven)\b/i, t);
    for (const m of t.matchAll(/\baccura/gi)) assert.ok(/(not|never|no|cannot|nor|without)[^.]*$/i.test(t.slice(0, m.index)), 'accurate not negated: ' + t);
    for (const m of t.matchAll(/verified/gi)) assert.ok(/(not|never|no|un|neither|nor|cannot|without)[^.]*$/i.test(t.slice(0, m.index)), 'verified not negated: ' + t);
  }
});

test('assessResult is pure: it does not change its inputs and gives the same answer twice', () => {
  const inp = base({ windMph: 7, latDeg: 30 }), copy = JSON.stringify(inp);
  const a = assessResult(inp, { rangeYd: 600 }), b = assessResult(inp, { rangeYd: 600 });
  assert.strictEqual(JSON.stringify(inp), copy); assert.deepStrictEqual(a, b);
});

test('the calculation engine is byte-identical to the Stage 5 commit', () => {
  const grab = (html) => html.slice(html.indexOf('/*SOLVER_START*/'), html.indexOf('/*SOLVER_END*/'));
  const now = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const then = execFileSync('git', ['show', '9ab52a6:index.html'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
  assert.ok(grab(now).length > 1000);
  assert.strictEqual(grab(now), grab(then));
  for (const f of ['tests/golden/baseline.json', 'tests/helpers/load-solver.js', 'tests/solver.test.js']) {
    assert.strictEqual(execFileSync('git', ['diff', '9ab52a6', '--stat', '--', f], { cwd: root, encoding: 'utf8' }).trim(), '', f);
  }
  const refsThen = JSON.parse(execFileSync('git', ['show', '9ab52a6:tests/validation/references.json'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 }));
  assert.deepStrictEqual(refs.tolerances, refsThen.tolerances);
});
