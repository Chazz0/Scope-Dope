'use strict';
// Compares every cell of tests/validation/source-reads.json (what a page-reading tool extracted from each source on the access
// date) with the project's reference data in tests/validation/references.json. Read-only. Records mismatches and does not
// correct anything. A match here means two reads of a page agree with the project copy. Because every read goes through the
// same kind of page reader and not a raw download, it is corroboration, not independent verification.
// Usage: node tests/tools/audit-reference-data.js [--json]
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'validation');
const R = JSON.parse(fs.readFileSync(path.join(dir, 'references.json'), 'utf8'));
const S = JSON.parse(fs.readFileSync(path.join(dir, 'source-reads.json'), 'utf8'));
const find = (id) => {
  const d = R.datasets.find(x => x.id === id); if (d) return { muzzle: d.muzzle, rows: d.rows, bc: d.bc };
  const c = R.trajectoryCases.find(x => x.id === id);
  if (c) return { muzzle: { v: c.inputsPublished.v0Fps, e: c.inputsPublished.muzzleEnergyFtLb, drop: c.inputsPublished.muzzleTrajectoryIn }, rows: c.readings.confirmed_distances.rows, bc: c.inputsPublished.bcG1 };
  return null;
};
const out = { cells: 0, match: 0, mismatches: [], recordedEmptyReadHasValue: [], byRead: {} };
for (const rd of S.reads) {
  const st = out.byRead[rd.readId] = { url: rd.url, cells: 0, match: 0 };
  for (const t of rd.targets) {
    const rec = find(t.datasetId);
    if (!rec) { out.mismatches.push({ read: rd.readId, id: t.datasetId, what: 'dataset not in references.json' }); continue; }
    const cmp = (what, got, want) => {
      if (want === null || want === undefined) { if (got !== undefined && got !== null) out.recordedEmptyReadHasValue.push({ read: rd.readId, id: t.datasetId, what, read_value: got }); return; }
      out.cells++; st.cells++;
      if (got === want) { out.match++; st.match++; } else out.mismatches.push({ read: rd.readId, id: t.datasetId, what, read_value: got, recorded: want });
    };
    if (t.bc !== undefined) cmp('bc', t.bc, rec.bc);
    for (const k of ['v', 'e', 'drop']) if (t.muzzle && t.muzzle[k] !== undefined) cmp('muzzle ' + k, t.muzzle[k], rec.muzzle[k]);
    for (const [rng, w] of Object.entries(t.rows || {})) for (const k of ['v', 'e', 'drop']) if (w[k] !== undefined) cmp(rng + ' yd ' + k, w[k], rec.rows[rng] ? rec.rows[rng][k] : undefined);
  }
}
if (process.argv.includes('--json')) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
for (const [id, s] of Object.entries(out.byRead)) console.log(id + '  ' + s.match + ' of ' + s.cells + ' cells agree  ' + s.url);
console.log('\nTotal: ' + out.match + ' of ' + out.cells + ' cells agree; ' + out.mismatches.length + ' mismatches.');
for (const m of out.mismatches) console.log('  MISMATCH ' + m.read + ' ' + m.id + ' ' + m.what + ': read ' + m.read_value + ', recorded ' + m.recorded);
for (const m of out.recordedEmptyReadHasValue) console.log('  NOTE ' + m.read + ' ' + m.id + ' ' + m.what + ': recorded value is empty (placeholder) but this read shows ' + m.read_value + '. Not copied into the data.');
console.log('\nThese are reads by a page-reading tool, not raw downloads. Agreement is corroboration, not independent verification.');
