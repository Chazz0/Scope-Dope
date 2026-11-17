# Stage 15: scope-adjustment module (standalone)

> **Corrected by the final audit (`STAGE15_FINAL_AUDIT.md`).** The first version of this report said Applied Ballistics documents no click value or separate elevation and windage settings, and did not define shooter MOA. Both were wrong: the 2018 AB Mobile guide lists separate Elevation and Windage Turret Grad, Unit and Correction Factor fields, and the Analytics manual defines IPHY as inches per hundred yards. The audit also corrects the section title and page numbers. Where this report and the audit differ, the audit is right.

**Physical accuracy: NOT DEMONSTRATED.** This module does unit and turret arithmetic on a correction someone else calculated. It does not calculate a trajectory and says nothing about whether any ballistic correction is right. It is **not connected** to the app: no screen, saved rifle, default or calculation uses it.

Files: `lib/scope-adjust.js` (module), `tests/scope-adjust.test.js` (tests), this report. Nothing else changed. `index.html`, the solver, BC and velocity code, reference data and baselines are byte-identical to `main` (a test enforces it).

## Sources studied

1. Applied Ballistics, *AB Quantum User Manual* (appliedballisticsllc.com, 2024), section 9.0 "Sight Scale Factor", p. 25, and section 5.1 (Profile Edit).
2. Applied Ballistics, *Analytics User Manual* (Build 068), sections 3.2.4, 4.3 and 7.0.
3. Garmin, *Applied Ballistics Glossary of Terms* (Foretrex 601/701 manual; Applied Ballistics features inside a Garmin product, so a secondary source).

The Leica glossary page could not be fetched, so it was not used. The manuals were read through a page-summarizing reader, not opened directly, so the page and section references are the reader's. Check them against the documents before relying on them.

## What the documents say, and what the module does with it

| Topic | Applied Ballistics documentation | Module |
|---|---|---|
| Tracking factor definition | Quantum 2024 s9.0 "Determining Sight Scale Factor (Tall Target Testing)", p. 25: CF = expected POI shift / actual POI shift; the raw elevation prediction is multiplied by CF. Worked example: 102 yd, 30 MOA dialed, 29.8 in actual, expected 32.04 in, CF about 1.075, 30 MOA is dialed as 32.25 MOA. Analytics s3.2.4 "Advanced Settings", p. 12: dialed / measured movement (30 / 29 = 1.035), and the program "will scale the calculated drop by this correction factor". | Same. CF = expected shift / actual shift; the calculated correction is **multiplied** by CF. Both worked examples are reproduced by tests. |
| Garmin "Sight Scale Factor" | Garmin glossary: a linear multiplier, actual / expected (turret 10 mil, impact 9 mil gives 0.9). This is the **reciprocal** of the Quantum CF. | **Not used.** The field is named `trackingCorrectionFactor`. A test shows 0.9 is treated as a CF of 0.9 (dial less), never as an SSF. Entering a Garmin value here would give a wrong dial. |
| Test procedure | 100 yd or m vertical target, zero, dial at least 30 MOA or 10 MIL, measure the shift. Constants (inches per unit per yd or m): yd/MOA 0.01047, yd/MIL 0.03599, m/MOA 0.01145, m/MIL 0.03936. Expected = dialed x range x constant. | Implemented as `trackingCorrectionFactorFromTest`. Rejects a dial below 30 MOA or 10 MIL. The constants are used as published; they agree with exact geometry to 0.1% (0.03599 versus 0.036 for MIL in yards is a 0.03% difference). |
| MIL, true MOA, shooter MOA | Analytics 7.0: output can be MILS, MOA (True MOA) or IPHY, "Shooters MOA". | Three exact units: `MIL`, `TRUE_MOA`, `SHOOTER_MOA`. The bare word "MOA" is rejected as ambiguous. |
| Windage factor | Analytics mentions the factor scaling **drop** only. Garmin lists separate elevation and windage factors. | Each axis has its own factor, required explicitly. Applying one to windage goes beyond the Analytics text. |

