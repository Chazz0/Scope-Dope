# Calculation model: sources, limits and labels

Model version: see `docs/MODEL_CHANGELOG.md`. Status as of 2026-11-16.

**Passing software tests is not proof of ballistic accuracy.** A test records what the code
does. It cannot show that what the code does matches real bullets.

## Three separate achievements

Passing tests, matching published data and predicting a real bullet are different things. Each is shown separately.

| Achievement | Question | Where it stands |
| --- | --- | --- |
| **Software correctness** | Does the program calculate consistently? | Supported by automated tests. This says nothing about the other two. |
| **Reference agreement** | Does it reproduce published data? | Partly, not established. One bullet agrees with one manufacturer table from 100 to 500 yd, and two drag-table points agree at Mach 3. The reference data has not been reproduced by an independent reviewer. The project owner waived that step on 2026-11-16, so it is owner-checked only (`docs/STAGE5_COMPLETION.md`). |
| **Physical accuracy** | Does it predict what an actual bullet does? | NOT DEMONSTRATED. No measured flight data has been compared. |

Stage 5 completion criteria are in `docs/STAGE5_COMPLETION.md`.

## The three labels

| Label | Meaning |
| --- | --- |
| **Tested** | Automated tests run it and pass. This says the code behaves consistently and is protected against accidental change. It says nothing about accuracy. |
| **Verified** | Compared with an independent, named source that was opened and read, and agreed within a stated tolerance. For data copied from a source, the copy must also have been reproduced by someone other than the author. A Verified label always states its scope: which values, which conditions. It never means physically accurate. |
| **Unverified** | Not compared with an independent source that was opened and read. |

A component can be Tested and also Unverified. Most of this app is.

## Components

| Component | Tested | Independent check | Source and what is known |
| --- | --- | --- | --- |
| G1 drag table (`G1`) | Tested | **Unverified** | One point agrees: Cd 0.5133 at Mach 3 against 0.51 printed by Applied Ballistics (evidence AB-G1-M3). The other points were not checked. The origin of the table in this file is not established, see below. |
| G7 drag table (`G7`) | Tested | **Unverified** | One point agrees: Cd 0.2424 at Mach 3 against 0.24 (evidence AB-G7-M3). The other points were not checked. Origin not established. |
| BC to SI factor, 703.0696 | Tested | **Verified**, scope: the unit conversion only | Arithmetic from the exact definitions of the pound and the inch: 0.45359237 kg divided by 0.0254 squared. Checked in `tests/validation.test.js`. |
| Drag equation, `a = (pi/8) rho Cd(M) v / BC` | Tested | **Unverified** | Agrees within tolerance with published tables from Hornady (several bullets) and Federal (a G7 bullet), 100 comparisons of 103 in total across both candidate atmospheres. The 1.8% BC offset in the first Hornady case disappears in the Aberdeen atmosphere (hypothesis, not confirmed). The reference copies were read by a page tool and not independently reproduced, so this is not verification. |
| Atmosphere: ISA pressure, moist-air density, speed of sound with gamma 1.4 | Tested | **Unverified** | Sea-level results are close to the commonly quoted ICAO values, but those values were quoted from memory and no source was opened for this. |
| RK2 integrator, 0.5 ms step | Tested | **Unverified** | Tests measure sensitivity to the step size. That compares the code with itself. |
| Zeroing and angled shots | Tested | **Unverified** | No external comparison. |
| Crosswind by lag time, `w (t - x/v0)` | Tested | **Unverified** | Standard textbook method as commonly described. Source not opened. |
| Spin drift, `1.25 (Sg + 1.2) t^1.83` inches | Tested | **Unverified** | An empirical formula attributed to Bryan Litz. Source not opened. |
| Stability factor (Miller estimate) | Tested | **Unverified** | Attributed to Don Miller. Source not opened. |
| Coriolis, first order | Tested | **Unverified** | Uses Earth rotation rate 7.292115e-5 rad/s. No external comparison. |
| Factory-load presets (BC, velocity, weight) | Tested | **Unverified** | Typical values, not a manufacturer's data for your lot. Check against your ammunition. |

## Where the drag tables come from

This is not settled, and this document does not claim it is.

- A third-party software README names E. D. Lowry, "Exterior Ballistic Tables Based on Numerical
  Integration", Winchester-Western, 1965, as the original source. The README gives no verification.
- Another ballistics software page says most of its drag tables derive from SAAMI tables.
- A hobbyist page says the G1 shape dates from Krupp in the 1870s.
- R. L. McCoy's report ARBRL-TR-02293 (February 1981) is often cited alongside these tables. It was
  opened. It is a program for estimating drag from a bullet's shape and does not contain the G tables.

None of the primary documents behind the G tables was found and compared line by line with the tables in
`index.html`. Until that is done, both tables stay **Unverified**, even though one point on each agrees.

### Comparison of every point with a secondary copy (2026-11-16)

`node tests/tools/compare-g-tables.js` compares all 79 G1 and 83 G7 points in `index.html` with a secondary transcription of another open-source project's data files (`tests/validation/third-party-tables/`, see its `PROVENANCE.md`). G1: identical at 79 of 79. G7: identical at all 83 shared Mach points; the other copy has one extra point at Mach 1.125 (Cd 0.3987 against 0.39845 interpolated here, a difference of 0.00025). The origin of that copy is unknown, so this does not verify either table. Both stay **Unverified**.

## Atmosphere and the 1.8% offset (hypothesis)

Hornady's own pages disagree on its standard atmosphere: hornady.com/bc says ICAO (59 F, 29.92 inHg, 0% RH); the Hornady external-ballistics page says Aberdeen (59 F, 29.53 inHg, 78% RH). Both were declared before any run. In the Aberdeen atmosphere the engine reproduces the Hornady LE table and the Hornady resource-page tables to within about 0.07% in velocity; in ICAO they differ by up to 1.4% for the round-nose bullet. This is consistent with Hornady using the Aberdeen atmosphere, but no Hornady page says so for the LE table, so it is a hypothesis. Federal does not state its atmosphere and agrees under both. Nothing was selected, and no BC or solver code changed.

## Formulas checked against opened sources (qualitative only)

- **Miller stability.** The formula was reconstructed from an opened description; the constants 30 and 2800 fps match. The pressure reference may differ (29.92 inHg here, 750 mmHg = 29.53 inHg in some descriptions), worth about 1.3% in the stability factor. Flagged, not changed. The code was not compared with Miller's original paper.
- **Spin drift and Coriolis.** The Applied Ballistics article opened gives magnitudes (spin drift about 8 to 9 in at 1000 yd for a typical match bullet; Coriolis at most about 10 to 12 in) and directions, and no formulas. Magnitudes are not a quantitative check, so both stay Unverified.
- **Atmosphere constants.** No readable authoritative source has been opened. Unverified.

## Known limits of this model

- Point-mass model. It has no yaw, no aerodynamic jump, and no velocity-banded BC.
- Hornady states that G1 and G7 shapes may not match some modern bullets and that truing a BC
  moves errors around rather than removing them.
- Atmosphere is a single uniform layer at the shooter's conditions.
- Powder temperature has no effect unless you enter a velocity change per degree.

## How this is kept honest

- `tests/validation/references.json` holds every reference number with its source, and the
  tolerances. The tolerances were written before the comparison ran.
- `node tests/tools/run-validation.js` prints every comparison, including failures.
- `tests/validation.test.js` fails if a component is labeled Verified without scope, if the
  tolerances change, or if either reading of an ambiguous source is removed.
- The app shows "tested, not independently verified" next to the model version.
