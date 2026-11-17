'use strict';
// Stage 9.1 Node tests. Written before the app change.
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { loadAssess } = require('./helpers/load-assess');
const { baseInputs } = require('./helpers/load-solver');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const { assessResult } = loadAssess();
const base = (o) => ({ ...baseInputs(), v0nom: 2650, windMph: 0, headMph: 0, ...(o || {}) });
const ids = (r) => r.findings.map(f => f.level + ':' + f.id);
const STAGE9 = '9fca2372faaf4a9cba3e048190d659e738821cab', STAGE8 = 'c99bb06857fafdd7a68557bc4ad6cf7d075b8f8e';
const show = (rev, f) => execFileSync('git', ['show', rev + ':' + f], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });

test('a stability estimate below 1.0 gives a warning when spin drift is in use, and nothing otherwise', () => {
  const at = (o, sg) => ids(assessResult(base(o), { rangeYd: 400, sg }));
  assert.ok(at({ twist: 16 }, 0.75).includes('warning:stability'));
  assert.ok(at({ twist: 16 }, 0.99).includes('warning:stability'));
  for (const sg of [1.0, 1.01, 1.7, 3]) assert.ok(!at({ twist: 10 }, sg).includes('warning:stability'), String(sg));
  assert.ok(!at({ twist: 0 }, 0.5).includes('warning:stability'), 'no spin drift when twist is 0');
  assert.ok(!ids(assessResult(base({ twist: 16 }), { rangeYd: 400 })).includes('warning:stability'), 'no estimate given');
  const t = assessResult(base({ twist: 16 }), { rangeYd: 400, sg: 0.75 }).findings.find(f => f.id === 'stability').text;
  assert.match(t, /below 1\.0/); assert.match(t, /spin.drift/i); assert.match(t, /may be unreliable/i); assert.match(t, /assumed bullet length/i);
  assert.match(t, /0\.75/);
});

test('the preset-derived coefficient is noted; typed, fitted and saved ones are not called preset values', () => {
  const at = (bcsrc) => ids(assessResult(base({ bcsrc }), { rangeYd: 400 }));
  assert.ok(at('factory').includes('notice:bcfactory')); assert.ok(at('fitted').includes('notice:bcfitted'));
  for (const s of ['user', '', undefined]) assert.ok(!at(s).some(i => /bcfactory|bcfitted/.test(i)), String(s));
  const t = assessResult(base({ bcsrc: 'factory' }), { rangeYd: 400 }).findings.find(f => f.id === 'bcfactory').text;
  assert.match(t, /typical/i); assert.match(t, /not .*your bullet/i);
});

test('page source: weight handler never rewrites a typed or fitted coefficient; source and weight are saved', () => {
  assert.match(html, /const PKEYS = \[[^\]]*'bcwt'/); assert.match(html, /id="bcwt"/); assert.match(html, /id="bcKeep"/);
  const a = html.indexOf("if (id === 'wt'){"), seg = html.slice(a, html.indexOf("if (id === 'preset'", a));
  assert.match(seg, /bcsrc/); assert.match(seg, /'factory'/);
  assert.doesNotMatch(html.slice(a - 400, a), /\$\('bcsrc'\)\.value = ''/);
});

test('the calculation block is byte-identical to Stage 9, Stage 8 and Stage 5; model version, baseline and reference data unchanged', () => {
  const grab = (h) => h.slice(h.indexOf('/*SOLVER_START*/'), h.indexOf('/*SOLVER_END*/'));
  for (const rev of [STAGE9, STAGE8, '9f37df7', '9ab52a6']) assert.strictEqual(grab(html), grab(show(rev, 'index.html')), rev);
  assert.ok(grab(html).length > 1000); assert.match(grab(html), /1\.25 \* \(stability\(inp\) \+ 1\.2\) \* Math\.pow\(s\.t, 1\.83\)/);
  assert.match(html, /const MODEL_VERSION = '1\.0\.0';/);
  for (const f of ['tests/golden/baseline.json', 'tests/helpers/load-solver.js', 'tests/solver.test.js', 'tests/validation/references.json', 'docs/MODEL_SOURCES.md']) {
    assert.strictEqual(execFileSync('git', ['diff', STAGE9, '--stat', '--', f], { cwd: root, encoding: 'utf8' }).trim(), '', f);
  }
});

test('the new messages never call a result accurate, verified, guaranteed or safe', () => {
  const r = assessResult(base({ twist: 16, bcsrc: 'factory' }), { rangeYd: 400, sg: 0.8 });
  for (const t of [r.badge, ...r.findings.map(f => f.text)]) {
    assert.doesNotMatch(t, /\b(guarantee|guaranteed|safe|proven)\b/i);
    for (const x of t.matchAll(/verified|accurate\b/gi)) assert.ok(/(not|never|no|un|neither|nor|cannot|without|does not)[^.]*$/i.test(t.slice(0, x.index)), 'unnegated: ' + t);
  }
});
