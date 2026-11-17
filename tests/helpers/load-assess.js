'use strict';
// Loads the transparency/assessment block straight out of index.html (between ASSESS_START and ASSESS_END), the same way
// load-solver.js loads the solver. The block holds advisory text only. It never feeds the calculation.
const fs = require('fs'), path = require('path');
const FILE = process.env.SCOPE_DOPE_FILE || path.join(__dirname, '..', '..', 'index.html');
function loadAssess(file) {
  const html = fs.readFileSync(file || FILE, 'utf8');
  const a = html.indexOf('/*ASSESS_START*/'), b = html.indexOf('/*ASSESS_END*/');
  if (a < 0 || b < 0 || b < a) throw new Error('assess markers not found');
  return new Function(html.slice(a, b) + '\nreturn { VALIDATED, assessResult };')();
}
module.exports = { loadAssess };
