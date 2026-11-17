# Stage 8: Complete calculation audit (Step 1 only)

Branch `stage-8-calculation-audit`, from `stage-7-ux-data-integrity` (b54b1a7). Audit date 2026-11-16.

**This is an audit. Nothing was fixed.** The solver block, formulas, drag tables, input behavior, saved data and interface are unchanged. The only files added are this report and three read-only probe scripts (`tests/tools/stage8-audit-*.js`) that reproduce the numbers quoted below. Nothing is merged into main.

**Physical accuracy: NOT DEMONSTRATED.** Nothing in this audit changes any verification claim. The three kinds of evidence stay separate:

| Kind of evidence | Status after this audit |
| --- | --- |
| Software correctness (the code does what it is written to do, consistently) | Supported by automated tests (118 Node tests, 94 browser tests pass on the Stage 7 commit). This audit adds a few confirmed defects in the surrounding code (section 8). |
| Agreement with manufacturer or calculator reference data | Partial, as recorded in Stage 5 (201 of 211 comparisons inside pre-registered tolerances). Not upgraded here. The reference entries were read through page tools and not checked against original pages. |
| Physical accuracy against measured bullet flight | NOT DEMONSTRATED. The only measured data is Doppler drag at about 100 m (21 of 26 values within 3%), which tests drag, not a trajectory. |

## 0. How to read this report

Every finding has a status:

- **Confirmed**: reproduced by running code, or read directly from code and history, as stated.
- **Suspected**: follows from the code or from a source, but was not reproduced or its size was not measured.
- **Unresolved**: cannot be decided with what is available here (usually needs an original source or measured data).

Source citations are given by author and title. **They were not opened for this audit** unless a Stage 5 document records that they were (those are marked "opened in Stage 5"). A citation here says where the formula is documented, not that this audit checked the formula against it. Where I name a source, I am naming the original work and not another calculator that repeats it.

Evidence was gathered by (a) reading every line of the solver block and the surrounding input, storage and rendering code, (b) running the engine through the existing test loader with inputs chosen for each question, (c) driving the page in Chromium with seeded saved data, and (d) reading the git history. Probe scripts: `node tests/tools/stage8-audit-engine-1.js`, `-engine-2.js`, `stage8-audit-ui.js`.

## 1. Answers to the questions you asked first

1. **Why did `readInputs()` hardcode `tgtMph` to zero?** Because the moving-target feature was never finished. In the baseline (b8ad09a) the engine, the output dial and the help text existed, but there was no input field, no session wiring and no validation path, so the code could only ever receive zero. Full trace in section 2. Whether the input was deliberately taken out before the baseline was committed cannot be known from the repository (section 2.4).
2. **Is it still hardcoded?** No. The current page has no `tgtMph` at all. The moving-target code was removed in Stage 4 (commit 67732c8), with tests written first. **I have not restored it.** Restoring it would need a design decision from you (section 2.5).
3. **Is the solver correct?** Unknown in the physical sense. It integrates a documented equation consistently (section 4) and reproduces several manufacturer tables within tolerance (Stage 5). Whether the drag tables are the genuine standard tables is **unresolved**.
4. **What is wrong that can be shown?** Six confirmed defects (section 8, C2 to C6b: four reproduced by running code or the page, two read from code and label text), two cosmetic or trivial items (C7, C8), none in the drag-equation arithmetic itself, plus a list of assumptions whose size I measured (section 9).

## 2. The moving-target investigation

### 2.1 Where the code stood in the baseline (b8ad09a, the first commit that contains the app)

| Stage of the path | What the baseline had | Status |
| --- | --- | --- |
| Input field | **None.** The page contains no element with id `tgt`, `tgtAng` or `tgtDir`. (`git show b8ad09a:index.html` has 10 mentions of `tgt`; none is an input element.) | Missing |
| Input reading | `readInputs()` returned `tgtMph: 0, tgtAngle: 90, tgtDir: 'LR'` as constants (line 898). | Hardcoded |
| Validation | `RANGES` had entries `tgt:[0,60,0]` and `tgtAng:[0,90,90]`. They are only used by `num(id)`, which was never called with those ids, so the limits were never applied. | Dead |
| Session persistence | `sessionDefaults()` listed `tgt`, `tgtAng`, `tgtDir`. `collectSession()` and `applySession()` never read or wrote them. A saved session never contained them. | Disconnected |
| Calculation | `dopeAt()` computed `leadM = tgtMph * 0.44704 * t * sin(tgtAngle)` and `leadRad = ±leadM / x` only when `tgtMph > 0`. | Implemented, unreachable |
| Output | A `Lead` dial (`#leadDial`, hidden unless `tgtMph > 0`) and optional Lead columns in the range card. The page header comment and the Chart hint text both said moving-target settings were on the HUD. | Implemented, never shown |
| Test evidence | The Stage 1 golden baseline records `leadMoa` and `leadMil` as exactly 0 for every case. | Consistent with unreachable |

