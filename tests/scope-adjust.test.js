'use strict';
// Stage 15: standalone scope-adjustment module (lib/scope-adjust.js). Not connected to the app.
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const S = require('../lib/scope-adjust');
const root = path.join(__dirname, '..');
const near = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, (m || '') + ' expected ' + b + ' got ' + a);
const ax = (o) => ({ unit: 'TRUE_MOA', clickValue: 0.25, trackingCorrectionFactor: 1, ...(o || {}) });
const scope = (e, w) => ({ elevation: ax(e), windage: ax(w) });
const corr = (v, u) => S.ballisticCorrection(v, u || 'TRUE_MOA');
const problems = (f) => { try { f(); } catch (e) { assert.ok(e instanceof S.ScopeAdjustError, 'wrong error type: ' + e); return e.problems.join(' | '); } assert.fail('expected a rejection'); };

// ---- unit conversions ----
test('exact unit definitions: 1 MIL = 3.43775 true MOA = 3.6 shooter MOA; 1 true MOA = 1.0472 shooter MOA', () => {
  near(S.convertAngle(1, 'MIL', 'TRUE_MOA'), 3.4377467707849, 1e-12);
  near(S.convertAngle(1, 'MIL', 'SHOOTER_MOA'), 3.6, 1e-12);
  near(S.convertAngle(1, 'TRUE_MOA', 'SHOOTER_MOA'), 1.0471975511966, 1e-12);
  near(S.convertAngle(100, 'SHOOTER_MOA', 'MIL'), 27.7777777778, 1e-9);
});
test('1 MIL is 3.6 in at 100 yd, 1 true MOA 1.0472 in, 1 shooter MOA exactly 1 in', () => {
  const inAt100yd = (v, u) => v * S.RAD_PER_UNIT[u] * 3600;
  near(inAt100yd(1, 'MIL'), 3.6, 1e-12); near(inAt100yd(1, 'TRUE_MOA'), 1.0471975512, 1e-9); near(inAt100yd(1, 'SHOOTER_MOA'), 1, 1e-12);
});
test('conversions round-trip and keep sign and zero', () => {
  for (const a of S.UNITS) for (const b of S.UNITS) for (const v of [-12.5, 0, 0.1, 37.25]) near(S.convertAngle(S.convertAngle(v, a, b), b, a), v, 1e-9);
  assert.strictEqual(S.convertAngle(0, 'MIL', 'TRUE_MOA'), 0); assert.ok(S.convertAngle(-1, 'MIL', 'TRUE_MOA') < 0);
});
test('plain MOA and look-alike unit names are rejected as ambiguous or unknown, in every entry point', () => {
  for (const u of ['MOA', 'moa', 'MRAD', 'mil', 'IPHY', 'SMOA', 'true moa', 'inches', '', null, undefined, 5]) {
    problems(() => S.convertAngle(1, u, 'MIL')); problems(() => S.convertAngle(1, 'MIL', u)); problems(() => S.ballisticCorrection(1, u));
  }
  assert.match(problems(() => S.ballisticCorrection(1, 'MOA')), /ambiguous/);
});

