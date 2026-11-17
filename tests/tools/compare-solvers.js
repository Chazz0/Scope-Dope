'use strict';
// Differential check for a change to the calculation block. Runs many random, valid inputs through the solver from a
// git ref (the OLD one) and the current index.html (the NEW one) and compares every output field.
// Fields named in IGNORE are the ones a change is allowed to remove. Anything else that differs is reported.
// This shows the change did not move other numbers. It says nothing about whether the numbers are right.
// Usage: OLD_REF=<git ref> node tests/tools/compare-solvers.js [count]
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const { loadSolver, baseInputs } = require('../helpers/load-solver');
const ROOT = path.join(__dirname, '..', '..');
const ref = process.env.OLD_REF; if (!ref) { console.error('Set OLD_REF to a git ref, e.g. OLD_REF=HEAD~1'); process.exit(2); }
const IGNORE = new Set((process.env.IGNORE || 'leadMoa,leadMil').split(','));
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sd-cmp-')), 'old.html');
fs.writeFileSync(tmp, cp.execSync('git show ' + ref + ':index.html', { cwd: ROOT, maxBuffer: 1 << 26 }));
const OLD = loadSolver({ file: tmp }), NEW = loadSolver();
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (a, b) => a + (b - a) * rnd(), chance = (p) => rnd() < p;
const N = parseInt(process.argv[2] || '2000', 10); let compared = 0, fieldsCompared = 0, diffs = [], nulls = 0;
for (let i = 0; i < N; i++) {
  const inp = baseInputs({
    tempF: pick(-20, 110), altFt: pick(-200, 12000), pressInHg: chance(0.3) ? pick(22, 31) : null, humidity: pick(0, 100),
    v0: pick(1500, 3600), bc: pick(0.1, 0.9), wt: pick(40, 300), h: pick(1, 3), zero: pick(50, 300), diam: pick(0.22, 0.38), twist: pick(7, 14),
    model: chance(0.5) ? 'G1' : 'G7', twistDir: chance(0.5) ? 'R' : 'L', windMph: pick(0, 30), windFrom: chance(0.5) ? 'R' : 'L', headMph: pick(-10, 10),
    angleDeg: chance(0.5) ? 0 : pick(-45, 45), latDeg: chance(0.5) ? null : pick(-60, 60), azimuth: pick(0, 360)
  });
  const maxYd = 1300, yd = pick(50, 1200);
  const a = OLD.dopeAt(OLD.buildModel(inp, maxYd), inp, yd), b = NEW.dopeAt(NEW.buildModel(inp, maxYd), inp, yd);
  if (!a || !b) { if (!!a !== !!b) diffs.push({ i, why: 'one side has no solution' }); else nulls++; continue; }
  compared++;
  for (const k of Object.keys(a)) { if (IGNORE.has(k)) continue; fieldsCompared++; if (!Object.is(a[k], b[k])) diffs.push({ i, k, old: a[k], new: b[k] }); }
  for (const k of Object.keys(b)) if (!(k in a)) diffs.push({ i, k, why: 'new field' });
}
console.log('old = git ' + ref + ' | random inputs ' + N + ' | solved by both ' + compared + ' | no solution in both ' + nulls + ' | fields compared ' + fieldsCompared + ' | ignored ' + [...IGNORE].join(','));
console.log(diffs.length ? 'DIFFERENCES: ' + diffs.length + '\n' + JSON.stringify(diffs.slice(0, 5)) : 'identical: every compared field matched bit for bit');
process.exit(diffs.length ? 1 : 0);
