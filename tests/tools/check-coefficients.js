'use strict';
// READ-ONLY. Lists rifles whose saved ballistic coefficient differs from what scaling the cartridge preset's factory
// coefficient by bullet weight would give. A difference is NOT proof of a wrong value: you may have typed a published
// coefficient on purpose. It only shows which rifles to look at. This tool never writes anything.
// Usage: node tests/tools/check-coefficients.js <file>   where <file> holds a backup code from Rifle settings,
//        or the raw text stored under "scopedope.v2".
const fs = require('fs');
const PRESETS = { p223: ['.223 Rem', 55, 0.243], p243: ['.243 Win', 95, 0.379], p65cm: ['6.5 Creedmoor', 140, 0.610], p270: ['.270 Win', 130, 0.409],
  p308: ['.308 Win', 168, 0.462], p3006: ['.30-06 Sprg', 150, 0.415], p300: ['.300 Win Mag', 190, 0.533], p65prc: ['6.5 PRC', 143, 0.625] };
const file = process.argv[2];
if (!file) { console.error('Usage: node tests/tools/check-coefficients.js <file>'); process.exit(2); }
let o; try { o = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error('Could not read that file as JSON.'); process.exit(2); }
const people = Array.isArray(o.people) ? o.people : (Array.isArray(o.profiles) ? [{ name: 'Me', profiles: o.profiles }] : []);
if (!people.length) { console.error('No rifles found in that file.'); process.exit(2); }
let flagged = 0, total = 0;
for (const p of people) for (const r of (p.profiles || [])) {
  total++;
  const pre = PRESETS[r.preset], wt = parseFloat(r.wt), bc = parseFloat(r.bc);
  let note;
  if (!pre) note = 'custom load: no reference value, cannot assess';
  else if (r.model === 'G7') note = 'G7 coefficient: the preset reference is G1, cannot assess';
  else if (!(wt > 0) || !(bc > 0)) note = 'weight or coefficient is blank or invalid';
  else if (wt === pre[1]) note = bc === pre[2] ? 'factory values, nothing to compare' : 'weight is the preset weight; coefficient was set by you';
  else {
    const want = pre[2] * wt / pre[1], d = (bc - want) / want;
    if (Math.abs(d) > 0.01) { flagged++; note = 'LOOK AT THIS: saved ' + bc + ', scaling the ' + pre[0] + ' factory value to ' + wt + ' gr gives ' + want.toFixed(3) + ' (' + (d > 0 ? '+' : '') + (100 * d).toFixed(1) + '%)'; }
    else note = 'consistent with scaling (' + (100 * d).toFixed(1) + '%)';
  }
  console.log((p.name || '?') + ' / ' + (r.pname || '?') + ': ' + note);
}
console.log('\n' + total + ' rifles, ' + flagged + ' to look at. Nothing was changed.');
