'use strict';
// Stage 13 added round-3 reference datasets (registeredRound 3) to tests/validation/references.json. Earlier stages pinned that file
// byte-for-byte. This helper keeps the pin strict for everything that existed before: it removes only the round-3 datasets and the
// round-3 sentence of roundNote, and the rest must equal the pinned earlier version exactly (tolerances, table points, cases,
// atmospheres and every earlier dataset value). It cannot hide a change to anything registered before round 3.
const ROUND3_SENTENCE = / Round 3 datasets \(HORNADY-PH-300WM-200-ELDX-\*\)[^]*$/;
function withoutRound3(text) {
  const o = JSON.parse(text);
  o.datasets = o.datasets.filter(d => d.registeredRound !== 3);
  o.roundNote = o.roundNote.replace(ROUND3_SENTENCE, '');
  return o;
}
module.exports = { withoutRound3 };