### 2.2 Classification

**Incomplete feature with a disconnected input.** The calculation, the display and the documentation text were written. The input control, its session persistence and its validation were not. The code was not a bug in the sense of a wrong number: it was unreachable.

### 2.3 What happened since

Stage 4 (491fae4 tests first, 67732c8 removal, ef062fb cleanup) removed the unreachable engine code, the Lead dial, the Lead columns and the unused ids. Tests prove the engine ignores old moving-target inputs and the page source contains no leftover identifiers (section 9 of `tests/solver.test.js`, and `tests/browser/inputs.check.js`). A saved session that still carries old `tgt` keys loads normally and does not keep them. No saved profile was changed.

### 2.4 Unresolved: was it removed on purpose earlier?

**Unresolved.** The repository has two commits before the audit work: `a8c2359` (a one-line README) and `b8ad09a` (the whole app in one commit). There is no earlier history, so I cannot say whether an input field once existed and was taken out. The evidence that the feature was intended: the header comment says the HUD takes "moving target in", the help text mentions "moving target settings from the HUD", and a hidden Lead dial and Lead columns were written. The evidence that it was never finished: no input, no session wiring, a constant in `readInputs()`. I did not find evidence of a deliberate removal.

### 2.5 If it is restored later: what the removed formula did and did not do (Suspected issues, from reading the baseline code)

- It computed lateral lead as `target speed x time of flight x sin(angle) / range`. That is the first-order, constant-velocity case only.
- Angle was limited to 0 to 90 degrees, so a target moving toward the shooter and away from the shooter could not be told apart, and the along-range component (which changes drop) was ignored.
- Time of flight came from the trajectory with the shooter's wind; the lead was added to nothing and shown as its own dial, so no check existed that wind, spin drift, Coriolis and lead combine sensibly.
- There was no validation range wired to it (see the table above).
- Any restored version needs its own inputs, limits, session keys, tests and a labeled "not compared with anything" notice. **No restoration is proposed in this audit.**

## 3. Calculation functions: inventory, callers and flow

All line numbers are in `index.html` at commit b54b1a7. The solver block is lines 558 to 757 (`/*SOLVER_START*/` to `/*SOLVER_END*/`). It is byte-identical to Stage 5 (guarded by `tests/step7.test.js`).

### 3.1 Solver block

| Function (file `index.html`) | Line | Purpose | Called by |
| --- | --- | --- | --- |
| `MODEL_VERSION`, `G_ACC` | 561, 562 | Model label 1.0.0; gravity 9.80665 m/s^2 | label (line 1751); `accel`, `traceRot` |
| `G1`, `G7` | 563, 565 | Drag tables, `[Mach, Cd]` pairs (79 and 83 points) | `buildModel`, `cdOf` |
| `cdOf(T, m)` | 567 | Piecewise-linear Cd lookup, constant beyond ends | `accel` (602), `traceRot` (662) |
| `cdG1(m)` | 578 | Identical copy of `cdOf(G1, m)` | **Nothing** (dead code) |
| `atmosphere(tempF, altFt, pInHg, rh)` | 589 | Air density and speed of sound | `buildModel` (636) |
| `accel(vx, vy, p)` | 599 | Drag plus gravity acceleration, with headwind | `trace` (611, 613) |
| `trace(p, theta, maxX)` | 606 | RK2 (explicit midpoint) integration, fixed 0.5 ms step | `buildModel` (643, 650) |
| `sampleAt(S, x)` | 621 | Binary search and linear interpolation along a trace | `buildModel`, `dopeAt`, `intXdt`, `renderPath` |
| `buildModel(inp, maxYd)` | 635 | Unit conversion, atmosphere, zero-angle bisection, main trace | `getModel` (1127), `fitTrue` (1534) |
| `traceRot(p, phi, maxX, th)` | 653 | Same integrator in a rotated frame (angled shots) | `dopeAt` (726), `solveRot` (680) |
| `solveRot(M, x, th)` | 676 | Bisection for the launch angle on an angled shot | `dopeAt` (730) |
| `stability(inp)` | 687 | Miller stability estimate with estimated bullet length | `dopeAt` (734), page hint (1428) |
| `intXdt(S, x)` | 695 | Trapezoid integral of x over time (for Coriolis) | `dopeAt` (739) |
| `maxOrdinate(M, rangeYd)` | 704 | Maximum height above line of sight | **Nothing** (dead code; tests only) |
| `dopeAt(M, inp, rangeYd)` | 714 | Everything per distance: drop, hold, wind, spin drift, Coriolis, velocity, energy, time | `renderPanel` (1140), `renderTable` (1280), `fitTrue` (1534) |

### 3.2 Calculation outside the solver block (still affects a displayed number)

