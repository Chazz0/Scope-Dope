'use strict';
// Stage 16: the app no longer defaults a scope click value, so a rifle shows clicks only after its scope settings are entered.
// The earlier browser suites were written when 1/4 MOA was a silent default. They now enter the equivalent settings explicitly
// (1/4 true MOA for both knobs, tracking factors 1.000), exactly as a user would, and then run unchanged.
const FIELDS = { eUnit: 'TRUE_MOA', eClick: '0.25', eCf: '1', wUnit: 'TRUE_MOA', wClick: '0.25', wCf: '1' };
async function completeScope(page) {
  await page.click('#tabRifle');
  for (const id of Object.keys(FIELDS)) {
    if (id.endsWith('Unit')) await page.selectOption('#' + id, FIELDS[id]);
    else { await page.fill('#' + id, FIELDS[id]); await page.dispatchEvent('#' + id, 'input'); }
  }
  await page.click('#tabHud'); await page.waitForTimeout(150);
}
module.exports = { FIELDS, completeScope };
