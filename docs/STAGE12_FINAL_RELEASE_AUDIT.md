# Stage 12: Final Release Audit and Documentation

Branch `stage-12-final-release-audit`, from the approved Stage 11 commit `ba0594c252a49df1fe552a5f3f98529d38a70af8`. Model version: **1.0.0**. Physical accuracy remains **NOT DEMONSTRATED**. A passing software audit does not establish real-world ballistic accuracy.

**Recommendation: READY FOR PRELIMINARY RELEASE**, on the conditions in section 8: it is presented only as an unvalidated estimate, with the disclosures now in the interface and the release notes, and the open Coriolis discrepancy is accepted as a known limitation. This is a statement about software behaviour and honest labelling. It is not a statement about ballistic accuracy. Nothing was merged, published or deployed.

## 1. Software audit

Method: a new browser audit, `tests/browser/stage12-audit.check.js` (41 checks), plus the 132 existing browser checks (173 in total), driven in Chromium against `index.html`.

| Area | What was checked | Result |
|---|---|---|
| Invalid input | For all 16 numeric fields with limits (distance, wind, BC, weight, diameter, muzzle velocity, zero, sight height, twist, temperature, altitude, pressure, humidity, latitude, temperature reference, velocity change): a value just below and just above the limit, and blank where blank is not allowed | Every case shows no dial value, a "Fix the highlighted fields" message naming the field and its allowed range, no page error |
| Boundary input | Each limit value itself | Always a finite result or a clear message; no NaN, Infinity or undefined appears anywhere on screen |
| Blank optional fields | Station pressure blank (estimated from altitude) and latitude blank (Coriolis off) | Treated as valid choices, and a notice says what was assumed |
| Chart tool | Reversed, too small, too large and zero-step ranges | The range card is cleared and a message names the problem (checked after the app's 120 ms redraw delay) |
| True-to-impact tool | Empty, zero, negative, out-of-range distance and MOA | A message is shown and the loaded muzzle velocity and BC are not changed |
| Typed values | A typed muzzle velocity (2712) and BC (0.4731), then add a rifle, switch away and back, reload | Unchanged each time; no silent overwrite |
| Profiles | Create, rename, delete, switch, last-rifle and last-profile protection, reload, backup export and import, damaged and newer-schema data, storage failures | All 27 existing storage checks pass |
| Markup in names | A rifle name containing an `<img onerror>` tag | Shown as plain text; no script ran; no element injected |
| Layout | Phone 320 and 390 px wide, tablet 768 px, desktop 1280 px, all three tabs | No horizontal scroll; tab controls at least 40 px; no page errors |
| Existing layout, input and step checks | 9 + 27 + 20 checks | All pass |

Result: **no crash, broken control, data-loss path or plausible-looking result for invalid input was found.**

Behaviours noted, none treated as release blockers:

1. Typed values are saved as typed even when invalid, and the error then stays on screen after a reload. This is deliberate (no silent rewrite) and is documented in the release notes.
2. A preset-derived (factory) BC is scaled with bullet weight, so a mistyped weight such as 1e6 makes the BC field show 2750 and the error list names the BC as well as the weight. A typed or fitted BC is never rewritten. The scaling is labelled as factory-derived. This is confusing, not wrong.
3. The "Twist rate is 0" notice in the code cannot appear in normal use, because 0 is outside the allowed 5 to 20 range and is rejected first. Harmless.
4. Mobile testing is Chromium with emulated phone sizes. It has not been run on a real phone, Safari or Firefox. This is a test gap, not a found defect.

## 2. Calculation and data integrity

| Item | Result |
|---|---|
| Solver block (`/*SOLVER_START*/` to `/*SOLVER_END*/`) | Byte-identical to Stage 11 (`ba0594c`); SHA-256 of the block `f6eae75d3f6bc0f7f594cd7c2095e7ecdaa345bd1678710d3799df18bfdb7ce8` for both. A guard test enforces it. |
| Model version | 1.0.0 |
| Drag tables, reference data, measured data, golden baseline, test helper, `docs/MODEL_SOURCES.md`, Stage 11 datasets and results | Byte-identical to Stage 11. A guard test enforces it. |
| Tolerances | No test tolerance was changed. |
| `references.json` SHA-256 | e09638be17a730645f6cf50e27c54129484ed90d4cb0c10ceb2cc9295d52abd3 |
| `golden/baseline.json` SHA-256 | 1ed3b62d1f239b3572d71d638a54bdb301accdf88b8b1cf8a45aba5d55ef05c3 |
| `measured-doppler.json` SHA-256 | cba721faf1b9d99c394c1a9ac5fa5c3644f525b0f2bf3decb183cb476aae2f11 |
| Existing calculation guards and regression tests | All pass (section 6). |

One guard change, disclosed in full. `tests/stage10.test.js` and `tests/stage11.test.js` each contained a historical check that the whole of `index.html` equalled a pinned earlier commit. That could not hold once Stage 12 changed interface wording, which the authorization allows. Each check now pins the solver block, which is the part that must never change, and a comment says why. No tolerance, baseline or expected value was altered, and the solver-block pins in Stages 9, 9.1, 10, 11 and 12 all remain.

### Known calculation limitations (documented, not changed)

- **Coriolis discrepancy, unresolved (Stage 10).** The closed-form estimate is 14%, 33% and 47% larger than a full integration at 500, 1000 and 1500 yd for the .308 175 gr G7 0.243 sample, because drag damps the Coriolis-induced velocity. The size of the effect is about 0.1 to 0.2 mil at these ranges (Stage 11). Fixing it changes calculation behaviour and needs separate authorization. **Recommended correction (not implemented):** replace the closed form with the integrated effect, or scale it, then re-baseline the golden data under a new model version.
- Drag tables unverified against an original source; interpolation effect at most 0.04 in.
- Atmosphere formulas partly verified; a sea-level pressure typed at 5000 ft overstates density by 20.2% (the interface warns).
- Bullet length assumed (1875 gr/in^3); stability changes about -2.9% per +1% length; the assumed length ran 1% to 9% below Berger catalog lengths for four bullets.
- Spin-drift equation's primary source not opened.
- One BC at all speeds; no aerodynamic jump; no powder-temperature model beyond the user's setting.
- Measured-trajectory comparison inconclusive (Stage 11): predictions differed from measurements by amounts from inside measurement error to about 1.5 mil, with the unknown inputs alone able to move the prediction by as much.

## 3. Safety and transparency

Required statement, where it appears now, and what changed.

| Required statement | Where shown | Change in Stage 12 |
|---|---|---|
| Model not demonstrated to be physically accurate | HUD result summary, Chart summary and note, Rifle tab footer, result badge, CSV header line | **Added** "The model has not been shown to be physically accurate." |
| Manufacturer comparisons are not proof of real-world accuracy | HUD limits note, Chart note, Rifle tab footer | **Added** |
| Estimated stability depends on assumed bullet length | Stability hint and stability warning | Already present, kept |
| Spin drift may be unreliable when stability is below 1.0 | Warning shown when estimated SG is below 1.0 | Already present, kept |
| Truing can absorb errors in BC, drag and atmosphere | True-to-impact card, fitted-value labels and notices, Rifle tab footer | Footer **added**; others already present |
| User-entered and fitted values distinguished from preset values | Source labels for velocity and BC (factory, entered, fitted) and the factory-velocity offer | Already present, kept |
| Station pressure versus sea-level pressure | Field label "Station pressure (not sea-level pressure)", hint text, and a notice when pressure is high for the altitude | Already present, kept |
| Coriolis discrepancy unresolved | Coriolis hint beside the latitude field and the Coriolis notice | **Added** |
| Limits of the model | HUD limits note | Extended to say the one measured-trajectory comparison was inconclusive |

No warning or limitation was removed or softened. The older wording ("Not independently verified") was kept and the new sentences were added after it. A guard test checks that the earlier disclosures remain.

### Before and after (interface wording)

The exact diff of `index.html` against Stage 11 is saved in `docs/STAGE12_INTERFACE_DIFF.txt`. All 10 changed lines are text. The solver block did not change.

| Place | Before | After (added text) |
|---|---|---|
| HUD summary | Calculated estimate. Not independently verified. | ... Not independently verified. The model has not been shown to be physically accurate. |
| Chart summary and note | ...Not independently verified against measured bullet flight. | ...flight. The model has not been shown to be physically accurate. And, in the note: "...manufacturer comparisons are not proof of real-world accuracy." |
| Result badge and CSV header line | Calculated estimate. Not independently verified. ... | Same, plus the physical-accuracy sentence |
| Coriolis notice | ...was not compared with measurements. | Adds that a known discrepancy is unresolved (about 14%, 33% and 47% larger than a full integration at 500, 1000 and 1500 yd for one sample) and that the figures are uncertain |
| Coriolis hint (Rifle tab) | ...grows quickly at long range. | Adds the known, unresolved discrepancy |
| Limits note | ...never with measured bullet flight. | Adds that manufacturer comparisons are not proof of real-world accuracy and that the measured-trajectory attempt was inconclusive |
| Rifle tab footer | ...until the card matches your groups. | Adds the physical-accuracy, manufacturer-comparison and truing sentences |

The calculated numbers on screen did not change; the golden baseline and all calculation tests pass unchanged.

## 4. Documentation

- `docs/RELEASE_NOTES.md` (new, user-facing): what the app does, what the model calculates, what was tested, what has not been validated, known defects and limitations, supported inputs and units, how to interpret results, the model version and its meaning. It makes no accuracy claim and a guard test checks the wording.
- This report.
- `docs/MODEL_CHANGELOG.md`: Stage 12 entry (interface wording and documentation only; no model change).
- `tests/README.md`: entries for the new tests.
- Earlier stage reports and `docs/MODEL_SOURCES.md` are unchanged.

## 5. Final testing

### Test results

| Suite | Result |
|---|---|
| Node: `node --test tests/*.test.js` | 155 passed, 0 failed (see section 6 for the final run) |
| Browser: inputs | 27 of 27 |
| Browser: layout | 9 of 9 |
| Browser: stage12-audit (new) | 41 of 41 |
| Browser: stage9-1 | 14 of 14 |
| Browser: stage9 | 24 of 24 |
| Browser: step7 | 20 of 20 |
| Browser: storage | 27 of 27 |
| Browser: transparency | 6 of 6 |
| Browser: upgrade (old app reads new data) | 5 of 5 |
| Browser total | 173 of 173 |

Desktop and mobile: the layout and audit suites run at 320, 390, 400, 768 and 1280 px wide and pass. These are emulated sizes in Chromium.

### Failures and unresolved test issues

None failed in the final run. Two things went wrong during the work and were fixed in the new tests, not by loosening anything: the first audit run used a hidden wind field and treated blank optional fields as invalid, and one check read the range card before the app's redraw delay. Two existing guard tests (the "does not claim verification" label check and the "accurate must be negated" wording check) rejected my first wording; I rewrote the interface text to satisfy them rather than edit them.

## 6. Final run

Node: 155 passed, 0 failed (`node --test tests/*.test.js`). Browser: 173 passed, 0 failed across nine files (27, 9, 41, 14, 24, 20, 27, 6, 5). Reproduce with `node --test tests/*.test.js` and `for f in tests/browser/*.check.js; do node $f; done`. Each browser file prints its own inner count; `node --test` counts one test per file.

## 7. Remaining defects and release blockers

Defects and open issues (none require changing calculation behaviour to ship a preliminary release):

1. Coriolis closed-form discrepancy (unresolved; calculation change needs separate authorization).
2. Measured-trajectory evidence is inconclusive; physical accuracy is NOT DEMONSTRATED.
3. Drag table origin, spin-drift equation source and assumed bullet length are unverified.
4. Single BC versus velocity-dependent BC; transonic behaviour not demonstrated.
5. Confusing but harmless display of a scaled factory BC when the weight is mistyped.
6. Not tested on real phones, Safari or Firefox.

**Release blockers: none for a preliminary release that is labelled as an unvalidated estimate.** If the intention is to present the app as anything more than that, accuracy is the blocker, and this audit cannot remove it.

## 8. Conditions on the recommendation

- Present it as a preliminary, unvalidated estimate tool and ship the release notes with it.
- Keep the disclosures in the interface. Do not remove or shorten them.
- Treat the Coriolis figures as uncertain until the discrepancy is resolved.
- Ask for separate authorization before any calculation change, including the Coriolis correction.

## 9. Files changed in Stage 12

`index.html` (10 interface text lines), `tests/stage12.test.js`, `tests/browser/stage12-audit.check.js`, `tests/stage10.test.js` and `tests/stage11.test.js` (scope of one historical check, see section 2), `docs/STAGE12_FINAL_RELEASE_AUDIT.md`, `docs/RELEASE_NOTES.md`, `docs/STAGE12_INTERFACE_DIFF.txt`, `docs/MODEL_CHANGELOG.md`, `tests/README.md`.