| Function | Line | What it calculates |
| --- | --- | --- |
| `readInputs()` | 1073 | Reads and validates fields; wind clock to crosswind and headwind components; temperature-adjusted velocity `v0 = v0nom + vsens x (T - vref)` |
| `getModel(inp)` | 1124 | Caches `buildModel` by a key of the fields the model uses |
| `clicksFor(d, inp)` | 1130 | Rounds MOA or mil hold to scope clicks |
| `onInput` weight branch | 1484 | Scales the ballistic coefficient in proportion to weight (section 5.3) |
| `fitTrue()` | 1520 | Bisection that changes BC or muzzle velocity to match one observed elevation |
| `assessResult(inp, ctx)` | 768 | Advisory warnings only; feeds no number into the solver |
| `renderPanel`, `renderTable`, `buildCsv` | 1139, 1261, 1301 | Display, range card and CSV text |

### 3.3 Flow

```
HTML fields (text as typed)
  -> readInputs(): parse, range-check each field, build inp {SI conversion happens later}
       invalid or empty field -> problems[]; no result is shown (Stage 3)
  -> getModel(inp) -> buildModel(inp): feet/inches/grains/mph -> SI; atmosphere(); BC lb/in^2 -> kg/m^2 (x 703.0696)
       zero: bisect bore angle so the trajectory crosses the sight line at the zero distance (no wind, current atmosphere)
       trace(): main trajectory with headwind component
  -> dopeAt(M, inp, range): sample the trajectory; level shot uses -drop/x; angled shot re-solves with rotated gravity
       + crosswind (lag rule) + spin drift (Litz) + Coriolis (first order)
  -> clicksFor(): divide by click size, round
  -> renderPanel / renderTable / CSV
```

## 4. Trajectory solver and numerical integration

**What it is (Confirmed, code).** A two-dimensional point-mass model. State: horizontal and vertical velocity of the bullet relative to the ground; the air velocity enters only as a headwind added to the horizontal component. Acceleration: `a = -(pi/8) x rho x Cd(Mach) x |v| x v / BC_SI` plus gravity (`accel`, line 599). Here `Mach = |v_air| / speed_of_sound` and `BC_SI = BC x 703.0696` kg/m^2.

**Is the equation dimensionally right? (Confirmed by derivation, not by a source opened.)** With the standard-projectile convention (`BC = m / (i d^2)` in lb/in^2 and `Cd` the standard drag coefficient referred to the standard projectile), drag acceleration is `(pi/8) rho Cd v^2 / BC_SI`. The code matches that. Reference: McCoy, R. L., *Modern Exterior Ballistics* (Schiffer, 1999), chapters on the point-mass model and the ballistic coefficient. Cited, not opened here.

**Integrator (Confirmed, code).** Explicit midpoint (second-order Runge-Kutta), fixed step 0.0005 s (`const dt = 0.0005;` in `trace` line 609 and `traceRot` line 657). Stop when `x >= maxX`, `t >= 20 s` or `vx <= 15 m/s`. Position is advanced with the midpoint velocity. Reference for the method: any numerical-analysis text (for example Press et al., *Numerical Recipes*); cited, not opened.

**Step-size sensitivity (Confirmed, measured here, `stage8-audit-engine-1.js` E2).** Level shot, .308 168 gr, G1 0.462, 2650 fps, 1000 yd:

| Step | Drop (in) | Time (s) | Elevation (mil) |
| --- | --- | --- | --- |
| 2 ms | -422.2995 | 1.76138 | 11.73054 |
| **0.5 ms (app)** | **-422.3006** | 1.76138 | 11.73057 |
| 0.1 ms | -422.3007 | 1.76138 | 11.73057 |
| 0.05 ms | -422.3007 | 1.76138 | 11.73057 |

The step is converged to about 0.001 in at 1000 yd. Stage 5 also compared the engine with a separately written RK4 integrator (agreement within 0.2 fps at every range). **Caveat (Confirmed):** that integrator shares the engine's drag tables and atmosphere, so it checks the integration method and the angled-shot geometry only.

**Other numerical details (Confirmed, code).**
- Zero angle: 42 bisection steps on `[-0.05, 0.35]` rad (resolution about 1e-13 rad). Angled solve: 38 steps on `[-0.02, 0.25]` rad.
- `sampleAt` interpolates linearly between 0.5 ms samples (error of order dt^2, negligible at this step).
- The bisection assumes the height at the target distance rises with launch angle. That holds inside the reachable region and fails outside it (finding C2).
- The angled-shot branch of `dopeAt` re-solves the launch angle in a rotated frame; the level branch does not (finding C3).

**Suspected / Unresolved**
- **S-INT-1 (Unresolved).** Linear interpolation of Cd between table points is a modelling choice. The G7 table jumps from 0.2054 to 0.2993 to 0.3803 across 0.05 Mach near Mach 1; linear interpolation could differ from the original smooth curve there. The size cannot be bounded without the original table (section 6).
- **S-INT-2 (Suspected).** The loop stops when `vx <= 15 m/s` or after 20 s and then reports "out of range"/"does not reach". For very slow, low-BC bullets this ends the trace correctly; for other inputs the 20 s cap could cut a valid long flight. Not reproduced; ranges up to 2000 yd are allowed.

