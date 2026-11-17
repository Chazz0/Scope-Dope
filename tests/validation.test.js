'use strict';
// Guards for the validation work. These check that the evidence files and the labels stay honest.
// They do not judge whether the ballistics are accurate. A passing test is not evidence of accuracy.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { DEFAULT_FILE } = require('./helpers/load-solver');

const root = path.join(__dirname, '..');
const refs = JSON.parse(fs.readFileSync(path.join(__dirname, 'validation', 'references.json'), 'utf8'));
const sources = fs.readFileSync(path.join(root, 'docs', 'MODEL_SOURCES.md'), 'utf8');

test('the tolerances are the ones written before the comparison was run', () => {
  assert.deepStrictEqual(refs.tolerances.tableCd.abs, 0.005);
  assert.deepStrictEqual(refs.tolerances.velocityPct.value, 1.0);
  assert.deepStrictEqual(refs.tolerances.dropIn.pct, 2.0);
  assert.deepStrictEqual(refs.tolerances.dropIn.minAbs, 0.3);
});

test('the owner-confirmed distance labels are recorded, and the discarded reading is history only', () => {
  const c = refs.trajectoryCases.find(x => x.id === 'HORNADY-LE-140-OTMA');
  assert.deepStrictEqual(c.labelsConfirmed.distancesYd, ['Muzzle', 50, 100, 200, 300, 400, 500]);
  assert.ok(c.discardedReadings.A_shifted_one_column && c.discardedReadings.B_hundred_yard_steps, 'discarded readings must stay recorded as history');
  assert.ok(!Object.keys(c.readings).some(k => /^(A_|B_)/.test(k)), 'a discarded reading must not be in the readings that are run');
  assert.strictEqual(c.readings.confirmed_distances.rows['50'], null, 'the placeholder 50 yd column must stay invalid, not become a number');
  assert.ok(c.readings.confirmed_distances.rowNotes['50'].includes('0 / N/A / 0'));
  assert.match(c.valuePairing, /not seen by the author/, 'what the author did not see must stay disclosed');
});