// ---- Applied Ballistics worked examples ----
test('Quantum section 9.0 example: 102 yd, 30 MOA dialed, 29.8 in actual -> expected 32.04 in, CF 1.075, 30 MOA is dialed as 32.25 MOA', () => {
  const t = S.trackingCorrectionFactorFromTest({ unit: 'TRUE_MOA', rangeUnit: 'yd', dialed: 30, range: 102, actualShiftIn: 29.8 });
  near(t.expectedShiftIn, 32.04, 0.005); near(t.trackingCorrectionFactor, 1.075, 0.0005);
  const r = S.adjustAxis(corr(30), ax({ trackingCorrectionFactor: t.trackingCorrectionFactor }), 'elevation');
  near(r.corrected.value, 32.25, 0.005); assert.strictEqual(r.calculated.value, 30);
});
test('Analytics section 3.2.4 example: dialed 30, measured 29 -> 1.035, and the calculated drop is scaled by it', () => {
  const cf = S.trackingCorrectionFactorFromMovement(30, 29); near(cf, 1.035, 0.001, 'the manual rounds 30/29 = 1.0345 to 1.035');
  near(S.adjustAxis(corr(20), ax({ trackingCorrectionFactor: cf }), 'elevation').corrected.value, 20 * 30 / 29, 1e-12);
});
test('the published test constants are the documented ones and agree with the geometry to 0.1%', () => {
  assert.deepStrictEqual(S.AB_TEST_CONSTANT.yd, { TRUE_MOA: 0.01047, MIL: 0.03599 }); assert.deepStrictEqual(S.AB_TEST_CONSTANT.m, { TRUE_MOA: 0.01145, MIL: 0.03936 });
  near(S.AB_TEST_CONSTANT.yd.TRUE_MOA / (S.RAD_PER_UNIT.TRUE_MOA * 36), 1, 1e-3); near(S.AB_TEST_CONSTANT.yd.MIL / (S.RAD_PER_UNIT.MIL * 36), 1, 1e-3);
  near(S.AB_TEST_CONSTANT.m.TRUE_MOA / (S.RAD_PER_UNIT.TRUE_MOA * 39.3701), 1, 1e-3); near(S.AB_TEST_CONSTANT.m.MIL / (S.RAD_PER_UNIT.MIL * 39.3701), 1, 1e-3);
});
test('test results for MIL and metric ranges use their own constants; a scope that tracks true gives 1', () => {
  near(S.trackingCorrectionFactorFromTest({ unit: 'MIL', rangeUnit: 'm', dialed: 10, range: 100, actualShiftIn: 10 * 100 * 0.03936 }).trackingCorrectionFactor, 1, 1e-12);
  near(S.trackingCorrectionFactorFromTest({ unit: 'MIL', rangeUnit: 'yd', dialed: 10, range: 100, actualShiftIn: 36 }).trackingCorrectionFactor, 0.03599 * 1000 / 36, 1e-12);
});
test('the tracking test rejects too small a dial, shooter MOA, bad ranges, bad shifts and impossible factors', () => {
  const ok = { unit: 'TRUE_MOA', rangeUnit: 'yd', dialed: 30, range: 100, actualShiftIn: 31 };
  S.trackingCorrectionFactorFromTest(ok);
  for (const bad of [{ dialed: 29.9 }, { unit: 'MIL', dialed: 9.9 }, { unit: 'SHOOTER_MOA' }, { unit: 'MOA' }, { rangeUnit: 'ft' }, { rangeUnit: undefined }, { range: 0 }, { range: -5 }, { range: NaN },
    { actualShiftIn: 0 }, { actualShiftIn: -1 }, { actualShiftIn: Infinity }, { dialed: '30' }, { actualShiftIn: 10 }, { actualShiftIn: 100 }])
    problems(() => S.trackingCorrectionFactorFromTest({ ...ok, ...bad }));
  problems(() => S.trackingCorrectionFactorFromTest(null));
  for (const [d, m] of [[0, 1], [1, 0], [-1, 1], [1, NaN], ['30', 29], [30, 5], [30, 100]]) problems(() => S.trackingCorrectionFactorFromMovement(d, m));
});