## 5. G1 and G7 drag, ballistic coefficient and BC handling

### 5.1 Drag tables and provenance (Unresolved)

- `G1` has 79 points from Mach 0 to 5.0; `G7` has 83. Spacing is 0.05 Mach in most of the table, 0.1 or 0.2 elsewhere. The G1 table has no point at Mach 0.65 (a 0.1 gap from 0.6 to 0.7). Probe `stage8-audit-engine-1.js` E15 lists every gap.
- Provenance was investigated in Stage 5 (`docs/MODEL_SOURCES.md`, `docs/SOURCE_RESEARCH.md`): **the origin of both tables is not established.** Candidate originals named by secondary sources: Ingalls and the BRL/Aberdeen tables, Krupp (1881), and Lowry's *Exterior Ballistic Tables Based on Numerical Integration* (Winchester-Western, 1965). R. L. McCoy's ARBRL-TR-02293 (1981) was opened in Stage 5 and does not contain the G tables. Applied Ballistics, *Aerodynamic Drag Modeling for Ballistics*, gives only the Mach 3 values (G1 0.51, G7 0.24); the tables here give 0.5133 and 0.2424.
- Point-for-point comparison with one secondary copy of unknown origin: G1 79 of 79 identical, G7 83 of 83 shared points identical (`node tests/tools/compare-g-tables.js`). That shows consistency with that copy, not correctness.
- **Status: Unresolved. Both tables remain Unverified**, as the owner-accepted Stage 5 wording says.

### 5.2 Interpolation (Confirmed behaviour, accuracy Unresolved)
Linear in Mach, flat beyond Mach 0 and Mach 5. Behaviour Confirmed by reading `cdOf` and by test (`cdG1` returns exactly what `cdOf(G1, m)` returns, max difference 0 over a sweep, E16). The error of this interpolation relative to the original curve is not known.

### 5.3 Ballistic coefficient handling

| Item | Finding | Status |
| --- | --- | --- |
| Meaning | One constant BC for the whole flight, applied to the chosen standard shape (G1 or G7). No velocity-banded BC. | Confirmed (code). Known limit of the model. |
| Unit factor | `BC x 703.0696` converts lb/in^2 to kg/m^2. Exact value 0.45359237 / 0.0254^2 = 703.06958. | Confirmed (arithmetic; also pinned in `tests/validation.test.js`) |
| G1 versus G7 | The app does not convert between them. Switching the drag model leaves the same number in the BC field and reinterprets it. A G1 value of 0.462 read as G7 is far above any G7 value in the comparisons. | Confirmed (code, `onInput` has no model branch). The Stage 6 warning fires when the number is outside the compared range, but nothing prevents the switch. |
| BC scaled with weight | Editing bullet weight rewrites the BC text in proportion (`BC x new weight / anchor weight`). That is exact only if diameter and form factor are unchanged (`BC = m / (i d^2)`). A message is shown. Example: 168 gr .462 becomes .522 at 190 gr. | Confirmed (code). Whether it is appropriate is Suspected: it replaces a published BC with a derived one, and diameter edits do not rescale it. |
| Truing (`fitTrue`) | Fits BC or muzzle velocity to one observed hold at one distance by bisection. Fitting velocity absorbs any drag-table or BC error into the velocity. | Confirmed (code). Product risk, see C6. |
| Factory presets | Eight presets with G1 BCs and typical velocities; a preset sets the model to G1. | Confirmed. Reference data only. |
| Atmosphere the BC refers to | Manufacturers state BCs against different standard atmospheres (ICAO 59 F, 29.92 inHg dry versus a Hornady-quoted 59 F, 29.53 inHg, 78%). Which applies to a given published BC is not stated by the sources opened. | Unresolved (Stage 5 hypothesis only) |

## 6. Atmospheric calculations and assumptions

`atmosphere()` (line 589):

1. Temperature F to K. Altitude ft to m.
2. Pressure: the user's value times 3386.389 Pa per inHg, **or** if blank the ICAO barometric formula `101325 (1 - 2.25577e-5 h)^5.25588` Pa.
3. Vapor pressure: relative humidity (clamped 0 to 100) times `610.94 exp(17.625 tC / (tC + 243.04))` Pa.
4. Density `rho = (p - pv)/(287.058 T) + pv/(461.495 T)`.
5. Speed of sound `sqrt(1.4 p / rho)`.

