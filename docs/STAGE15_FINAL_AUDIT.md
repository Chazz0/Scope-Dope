# Stage 15 final audit: scope-adjustment module

**Physical accuracy: NOT DEMONSTRATED.** The module does unit and turret arithmetic on a correction someone else calculated. It does not show any ballistic correction is right. It is **not connected** to the app (not to the HUD, the DOPE chart, the saved rifles or any default), and the ballistic solver is unchanged. Nothing is merged or deployed.

Branch `stage-15-scope-adjustment-module`. Files: `lib/scope-adjust.js`, `tests/scope-adjust.test.js`, `tests/scope-adjust-provenance.test.js`, `docs/STAGE15_SCOPE_ADJUSTMENT_MODULE.md` (corrected), this audit.

## 1. How the references were verified, and the limit of that verification

I could not download the PDFs: the workspace's network is blocked for appliedballisticsllc.com. I read them with the fetch tool, which converts the PDF to text, keeps the PDF's own page markers and answers questions about it. That is a read of the **text of the original PDFs as extracted**, not me opening the files. It caps quotations at about 125 characters, so I could not reproduce passages in full. **Please open the PDFs and spot-check the items marked "check" below.** The tool read four documents:

| Key | Document | Read |
|---|---|---|
| Q24 | AB Quantum User Manual (appliedballisticsllc.com, 2024/12 upload) | yes |
| Q3 | Applied Ballistics Quantum Application 3.0 User Guide (2025/02 upload "User-Manual-2.pdf", copyright 2006 to 2025) | yes |
| AN | Applied Ballistics Analytics User Manual, Build 068 (2019/11 upload) | yes |
| AM | AB Mobile User Guide, version 07/2018 (2.2) (2019/11 upload; text has no page numbers, so I cite headings) | yes |
| GA | Garmin glossary of Applied Ballistics terms (secondary source) | yes (summary only) |

### Reference-by-reference result

| Claim in the module | Source and location | Result |
|---|---|---|
| CF = expected POI shift / actual POI shift | Q24 s9.0 "Determining Sight Scale Factor (Tall Target Testing)", p. 25; Q3 s9.0 p. 29; AM "Tall Target Test" | **Confirmed**, wording matches in all three |
| Apply CF to any raw ballistic prediction (multiply) | Q24 p. 25 ("Apply this correction factor to any raw ballistic prediction"); Q3 p. 29 step 4; AN s3.2.4 | **Confirmed** |
| Constants 0.01047, 0.03599, 0.01145, 0.03936 | Q24 s9.0 p. 25 | **Confirmed** (check the table on p. 25) |
| Expected = dialed x range x constant | Q24 s9.0 p. 25 | **Confirmed** |
| Worked example: 102 yd, 30 MOA, 29.8 in, 32.04 in, CF 1.075, 32.25 MOA | Q24 s9.0 p. 25 | **Confirmed**, every number |
| Dial at least 30 MOA or 10 MIL | Q24 p. 25; Q3 p. 29; AN s3.2.4 | **Confirmed** |
| Analytics example 30/29 = 1.035; "program will scale the calculated drop by this correction factor" | AN s3.2.4 "Advanced Settings", **p. 12** | **Confirmed.** 30/29 is 1.0345; the manual prints 1.035 |
| Units MILS, MOA (True MOA), IPHY = "Inches Per Hunderd Yards aka Shooters MOA" | AN s7.0 "Input/Output Unit Settings", p. 25; AM "Elevation Unit" | **Confirmed.** The manual's own spelling is "Hunderd" |
| Table 2 lists elevation, windage, drop, drift in inches, mils, moa | AN s4.3 p. 17 | **Confirmed** |
| Profile Edit and scope units | Q24 s5.1 p. 16 to 17; Q3 s5.1 p. 21 | **Confirmed.** The earlier report cited Q24 only |
| Separate elevation and windage unit and turret graduation | AM Sight Data: Elevation Unit, Windage Unit, Elevation Turret Grad, Windage Turret Grad | **Confirmed in AM only.** Q24, Q3 and AN do not cover click values |
| Separate elevation and windage correction factor fields | AM Sight Data: Elevation Correction Factor, Windage Correction Factor | **Confirmed in AM only.** Windage entry has a heading and no description |

### Errors found in my first report (corrected)

1. It said Applied Ballistics documents no click value or separate elevation and windage settings. **Wrong:** AM lists Elevation Turret Grad and Windage Turret Grad, separate units, and separate correction factors. Q24, Q3 and AN are silent, which is what I had checked.
2. It said the documents do not define shooter MOA. **Wrong:** AN s7.0 and AM define it as inches per hundred yards. True MOA and MIL are named but not defined, so those two definitions are standard ones (1/60 degree, 1/1000 radian), labelled `STANDARD`.
3. It titled the Quantum section "Sight Scale Factor" and gave p. 25 only. The title is "Determining Sight Scale Factor (Tall Target Testing)". Q24 p. 25, Q3 p. 29.
4. It cited "Analytics 3.2.4" without the page or heading: s3.2.4 "Advanced Settings", p. 12.
5. It said AM was not read. It was not, in the first pass; it was read in this audit.

## 2. Documented Applied Ballistics behaviour versus this application's decisions

The module exports `PROVENANCE` and tests enforce the labels. A documented or partly documented rule must cite a source; an application decision must not.