// ---- turret settings ----
test('clicks are whole, signed, rounded half away from zero, and the dialed value is clicks x click value', () => {
  const r = (v, c) => S.adjustAxis(corr(v), ax({ clickValue: c }), 'elevation');
  assert.strictEqual(r(10, 0.25).clicks, 40); assert.strictEqual(r(10.1, 0.25).clicks, 40); assert.strictEqual(r(10.13, 0.25).clicks, 41);
  assert.strictEqual(r(-10.13, 0.25).clicks, -41); assert.strictEqual(r(0.125, 0.25).clicks, 1); assert.strictEqual(r(-0.125, 0.25).clicks, -1); assert.strictEqual(r(0.1, 0.25).clicks, 0);
  assert.ok(Object.is(r(-0.01, 0.25).clicks, 0), 'no negative zero');
  near(r(10.13, 0.25).dialed.value, 10.25, 1e-12); near(r(10.13, 0.25).remainder.value, -0.12, 1e-12);
});
test('configurable graduations for each unit: 0.1 MIL, 0.05 MIL, 1/8, 1/4, 1/2, 1 MOA, 1/4 shooter MOA', () => {
  const run = (unit, c, v) => S.adjustAxis(corr(v, unit), ax({ unit, clickValue: c }), 'elevation').clicks;
  assert.strictEqual(run('MIL', 0.1, 5.23), 52); assert.strictEqual(run('MIL', 0.05, 5.23), 105); assert.strictEqual(run('TRUE_MOA', 0.125, 3), 24); assert.strictEqual(run('TRUE_MOA', 0.5, 3.3), 7);
  assert.strictEqual(run('TRUE_MOA', 1, 3.4), 3); assert.strictEqual(run('SHOOTER_MOA', 0.25, 3), 12);
});
test('elevation and windage are independent: different units, click values and factors', () => {
  const r = S.scopeAdjustment(corr(8, 'MIL'), corr(1.5, 'TRUE_MOA'),
    { elevation: ax({ unit: 'MIL', clickValue: 0.1, trackingCorrectionFactor: 1.02 }), windage: ax({ unit: 'TRUE_MOA', clickValue: 0.25, trackingCorrectionFactor: 1 }) });
  assert.strictEqual(r.elevation.clicks, 82); assert.strictEqual(r.elevation.corrected.unit, 'MIL'); near(r.elevation.corrected.value, 8.16, 1e-12);
  assert.strictEqual(r.windage.clicks, 6); assert.strictEqual(r.windage.corrected.unit, 'TRUE_MOA'); assert.strictEqual(r.windage.trackingCorrectionFactor, 1);
  const s2 = S.scopeAdjustment(corr(8, 'MIL'), corr(1.5, 'TRUE_MOA'),
    { elevation: ax({ unit: 'MIL', clickValue: 0.1, trackingCorrectionFactor: 1.02 }), windage: ax({ unit: 'TRUE_MOA', clickValue: 0.5, trackingCorrectionFactor: 1 }) });
  assert.strictEqual(s2.elevation.clicks, 82); assert.strictEqual(s2.windage.clicks, 3);   // the windage settings did not touch elevation
});

// ---- correction factor ----
test('the calculated correction is MULTIPLIED by CF (Applied Ballistics), never divided; Garmin SSF is not used', () => {
  const r = S.adjustAxis(corr(30), ax({ trackingCorrectionFactor: 1.075 }), 'elevation');
  near(r.corrected.value, 32.25, 1e-12); assert.ok(r.corrected.value > 30);
  const g = S.adjustAxis(corr(30), ax({ trackingCorrectionFactor: 0.9 }), 'elevation');   // 0.9 means a CF of 0.9, i.e. dial LESS; it is not interpreted as an SSF
  near(g.corrected.value, 27, 1e-12);
});
test('CF 1 is neutral only because it was stated: the result equals the calculated value', () => {
  const r = S.adjustAxis(corr(12.3), ax({ trackingCorrectionFactor: 1 }), 'elevation'); assert.strictEqual(r.corrected.value, 12.3);
});
test('the ballistic correction is returned unchanged and labelled apart from the scope adjustment', () => {
  const c = corr(12.3); const r = S.adjustAxis(c, ax({ trackingCorrectionFactor: 1.04 }), 'elevation');
  assert.strictEqual(c.kind, 'ballistic-correction'); assert.strictEqual(r.kind, 'scope-adjustment'); assert.deepStrictEqual({ ...r.calculated }, { value: 12.3, unit: 'TRUE_MOA' });
  assert.deepStrictEqual({ ...c }, { kind: 'ballistic-correction', value: 12.3, unit: 'TRUE_MOA' });
  assert.ok(Object.isFrozen(r) && Object.isFrozen(r.calculated) && Object.isFrozen(c));
  assert.throws(() => S.adjustAxis(r, ax(), 'elevation'), S.ScopeAdjustError);              // an adjustment is not accepted as a correction
  assert.throws(() => S.adjustAxis({ value: 5, unit: 'TRUE_MOA' }, ax(), 'elevation'), S.ScopeAdjustError);   // a bare object is not a labelled correction
});
test('inputs are not mutated', () => {
  const sc = scope({ trackingCorrectionFactor: 1.03 }), before = JSON.stringify(sc); S.scopeAdjustment(corr(5), corr(1), sc); assert.strictEqual(JSON.stringify(sc), before);
});

