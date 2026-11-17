# Stage 16: scope-adjustment integration

**Physical accuracy: NOT DEMONSTRATED.** This stage changes how a calculated correction is turned into scope clicks and how scope settings are stored. It does not change any trajectory calculation, and nothing here shows a calculated correction is right.

Branch `stage-16-scope-integration` (from `stage-15-scope-adjustment-module`). Not merged, not deployed.

## Owner decisions applied

1. **Windage factor:** a separate, labelled "Windage correction factor" field is kept, and exactly 1.000 is required (the field's min and max are both 1; the module rejects any other value). The elevation factor is never applied to windage. No non-neutral windage factor is possible until a horizontal tracking test is designed and validated.
2. **Click value:** the upper limit of 10 is kept; zero, negative, missing and invalid values are rejected. The screen and the module both describe the limit as an **application validation limit, not an Applied Ballistics or manufacturer specification**.

## What changed in the app

| Area | Before | Now |
|---|---|---|
| Scope settings | One "Scope click value" list for both knobs (1/8, 1/4, 1/2 MOA, 0.1 MRAD), default 1/4 MOA | Separate **elevation** and **windage** settings: unit (MIL, true MOA, shooter MOA), click value, and a correction factor. Elevation factor labelled "Applied Ballistics Tracking Correction Factor". All six start **empty** |
| Defaults | New rifles and rifles missing the field silently got 1/4 MOA | No default anywhere. `profileDefaults` leaves all scope fields empty |
| Rifle with missing or invalid settings | n/a | Marked "(scope not set)" in both rifle lists, flagged on the Rifle tab with the exact fields missing, and shows **no clicks** |
| HUD (complete) | Big number was the calculated angle; "N clicks" below | Big number is the **scope adjustment** (calculated x factor, in the scope unit). Below: "N clicks · calculated X mil" and "x tracking F" when F is not 1 |
| HUD (incomplete) | n/a | Big numbers show "—" and "Set scope". Below: "Calculated X mil, Y true MOA". A notice says the calculated values are not scope adjustments |
| Range card | Columns Up MOA, Up mil, Up clicks, Wind MOA, Wind clicks | **Calc** columns (calculated, from the solver): Calc up mil, Calc up true MOA, Calc wind mil, Calc wind true MOA. **Dial** and click columns only when the scope is complete: Dial up (unit), Up clicks, Dial wind (unit), Wind clicks |
| CSV | Click size line | Scope line stating units, click values and factors, or "scope settings not set"; says Calc columns are calculated and Dial columns are scope adjustments |
| Fit tool | "Up needed (MOA)" | "Up needed (true MOA)" so it is not read as shooter MOA |

The module is embedded in `index.html` between `/*SCOPE_START*/` and `/*SCOPE_END*/`, unchanged from `lib/scope-adjust.js`; a test checks the copy is byte-for-byte the library file.

## Ballistic solver: unchanged

`/*SOLVER_START*/` to `/*SOLVER_END*/` is byte-identical to `main` (Node test), as are the assessment block, reference data, tolerances, golden baseline and test helpers. The model version is still 1.0.0.

The app's calculated corrections are the same as before: a browser test loads the previous release (`main`) and this version with the same rifle and compares the calculated true MOA and mil for elevation and windage at 300, 600 and 1000 yd; they are equal. A second browser test compares the HUD numbers and the physical range-card columns for a low-stability load against the approved Stage 9 page; they are equal.

## Migration behaviour

**There is no silent migration. Saved rifles are not changed, and nothing is migrated without your pressing a button.**

- A rifle saved with the old single click value keeps that value **exactly as saved**, in a hidden field, and it is written back unchanged on every save.
- The six new fields are filled with empty strings for that rifle. No unit, click value or factor is derived from the old value. The rifle is marked "(scope not set)" and shows no clicks.
- The Rifle tab states: "This rifle was saved with one click setting (0.25 MOA, true MOA). It has not been applied."
- **Explicit button only.** A button "Fill the units and click values from the old setting" appears for such a rifle. When you press it, it sets both units and both click values (old MOA is treated as true MOA because the old app used the true-MOA conversion; MRAD becomes MIL). It leaves **both correction factors empty**, so the rifle stays incomplete until you enter them yourself. A Node test checks that no load, profile or save path calls the conversion and that the button never fills a factor.
- Existing data is preserved: the upgrade test (old app writes a store, new app loads, views, switches and reloads every rifle) passes, with one disclosed relaxation: the six new fields may appear as empty strings. Any other change, or any non-empty new value, still fails.
- Stored backups, import and export carry the new fields; old backup codes import as incomplete rifles.

## Rounding

Clicks round to the nearest whole click, halves **away from zero** (application decision, documented in Stage 15). The previous screens used `Math.round`, which differs only on exact negative halves (for example -2.5 clicks was -2, now -3).

## Tests

- Node: `tests/stage16.test.js` (8 tests: solver and data unchanged, embedded module equals library, defaults removed, no migration path, windage and limit text, labelling, report) plus the updated Stage 15 module tests.
- Browser: `tests/browser/stage16.check.js` (17 checks): no defaults, incomplete HUD and range card, complete HUD and range card with dial = calculated x factor, separate elevation and windage settings, shooter MOA distinct, windage factor must be exactly 1, every missing or invalid field named and blocking clicks, limit text, legacy rifle preserved byte-for-byte, legacy button behaviour, several rifles, trajectory parity with the previous release, layout at 320, 390 and 768 px.
- Earlier tests changed, because the app no longer has a 1/4 MOA default (all disclosed in the commit):
  - The older browser suites (inputs, layout, stage9, stage9-1, stage12-1, step7, transparency) now enter equivalent scope settings explicitly (1/4 true MOA, factors 1.000) at the start, through `tests/browser/helpers/scope-setup.js`, and their seeded rifles carry the explicit fields. Their assertions are unchanged except:
  - inputs: expected range-card column names updated.
  - stage9-1: the old-versus-new comparison now compares HUD numbers and the physical and calculated range-card columns (the layouts differ).
  - storage: rifle names in the list now include "(scope not set)" for rifles created without scope settings.
  - upgrade: allows the six new empty fields (above).
  - Stage 15 module tests: the Stage 15 "index.html is byte-identical to main" test now compares the solver block and data files, and the "app does not mention the module" test was replaced.

## Limits and open items

- Scope settings are per rifle and entered by hand; the app does not check them against a real scope.
- The correction factor is applied to elevation and windage as the owner decided (windage fixed at 1.000). A windage tracking test is not designed.
- The rounding difference on negative halves is new behaviour.
- A rifle with incomplete scope settings shows no clicks: that is intended, and it changes what a first-time user sees until they enter their scope.
- The Stage 15 provenance labels still apply: the factor bounds (0.5 to 2), the click limit, the rounding and the no-default rule are application decisions, not Applied Ballistics specifications.