| Item | Finding | Status |
| --- | --- | --- |
| Vapor pressure constants | These are the Magnus-type constants of Alduchov and Eskridge, *J. Appl. Meteorol.* 35 (1996) 601 to 609. Cited, not opened. | Suspected (source plausible, not opened) |
| Dry sea level | Density 1.22498 kg/m^3 and speed of sound 340.297 m/s against 1.2250 and 340.294 from U.S. Standard Atmosphere 1976 constants as printed in a program (the 1976 document was not opened). | Confirmed to 0.002% for that point, Stage 5 |
| Barometric formula at altitude | No opened source. Probe E18: 5000 ft gives 1.0192 kg/m^3. | Unresolved |
| Speed of sound with `gamma = 1.4` and moist density | A fixed gamma for dry air; moist air has a slightly different effective value. Effect not measured. | Suspected, unquantified |
| Station versus sea-level pressure | The field is labeled "Air pressure (inHg)" with placeholder "Auto". The model needs **station** pressure. Weather reports and many phone apps give sea-level-adjusted pressure. At 5000 ft that is about 29.9 inHg against about 25.0 inHg true station pressure, a density difference near 20%. The advisory text says "station pressure"; the label does not. | **Confirmed** label ambiguity (C6b); size is arithmetic |
| Pressure limit versus altitude limit | Pressure is limited to 20 to 32.5 inHg; altitude to -500 to 15,000 ft. Station pressure at 15,000 ft is about 16.9 inHg. | **Confirmed**, reproduced in the page: altitude 15000 ft with pressure 16.9 gives "Pressure is 16.9 inHg (allowed 20 to 32.5 inHg)" and no result (C4) |
| Default atmosphere | New profiles default to 59 F, 0 ft, **50% humidity**, pressure from altitude. Density is 0.32% below the dry ICAO value (E19). BCs are usually referred to a standard atmosphere, so the default is not the standard one. | Confirmed, size 0.32% |
| Uniform atmosphere | One density for the whole flight and path, including uphill shots through changing air. | Confirmed (code) |
| Silent clamp | `atmosphere()` clamps humidity to 0 to 100 without a message. The page validates the range before the engine is called, so it is inert in the app; other callers would not be warned. | Confirmed, low |
| Zero atmosphere | The zero angle is solved in the **current** atmosphere, as if the rifle was zeroed in today's air. | Confirmed behaviour; size in section 9 |

## 7. Wind, spin drift, Coriolis and other environmental effects

### 7.1 Wind
- **Headwind** adds to the airspeed in the drag term, so it changes drop and time of flight (`accel`). Probe E17: 10 mph headwind raises 500 yd drop from -62.63 to -62.92 in. Confirmed behaviour.
- **Crosswind** uses the lag (Didion) rule: `drift = wind x (t - x / v0)`, with `v0` the muzzle velocity. Reference: McCoy (1999) and Litz, *Applied Ballistics for Long Range Shooting*. Cited, not opened. Stage 5 labels it Unverified. Probe E12: 10 mph full-value wind gives 22.57 in at 500 yd.
- Wind is one constant speed and direction over the whole path, with no vertical component and no variation with range. The direction is chosen from 12 clock positions (30 degree steps). Confirmed (code and page). These are model limits, not defects.
- The wind direction does not change the zero. The zero is solved with no wind (Confirmed).
- For angled shots the lag time uses slope distance divided by muzzle velocity. Suspected small effect, not measured.

### 7.2 Spin drift
- `1.25 x (SG + 1.2) x t^1.83` inches, `SG` the stability estimate, `t` seconds. Attributed to Litz (*Applied Ballistics for Long Range Shooting*). Stage 5 found no opened source stating the equation; a published range ("8 to 9 in at 1000 yd") was not matched for the one bullet chosen (9.31 in; probe E13 reproduces 9.31 in, SG 1.974). **Unverified; source Unresolved.**
- Sign: right-hand twist drifts right. Confirmed from code (hold is the opposite way).
- No lower limit on SG: the formula is still applied when the stability estimate is below 1 (a bullet the same page says may tumble). **Suspected** misuse; not reproduced as a displayed number in this audit.

### 7.3 Stability (Miller)
Form: `SG = 30 m / (t^2 d^3 l (1 + l^2)) x (v / 2800)^(1/3) x ((T + 460)/519) x (29.92/p)`. Stage 5 matched the engine to the printed equation in arXiv 1410.5340 (opened in Stage 5); Miller's own article (D. G. Miller, "A New Rule for Estimating Rifling Twist", *Precision Shooting*, March 2005) was not opened. **Bullet length is not an input:** it is estimated as `weight / (1875 x pi/4 x d^2)`, that is an assumed average density of 1875 grains per cubic inch (about 7.4 g/cm^3). Real lengths differ (boat-tails, plastic tips, monolithic copper). **Suspected**: the stability value, the page's tumble hint and the spin-drift number all inherit that assumption. The hint text "The twist is fast enough." is a definite statement built on an estimate (Suspected transparency issue).