test('every reference names its source, a URL and what could not be read', () => {
  for (const p of refs.tablePoints) { assert.ok(p.source && /^https:\/\//.test(p.url) && p.quote, p.id); }
  for (const c of refs.trajectoryCases) {
    assert.ok(c.source && /^https:\/\//.test(c.url), c.id);
    assert.ok(Array.isArray(c.inputsNotPublished) && c.inputsNotPublished.length > 0, c.id + ' must list what the source does not publish');
    assert.ok(c.assumptions && c.assumptions.why, c.id + ' must say why each assumption was made');
  }
});

test('the validation runner reports every comparison, including the ones that differ and the ones not obtained', () => {
  const out = JSON.parse(execFileSync('node', [path.join(root, 'tests', 'tools', 'run-validation.js'), '--json'], { encoding: 'utf8' }));
  assert.strictEqual(out.filter(x => x.kind === 'table').length, refs.tablePoints.length);
  const rows = refs.trajectoryCases.flatMap(c => Object.values(c.readings).flatMap(r => Object.values(r.rows)));
  assert.strictEqual(out.filter(x => x.kind === 'trajectory').length, rows.filter(x => x !== null).length);
  assert.strictEqual(out.filter(x => x.kind === 'notObtained').length, rows.filter(x => x === null).length);
  assert.ok(!out.some(x => /^(A_|B_)/.test(String(x.reading || ''))), 'a discarded reading was run');
});

test('the BC unit factor in the app matches the exact definitions of the pound and the inch', () => {
  const exact = 0.45359237 / (0.0254 * 0.0254);
  assert.ok(Math.abs(exact - 703.0696) < 1e-4, 'exact value is ' + exact);
  const html = fs.readFileSync(DEFAULT_FILE, 'utf8');
  assert.ok(html.includes('inp.bc * 703.0696'), 'the app no longer uses 703.0696');
});

test('the sources document states that software tests are not proof of accuracy', () => {
  assert.ok(sources.includes('Passing software tests is not proof of ballistic accuracy.'));
});

test('the sources document defines Tested, Verified and Unverified', () => {
  for (const w of ['**Tested**', '**Verified**', '**Unverified**']) assert.ok(sources.includes('| ' + w + ' |'), w + ' is not defined');
});

test('every component labeled Verified states its scope', () => {
  const rows = sources.split('\n').filter(l => l.startsWith('|') && /\*\*Verified\*\*,/.test(l));
  assert.ok(rows.length >= 1);
  for (const r of rows) assert.match(r, /scope:/i, 'a Verified row has no scope: ' + r.slice(0, 60));
});

test('no drag table is labeled Verified while only one point has been compared', () => {
  const g = sources.split('\n').filter(l => /^\| G[17] drag table/.test(l));
  assert.strictEqual(g.length, 2);
  for (const l of g) assert.ok(/\*\*Unverified\*\*/.test(l) && !/\*\*Verified\*\*/.test(l), l.slice(0, 40));
});

test('evidence ids named in the sources document exist in the reference data', () => {
  const ids = new Set(refs.tablePoints.map(p => p.id));
  const named = sources.match(/\b[A-Z]{2}-G[17]-M\d\b/g) || [];
  assert.ok(named.length > 0);
  for (const id of named) assert.ok(ids.has(id), id + ' is not in references.json');
});

test('transcription check: each Hornady row\'s energy matches its velocity (this checks the copy, not ballistics)', () => {
  const c = refs.trajectoryCases.find(x => x.id === 'HORNADY-LE-140-OTMA');
  const wt = c.inputsPublished.weightGr;
  const energy = (v) => v * v * wt / 450240;
  assert.ok(Math.abs(energy(c.inputsPublished.v0Fps) - c.inputsPublished.muzzleEnergyFtLb) <= 2, 'muzzle row');
  for (const [r, w] of Object.entries(c.readings.confirmed_distances.rows)) {
    if (!w) continue;
    assert.ok(Math.abs(energy(w.v) - w.e) <= 2, r + ' yd: ' + w.v + ' fps gives ' + energy(w.v).toFixed(1) + ' ft-lb but the copy says ' + w.e + '. Whole-fps rounding allows about 1.');
  }
});

// ---- Independent-reviewer reproduction and Stage 5 completion (added after the owner's 20:12 requirements) ----
const tool = (args) => { try { return { code: 0, out: execFileSync('node', [path.join(root, 'tests', 'tools', 'compare-reviewer.js'), ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; } catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') }; } };
const fixture = path.join(__dirname, 'validation', 'fixtures', 'FIXTURE-not-a-review.json');
const template = path.join(__dirname, 'validation', 'reviewer-template.json');

test('the reviewer template is blank, so a reviewer cannot be handed the project values', () => {
  const t = JSON.parse(fs.readFileSync(template, 'utf8'));
  assert.deepStrictEqual(t.columns, ['Muzzle', '50', '100', '200', '300', '400', '500']);
  for (const col of t.columns) {
    const cell = t.table[col];
    assert.ok(cell && cell.velocityFps === null && cell.energyFtLb === null && cell.trajectoryIn === null && cell.rawText === '', col + ' must be blank');
  }
  assert.strictEqual(t.sawProjectValuesBeforeTranscribing, null);
  assert.strictEqual(t.reviewer.independent, null);
});

test('the comparison tool refuses an incomplete reviewer file', () => {
  const r = tool([template]);
  assert.notStrictEqual(r.code, 0);
  assert.match(r.out, /incomplete|not filled/i);
});

test('a fixture is labeled as NOT an independent review, and still exercises the whole comparison', () => {
  const r = tool([fixture]);
  assert.strictEqual(r.code, 0, r.out);
  assert.match(r.out, /NOT AN INDEPENDENT REVIEW/);
  assert.match(r.out, /0 differences from the project copy/);
  assert.match(r.out, /5 of 5 engine comparisons within tolerance/);
});

test('the tool reports a difference between the reviewer\'s copy and the project copy', () => {
  const f = JSON.parse(fs.readFileSync(fixture, 'utf8'));
  f.table['300'].velocityFps = 2247;
  const tmp = path.join(require('os').tmpdir(), 'reviewer-altered-' + process.pid + '.json');
  fs.writeFileSync(tmp, JSON.stringify(f));
  const r = tool([tmp]);
  fs.unlinkSync(tmp);
  assert.match(r.out, /DIFFERS FROM PROJECT COPY.*300/);
  assert.match(r.out, /1 difference/);
});

test('a review only counts as independent if the reviewer says they never saw the project values', () => {
  const f = JSON.parse(fs.readFileSync(fixture, 'utf8'));
  f.reviewer.name = 'A. Reviewer'; f.reviewer.independent = true; f.sawProjectValuesBeforeTranscribing = true;
  const tmp = path.join(require('os').tmpdir(), 'reviewer-saw-' + process.pid + '.json');
  fs.writeFileSync(tmp, JSON.stringify(f));
  const r = tool([tmp]);
  fs.unlinkSync(tmp);
  assert.match(r.out, /NOT AN INDEPENDENT REVIEW/);
});

test('the reviewer protocol says the reviewer must not be shown the project values first', () => {
  const t = fs.readFileSync(path.join(root, 'docs', 'REVIEWER_PROTOCOL.md'), 'utf8');
  assert.match(t, /must not be shown/i);
  assert.match(t, /original manufacturer/i);
});

const completion = () => fs.readFileSync(path.join(root, 'docs', 'STAGE5_COMPLETION.md'), 'utf8');
const stateCounts = (t) => ({
  complete: (t.match(/^- \[x\] /gm) || []).length,
  waived: (t.match(/^- \[~\] /gm) || []).length,
  open: (t.match(/^- \[ \] /gm) || []).length
});

test('OPEN, WAIVED and COMPLETE are separate states, and the overall status follows from them', () => {
  const t = completion(), n = stateCounts(t);
  assert.ok(n.complete + n.waived + n.open >= 6, 'criteria list is missing');
  const want = n.open > 0 ? 'NOT COMPLETE' : (n.waived > 0 ? 'COMPLETE EXCEPT WAIVED ITEMS' : 'COMPLETE');
  const status = (t.match(/^\*\*Stage 5 status: ([A-Z ]+)\*\*/m) || [])[1];
  assert.strictEqual(status, want, 'status says ' + status + ' but the items give ' + want);
});

test('the summary line counts each state separately, and a waived item is not counted as complete', () => {
  const t = completion(), n = stateCounts(t);
  const m = t.match(/^Criteria: (\d+) complete, (\d+) waived, (\d+) open\./m);
  assert.ok(m, 'summary line "Criteria: N complete, N waived, N open." is missing');
  assert.deepStrictEqual([Number(m[1]), Number(m[2]), Number(m[3])], [n.complete, n.waived, n.open]);
  assert.match(t, /A waived item is not evidence and is not counted as complete\./);
});

test('the reviewer box can only be checked with a real review file', () => {
  const t = completion();
  const line = t.split('\n').find(l => /independent reviewer reproduced/i.test(l)) || '';
  if (line.includes('[x]')) assert.ok(fs.existsSync(path.join(__dirname, 'validation', 'reviewer-results.json')), 'reviewer criterion is checked but there is no reviewer-results.json');
});

test('no document or app label says independently verified without a negation', () => {
  const files = ['docs/MODEL_SOURCES.md', 'docs/VALIDATION_REPORT.md', 'docs/STAGE5_COMPLETION.md', 'docs/MODEL_CHANGELOG.md', 'docs/REVIEWER_PROTOCOL.md', 'tests/README.md', 'index.html'];
  for (const f of files) {
    const text = fs.readFileSync(path.join(root, f), 'utf8');
    for (const m of text.matchAll(/independently[ -]verified/gi)) {
      const before = text.slice(Math.max(0, m.index - 40), m.index).toLowerCase();
      assert.ok(/(not|never|no|un|neither|nor|cannot|without|waived)[^.\n]*$/.test(before) || /\bnot\s*$/.test(before), f + ': "' + text.slice(Math.max(0, m.index - 40), m.index + 30).replace(/\n/g, ' ') + '" is not negated');
    }
  }
});

test('physical accuracy is labeled NOT DEMONSTRATED in every document that mentions it', () => {
  for (const f of ['docs/STAGE5_COMPLETION.md', 'docs/MODEL_SOURCES.md', 'docs/VALIDATION_REPORT.md']) {
    const text = fs.readFileSync(path.join(root, f), 'utf8');
    assert.match(text, /Physical accuracy[^\n]*NOT DEMONSTRATED/, f);
    assert.doesNotMatch(text, /Physical accuracy[^\n]*(Achieved|Established|Verified)/i, f);
  }
});

test('a waived criterion carries who waived it, when, and what it leaves unestablished', () => {
  const t = fs.readFileSync(path.join(root, 'docs', 'STAGE5_COMPLETION.md'), 'utf8');
  const waived = t.split('\n').filter(l => l.startsWith('- [~] '));
  assert.ok(waived.length >= 1, 'the reviewer criterion should be recorded as waived');
  for (const l of waived) {
    assert.match(l, /WAIVED by the project owner on 20\d\d-\d\d-\d\d/, 'waiver needs who and when: ' + l.slice(0, 60));
    assert.match(l, /owner-checked only/, 'waiver must say what it leaves unestablished: ' + l.slice(0, 60));
  }
  assert.ok(waived.some(l => /independent reviewer reproduced/i.test(l)), 'the reviewer criterion is not the waived one');
});

test('a waived reviewer does not let the Hornady data support a Verified label', () => {
  const t = fs.readFileSync(path.join(root, 'docs', 'STAGE5_COMPLETION.md'), 'utf8');
  assert.match(t, /no component[^.]*Verified[^.]*Hornady/i);
  const rows = sources.split('\n').filter(l => /^\| (Drag equation|G1 drag table|G7 drag table)/.test(l));
  assert.strictEqual(rows.length, 3);
  for (const l of rows) assert.ok(/\*\*Unverified\*\*/.test(l), l.slice(0, 40));
});

test('the sources document separates software correctness, reference agreement and physical accuracy', () => {
  for (const w of ['Software correctness', 'Reference agreement', 'Physical accuracy']) assert.ok(sources.includes(w), w + ' is missing');
  assert.match(sources, /Physical accuracy[^\n]*NOT DEMONSTRATED/);
});

// ---- Second manufacturer datasets and the atmosphere sensitivity (validation round of 21:02) ----
const runJson = () => JSON.parse(execFileSync('node', [path.join(root, 'tests', 'tools', 'run-validation.js'), '--json'], { encoding: 'utf8' }));

test('two candidate atmospheres are declared before any dataset is run, each with its source', () => {
  assert.ok(refs.atmospheres.ICAO && refs.atmospheres.HORNADY_ABERDEEN);
  assert.deepStrictEqual([refs.atmospheres.ICAO.tempF, refs.atmospheres.ICAO.pressInHg, refs.atmospheres.ICAO.humidity], [59, 29.92, 0]);
  assert.deepStrictEqual([refs.atmospheres.HORNADY_ABERDEEN.tempF, refs.atmospheres.HORNADY_ABERDEEN.pressInHg, refs.atmospheres.HORNADY_ABERDEEN.humidity], [59, 29.53, 78]);
  for (const a of Object.values(refs.atmospheres)) assert.ok(a.source && a.source.length > 20);
});

test('a second manufacturer and a G7 bullet are in the data, with what the source does not publish', () => {
  const ids = refs.datasets.map(d => d.id);
  assert.ok(ids.includes('FEDERAL-GM-6.5CM-130-G7'), 'Federal G7 dataset missing');
  const fed = refs.datasets.find(d => d.id === 'FEDERAL-GM-6.5CM-130-G7');
  assert.strictEqual(fed.model, 'G7'); assert.strictEqual(fed.bc, 0.287);
  assert.notStrictEqual(fed.manufacturer, 'Hornady');
  assert.ok(fed.notPublished.some(x => /atmosphere/i.test(x)));
  assert.ok(ids.filter(i => i.startsWith('HORNADY-')).length >= 6, 'the Hornady resource-page tables are missing');
});

test('placeholder cells in a source stay null and are never filled in by inference', () => {
  const fed = refs.datasets.find(d => d.id === 'FEDERAL-GM-6.5CM-130-G7');
  assert.strictEqual(fed.rows['100'].drop, null, 'Federal 100 yd average-range trajectory is an image placeholder');
  assert.ok(fed.cellNotes && /placeholder/i.test(JSON.stringify(fed.cellNotes)));
  assert.ok(fed.excludedTables && /long range/i.test(JSON.stringify(fed.excludedTables)) && /zero/i.test(JSON.stringify(fed.excludedTables)));
});

test('transcription check for every dataset: each row\'s energy matches its velocity', () => {
  let checked = 0;
  for (const d of refs.datasets) {
    const energy = (v) => v * v * d.weightGr / 450240;
    if (d.muzzle && d.muzzle.e) { assert.ok(Math.abs(energy(d.muzzle.v) - d.muzzle.e) <= 2, d.id + ' muzzle'); checked++; }
    for (const [r, w] of Object.entries(d.rows)) if (w.v !== null && w.e) {
      const ok = Math.abs(energy(w.v) - w.e) <= 2;
      if (!ok) assert.ok(d.energyCheckExceptions && d.energyCheckExceptions[r], d.id + ' ' + r + ' yd: ' + w.v + ' fps vs ' + w.e + ' ft-lb, and no documented exception');
      checked++;
    }
  }
  assert.ok(checked >= 20, 'too few rows were checked: ' + checked);
});

test('every dataset is run under every atmosphere that applies, and failures are reported with the passes', () => {
  const out = runJson().filter(x => x.kind === 'dataset');
  assert.ok(out.length > 0);
  for (const d of refs.datasets) {
    const mine = out.filter(x => x.id === d.id);
    const atmos = new Set(mine.map(x => x.atmosphere));
    for (const a of d.atmospheresRun) assert.ok(atmos.has(a), d.id + ' was not run under ' + a);
    if (d.atmospheresRun.length > 1) assert.ok(d.atmospheresRun.length >= 2);
  }
  assert.ok(out.some(x => x.pass === false) || out.every(x => x.pass === true), 'results must carry a pass flag');
});

test('the dataset runner does not change the tolerances', () => {
  assert.strictEqual(refs.tolerances.velocityPct.value, 1.0);
  assert.strictEqual(refs.tolerances.dropIn.pct, 2.0);
  assert.strictEqual(refs.tolerances.dropIn.minAbs, 0.3);
});

test('the G table comparison reports every point and states that agreement between copies is not verification', () => {
  const out = JSON.parse(execFileSync('node', [path.join(root, 'tests', 'tools', 'compare-g-tables.js'), '--json'], { encoding: 'utf8' }));
  assert.strictEqual(out.G1.ourPoints, 79); assert.strictEqual(out.G7.ourPoints, 83);
  assert.strictEqual(out.G1.theirPoints, 79); assert.strictEqual(out.G7.theirPoints, 84);
  assert.strictEqual(out.G1.valuesIdentical + out.G1.valueDiffs.length, out.G1.machPointsInBoth);
  const txt = execFileSync('node', [path.join(root, 'tests', 'tools', 'compare-g-tables.js')], { encoding: 'utf8' });
  assert.match(txt, /does not verify either/);
  const readme = fs.readFileSync(path.join(__dirname, 'validation', 'third-party-tables', 'PROVENANCE.md'), 'utf8');
  assert.match(readme, /secondary/i); assert.match(readme, /not authoritative/i);
});

test('the atmosphere finding is labeled a hypothesis and neither atmosphere is declared correct', () => {
  for (const f of ['docs/MODEL_SOURCES.md', 'docs/VALIDATION_REPORT.md', 'docs/STAGE5_COMPLETION.md']) {
    const t = fs.readFileSync(path.join(root, f), 'utf8');
    assert.match(t, /hypothesis/i, f);
    assert.doesNotMatch(t, /offset (is|was) explained by|the offset is now explained/i, f);
  }
  assert.match(refs.atmosphereNote, /neither is selected/i);
});

test('the second-dataset and G-table criteria stay open until the evidence exists', () => {
  const c = fs.readFileSync(path.join(root, 'docs', 'STAGE5_COMPLETION.md'), 'utf8');
  for (const k of ['A second, different manufacturer', 'The origin of the G1 and G7 tables', 'The steady offset']) {
    assert.match(c, new RegExp('- \\[ \\] ' + k), k + ' must stay open');
  }
});

// ---- Round of 2026-11-16 (21:15): audit, owner check sheet, atmosphere sourcing ----
test('the formula audit runs, its tolerances are fixed, and its failures are reported not hidden', () => {
  const out = JSON.parse(execFileSync('node', [path.join(root, 'tests', 'tools', 'formula-audit.js'), '--json'], { encoding: 'utf8' }));
  const by = Object.fromEntries(out.map(x => [x.id, x]));
  assert.strictEqual(by['ATM-RHO'].tol, 0.001); assert.strictEqual(by['ATM-SOS'].tol, 0.001);
  assert.ok(by['ATM-RHO'].pass && by['ATM-SOS'].pass);
  for (const k of Object.keys(by).filter(k => k.startsWith('MILLER-'))) assert.ok(by[k].pass, k);
  assert.ok(by['COR-H-HEMISPHERES'].pass && by['COR-V-EAST-WEST'].pass && by['COR-V-NORTH'].pass);
  // The magnitude rows are reported with their pass flag. If they are OUTSIDE, MODEL_SOURCES must say so.
  const src = fs.readFileSync(path.join(root, 'docs', 'MODEL_SOURCES.md'), 'utf8');
  for (const id of ['SPIN-1000', 'COR-H-1000']) if (!by[id].pass) assert.match(src, /OUTSIDE/);
});

test('the audit does not turn any formula into Verified', () => {
  const src = fs.readFileSync(path.join(root, 'docs', 'MODEL_SOURCES.md'), 'utf8');
  for (const row of src.split('\n').filter(l => /^\| (Spin drift|Stability factor|Coriolis|Atmosphere:)/.test(l))) assert.ok(!/\*\*Verified\*\*/.test(row), row);
});

test('the owner check sheet lists every dataset and every entry, and says it has not been done', () => {
  const sheet = fs.readFileSync(path.join(root, 'docs', 'OWNER_CHECK_REFERENCE_DATA.md'), 'utf8');
  assert.match(sheet, /NOT DONE/);
  assert.match(sheet, /HORNADY-LE|Hornady LE 6\.5/);
  for (const d of refs.datasets) {
    assert.ok(sheet.includes(d.id), d.id + ' missing from the sheet');
    for (const [r, w] of Object.entries(d.rows)) if (w.v !== null) assert.ok(sheet.includes(r + ' yd velocity') && sheet.includes(w.v + ' fps'), d.id + ' ' + r);
  }
  assert.match(sheet, /leave the recorded value alone/);
  const c = fs.readFileSync(path.join(root, 'docs', 'STAGE5_COMPLETION.md'), 'utf8');
  assert.match(c, /- \[ \] The project owner checked every Federal and Hornady reference entry/);
  assert.match(c, /265 of 266/);
});

test('the Aberdeen question is documented with temperature, pressure, humidity, and what is not confirmed', () => {
  const src = fs.readFileSync(path.join(root, 'docs', 'MODEL_SOURCES.md'), 'utf8');
  assert.match(src, /Aberdeen atmosphere question/);
  for (const k of ['59 F', '29.53 inHg', '78%', '29.92 inHg']) assert.ok(src.includes(k), k);
  assert.match(src, /No source opened says Hornady computed/);
  assert.match(src, /primary, pre-registered run/);
});

test('the primary ICAO comparison is unchanged by this round', () => {
  const out = JSON.parse(execFileSync('node', [path.join(root, 'tests', 'tools', 'run-validation.js'), '--json'], { encoding: 'utf8' }));
  const traj = out.filter(x => x.kind === 'trajectory');
  assert.strictEqual(traj.length, 5);
  assert.deepStrictEqual(traj.map(x => x.vOurs), [2550.7, 2406.3, 2266.6, 2131.4, 2000.9]);
  assert.ok(traj.every(x => x.vPass && x.dropPass));
});

// ---- Documentation corrections (21:29): summary, criterion parts, qualifications ----
test('the opening summary and the three achievements read the same in every document', () => {
  const docs = ['docs/MODEL_SOURCES.md', 'docs/VALIDATION_REPORT.md', 'docs/STAGE5_COMPLETION.md'].map(f => [f, fs.readFileSync(path.join(root, f), 'utf8')]);
  for (const [f, t] of docs) {
    assert.match(t, /Reference agreement is partly demonstrated across several manufacturer datasets, but remains incomplete/, f);
    assert.match(t, /100 of 103 comparisons pass\. The three misses occur under ICAO conditions/, f);
    assert.match(t, /None of this establishes physical accuracy\./, f);
    assert.match(t, /Partial, with unresolved source and transcription checks/, f);
    assert.match(t, /NOT DEMONSTRATED|Not demonstrated/, f);
    assert.doesNotMatch(t, /One bullet agrees with one manufacturer table|two drag-table points agree/i, f);
  }
});

test('the second-manufacturer criterion separates registered, checked and reproduced, and is not marked complete', () => {
  const c = fs.readFileSync(path.join(root, 'docs', 'STAGE5_COMPLETION.md'), 'utf8');
  const line = c.split('\n').find(l => l.includes('A second, different manufacturer data set'));
  assert.ok(line.startsWith('- [ ]'));
  assert.match(line, /dataset registered and calculations run: done/);
  assert.match(line, /every source entry checked against the original manufacturer page: OPEN/);
  assert.match(line, /independent reproduction: not performed/);
  assert.match(line, /not independently verified/);
  assert.match(c, /Criteria: 1 complete, 1 waived, 6 open\./);
  assert.match(c, /\*\*Stage 5 status: NOT COMPLETE\*\*/);
});

test('the G-table comparison and the Aberdeen statements carry their qualifications', () => {
  const GQ = 'It establishes consistency between the copies, not the provenance or accuracy of the tables. Neither table is Verified.';
  for (const f of ['docs/MODEL_SOURCES.md', 'docs/VALIDATION_REPORT.md', 'docs/STAGE5_COMPLETION.md']) {
    const t = fs.readFileSync(path.join(root, f), 'utf8');
    assert.ok(t.includes(GQ), f + ' lacks the G-table qualification');
    assert.match(t, /Neither (Hornady )?statement proves/, f);
    assert.match(t, /Aberdeen is not selected|Aberdeen is not selected as correct/, f);
  }
});

// ---- Comparison counts (21:36): the documented breakdown must equal the runner's output ----
test('the documented 100 of 103 breakdown equals what the runner produces, and every failure is listed', () => {
  const out = runJson();
  const ok = (x) => x.kind === 'trajectory' ? x.vPass && x.dropPass : x.pass;
  const counted = out.filter(x => ['table', 'trajectory', 'dataset'].includes(x.kind));
  const by = (f) => { const g = counted.filter(f); return [g.length, g.filter(ok).length]; };
  // Round 1 is pinned separately so the original 103 / 100 stays reproducible after round 2 was registered.
  const r1 = (x) => x.kind !== 'dataset' || x.round === 1;
  const by1 = (f) => by(x => r1(x) && f(x));
  assert.deepStrictEqual(by1(() => true), [103, 100]);
  assert.deepStrictEqual(by1(x => x.kind === 'table'), [2, 2]);
  assert.deepStrictEqual(by1(x => x.kind === 'trajectory'), [5, 5]);
  assert.deepStrictEqual(by1(x => x.kind === 'dataset' && x.atmosphere === 'ICAO'), [38, 35]);
  assert.deepStrictEqual(by1(x => x.kind === 'dataset' && x.atmosphere === 'HORNADY_ABERDEEN'), [38, 38]);
  assert.deepStrictEqual(by1(x => x.kind === 'dataset' && x.atmosphere === 'STATED_CONDITIONS'), [20, 20]);
  // Round 2 (registered 2026-11-16 after round 1) and the overall total.
  const by2 = (f) => by(x => x.kind === 'dataset' && x.round === 2 && f(x));
  assert.deepStrictEqual(by2(() => true), [108, 101]);
  assert.deepStrictEqual(by2(x => x.atmosphere === 'ICAO'), [54, 49]);
  assert.deepStrictEqual(by2(x => x.atmosphere === 'HORNADY_ABERDEEN'), [54, 52]);
  assert.deepStrictEqual(by(() => true), [211, 201]);
  const sens = out.filter(x => x.kind === 'sensitivity');
  assert.strictEqual(sens.length, 5); assert.ok(sens.every(x => x.pass));
  const failed = counted.filter(x => !ok(x)).map(x => x.id + ' ' + x.atmosphere + ' ' + x.range);
  assert.deepStrictEqual(failed.filter(f => !f.startsWith('FEDERAL-GM308M-168-G7')), ['HORNADY-ROUNDNOSE-180-G1-0.241 ICAO 400', 'HORNADY-ROUNDNOSE-180-G1-0.241 ICAO 500', 'HORNADY-CORR-TEST3 ICAO 500']);
  assert.deepStrictEqual(failed.filter(f => f.startsWith('FEDERAL-GM308M-168-G7')), [
    'FEDERAL-GM308M-168-G7-AVG ICAO 300', 'FEDERAL-GM308M-168-G7-AVG ICAO 400', 'FEDERAL-GM308M-168-G7-AVG ICAO 500',
    'FEDERAL-GM308M-168-G7-AVG HORNADY_ABERDEEN 400', 'FEDERAL-GM308M-168-G7-AVG HORNADY_ABERDEEN 500',
    'FEDERAL-GM308M-168-G7-LONG ICAO 400', 'FEDERAL-GM308M-168-G7-LONG ICAO 500']);
  const rep = fs.readFileSync(path.join(root, 'docs', 'VALIDATION_REPORT.md'), 'utf8');
  assert.match(rep, /\| Datasets, ICAO \| 38 \| 35 \| 3 \|/);
  assert.match(rep, /\| Datasets, Aberdeen \| 38 \| 38 \| 0 \|/);
  assert.match(rep, /\| Datasets, printed conditions[^|]*\| 20 \| 20 \| 0 \|/);
  for (const f of ['docs/MODEL_SOURCES.md', 'docs/VALIDATION_REPORT.md', 'docs/STAGE5_COMPLETION.md']) assert.match(fs.readFileSync(path.join(root, f), 'utf8'), /The 103 is a total, not a per-atmosphere figure/, f);
});

test('Federal is not called verified, and its criterion parts are stated', () => {
  const c = fs.readFileSync(path.join(root, 'docs', 'STAGE5_COMPLETION.md'), 'utf8');
  const line = c.split('\n').find(l => l.includes('A second, different manufacturer data set'));
  assert.match(line, /Federal/); assert.match(line, /not independently verified/); assert.match(line, /independent reproduction: not performed/);
  assert.ok(line.startsWith('- [ ]'));
  for (const f of ['docs/MODEL_SOURCES.md', 'docs/VALIDATION_REPORT.md', 'docs/STAGE5_COMPLETION.md', 'docs/OWNER_CHECK_REFERENCE_DATA.md']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, f), 'utf8'), /Federal[^.\n]{0,60}(is|are|was) (independently )?verified/i, f);
  }
});

// ---- Round 2, source audit, measured-data, and no-engine-change guards (2026-11-16) ----
const runTool = (f, ...a) => execFileSync('node', [path.join(root, 'tests', 'tools', f), ...a], { encoding: 'utf8', maxBuffer: 1 << 26 });

test('reference-data audit: 265 of 266 cells agree and the retailer BC mismatch is recorded', () => {
  const out = runTool('audit-reference-data.js');
  assert.match(out, /265 of 266/);
  assert.match(out, /\.286/);
});

test('measured Doppler comparison is labelled MEASURED, drag-only, and not a physical-accuracy claim', () => {
  const m = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'validation', 'measured-doppler.json'), 'utf8'));
  assert.ok(m.classification.startsWith('MEASURED'));
  const out = runTool('compare-measured.js');
  assert.match(out, /21 of 26 within/);
  assert.match(out, /does not establish physical accuracy/);
});

test('engine inputs are unchanged relative to the Stage 5 base commit', () => {
  const diff = execFileSync('git', ['diff', '--stat', '9f37df7', '--', 'index.html', 'tests/golden', 'tests/helpers', 'tests/solver.test.js'], { cwd: root, encoding: 'utf8' });
  assert.strictEqual(diff.trim(), '');
  const refs = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'validation', 'references.json'), 'utf8'));
  assert.deepStrictEqual(refs.tolerances, JSON.parse(execFileSync('git', ['show', '9f37df7:tests/validation/references.json'], { cwd: root, encoding: 'utf8' })).tolerances);
});