## Not documented by Applied Ballistics (module's own rules)

These are not taken from Applied Ballistics. Nothing in the documents I could read covers them.

- **Click value / turret graduation:** The Quantum and Analytics manuals do not cover it. The 2018 AB Mobile guide lists separate elevation and windage turret graduations but no allowed range. The module takes a click value per axis, required, with no default, limit 0 < click <= 10 units.
- **Rounding:** Not stated. The module rounds to the nearest whole click, halves away from zero, and also reports the exact click count, the amount actually dialed, and the remainder.
- **Valid ranges:** No valid range for a CF or click value is stated. The module accepts a CF from 0.5 to 2.0 and rejects anything else, so a typo cannot silently produce a large dial.
- **Definitions of the units:** The documents define shooter MOA as IPHY, inches per hundred yards. They name true MOA and MIL without defining them, so the module uses the standard definitions: true MOA = 1/60 degree, MIL = 1/1000 radian.
- **Shooter MOA in the tracking test:** The published constants cover MOA and MIL only, so the test function rejects `SHOOTER_MOA`.
- **How Applied Ballistics converts between MIL, MOA and IPHY internally:** not documented. The module uses exact angles.

## Architecture

```
ballistic solver (unchanged)  ->  ballisticCorrection(value, unit)   "calculated, in an exact unit"
                                          |
turret settings (required) ------>  adjustAxis / scopeAdjustment    "scope adjustment"
  per axis: unit, clickValue, trackingCorrectionFactor
                                          |
                          { kind:'scope-adjustment', calculated, corrected = calculated x CF,
                            clicksExact, clicks, dialed, remainder }
```

- A ballistic correction is a frozen object tagged `ballistic-correction`. The scope result is tagged `scope-adjustment` and carries the untouched calculated value beside the corrected one, so the two cannot be confused.
- A correction whose unit differs from the turret's unit is an error. Converting is a separate, explicit call (`convertAngle`).
- Every setting is required. Missing, null, empty, non-numeric, non-finite, out-of-range and wrongly typed values are rejected, all problems are reported together, and no default is substituted. A CF of 1 is accepted only when passed.

## Affected parts of the existing app and conflicts (nothing changed; for the later wiring decision)

- **Solver:** no conflict. It outputs the angle in two forms (`elevMoa` with the true-MOA factor 3437.7468 and `elevMil`). Those are exactly `TRUE_MOA` and `MIL` inputs to this module. The solver has no shooter-MOA output and will not get one.
- **"Scope click value" dropdown** (one list for elevation and windage; 1/8, 1/4, 1/2 MOA and 0.1 MRAD): conflicts with separate elevation and windage settings, and its "MOA" is true MOA only.
- **Default:** `profileDefaults` and `applyProfile` silently supply `MOA:0.25` for a missing click, which conflicts with "never silently substitute defaults". The module does not do this; the app currently does.
- **Saved rifles:** the `click` field is a single string. Separate settings need new fields and a migration that asks the user, not fills in a value.
- **HUD, range card, CSV, Chart:** `clicksFor` rounds with plain `Math.round` (half toward positive infinity for negatives), which differs from this module's half-away-from-zero rule for exact halves of negative values; labels use "MOA" or "mil" without saying true or shooter.
- **Fit tool:** takes "up needed (MOA)" with no unit distinction.
- **Tracking factor:** the app has no scale-factor setting.

## Tests

`tests/scope-adjust.test.js`: unit definitions and round trips, ambiguity rejection, both Applied Ballistics worked examples, test constants, turret graduations, independent elevation and windage, CF multiplication and the rejection of the Garmin convention, no mutation, no implicit unit mixing (all pairings), every required field removed on each axis, a matrix of invalid values, and guards that the app and calculation files are unchanged.

## Limits

Interpretation of the manuals comes from a summarizing reader, not a direct read. A real scope was not tested. No measured tracking data was used. Nothing here shows any ballistic correction is accurate.
