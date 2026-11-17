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

## The Aberdeen atmosphere question (investigated 2026-11-16)

All pages below were read through a summarizing page reader, not seen directly. The project owner has not checked the quotes (`docs/OWNER_CHECK_REFERENCE_DATA.md`).

| Source | Temperature | Pressure | Humidity | Says it applies to |
| --- | --- | --- | --- | --- |
| Hornady, External Ballistics page (hornady.com/team-hornady/.../external-ballistics) | 59 F | 29.53 inHg | 78% | "All ballistic coefficients and ballistic tables in this book have been adjusted to standard conditions. These are standard conditions for the Aberdeen test site." The book is not named, and no edition or date is shown. |
| Hornady, hornady.com/bc | 59 F | 29.92 inHg | 0% | "Hornady BC values have been corrected back to ... ICAO Standard Atmosphere", and ELD-X, ELD Match and A-Tip velocity tables are labeled ICAO. |
| dexadine.com BEX help (a ballistics program's documentation) | 59 F | 29.53 inHg (750 mmHg) | 78% | Calls these the "standard Metro" conditions and "the standard ballistics atmosphere". It does not say who defined them. |
| U.S. Standard Atmosphere 1976 constants (as printed in a program that cites it) | 288.15 K = 59 F | 101325 Pa = 29.92 inHg | dry | The ICAO-type atmosphere. |

What this shows: two conventions are in use, with the same 59 F. The Aberdeen figures (29.53 inHg, 78%) appear on Hornady's page and a second ballistics program's page. No source opened says Hornady computed the Hornady LE table, the resource-page tables or the current BCs in Aberdeen conditions. Hornady's pages conflict with each other, and the Aberdeen statement may be old handbook text. A direct statement from Hornady for the LE table is still needed. In the engine, Aberdeen conditions give 1.80% lower air density than ICAO (1.2029 against 1.2249 kg/m3), the size of the effective-BC offset seen in the first Hornady case, and re-running the cases in Aberdeen conditions removes that offset (velocity within 0.07%). That is a hypothesis consistent with the data, not an established explanation. The ICAO comparison stays the primary, pre-registered run, and no BC or solver code was changed.

## The drag-table origin search (continued 2026-11-16)

Still no authoritative original. Opened this round: Applied Ballistics "Aerodynamic Drag Modeling for Ballistics" gives no origin and no table (only the Mach 3 values already recorded) and cites McCoy, *Modern Exterior Ballistics* (1999) and Peelen, "A Look at Drag Models in Old Small Arms Firing Tables" (2006), neither of which was opened. A hobbyist page narrates Krupp (1881), Ingalls, BRL experiments and Winchester-Western (1965) with no bibliographic details. One site that may hold tables disallows automated access, so it was not used. The secondary comparison is supporting evidence only.

## Physical formula audit (2026-11-16)

`node tests/tools/formula-audit.js`. Tolerances were fixed before the run.

| Check | Source opened | Result | What it does and does not show |
| --- | --- | --- | --- |
| Sea-level density 1.2250 kg/m3 and speed of sound 340.294 m/s | U.S. Standard Atmosphere 1976 constants as printed in pdas.com atmos76.f90 (the 1976 document itself not opened) | Density -0.0018%, speed of sound +0.0009% (tolerance 0.1%) | Sea level, dry air only. No source opened for the humidity (vapor pressure) term, the altitude formula at other heights, or the gamma 1.4 moist-air speed of sound. |
| Altitude pressure formula | none opened | Self-consistent at 0 ft only | Unverified above sea level. |
| Miller stability formula | arXiv 1410.5340, which prints the equation and cites Miller 2005 (Miller's own article not opened) | The engine's formula equals the printed one for three inputs (differences 0) | The printed reference pressure is 29.92 inHg and temperature 59 F, as in the engine. A Wikipedia page lists 750 mmHg but its equations did not load, so that conflict is unresolved. The engine does not take bullet length: it estimates length from weight, and real bullets differ, so real stability values can differ from the engine's. Formula form only. |
| Spin drift 1.25 (Sg + 1.2) t^1.83 in | No opened source with the formula. An open-source Rust crate repeats it with no citation. Applied Ballistics gives only "8 to 9 in at 1000 yd" | 9.31 in for the one bullet I chose (175 gr, BC 0.5, 2800 fps, 11 in twist), OUTSIDE the 8 to 9 range | The source's range is for "typical" trajectories and is not tied to any bullet, so this is not a failure of the formula. It is not a verification either. Unverified. |
| Coriolis, 2 Omega sin(lat) integral of x dt, Omega 7.292115e-5 rad/s | Omega appears in a book appendix (title only, no edition) found through a page reader. No source with the deflection formula opened. Applied Ballistics gives "2.5 to 3.0 in" at 1000 yd, 45 deg | 3.34 in horizontal and 3.34 in vertical for the same chosen bullet, OUTSIDE 2.5 to 3.0 | Coriolis grows with time of flight, and the source does not say which bullet. Directions behave as the article describes (sign flips by hemisphere and by east/west, zero at the equator for horizontal and at the pole for vertical, zero firing north). Unverified. |

None of these rows moves a component to Verified. The two OUTSIDE rows are reported as they came out. The chosen example was not changed to make them pass.

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
