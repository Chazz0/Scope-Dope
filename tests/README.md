# Scope Dope tests (Stage 1 baseline, Stage 2 data protection)

These tests record how the app behaves. They do not change the app.
Passing them means "the behavior is what was documented", not "the app is accurate".

**Stage 2 update:** the four storage `[known gap]` checks (no backup, damaged data overwritten, silent save
failure, read failure) were replaced by checks of the fixed behavior, and tests for the schema number,
backups, damaged-data copies and export/import were added to `tests/browser/storage.check.js`.
The solver tests and golden baseline are unchanged.

**Stage 3 update:** the five input `[known gap]` checks in `tests/browser/inputs.check.js` (silent default for a blank
coefficient, distance below the minimum calculated as 10 yd, silent coefficient rescale, wind field/slider mismatch,
silent preset overwrite) were replaced by 15 checks of the fixed behavior. No `[known gap]` checks remain.

**Stage 4:** the moving-target (lead) code was removed. Golden case K and the two lead fields were removed from
`tests/golden/` by deleting keys only (no number regenerated). `tests/tools/compare-solvers.js` replays random valid inputs
through the old and new solver and compares every field bit for bit (`OLD_REF=<git ref> node tests/tools/compare-solvers.js`).

**Stage 3 follow-up:** `tests/browser/inputs.check.js` now has 26 checks (added: opening or viewing a rifle never changes a
saved weight or coefficient; blank coefficient is left alone when the weight changes; Chart tab From/To/Every are validated
like every other field). Two read-only analysis tools were added in `tests/tools/`: `coefficient-exposure.js` (replays the
old per-keystroke arithmetic) and `check-coefficients.js` (lists saved rifles worth a second look; never writes).

**Stage 5 validation tools** (`tests/tools/`): `run-validation.js` (published tables; ICAO, Aberdeen and printed-conditions runs), `compare-g-tables.js`
(79 G1 and 83 G7 points against a secondary copy), `formula-audit.js` (atmosphere, Miller, spin drift, Coriolis against opened
sources), `make-owner-check-sheet.js` (writes `docs/OWNER_CHECK_REFERENCE_DATA.md`). All read-only. None changes the engine.

## Run

```
node --test tests/solver.test.js          # calculation engine, no extra packages (Node 20 or newer)
node tests/browser/storage.check.js       # saved data, needs Playwright + Chromium
node tests/browser/inputs.check.js        # how the page treats inputs, needs Playwright + Chromium
node tests/browser/layout.check.js        # phone-width layout and 16px input font check, needs Playwright + Chromium
node tests/browser/upgrade.check.js       # data saved by the live app (git main) loads unchanged in this code, needs git + Playwright
```

The engine tests read the code between `SOLVER_START` and `SOLVER_END` in `index.html`, so they test
exactly what the app runs. Set `SCOPE_DOPE_FILE=/path/to/other.html` to test a different copy.

## What the labels mean

- **No label**: behavior that should stay true (unit conversions, directions, stability, atmosphere).
- **[known gap]**: the audit flagged this behavior as weak. The test passes today because it records the
  weakness. When the weakness is fixed on purpose, the test is replaced in the same stage.
- **regression**: compares against `golden/baseline.json`, generated from the baseline engine. Regenerate it
  only on purpose with `node tests/tools/make-golden.js`, after a reviewed calculation change.
- **cross-check**: compares with a second integrator written for the tests (`helpers/independent-rk4.js`).
  It shares the engine's drag tables and atmosphere, so it checks the integration method and angled-shot
  geometry only. It is **not** independent validation.
- **external point check**: one published Hornady table. Limited evidence, see the Stage 1 report.

## Baseline

The code at tag `baseline-before-accuracy-work` is the state before any accuracy work.

## Stage 5: accuracy verification (in progress)

- `tests/model-version.test.js` ties `MODEL_VERSION`, `tests/golden/baseline.json` and `docs/MODEL_CHANGELOG.md` together.
- `tests/validation/references.json` holds every published reference number, its source URL and the tolerances.
  The tolerances were written before the comparison was run. Do not change them to make a case pass.
- `node tests/tools/run-validation.js` prints every comparison against that data, including the ones that differ.
- `tests/validation.test.js` guards the evidence files and the Tested / Verified / Unverified labels in `docs/MODEL_SOURCES.md`.

None of these show that the ballistics are accurate. See `docs/VALIDATION_REPORT.md` for what was and was not compared.

**Stage 6 update:** `tests/assess.test.js` and `tests/browser/transparency.check.js` cover the advisory transparency panel (see `docs/STAGE6_TRANSPARENCY.md`). They also pin that the calculation block is unchanged.