### 7.4 Coriolis and Eotvos
- Horizontal: `2 Omega sin(lat) integral(x dt)`. Vertical: `2 Omega cos(lat) sin(azimuth) integral(x dt)`, with `Omega = 7.292115e-5` rad/s. Standard first-order forms from McCoy (1999); cited, not opened. Stage 5 derived them and checked directions (sign by hemisphere and east-west, zeros at the equator and pole). **Unverified** against measurements. The probe example gives 3.34 in at 1000 yd, outside a published "2.5 to 3.0 in" range for an unnamed bullet (reported, not tuned).
- The terms that depend on vertical velocity (the range-direction Coriolis term) are not included. For angled shots, slope distance is used where horizontal geometry is meant. **Suspected**, not measured.
- Constant standard gravity 9.80665 m/s^2 everywhere. Actual gravity varies about +/-0.27% about that value with latitude and altitude. That scales drop by a similar fraction, about 1.1 in of 422 in at 1000 yd. **Suspected / small**, computed by proportion, not by a run.

### 7.5 Not modeled (Confirmed absences)
Aerodynamic jump, yaw of repose, Magnus force, variable BC with velocity, bullet length and shape beyond G1/G7, wind shear, humidity-dependent gamma, varying gravity, powder-temperature model beyond a linear coefficient the user enters, muzzle-velocity variation.

## 8. Confirmed defects and weaknesses (reproduced)

None of these changes the arithmetic inside the drag equation. Each was reproduced here or read from code, as stated. **None has been fixed.**

| ID | Finding | Evidence | Size / severity |
| --- | --- | --- | --- |
| **C1** | Moving-target input never existed in the baseline; the code was disconnected and unreachable. Removed in Stage 4. | Git history, section 2 | Resolved by removal; restoration undecided |
| **C2** | **An unreachable zero distance gives a silent wrong result.** If no launch angle can hit the sight line at the zero distance, the bisection ends at its upper bound (0.35 rad, 20 degrees) and the app still shows an elevation. Example: 500 fps, BC 0.05, zero 1000 yd, distance 500 yd shows "10.8 up" with no notice (UI) and the engine returns elevation 16.8 MOA at 500 yd (E10). | `stage8-audit-engine-1.js` E10; `stage8-audit-ui.js` | Needs extreme inputs. The probe's four loads: 22 LR 1050 fps at 300 or 1000 yd, a 9 mm load at 1000 yd, and 500 fps at 600 yd; only the last reached the bound (theta 0.3500). Severity: low frequency, high wrongness. |
| **C3** | **Level and angled shots use different elevation methods.** At 0 degrees the hold is `-drop/x`; at any other angle it is a re-solved launch angle. A 0.0001 degree angle changes the answer: 0.0016 mil at 1000 yd, 0.0109 mil at 1500 yd (about 0.6 in) (E1). | `stage8-audit-engine-1.js` E1, E11 | Small. It is an internal inconsistency, not a measure of which is closer to reality. |
| **C4** | **Pressure limit conflicts with the altitude limit.** Pressure 20 to 32.5 inHg is rejected above about 10,700 ft; altitude is allowed to 15,000 ft, where station pressure is about 16.9 inHg. A user at 12,000 ft who types their true pressure is told it is invalid. | `stage8-audit-ui.js` P9 | Medium for high-altitude users; the error is shown (not silent) |
| **C5** | **A saved profile that lacks a field takes the previous rifle's value for it.** `switchPerson` applies another profile's stored object without merging defaults, and `applyProfile` skips missing keys, so the form keeps the last rifle's text. Reproduced: switching to a profile without `twist` and `h` showed twist 7 and height 2.2 from the other profile. | `stage8-audit-ui.js` P1 | Latent (needs a stored profile with a missing key, for example an older version or hand-edited data). Data-integrity risk because the wrong rifle's number feeds a calculation without a notice. Stage 7 handled only its own new key. |
| **C6** | **A velocity fitted by the truing function is labeled "Your entered velocity".** `fitTrue` sets the source flag to `user`, and the velocity line then reads "Your entered velocity. This is the velocity the calculation uses." A fitted velocity is a curve-fit that absorbs drag and BC error; it is not a measured one. Introduced in Stage 7. | Code reading (`fitTrue`, `renderV0`); not run in a browser | Labeling issue against the stated product rule |
| **C6b** | The pressure field is labeled "Air pressure (inHg)" while the model needs station pressure; sea-level-adjusted values give about 20% density error at 5000 ft. | Label text; arithmetic | Medium for users at altitude |
| **C7** | Dead code in the solver block: `cdG1` and `maxOrdinate` have no caller in the page. Not harmful; it cannot be removed without changing the frozen block. | `grep` of callers | Cosmetic |
| **C8** | Energy uses 450240 (g = 32.16 ft/s^2); the standard value gives 450436. Energy is 0.04% high (2620.3 against 2619.2 ft-lb for the .308 example). | Arithmetic, E14 | Trivial |

## 9. Questionable assumptions, measured where possible

