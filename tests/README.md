# Scope Dope tests (Stage 1 baseline)

These tests record how the app behaves **today**. They do not change the app.
Passing them means "the behavior is what it was at the baseline", not "the app is accurate".

## Run

```
node --test tests/solver.test.js          # calculation engine, no extra packages (Node 20 or newer)
node tests/browser/storage.check.js       # saved data, needs Playwright + Chromium
node tests/browser/inputs.check.js        # how the page treats inputs, needs Playwright + Chromium
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