// ---- mixing units ----
test('a correction in one unit is never applied to a turret in another, in any pairing', () => {
  for (const cu of S.UNITS) for (const tu of S.UNITS) {
    if (cu === tu) { S.adjustAxis(corr(5, cu), ax({ unit: tu }), 'elevation'); continue; }
    assert.match(problems(() => S.adjustAxis(corr(5, cu), ax({ unit: tu }), 'elevation')), /never mixed implicitly/);
    assert.match(problems(() => S.scopeAdjustment(corr(5, tu), corr(5, cu), scope({ unit: tu }, { unit: tu }))), /windage/);
  }
});
test('true MOA and shooter MOA are different: the same angle gives different click counts', () => {
  const a = S.adjustAxis(corr(10, 'TRUE_MOA'), ax({ unit: 'TRUE_MOA' }), 'elevation').clicks;
  const b = S.adjustAxis(corr(S.convertAngle(10, 'TRUE_MOA', 'SHOOTER_MOA'), 'SHOOTER_MOA'), ax({ unit: 'SHOOTER_MOA' }), 'elevation').clicks;
  assert.strictEqual(a, 40); assert.strictEqual(b, 42);
});

// ---- invalid configurations ----
test('every scope setting is required: removing any one field is rejected and named, on each axis', () => {
  for (const axis of ['elevation', 'windage']) for (const f of ['unit', 'clickValue', 'trackingCorrectionFactor']) {
    const sc = scope(); delete sc[axis][f]; assert.match(problems(() => S.scopeAdjustment(corr(1), corr(1), sc)), new RegExp(axis + ' ' + f));
  }
  for (const sc of [null, undefined, {}, [], 'x', 5, { elevation: ax() }, { windage: ax() }, { elevation: null, windage: ax() }, { elevation: [], windage: ax() }]) problems(() => S.scopeAdjustment(corr(1), corr(1), sc));
});
test('there is no default: an empty axis object, empty strings and nulls are rejected, never replaced', () => {
  for (const bad of [{}, { unit: '', clickValue: '', trackingCorrectionFactor: '' }, { unit: null, clickValue: null, trackingCorrectionFactor: null }]) {
    const p = problems(() => S.scopeAdjustment(corr(1), corr(1), { elevation: bad, windage: ax() })); assert.match(p, /elevation/);
  }
});
test('invalid click values and factors are rejected: zero, negative, huge, non-finite, strings, booleans, arrays', () => {
  for (const v of [0, -0.25, 11, 1e9, NaN, Infinity, -Infinity, '0.25', true, [0.25], {}, null, undefined]) problems(() => S.scopeAdjustment(corr(1), corr(1), scope({ clickValue: v })));
  for (const v of [0, -1, 0.49, 2.01, 100, NaN, Infinity, '1', true, [1], null, undefined]) { problems(() => S.scopeAdjustment(corr(1), corr(1), scope({ trackingCorrectionFactor: v }))); problems(() => S.scopeAdjustment(corr(1), corr(1), scope({}, { trackingCorrectionFactor: v }))); }
  for (const v of [0.5, 2, 10]) S.scopeAdjustment(corr(1), corr(1), scope({ clickValue: v === 0.5 ? 0.5 : v, trackingCorrectionFactor: v === 10 ? 1 : v }));
});
test('invalid ballistic corrections are rejected', () => {
  for (const v of [NaN, Infinity, -Infinity, '5', null, undefined, true, [5]]) problems(() => S.ballisticCorrection(v, 'MIL'));
  problems(() => S.scopeAdjustment(null, corr(1), scope())); problems(() => S.scopeAdjustment(corr(1), undefined, scope()));
});
test('all problems are reported together, not just the first', () => {
  const p = problems(() => S.scopeAdjustment(corr(1), corr(1), { elevation: { unit: 'MOA', clickValue: -1, trackingCorrectionFactor: 9 }, windage: {} }));
  for (const re of [/elevation unit/, /elevation clickValue/, /elevation trackingCorrectionFactor/, /windage unit/, /windage clickValue/, /windage trackingCorrectionFactor/]) assert.match(p, re);
});
test('very large and very small corrections stay finite and exact enough', () => {
  const r = S.adjustAxis(corr(1e6), ax(), 'elevation'); assert.strictEqual(r.clicks, 4e6); near(S.adjustAxis(corr(1e-12), ax(), 'elevation').corrected.value, 1e-12, 1e-24);
  assert.strictEqual(S.adjustAxis(corr(0), ax(), 'elevation').clicks, 0);
});

