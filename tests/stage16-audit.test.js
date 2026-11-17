'use strict';
// Stage 16 pre-merge safeguard audit (Node side): rounding for both axes, invalid configurations, and the production file's solver and module.
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const S = require('../lib/scope-adjust');
const root = path.join(__dirname, '..');
const PRE = 'b72dccb';   // main before Stage 16 was merged (the released Stage 14 state)
const show = (rev, f) => execFileSync('git', ['show', rev + ':' + f], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const between = (t, a, b) => t.slice(t.indexOf(a), t.indexOf(b) + b.length);
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
const ax = (o) => ({ unit: 'TRUE_MOA', clickValue: 0.25, trackingCorrectionFactor: 1, ...(o || {}) });
const both = (e, w, escope, wscope) => S.scopeAdjustment(S.ballisticCorrection(e, 'TRUE_MOA'), S.ballisticCorrection(w, 'TRUE_MOA'), { elevation: ax(escope), windage: ax(wscope) });
const away = (x) => (x < 0 ? -Math.round(-x) : Math.round(x));

test('rounding: every exact half-click, positive and negative, on elevation AND windage, goes away from zero', () => {
  // click 0.25: corrections that are exact binary multiples of 0.125 give exact halves (k * 0.125 / 0.25 = k / 2)
  for (let k = -21; k <= 21; k++) {
    const v = k * 0.125, expect = away(k / 2);
    const r = both(v, v);
    assert.strictEqual(r.elevation.clicks, expect, 'elevation ' + v); assert.strictEqual(r.windage.clicks, expect, 'windage ' + v);
    assert.strictEqual(r.elevation.clicksExact, k / 2);
    if (k % 2 !== 0) assert.ok(Math.abs(r.elevation.clicks) > Math.abs(k / 2), 'a half rounds away from zero: ' + v);
  }
  assert.deepStrictEqual([0.125, 0.375, 0.625, 1.125, 2.625].map(v => both(v, v).elevation.clicks), [1, 2, 3, 5, 11]);
  assert.deepStrictEqual([-0.125, -0.375, -0.625, -1.125, -2.625].map(v => both(v, v).windage.clicks), [-1, -2, -3, -5, -11]);
});
test('rounding: halves at other graduations (0.5 and 0.125 units per click) and with a tracking factor on elevation', () => {
  for (const [click, vals] of [[0.5, [0.25, 0.75, 1.25, -0.25, -0.75]], [0.125, [0.0625, 0.1875, -0.0625, -0.1875]]]) for (const v of vals) {
    const r = both(v, v, { clickValue: click }, { clickValue: click }); const e = away(v / click);
    assert.strictEqual(r.elevation.clicks, e); assert.strictEqual(r.windage.clicks, e);
  }
  const f = both(0.5, 0.5, { trackingCorrectionFactor: 1.25 });   // 0.625 / 0.25 = 2.5 exactly
  assert.strictEqual(f.elevation.clicks, 3); assert.strictEqual(f.windage.clicks, 2);   // windage has factor 1: 0.5 / 0.25 = 2
  assert.strictEqual(both(-0.5, -0.5, { trackingCorrectionFactor: 1.25 }).elevation.clicks, -3);
});
test('rounding: values just either side of a half, and no negative zero', () => {
  const r = (v) => both(v, v);
  assert.strictEqual(r(0.1249).elevation.clicks, 0); assert.strictEqual(r(0.1251).elevation.clicks, 1); assert.strictEqual(r(-0.1249).windage.clicks, 0); assert.strictEqual(r(-0.1251).windage.clicks, -1);
  for (const v of [0, -0, 0.01, -0.01, -0.124]) { assert.ok(Object.is(r(v).elevation.clicks, 0)); assert.ok(Object.is(r(v).windage.clicks, 0)); }
});
test('rounding: decimal click sizes can put a half-click just under the half in binary arithmetic; the exact count is reported alongside the rounded one', () => {
  // KNOWN LIMIT, documented in the Stage 16 audit: 0.15 / 0.1 is 1.4999999999999998 in binary floating point, so it rounds to 1 click, not 2.
  const r = S.adjustAxis(S.ballisticCorrection(0.15, 'MIL'), ax({ unit: 'MIL', clickValue: 0.1 }), 'elevation');
  assert.strictEqual(r.clicks, 1); assert.ok(r.clicksExact < 1.5 && r.clicksExact > 1.4999999);
  assert.ok(Math.abs(r.remainder.value) < 0.0501, 'the remainder shows what rounding left over');
});
test('every incomplete or invalid scope configuration is rejected by the module with no clicks produced', () => {
  const good = () => ({ elevation: ax(), windage: ax() });
  const bads = [];
  for (const axis of ['elevation', 'windage']) {
    for (const f of ['unit', 'clickValue', 'trackingCorrectionFactor']) bads.push((s) => { delete s[axis][f]; }, (s) => { s[axis][f] = null; }, (s) => { s[axis][f] = ''; }, (s) => { s[axis][f] = NaN; }, (s) => { s[axis][f] = undefined; });
    for (const v of [0, -0.25, 10.0001, Infinity, '0.25', true, [0.25]]) bads.push((s) => { s[axis].clickValue = v; });
    for (const v of ['MOA', 'MRAD', 'mil', 'moa', 'TRUE MOA', 'inches']) bads.push((s) => { s[axis].unit = v; });
  }
  for (const v of [0.4999, 2.0001, 0, -1]) bads.push((s) => { s.elevation.trackingCorrectionFactor = v; });
  for (const v of [0.9999999, 1.0000001, 0.5, 2, 1.075]) bads.push((s) => { s.windage.trackingCorrectionFactor = v; });
  bads.push((s) => { s.elevation = null; }, (s) => { s.windage = []; });
  let n = 0;
  for (const b of bads) { const s = good(); b(s); n++; assert.throws(() => S.scopeAdjustment(S.ballisticCorrection(5, 'TRUE_MOA'), S.ballisticCorrection(1, 'TRUE_MOA'), s), S.ScopeAdjustError, 'case ' + n); assert.ok(S.validateScopeConfig(s).length > 0); }
  assert.ok(n > 60);
  assert.strictEqual(S.validateScopeConfig(good()).length, 0);
  for (const s of [null, undefined, {}, [], 'x']) assert.throws(() => S.scopeAdjustment(S.ballisticCorrection(5, 'TRUE_MOA'), S.ballisticCorrection(1, 'TRUE_MOA'), s), S.ScopeAdjustError);
});
test('production file: the solver block, assessment block and model version are byte-identical to the pre-merge main, with a recorded hash', () => {
  const now = read('index.html'), pre = show(PRE, 'index.html');
  const sNow = between(now, '/*SOLVER_START*/', '/*SOLVER_END*/'), sPre = between(pre, '/*SOLVER_START*/', '/*SOLVER_END*/');
  assert.strictEqual(sha(sNow), sha(sPre)); assert.strictEqual(sNow, sPre);
  assert.strictEqual(between(now, '/*ASSESS_START*/', '/*ASSESS_END*/'), between(pre, '/*ASSESS_START*/', '/*ASSESS_END*/'));
  assert.match(sNow, /const MODEL_VERSION = '1\.0\.0';/);
  for (const f of ['tests/validation/references.json', 'tests/golden/baseline.json', 'sw.js', 'manifest.webmanifest']) assert.strictEqual(read(f), show(PRE, f), f);
});
test('production file: the embedded scope module is exactly lib/scope-adjust.js and exports the same API', () => {
  const html = read('index.html'), block = between(html, '/*SCOPE_START*/', '/*SCOPE_END*/');
  assert.ok(block.includes(read('lib/scope-adjust.js').trimEnd())); assert.strictEqual(html.split('/*SCOPE_START*/').length, 2);
  const E = new Function('return ' + block.slice(block.indexOf('(function(module){'), block.indexOf('/*SCOPE_END*/')).replace(/;\s*$/, ''))();
  assert.deepStrictEqual(Object.keys(E).sort(), Object.keys(S).sort());
  // differential: same results from the embedded copy and the library on a grid of valid and invalid inputs
  const units = ['MIL', 'TRUE_MOA', 'SHOOTER_MOA'];
  for (const u of units) for (const click of [0.05, 0.1, 0.125, 0.25, 0.5, 1]) for (const cf of [0.9, 1, 1.0345, 1.075]) for (const v of [-12.3, -0.125, 0, 0.125, 3.3333, 41.9]) {
    const a = S.adjustAxis(S.ballisticCorrection(v, u), { unit: u, clickValue: click, trackingCorrectionFactor: cf }, 'elevation');
    const b = E.adjustAxis(E.ballisticCorrection(v, u), { unit: u, clickValue: click, trackingCorrectionFactor: cf }, 'elevation');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
  }
});