| ID | Assumption | What was measured | Status |
| --- | --- | --- | --- |
| A1 | The rifle was zeroed in today's atmosphere. | Zeroed in standard air then shot elsewhere, difference from the app: **100 yd zero**, at 500 yd, 0.01 to 0.04 MOA (20 F, 100 F, 5000 ft, 10,000 ft). **500 yd zero**, at 1000 yd: -0.31 MOA at 20 F, +0.28 at 100 F, **+0.78 at 5000 ft, +1.39 at 10,000 ft** (`engine-2` section 1). | Confirmed size. The app has no input for the zero atmosphere. |
| A2 | One constant BC across the flight. | Not measured. Hornady states that G1 and G7 may not match some modern bullets and that truing a BC moves error around (Stage 5 docs). | Unresolved |
| A3 | Estimated bullet length for stability and spin drift (1875 gr/in^3). | Not measured against real bullets here. | Suspected |
| A4 | Default 50% humidity differs from the dry ICAO value. | -0.32% density. | Confirmed |
| A5 | Weight edits rescale BC. | .462 becomes .522 at 190 gr. | Confirmed behaviour; suitability Suspected |
| A6 | `gamma = 1.4`, uniform air, no wind variation, constant gravity. | Gravity proportion about 0.27%; others not measured. | Suspected |
| A7 | "MOA" is true MOA (3437.7468 per radian, 1.0472 in per 100 yd). Click values "1/4 MOA" are treated as 0.25 true MOA. A scope marked in 1.000 in per 100 yd ("IPHY") differs by 4.7%. No such option exists. Scope tracking error is not addressed. | Arithmetic | Confirmed behaviour; user impact Unresolved |
| A8 | Temperature effect on velocity is a straight line the user enters (`vsens`). No default, never validated. | Not measured | Confirmed behaviour |

### 9.1 Unit conversions (Confirmed by arithmetic, all in the solver block)

| Constant | Value in code | Exact or standard value | Match |
| --- | --- | --- | --- |
| feet to metres | 0.3048 | 0.3048 (exact) | yes |
| yards to metres | 0.9144 | 0.9144 (exact) | yes |
| inches to metres | 0.0254 | 0.0254 (exact) | yes |
| mph to m/s | 0.44704 | 0.44704 (exact) | yes |
| lb/in^2 to kg/m^2 | 703.0696 | 703.06958 | yes |
| inHg to Pa | 3386.389 | 3386.389 (conventional) | yes |
| radians to MOA | 3437.7468 | 3437.74677 | yes |
| radians to mil | x 1000 | milliradian | yes |
| ft-lb energy | wt x v^2 / 450240 | wt x v^2 / 450436 | 0.04% high (C8) |
| standard gravity | 9.80665 | 9.80665 (exact) | yes |

## 10. Scope adjustment and angular calculations
- Level shot: `elev = -(y - h) / x` radians (`dopeAt`), converted to MOA and mil. Small-angle form; the difference from the arctangent at 1500 yd is 6e-6 rad (E11).
- Angled shot: launch angle re-solved with gravity rotated by the slope angle; hold is the difference from the zero angle. This is the right frame rotation in principle; no external comparison covers it (Stage 5: no reference comparison for uphill or downhill).
- Clicks: `round(MOA or mil / click size)`; MOA clicks use true MOA.
- Zero geometry: the line of sight is horizontal at the scope height above the bore start; the bore is raised until the path crosses that line at the zero distance.

## 11. Input validation and missing-input handling
Good: Stage 3 names each empty, non-numeric or out-of-range field, shows no result, and never saves a substituted default. Step 7 spelled out units. Remaining gaps:

| ID | Gap | Status |
| --- | --- | --- |
| V1 | No cross-field checks: BC against weight and diameter, weight against diameter (implausible densities), BC type against BC value. | Confirmed absence |
| V2 | Zero distance reachability is not checked (C2). | Confirmed |
| V3 | Pressure range cannot express high altitude (C4). | Confirmed |
| V4 | Stability below 1 still produces a spin-drift number. | Suspected |
| V5 | The advisory ranges (`VALIDATED`) describe the reference comparisons (manufacturer tables up to 500 yd), not physical limits. | Confirmed by design (Stage 6) |
| V6 | Imported backup code values are copied as text (limited to 80 characters) and checked only when used. Invalid imports are flagged, not rejected. | Confirmed behaviour; low |
| V7 | Out-of-range numbers inside the engine are silently clamped in `atmosphere` (humidity) and `cdOf` (Mach beyond the table). | Confirmed, low |

## 12. Data persistence and the link from saved profiles to calculation inputs

- **Storage.** `localStorage` key `scopedope.v2`, schema 1: `{schema, pi, people, session}`. Backup copies under `scopedope.backup.*`, unreadable data under `scopedope.damaged.*`, older key `scopedope.v1`. Saving is switched off for the session if a safety copy cannot be made. Confirmed (code and Stage 2 tests).
- **The form is the single source.** Every calculation reads the current text in the HTML fields through `readInputs()`. A profile is the 21 field texts (`PKEYS`) stored as typed. Loading a profile writes those texts into the fields and recalculates. So what is saved is what is calculated, with no hidden conversion. Confirmed.
- **Session values** (`dist`, `wind`, `windHr`, `angle`, `az`, chart range) are shared by all rifles, not stored per rifle. `az` (shooting direction) therefore does not follow the rifle. Confirmed.
- **Risks found:** C5 (missing-key carry-over), C6 (fitted velocity labeled as entered), the preset still replacing BC, weight, diameter, twist and model with a message (Step 7 limitation), and the weight-scaled BC (A5). The service worker serves the network copy first and falls back to the cache offline, so a stale engine could run only offline (Suspected, low; the model version is shown on screen).
- **Verified by tests (Stage 2 and Step 7):** unreadable and newer-schema data are copied before anything is replaced; entered velocity survives preset selection, save and reload; the old saved format loads unchanged.

