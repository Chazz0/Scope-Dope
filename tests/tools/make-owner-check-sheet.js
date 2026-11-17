'use strict';
// Generates docs/OWNER_CHECK_REFERENCE_DATA.md from tests/validation/references.json so the sheet lists exactly the values the
// comparisons use. The owner fills in the page values. Differences are recorded, not corrected, and the reference data is only
// changed by a separate, explained commit. Usage: node tests/tools/make-owner-check-sheet.js [--write]
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const R = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'validation', 'references.json'), 'utf8'));
const L = [];
L.push('# Owner check sheet: reference data against the original manufacturer pages', '');
L.push('Status: **NOT DONE.** Optional. The owner has said they will not check data by hand, and this is no longer asked of them: `docs/REFERENCE_DATA_AUDIT.md` is the automated, multi-read corroboration. No entry below has been checked against a raw page by anyone but a page-reading tool.', '');
L.push('Where this sits: the owner check and the second-manufacturer reproduction are separate criteria in `docs/STAGE5_COMPLETION.md`, both WAIVED in narrowed form by the owner on 2026-11-16 22:23 (1 complete, 7 waived, 0 open; complete except waived items). Completing this sheet would settle only the owner check. It would not make the data independently verified, and physical accuracy stays NOT DEMONSTRATED. The reviewer item is WAIVED and counts as nothing here.', '');
L.push('How to use: open each URL yourself. For every row, write what the page shows in the "Page shows" column and mark Match Y or N. If a value differs, **write down the page value and leave the recorded value alone**. Corrections are made later in a separate commit that cites this sheet, so nothing is silently changed. Cells the source leaves blank or as an image placeholder are meant to stay empty ("none").', '');
L.push('Generated from `tests/validation/references.json` by `node tests/tools/make-owner-check-sheet.js --write`. Do not edit the recorded columns by hand.', '');
const section = (title, url, note, rows) => {
  L.push('## ' + title, '', 'URL: ' + url, '');
  if (note) L.push(note, '');
  L.push('| Entry | Recorded | Page shows | Match (Y/N) | Note |', '| --- | --- | --- | --- | --- |');
  for (const r of rows) L.push('| ' + r.join(' | ') + ' | | | |');
  L.push('');
};
const c = R.trajectoryCases[0], rd = c.readings.confirmed_distances;
{ const rows = [['BC (G1)', c.inputsPublished.bcG1], ['Muzzle velocity (fps)', c.inputsPublished.v0Fps], ['Muzzle energy (ft-lb)', c.inputsPublished.muzzleEnergyFtLb], ['Bullet weight (gr)', c.inputsPublished.weightGr], ['Muzzle trajectory (in)', c.inputsPublished.muzzleTrajectoryIn]];
  for (const [rng, w] of Object.entries(rd.rows)) rows.push([rng + ' yd velocity / energy / trajectory', w === null ? 'none (placeholder 0 / N/A / 0)' : w.v + ' fps / ' + w.e + ' ft-lb / ' + w.drop + ' in']);
  section('Hornady LE 6.5 Creedmoor 140 gr OTM-A (item 81480)', c.url, 'Also confirm: which distance each column is labeled, and that the 50 yd column really is the placeholder.', rows); }
for (const d of R.datasets) {
  const rows = [['BC (' + d.model + ')', d.bc], ['Muzzle velocity (fps)', d.muzzle.v]];
  if (d.bcUncorrected) rows.push(['Uncorrected BC used in the worked example', d.bcUncorrected]);
  if (d.weightGr) rows.push(['Bullet weight (gr)', d.weightGr]);
  if (d.muzzle.e) rows.push(['Muzzle energy (ft-lb)', d.muzzle.e]);
  if (d.muzzle.drop !== null) rows.push(['Muzzle trajectory (in)', d.muzzle.drop]);
  if (d.statedConditions) rows.push(['Stated conditions', JSON.stringify(d.statedConditions)]);
  for (const [rng, w] of Object.entries(d.rows)) rows.push([rng + ' yd velocity / energy / trajectory', [w.v === null ? 'none' : w.v + ' fps', w.e === null || w.e === undefined ? 'none' : w.e + ' ft-lb', w.drop === null ? 'none' : w.drop + ' in'].join(' / ')]);
  rows.push(['Zero range (yd)', d.zeroYd + ' (' + (d.id.startsWith('FEDERAL') ? 'page caption' : 'column header') + ')'], ['Sight height (in)', d.sightHeightIn]);
  section(d.id + ': ' + d.source, d.url, [d.note, d.pairingNote, d.cellNotes ? 'Cell notes: ' + JSON.stringify(d.cellNotes) : '', d.excludedTables ? 'Tables excluded and why: ' + JSON.stringify(d.excludedTables) : '', d.energyCheckExceptions ? 'Known energy inconsistency to look at: ' + JSON.stringify(d.energyCheckExceptions) : ''].filter(Boolean).join('\n\n'), rows);
}
section('Hornady atmosphere statements', 'https://www.hornady.com/team-hornady/ballistic-information/ballistic-resources/external-ballistics and https://www.hornady.com/bc', 'Check the quoted wording and whether any date or edition is shown.', [['External ballistics page: "These are standard conditions for the Aberdeen test site", sea level, 59 F, 29.53 inHg, 78%', 'as read by a page tool'], ['hornady.com/bc: "corrected back to ICAO Standard Atmosphere (Sea Level, 59 degrees F, 29.92 inHg, 0% Humidity)"', 'as read by a page tool']]);
const text = L.join('\n') + '\n';
if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'docs', 'OWNER_CHECK_REFERENCE_DATA.md'), text); else process.stdout.write(text);
