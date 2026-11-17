'use strict';
// Stage 9 (correctness and data integrity) Node tests. Written before the app changes.
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { loadAssess } = require('./helpers/load-assess');
const { baseInputs } = require('./helpers/load-solver');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const { assessResult } = loadAssess();
const base = (o) => ({ ...baseInputs(), v0nom: 2650, windMph: 0, headMph: 0, ...(o || {}) });
const ids = (r) => r.findings.map(f => f.level + ':' + f.id);
const STAGE8 = 'c99bb06857fafdd7a68557bc4ad6cf7d075b8f8e';
const show = (rev, f) => execFileSync('git', ['show', rev + ':' + f], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });

test('the panel notes a fitted velocity and a fitted coefficient, as notices and never as warnings', () => {
  const a = assessResult(base({ v0src: 'fitted' }), { rangeYd: 400 }), b = assessResult(base({ bcsrc: 'fitted' }), { rangeYd: 400 });
  assert.ok(ids(a).includes('notice:v0fitted')); assert.ok(ids(b).includes('notice:bcfitted'));
  assert.ok(!ids(a).includes('notice:v0factory'), 'fitted is not a factory value');
  assert.match(a.findings.find(f => f.id === 'v0fitted').text, /not (a velocity you )?measured/i);
  assert.match(a.findings.find(f => f.id === 'v0fitted').text, /absorb/i);
  assert.match(b.findings.find(f => f.id === 'bcfitted').text, /absorb/i);
  assert.ok(!ids(base()).length || !ids(assessResult(base({ v0src: 'user' }), { rangeYd: 400 })).some(i => /fitted/.test(i)));
  assert.ok(!ids(a).some(i => i.startsWith('warning:v0') || i.startsWith('warning:bcfit')));
});

test('a pressure that looks like sea level at altitude gets a note; consistent station pressure does not', () => {
  const at = (altFt, p) => ids(assessResult(base({ altFt, pressInHg: p }), { rangeYd: 400 }));
  assert.ok(at(5000, 29.92).includes('notice:pressureAltitude'));
  assert.ok(at(10000, 29.92).includes('notice:pressureAltitude'));
  for (const [alt, p] of [[0, 29.92], [0, 30.4], [1000, 29.0], [5000, 24.9], [10000, 20.6], [12000, 19.0], [15000, 16.9]]) assert.ok(!at(alt, p).includes('notice:pressureAltitude'), alt + ' ft ' + p);
  assert.ok(!ids(assessResult(base({ altFt: 5000, pressInHg: null }), { rangeYd: 400 })).includes('notice:pressureAltitude'), 'no pressure entered: nothing to compare');
  const t = assessResult(base({ altFt: 5000, pressInHg: 29.92 }), { rangeYd: 400 }).findings.find(f => f.id === 'pressureAltitude').text;
  assert.match(t, /sea-level/i); assert.match(t, /station/i);
});

test('page source: station pressure label and limits, stability wording, fitted flags, no leftover certainty', () => {
  assert.match(html, /Station pressure \(not sea-level pressure\)/);
  assert.match(html, /opt\('press', 15, 32\.5\)/); assert.match(html, /id="press"[^>]*min="15"/);
  assert.doesNotMatch(html, /The twist is fast enough/); assert.doesNotMatch(html, /Air pressure \(inHg\)/);
  assert.match(html, /assumed bullet length/);
  assert.match(html, /const PKEYS = \[[^\]]*'bcsrc'/); assert.match(html, /id="bcsrc"/); assert.match(html, /id="bcSrc"/);
  // station pressure at the top of the supported altitude must be inside the accepted range
  const pAtMax = 29.921 * Math.pow(1 - 6.8756e-6 * 15000, 5.2559); assert.ok(pAtMax >= 15, String(pAtMax));
});

test('the zero reachability check lives outside the solver block and uses the engine only to read its output', () => {
  const solver = html.slice(html.indexOf('/*SOLVER_START*/'), html.indexOf('/*SOLVER_END*/'));
  assert.doesNotMatch(solver, /zeroProblem|zeroReachable|cannot be reached/);
  assert.match(html, /function zeroProblem\(/);
});

test('the calculation block is byte-identical to the Stage 8 baseline (and so to Stage 5), model version unchanged', () => {
  const grab = (h) => h.slice(h.indexOf('/*SOLVER_START*/'), h.indexOf('/*SOLVER_END*/'));
  for (const rev of [STAGE8, '9f37df7', '9ab52a6']) assert.strictEqual(grab(html), grab(show(rev, 'index.html')), rev);
  assert.ok(grab(html).length > 1000);
  assert.match(html, /const MODEL_VERSION = '1\.0\.0';/);
  for (const f of ['tests/golden/baseline.json', 'tests/helpers/load-solver.js', 'tests/solver.test.js', 'tests/validation/references.json', 'docs/MODEL_SOURCES.md']) {
    assert.strictEqual(execFileSync('git', ['diff', STAGE8, '--stat', '--', f], { cwd: root, encoding: 'utf8' }).trim(), '', f);
  }
  assert.match(fs.readFileSync(path.join(root, 'docs', 'MODEL_CHANGELOG.md'), 'utf8'), /## 1\.0\.0/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'docs', 'MODEL_CHANGELOG.md'), 'utf8'), /## 1\.0\.1|## 1\.1\.0|## 2\.0\.0/);
});

test('the new messages never call a result accurate, verified, guaranteed or safe', () => {
  const texts = [assessResult(base({ v0src: 'fitted', bcsrc: 'fitted', altFt: 5000, pressInHg: 29.92 }), { rangeYd: 400 })].flatMap(r => [r.badge, ...r.findings.map(f => f.text)]);
  for (const t of texts) {
    assert.doesNotMatch(t, /\b(guarantee|guaranteed|safe|proven)\b/i);
    for (const x of t.matchAll(/verified|accurate\b/gi)) assert.ok(/(not|never|no|un|neither|nor|cannot|without|does not)[^.]*$/i.test(t.slice(0, x.index)), 'unnegated: ' + t);
  }
});