## 13. Recommended corrections, ranked by priority
**Proposals only. Nothing here is approved or started.** Items marked **[calc]** would change a calculated number or the solver block and so need a new model version, a regenerated golden baseline and your approval first.

| Rank | Item | Finding | Type |
| --- | --- | --- | --- |
| 1 | Add a reachability check for the zero distance and show a named error instead of a result | C2 | Input validation (outside the solver block) |
| 2 | Fix the pressure limit so it can express high-altitude station pressure (limit tied to the altitude range), and relabel the field "Station pressure (not sea-level)" with a hint | C4, C6b | Input validation and label |
| 3 | Merge defaults when a profile is applied and never leave another rifle's value in a field | C5 | Persistence |
| 4 | Label a fitted velocity or BC as "fitted", not "your entered velocity", and warn that it absorbs drag-table error | C6 | UX and data integrity |
| 5 | Replace the "The twist is fast enough." certainty with an estimate wording, and stop showing spin drift when SG < 1 | 7.2, 7.3 | Display |
| 6 | Add an optional zero-atmosphere input (temperature, altitude/pressure at the time of zeroing) | A1 | **[calc]** |
| 7 | Make level and angled shots use one elevation method | C3 | **[calc]** |
| 8 | Add bullet length as an input (optional) and use it in stability | A3 | **[calc]** |
| 9 | Decide whether weight edits should rescale BC, or leave BC alone and warn | A5 | Behaviour |
| 10 | Evaluate established ballistics libraries and the original G-function sources before any engine rewrite (Step 3 of the roadmap); keep the current engine as the reference for regression | section 14 | Research |
| 11 | Decide whether moving-target lead is wanted; if so, design it fully (section 2.5) | C1 | Product decision, **[calc]** |
| 12 | Add an optional scope click type (true MOA versus 1 in per 100 yd) | A7 | **[calc]**-adjacent |

## 14. Proposed independent validation strategy (not started)
1. **Primary drag sources first.** Obtain the original G1 and G7 drag functions from a primary publication (for example the BRL/Aberdeen report series, McCoy's *Modern Exterior Ballistics*, and Lowry 1965 if obtainable), and compare every table point and the interpolation. Until then the tables stay Unverified.
2. **Measured flight data, not other calculators.** Seek published chronograph and Doppler-radar data with stated bullet, atmosphere and zero (for example Litz-type measured BC and drag-curve publications, and range firing records). The 26-value Doppler comparison already in `tests/validation/measured-doppler.json` tests drag only. Add trajectory-level data (drop at several ranges) before any accuracy claim.
3. **Library cross-check with provenance.** Run the same inputs through at least two established, openly documented trajectory libraries and record each library's drag model, integrator and atmosphere, then explain every difference. Agreement is consistency, never accuracy (check each library's licence before reading or copying any of its code).
4. **Isolate each physical effect.** Separate tests for: drag table lookup, atmosphere (against the 1976 standard tables), zero geometry, angled-shot geometry, wind lag rule, Coriolis (against an independent derivation or a published worked example), spin drift (against the original formula source).
5. **Pre-registered tolerances.** Keep the Stage 5 rule: tolerances written before the comparison, failures reported as they come out.
6. **Cover the range the app allows.** The reference comparisons cover 50 to 500 yd, 2600 to 3000 fps, 130 to 180 gr, two calibers. The app allows 10 to 2000 yd, 500 to 4500 fps, 15 to 800 gr. Extend the data or narrow the claim.
7. **Regression guard.** Keep the golden baseline and the solver-block guard; any engine change gets a new model version.

## 15. What this audit did not do
- It did not open any cited primary source, except where Stage 5 recorded doing so.
- It did not compare the engine with measured bullet flight.
- It did not test other browsers, other devices or the installed (offline) app.
- It did not measure the effect of the items marked Suspected without a number.
- It did not change any code, test expectation, data, label or interface.

## 16. Files added by this audit
- `docs/STAGE8_CALCULATION_AUDIT.md` (this report)
- `tests/tools/stage8-audit-engine-1.js`, `tests/tools/stage8-audit-engine-2.js`, `tests/tools/stage8-audit-ui.js` (read-only probes)

**Status: audit complete. Stopped as instructed. No fixes, no solver separation, no formula changes, no library replacement. Awaiting your review and approval of the next stage.**