**DOCUMENTED:** CF definition; multiply the prediction by CF; the four test constants and the expected-shift formula; the 30 MOA / 10 MIL minimum dial; the unit names and shooter MOA = IPHY; separate elevation and windage units; an elevation correction factor.

**DOCUMENTED_PARTLY:** separate turret graduations (AM only); a windage correction factor field (AM only, no description, no procedure).

**STANDARD (named by Applied Ballistics, defined by convention):** true MOA = 1/60 degree; MIL = 1/1000 radian.

**APP_DECISION (not Applied Ballistics behaviour):**
- Rounding of clicks (section 5).
- The CF bounds 0.5 to 2.0 and the click bounds above 0 up to 10 (section 4).
- Every setting required, with no default. AM suggests entering 1.0 when the elevation factor is unknown, so this module is deliberately stricter.
- Multiplying a windage factor into windage by analogy, and not copying the elevation factor into windage (section 3).
- Rejecting plain "MOA", never mixing or converting units implicitly.
- Rejecting `SHOOTER_MOA` in the tracking-test helper (the constants cover MOA and MIL only).
- Tagged, frozen "ballistic-correction" and "scope-adjustment" objects.

## 3. Elevation only, or a separate windage factor?

**What the documents say.**
- AN s3.2.4 says the inputs compensate for irregularities "through its range of elevation and windage", but then describes only a vertical test and says the program scales the calculated **drop**.
- Q24 and Q3: one factor, one elevation example, applied to the "raw ballistic prediction". Windage never appears near the factor.
- AM: separate Elevation and Windage Correction Factor inputs, but the "Tall Target Test" section is titled "Determining Elevation Correction Factor" and the Windage entry is empty.
- GA (secondary): separate SSF Elevation and SSF Windage, in the reciprocal convention we do not follow.

**Conclusion for the factor's documented behaviour:** Applied Ballistics documents a tracking correction for **elevation only**. A windage input exists in one older app guide but is not described and has no measurement procedure.

**Is a separate windage factor technically justified?** My own reasoning, not Applied Ballistics': the elevation and windage turrets are separate adjustment mechanisms, so one can track differently from the other, and the elevation test cannot measure windage tracking. A windage factor is therefore justified **only if measured** with a horizontal version of the same test (dial windage, measure the horizontal shift). Applying the elevation factor to windage is not justified, and defaulting a windage factor to 1 without saying so would hide the fact that windage tracking was never checked.

**What the module does.** Each axis has its own factor, both required. The module never copies the elevation factor to windage. A windage factor of 1 is accepted only when stated, and it means "I am assuming the windage knob tracks true", not "tested". The windage procedure is **not documented by Applied Ballistics** and the module's multiplication of windage by CF is labelled `APP_DECISION`.

**Decision for you, before Stage 16:** (a) keep a separate windage factor as an explicitly entered, labelled "not measured by an Applied Ballistics procedure" setting; or (b) accept only 1 for windage, shown as "not corrected", until a windage test is defined. I recommend (a) with clear labelling. Nothing was changed on this point.

## 4. Why the ranges are what they are

Applied Ballistics gives no valid range for a correction factor or a click value in any document read. AM gives only typical values ("usually MOA scopes are 1/4, some are 1/8") and suggests 1.0 for an unknown factor. **Both ranges are therefore this application's own judgement, intended to catch typing and measurement errors, not to describe real scopes.**

- **Correction factor 0.5 to 2.0.** The examples in the manuals are 1.035 and 1.075. A factor of 2 would mean the turret moves half or double what it says, which is a broken or misread scope. The bounds exist so a decimal slip (10.75 for 1.075, or 0.1075) is rejected instead of silently dialled. Limit: I have no source for how large real tracking errors get, so the bounds are unsourced. They also apply to a factor computed from the test, which is rejected as a probable measurement error. A scope truly outside the range cannot be entered.
- **Click value above 0 up to 10 units.** Common graduations are 0.05, 0.1 and 0.2 MIL and 1/8, 1/4, 1/2 and 1 MOA. Zero or negative is meaningless. Ten is a generous upper limit that catches obvious slips but would accept 5 MOA per click, which no real turret has. **It is looser than it needs to be.** A tighter bound (for example 2 units) would catch more mistakes but is equally unsourced. Your call.

## 5. Rounding is an application decision

Applied Ballistics documents read do not state a rounding rule. The module rounds to the nearest whole click, with halves going away from zero (+2.5 to 3, -2.5 to -3), and reports the exact count, the amount actually dialed and the remainder. This is labelled `APP_DECISION`. The app's existing `clicksFor` uses `Math.round`, which sends -2.5 to -2, so the two differ on exact negative halves. That would need a decision when wiring in.

## 6. Tests

- All 192 tests from Stage 15 still pass, unchanged.
- Three new tests in `tests/scope-adjust-provenance.test.js` check that every rule is labelled, that rounding, bounds, no-defaults and the windage handling are application decisions, and that the documented constants in the code match the documented ones. Total: **195 of 195 pass.**
- `index.html`, the solver, reference data, golden baseline and helpers are byte-identical to `main` (an existing test enforces this).

## 7. What remains uncertain

- Quotations were capped, so the full text of Q24 s9.0 and AN s3.2.4 was read but not reproduced. Please check the items above against the PDFs.
- AM is a 2018 guide and may be out of date. The 2024 and 2025 Quantum guides do not list the separate windage inputs.
- No real scope was tested. Nothing here shows a ballistic correction is accurate.

I'm stopping here and waiting for your approval before Stage 16.
