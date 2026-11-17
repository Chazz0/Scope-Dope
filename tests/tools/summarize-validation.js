'use strict';
// Prints exact comparison counts from the runner output, by round, group and atmosphere. Read-only.
// Usage: node tests/tools/summarize-validation.js [--json]
const { execFileSync } = require('child_process');
const path = require('path');
const out = JSON.parse(execFileSync('node', [path.join(__dirname, 'run-validation.js'), '--json'], { encoding: 'utf8' }));
const ok = (x) => x.kind === 'trajectory' ? x.vPass && x.dropPass : x.pass;
const counted = out.filter(x => ['table', 'trajectory', 'dataset'].includes(x.kind));
const rows = [];
const add = (name, f) => { const g = counted.filter(f); rows.push({ group: name, total: g.length, within: g.filter(ok).length, outside: g.length - g.filter(ok).length, failures: g.filter(x => !ok(x)).map(x => (x.id || '') + ' ' + (x.atmosphere || '') + ' ' + (x.range || '')) }); };
add('Drag-table points (Mach 3)', x => x.kind === 'table');
add('Hornady LE, ICAO (primary run)', x => x.kind === 'trajectory');
for (const rd of [1, 2]) for (const [lab, a] of [['ICAO', 'ICAO'], ['Aberdeen', 'HORNADY_ABERDEEN'], ['printed conditions', 'STATED_CONDITIONS']]) add('Round ' + rd + ' datasets, ' + lab, x => x.kind === 'dataset' && x.round === rd && x.atmosphere === a);
const total = { group: 'TOTAL', total: counted.length, within: counted.filter(ok).length, outside: counted.filter(x => !ok(x)).length };
const sens = out.filter(x => x.kind === 'sensitivity');
if (process.argv.includes('--json')) { console.log(JSON.stringify({ rows: rows.filter(r => r.total), total, sensitivity: { total: sens.length, within: sens.filter(x => x.pass).length } }, null, 1)); process.exit(0); }
for (const r of rows.filter(r => r.total)) console.log(r.group.padEnd(40) + String(r.total).padStart(4) + ' compared, ' + String(r.within).padStart(4) + ' within tolerance, ' + String(r.outside).padStart(3) + ' outside' + (r.failures.length ? '\n      outside: ' + r.failures.join('; ') : ''));
console.log('TOTAL'.padEnd(40) + String(total.total).padStart(4) + ' compared, ' + String(total.within).padStart(4) + ' within tolerance, ' + String(total.outside).padStart(3) + ' outside');
console.log('Not in the total: LE Aberdeen sensitivity ' + sens.length + ' rows, ' + sens.filter(x => x.pass).length + ' within tolerance.');
