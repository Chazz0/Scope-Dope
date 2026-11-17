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
| **Physical accuracy** | Does it predict what an actual bullet does? | Not demonstrated. No measured flight data has been compared. |

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
| Drag equation, `a = (pi/8) rho Cd(M) v / BC` | Tested | **Unverified** | One manufacturer table agrees within tolerance from 100 to 500 yd, with a steady offset of about 1.8% in effective BC (see the validation report). That is one bullet, not verification, and the offset is unexplained. |
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