test('close-out round: the 10 failures are classified, diagnostic is reproducible, criteria status stays honest', () => {
  const dg = JSON.parse(runTool('diagnose-failures.js', '--json'));
  assert.strictEqual(dg.out.length, 10);
  assert.strictEqual(dg.out.filter(x => x.id.startsWith('FEDERAL-GM308M-168-G7')).length, 7);
  const g1 = dg.cross.find(c => c.atmosphere === 'HORNADY_ABERDEEN');
  assert.ok(Math.abs(g1.fittedG1BC - 0.4615) < 0.001);
  assert.ok(g1.residualVelocityPct.every(r => Math.abs(r) <= 0.05));
  const fa = JSON.parse(runTool('formula-audit.js', '--json'));
  for (const id of ['COR-H-INTEGRAL', 'SPIN-FORMULA', 'SPIN-AB-LIMIT', 'ATM-PV', 'ATM-VAPOUR-CONC']) assert.ok(fa.find(x => x.id === id && x.pass), id);
  const c = fs.readFileSync(path.join(root, 'docs', 'STAGE5_COMPLETION.md'), 'utf8');
  assert.match(c, /\*\*Stage 5 status: NOT COMPLETE\*\*/);
  assert.match(c, /Physical accuracy: NOT DEMONSTRATED/);
  const vr = fs.readFileSync(path.join(root, 'docs', 'VALIDATION_REPORT.md'), 'utf8');
  assert.match(vr, /3 consistent with the atmosphere hypothesis \(a supported hypothesis, not a confirmed explanation\)/); assert.match(vr, /0 attributed to a calculation error/);
});

