'use strict';
// Compares the G1 and G7 tables in index.html with a SECONDARY transcription saved in tests/validation/third-party-tables/.
// Read-only. Identical tables would show the two copies agree. They would not show either copy matches the original
// published tables, because the origin of both is unknown. Usage: node tests/tools/compare-g-tables.js [--json]
const fs = require('fs');
const path = require('path');
const { loadSolver } = require('../helpers/load-solver');
const S = loadSolver();
const dir = path.join(__dirname, '..', 'validation', 'third-party-tables');
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n').map(l => l.split(',').map(Number));
const out = {};
for (const [name, ours] of [['G1', S.G1], ['G7', S.G7]]) {
  const theirs = read(name.toLowerCase() + '.csv');
  const key = (m) => m.toFixed(4);
  const o = new Map(ours.map(p => [key(p[0]), p[1]])), t = new Map(theirs.map(p => [key(p[0]), p[1]]));
  const both = [...o.keys()].filter(k => t.has(k));
  const valueDiffs = both.filter(k => o.get(k) !== t.get(k)).map(k => ({ mach: Number(k), ours: o.get(k), theirs: t.get(k) }));
  const onlyOurs = [...o.keys()].filter(k => !t.has(k)).map(Number), onlyTheirs = [...t.keys()].filter(k => !o.has(k)).map(Number);
  // Effect of a Mach point that exists in only one table: compare the other table's interpolated value there.
  const gapEffect = onlyTheirs.map(m => { const interp = S.cdOf(ours, m); return { mach: m, theirsCd: t.get(key(m)), ourInterpolatedCd: Number(interp.toFixed(5)), diff: Number((interp - t.get(key(m))).toFixed(5)) }; });
  out[name] = { ourPoints: ours.length, theirPoints: theirs.length, machPointsInBoth: both.length, valuesIdentical: both.length - valueDiffs.length, valueDiffs, machPointsOnlyInOurs: onlyOurs, machPointsOnlyInTheirs: onlyTheirs, gapEffect };
}
if (process.argv.includes('--json')) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
for (const [n, r] of Object.entries(out)) {
  console.log(n + ': ours ' + r.ourPoints + ' points, secondary copy ' + r.theirPoints + ' points. Mach points in both: ' + r.machPointsInBoth + ', values identical at ' + r.valuesIdentical + ', different at ' + r.valueDiffs.length + '.');
  for (const d of r.valueDiffs) console.log('   DIFFERENT at Mach ' + d.mach + ': ours ' + d.ours + ', secondary ' + d.theirs);
  if (r.machPointsOnlyInOurs.length) console.log('   only in ours: Mach ' + r.machPointsOnlyInOurs.join(', '));
  if (r.machPointsOnlyInTheirs.length) { console.log('   only in the secondary copy: Mach ' + r.machPointsOnlyInTheirs.join(', ')); for (const g of r.gapEffect) console.log('      at Mach ' + g.mach + ' the secondary Cd is ' + g.theirsCd + '; our interpolated Cd is ' + g.ourInterpolatedCd + ' (diff ' + g.diff + ')'); }
}
console.log('\nThis compares two copies. The origin of both is unknown, so agreement does not verify either against the published original.');