// ---- nothing else changed ----
const show = (f) => execFileSync('git', ['show', 'main:' + f], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const solverBlock = (t) => t.slice(t.indexOf('/*SOLVER_START*/'), t.indexOf('/*SOLVER_END*/') + '/*SOLVER_END*/'.length);
test('the ballistic solver and every calculation, data and test-data file are byte-identical to main (Stage 16 connects the module to the screens, so index.html outside the solver now differs)', () => {
  assert.strictEqual(solverBlock(read('index.html')), solverBlock(show('index.html')));
  for (const f of ['tests/validation/references.json', 'tests/golden/baseline.json', 'tests/golden/cases.js', 'tests/helpers/load-solver.js', 'tests/helpers/load-assess.js']) assert.strictEqual(read(f), show(f), f);
});
test('the module is self-contained (no page, storage or require use)', () => {
  const m = read('lib/scope-adjust.js'); assert.ok(!/index\.html|document\.|window\.|localStorage|require\(/.test(m.replace(/\/\*[^]*?\*\//g, '').replace(/\/\/.*$/gm, '')));
});
test('windage factor must be exactly 1: the elevation factor is never applied to windage, and any other windage factor is refused', () => {
  for (const v of [0.99, 1.0001, 1.075, 0.5, 2, -1, 0]) { assert.match(problems(() => S.scopeAdjustment(corr(1), corr(1), scope({ trackingCorrectionFactor: 1.075 }, { trackingCorrectionFactor: v }))), /windage trackingCorrectionFactor/); assert.ok(problems(() => S.adjustAxis(corr(1), ax({ trackingCorrectionFactor: v }), 'windage'))); }
  const r = S.scopeAdjustment(corr(30), corr(10), scope({ trackingCorrectionFactor: 1.075 }, { trackingCorrectionFactor: 1 }));
  near(r.elevation.corrected.value, 32.25, 1e-12); assert.strictEqual(r.windage.corrected.value, 10); assert.strictEqual(r.windage.trackingCorrectionFactor, 1);
  S.adjustAxis(corr(1), ax({ trackingCorrectionFactor: 1.075 }), 'elevation');   // other axes keep their factor
});
test('the report states the sources, the gaps and that physical accuracy is not demonstrated', () => {
  const d = read('docs/STAGE15_SCOPE_ADJUSTMENT_MODULE.md');
  for (const re of [/NOT DEMONSTRATED/, /Not documented by Applied Ballistics/i, /Garmin/, /expected shift \/ actual shift/i, /not connected/i]) assert.match(d, re);
});