test('Federal .308 comparison: the G1 sets use G1 and .462, the G7 .224 sets stay registered and counted, nothing was changed', () => {
  const g1 = refs.datasets.filter(d => /^FEDERAL-GM308M-168-G1/.test(d.id));
  assert.strictEqual(g1.length, 2);
  for (const d of g1) { assert.strictEqual(d.model, 'G1'); assert.strictEqual(d.bc, 0.462); assert.strictEqual(d.registeredRound, 2); }
  const g7 = refs.datasets.filter(d => /^FEDERAL-GM308M-168-G7/.test(d.id));
  assert.strictEqual(g7.length, 2); for (const d of g7) assert.strictEqual(d.bc, 0.224);
  const out = runJson().filter(x => x.kind === 'dataset' && /^FEDERAL-GM308M-168-G1/.test(x.id));
  assert.strictEqual(out.length, 24); assert.ok(out.every(x => x.pass));
  const vr = fs.readFileSync(path.join(root, 'docs', 'VALIDATION_REPORT.md'), 'utf8');
  assert.match(vr, /Federal does not label \.462 as G1 or G7/); assert.match(vr, /It was \*\*not fitted\*\*/);
  assert.match(vr, /Nothing was removed or reclassified/);
});

test('close-out record keeps the status NOT COMPLETE, labels the hypothesis, and proposes (does not apply) a waiver', () => {
  const c = fs.readFileSync(path.join(root, 'docs', 'STAGE5_CLOSEOUT.md'), 'utf8');
  assert.match(c, /\*\*NOT COMPLETE\*\*/); assert.match(c, /1 complete, 1 waived, 6 open/);
  assert.match(c, /supported hypothesis, not a confirmed explanation/);
  assert.match(c, /Proposed waiver wording[^\n]*not in effect/);
  assert.match(c, /Physical accuracy: \*\*NOT DEMONSTRATED\*\*/);
  assert.match(c, /does not require checking any data/);
  assert.doesNotMatch(c, /trajectory accuracy (is|was) (shown|demonstrated)/i);
});

test('frozen inputs: tolerances, table points, atmospheres and every round 1 data set value equal the base commit', () => {
  const base = JSON.parse(execFileSync('git', ['show', '9f37df7:tests/validation/references.json'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 }));
  assert.deepStrictEqual(refs.tolerances, base.tolerances);
  assert.deepStrictEqual(refs.tablePoints, base.tablePoints);
  assert.deepStrictEqual(refs.atmospheres, base.atmospheres);
  assert.deepStrictEqual(refs.trajectoryCases, base.trajectoryCases);
  for (const d of base.datasets) { const n = { ...refs.datasets.find(x => x.id === d.id) }; delete n.registeredRound; assert.deepStrictEqual(n, d, d.id); }
});
