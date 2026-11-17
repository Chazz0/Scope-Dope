# Stage 10: Scientific verification (audit)

Date: 2026-11-17. Branch `stage-10-scientific-verification`, from the approved Stage 9.1 commit `1732d7941fbdb054f555b186aa382a032d355967`.
Model version: **1.0.0, unchanged.** Physical accuracy: **NOT DEMONSTRATED.**

This is an audit. It changes no solver code, drag-table value, formula, reference value, tolerance, golden baseline or model version, and `index.html` is byte-identical to Stage 9.1 (guard tests in `tests/stage10.test.js`). Where a possible defect was found it is documented and recommended for a separately authorized stage. It was not fixed and nothing was tuned to match a manufacturer or another calculator.

Agreement with another calculator, or with a published table, is not evidence that the model predicts real bullets. Nothing here is a measured-flight comparison.

## 1. Status of each component

Status words, used strictly:

- **VERIFIED**: compared with a named source that was opened and read, agreed within a stated tolerance. The scope is always stated and never means physical accuracy.
- **PARTIALLY VERIFIED**: some part was checked against an opened source or an independent calculation, and a stated part was not.
- **UNVERIFIED**: no opened source or independent check establishes it.
- **DISCREPANCY FOUND**: an independent check disagrees with the implementation by an amount that matters at the stated scale.

| Component | Status | Scope and basis |
| --- | --- | --- |
| G1 drag table | UNVERIFIED | No primary source could be opened. 79 of 79 points equal one secondary copy of unknown origin; the Mach 3 value (0.5133) is consistent with the 0.51 Applied Ballistics prints (rounded). See 3.1. |
| G7 drag table | UNVERIFIED | Same. 83 of 83 shared points equal the secondary copy, which has one extra point (Mach 1.125). Applied Ballistics prints 0.24 at Mach 3; the table has 0.2424. See 3.1. |
| Interpolation of the drag tables (linear) | PARTIALLY VERIFIED | The numerical effect of linear interpolation was measured independently (at most 0.04 in at 1000 to 1500 yd against a smooth cubic through the same points). Whether linear interpolation matches how the original tables were meant to be read is unknown. |
| Integrator and zeroing (RK2, 0.5 ms; bisection) | PARTIALLY VERIFIED | Independent integration (DOP853, tolerance 1e-11) agrees to 0.0002 in on drop, 3e-8 s on time of flight and 5e-5 fps on velocity out to 1500 yd. The drag law itself is not verified. |
| Altitude to pressure | PARTIALLY VERIFIED | Matches the U.S. Standard Atmosphere 1976 troposphere as implemented in a public-domain reference program (0 to 0.044% to 15,000 ft). The 1976 report itself could not be opened. |
| Moist-air density | PARTIALLY VERIFIED | Matches dry-air reference densities within 0.004% and an independently written mixture formula within 0.0011%. Humid-air density was not compared with measured data. |
| Vapor pressure (Magnus) | PARTIALLY VERIFIED | Constants match those listed as Alduchov and Eskridge on a university page (paper not opened). 0.3 to 0.63% below the Cramer-printed formula over -10 to 50 C; effect on air density 0.01%. |
| Speed of sound, `sqrt(1.4 p / rho)` | PARTIALLY VERIFIED | Within -0.04% to +0.09% of Cramer (1993) inside Cramer's stated range, and -0.15% to +0.21% of an ideal-gas mixture model over the whole input range. Effect at most 0.03 MOA at 1000 yd. |
| Station pressure handling | VERIFIED | Scope: the model's density equation needs absolute (station) pressure, and typing sea-level-adjusted pressure at 5000 ft overstates air density by 20.2% (computed). This is arithmetic about the model, not a statement about any user's data. |
| Miller stability formula | VERIFIED | Scope: equation form and constants only. Equal to Equation 1 of Courtney and Miller (arXiv 1410.5340, opened) and to a separate coding to 1e-14%. Says nothing about a real bullet. |
| Assumed bullet length (1875 gr/in^3 cylinder) | UNVERIFIED | No measured length could be obtained. Sensitivity measured: about -2.9% stability per +1% length. See 3.3. |
| Spin drift `1.25 (SG + 1.2) t^1.83` | UNVERIFIED | The equation's primary source was not opened. A forum post attributes it to Litz. The implementation equals the formula as quoted (arithmetic checked). Depends on the estimated length through SG. |
| Coriolis (first-order closed form) | DISCREPANCY FOUND | Signs and directions agree with a full-vector integration, and the magnitudes agree exactly when drag is removed. With drag, the closed form is larger by 14% at 500 yd, 33% at 1000 yd and 47% at 1500 yd for one sample bullet. See 3.4. |
| Crosswind (lag rule) | PARTIALLY VERIFIED | Agrees with a 3D point-mass integration that puts the wind in the drag law to 0.006% (0.013 in of 221.5 in at 1000 yd). The lag-rule source was not opened; no measured wind data; uniform wind only. |
| Angled-shot elevation (rotated frame) | PARTIALLY VERIFIED | Agrees with a separate inertial-frame solution to 1e-5 MOA. No external or measured comparison exists. |
| Level-shot elevation shortcut (`-drop/x`) | DISCREPANCY FOUND | Internal only. It differs from a re-solved launch angle by 0.005 MOA at 1000 yd and 0.026 MOA at 1500 yd (6.5 mm G7 case). Small, but it is the known Stage 8 item C3, now measured against an independent solution. |
| Independent implementation comparison (maintained external program) | UNVERIFIED | No independently maintained ballistic program could be run or read here. The comparison done is a same-author re-implementation (above), which checks implementation, not independence of method or data. |
| Manufacturer reference data | PARTIALLY VERIFIED | Fresh reads of two original manufacturer pages agree with the stored values (20 distinct Federal page cells, checked as 42 comparisons across four records, plus the Hornady LE rows; 0 mismatches). The reads still go through a page-summarizing tool, and several datasets come from secondary pages. See 3.6. |

## 2. Sources and access

Every page below was read through WebFetch or WebSearch. WebFetch returns a model-written extraction, not raw HTML or the original PDF, so a read is corroboration and not a copy of the source. The shell has no direct network access.

| Id | Source | Link | Used for | Limit |
| --- | --- | --- | --- | --- |
| S1 | ballistics-engine 0.33.0 data README and `g7.csv` (docs.rs) | https://docs.rs/crate/ballistics-engine/0.33.0/source/data/README.md | Names the claimed origin chain of the tables: Lowry 1965 and McCoy, ARBRL-TR-02293 (1981); says ICAO atmosphere | Secondary, no verification. Same lineage as the copy already in `tests/validation/third-party-tables/`. |
| S2 | Applied Ballistics, ABDOC130 "Drag Curve Models" | https://appliedballisticsllc.com/wp-content/uploads/2019/11/ABDOC130_CDM.pdf | Mach 3 values 0.51 (G1) and 0.24 (G7). No tables, no geometry | Two numbers only. |
| S3 | dexadine.com Ballistic Explorer help | https://dexadine.com/bexhelp/bexhelp117.htm | States most drag tables derive from SAAMI tables (used with permission) | Does not give values or a bibliography. |
| S4 | snipershide thread "G1 & G7 Tables?" | https://www.snipershide.com/shooting/goto/post?id=9268996 | A poster cites the Ordnance Department 1924 "Exterior Ballistic Tables Based on Numerical Integration" as the source of G1 and says an updated G7 ("Rev II") is proprietary | Forum claim, unchecked. |
| S5 | Bookstaber, "Standard Drag Models and Ballistic Coefficients" | https://david.bookstaber.com/Interests/2024/04/standard-drag-models-and-ballistic-coefficients/ | G7 profile resembles the 168 gr .308 OTM bullet; no table values | No origin documents. |
| S6 | pdas.com `atmos76.f90` | https://www.pdas.com/programs/atmos76.f90 | U.S. Standard Atmosphere 1976 constants and layer table (T0 288.15 K, P0 101325 Pa, R* 8314.32, M0 28.9644, g0 9.80665, r0 6356.766 km, lapse -6.5 K/km) | Public-domain implementation of the standard, not the standard. |
| S7 | NASA-TM-X-74335 record | https://ntrs.nasa.gov/api/citations/19770009539/ | Confirms the 1976 report exists (NOAA-S/T-76-1562) | The PDF fetch failed and the text file is not on the allowlist, so the document itself was not opened. |
| S8 | pyfar `speed_of_sound` source (documentation) | https://pyfar.readthedocs.io/en/stable/_modules/pyfar/constants/speed_of_sound.html | Cramer (1993) Table III coefficients and equations; Ostashev and Wilson ideal-gas mixture equation; validity ranges | Documentation of an implementation. Cramer's paper and the book were not opened. |
| S9 | Wikipedia "Density of air" (read through the page reader) | https://en.wikipedia.org/wiki/Density_of_air | Dry-air densities (35 C 1.1455, 20 C 1.2041, 0 C 1.2923, -10 C 1.3414, -25 C 1.4224 kg/m3), Rd 287.058, Rv 461.495, "less than 0.2%" stated error | Secondary; equations did not render. |
| S10 | University of Miami Humidity page (August-Roche-Magnus) | https://bmcnoldy.earth.miami.edu/Humidity.html | Constants 17.625 and 243.04; cites Alduchov and Eskridge (1996) | The page does not say which reference supplies the constants. |
| S11 | OSTI record for Alduchov and Eskridge | https://www.osti.gov/biblio/548871 | Confirms the paper exists | Abstract only; no coefficients on the page. |
| S12 | Courtney and Miller, "A Stability Formula for Plastic-Tipped Bullets" | https://arxiv.org/abs/1410.5340 | Miller stability equation as printed; constant-density assumption; applies to solid bullets; total length used | Opened. This is the one equation source that was opened. |
| S13 | Applied Ballistics, "Gyroscopic (Spin) Drift and Coriolis Effect" | https://appliedballisticsllc.com/wp-content/uploads/2021/06/Gyroscopic-Drift-and-Coriolis-Effect.pdf | Spin drift "8-9 inches at 1000 yards" for a typical trajectory; "no more than 10 to 12 inches"; Coriolis horizontal zero at the equator, vertical zero firing north or south; 2.5 to 3.0 in at 45 degrees N, 1000 yd | **Contains no equations and no bullet.** |
| S14 | snipershide thread on spin drift | https://www.snipershide.com/shooting/threads/spin-drift-308-and-50-bmg-caculations.88683 | A post gives "Drift = 1.25 * (Sg + 1.2) * ToF^1.83" and attributes it to Litz | Forum post, no page number. |
| S15 | UNITAF Force Manual Coriolis pages | https://unitedtaskforce.net/handbook/block/553/horizontal-coriolis-force-calculation | Not used as evidence | A game-community manual. Its horizontal formula uses cos(latitude), which conflicts with S13 (horizontal is zero at the equator). Recorded as a conflicting non-authoritative source. |
| S16 | Federal and Hornady LE product pages | see 3.6 | Fresh re-read of stored reference values | Summarizing reader. |
| S17 | Sierra 2025 catalog, Sierra and Hornady product pages, Applied Ballistics bullet list | https://sierrabullets.com/content/2025-sierra-bullets-catalog-poster.pdf | Looking for bullet length. None of these list length. Sierra prints G1 BC .462 (168 gr) and .533 (190 gr), the same numbers as two app presets | Length not obtained. |

## 3. Findings

### 3.1 G1 and G7 drag tables (investigation 1)

**Facts established**

- No authoritative original could be opened. The sources found name three different origin stories and none contains the table: Lowry (1965) with BRL refinement (S1, and Stage 5's reading), SAAMI tables (S3), and an Ordnance Department 1924 publication (S4). The McCoy report ARBRL-TR-02293 was opened in Stage 5 and contains a drag-estimation program, not the G tables.
- `node tests/tools/compare-g-tables.js` (rerun): G1 identical at 79 of 79 points; G7 identical at all 83 shared Mach points. The secondary copy has Mach 1.125 (Cd 0.3987) which `index.html` lacks. The app interpolates 0.39845 there, a difference of 0.00025. Adding the point changes the 1500 yd drop of the .308 175 gr G7 case by 0.009 in.
- Both copies come from the same open-source lineage (S1), so their agreement does not verify either.
- Structure (from `tests/tools/stage10-independent.py`): Mach 0 to 5, strictly increasing, no duplicates, spacing 0.025 to 0.2. G1 has 79 points, Cd 0.2020 to 0.6625; G7 has 83 points, Cd 0.1193 to 0.4043. G1 has no point at Mach 0.65 (spacing 0.1 between 0.6 and 0.7); G7 has none at 1.45 (1.4 to 1.5). Worst-case rounding from four decimals is 0.025% (G1) and 0.042% (G7) of the smallest Cd.
- Values above Mach 5 and below Mach 0 hold the end value. The solver stops a trace when horizontal speed falls to 15 m/s, so flights that slow far below Mach 0.5 are cut off.
- Mach 3 spot check: 0.5133 and 0.2424 against 0.51 and 0.24 printed to two decimals (S2): consistent, not a verification of the table.

**Interpolation effect (independent integrator, same tables).** Linear interpolation against a monotone cubic through the same points:

| Case | Range | Linear | Cubic | Difference |
| --- | --- | --- | --- | --- |
| .308 175 gr, G7 0.243, 2700 fps | 1000 yd | -393.626 in | -393.607 in | -0.019 in |
| .308 168 gr, G1 0.462, 2650 fps | 1000 yd | -422.301 in | -422.316 in | +0.016 in |
| 6.5 mm 140 gr, G7 0.305, 2710 fps | 1500 yd | -1069.491 in | -1069.455 in | -0.037 in |
| G1 0.243, 3240 fps (Mach 0.78 at the target) | 1000 yd | -547.720 in | -547.757 in | +0.037 in |
| G7 0.243, 2200 fps (Mach 0.88 at the target) | 1000 yd | -645.951 in | -645.910 in | -0.042 in |

**Significance.** The table values and their origin matter far more than the interpolation. The G7 curve rises from Cd 0.2054 at Mach 0.95 to 0.4043 at Mach 1.05, so any difference in that region would matter much more than the effect measured above. The Hornady and Federal comparisons from Stage 5 (200 of 211 within tolerance) constrain the tables only together with the BC and atmosphere assumptions. They do not verify the table.

**Not done.** No value was replaced, adjusted or "corrected". There is no evidence of an altered or unsupported entry, and equally no primary evidence that every entry is right.

### 3.2 Atmospheric calculations (investigation 2)

Implementation (`atmosphere()` in the solver): pressure from altitude `101325 (1 - 2.25577e-5 h)^5.25588` or from the entered station pressure times 3386.389 Pa/inHg; vapor pressure `610.94 exp(17.625 t / (t + 243.04))` times relative humidity; `rho = (p - pv) / (287.058 T) + pv / (461.495 T)`; speed of sound `sqrt(1.4 p / rho)`.

| Check | Result |
| --- | --- |
| Exponent `g0 M0 / (R* L)` from the 1976 constants (S6) | 5.25588, the same as the app. `L / T0` = 2.25577e-5 per m, the same as the app. |
| App pressure against the 1976 troposphere (geometric altitude converted to geopotential) | 0 ft: 0.0000%; 5000 ft: -0.0045%; 10,000 ft: -0.0186%; 15,000 ft: -0.0435%. The app treats geometric altitude as geopotential, which is the whole difference. |
| Sea level, 59 F, dry | Density 1.22498 against 1.2250 (-0.0018%); speed of sound 340.297 against 340.294 m/s (+0.0009%). |
| Dry density at 101.325 kPa against S9 | 35 C -0.002%, 20 C -0.001%, 0 C -0.004%, -10 C -0.003%, -25 C +0.003%. |
| Moist density against an independently written mixture formula (140 points, -40 to 130 F, 0 to 15,000 ft, RH 0 to 100) | -0.0000% to +0.0011%. |
| Vapor pressure, Magnus against the Cramer-printed formula with enhancement factor | -0.31% at -10 C, -0.42% at 0 C, -0.62% at 20 C, -0.63% at 30 C, -0.39% at 50 C. Effect on density: 0.01% at 30 C, 100% RH. |
| Speed of sound against Cramer (31 points inside 0 to 30 C, 75 to 102 kPa) | -0.039% to +0.090%. |
| Speed of sound against the ideal-gas mixture model (all 140 points) | -0.149% to +0.214%, worst at 130 F, 15,000 ft, RH 50. |
| Effect sizes on the 1000 yd drop (.308 175 gr G7) | Speed of sound +0.2%: -0.31 in (0.03 MOA). Air density +0.5%: -1.66 in (0.16 MOA). Air density -1.8% (the Aberdeen against ICAO difference in `docs/SOURCE_RESEARCH.md`): +5.89 in (0.56 MOA). |
| Station against sea-level pressure at 5000 ft, ISA temperature | Typing 29.92 inHg where station pressure belongs gives air density +20.2% (1.2685 against 1.0555 kg/m3). Since Stage 9 the field is labeled "Station pressure (not sea-level pressure)". |

**Boundary conditions.** The UI limits are -40 to 130 F, -500 to 15,000 ft, 15 to 32.5 inHg, 0 to 100% RH. The 1976 troposphere formula holds to 11 km (36,089 ft), well above 15,000 ft. Cramer's formula is stated valid only for 0 to 30 C and 75 to 102 kPa; outside that, only the ideal-gas model was available as a comparison, and it is a derived model, not data. The Magnus form is used over water at all temperatures, so below 0 C the humidity is relative to water, which is the usual meteorological convention. Temperature is always the user's entry; with no pressure entered, only the pressure comes from the standard atmosphere.

**Significance.** Every atmosphere difference found is at most 0.03 MOA at 1000 yd, except the pressure field confusion (20%), which is handled by the Stage 9 label, and the Aberdeen against ICAO question, which is a reference-data question and still not settled.

### 3.3 Stability (investigation 3)

- **Formula.** The app equals Equation 1 of S12: `Sg = 30 m / (t^2 d^3 L (1 + L^2)) (V / 2800)^(1/3) ((T + 460) / 519) (29.92 / P)`, with `m` in grains, `t` twist in calibers, `d` and `L` in inches and calibers, `V` in fps. Independent coding agrees to 1e-14% over 72 preset, temperature and altitude combinations. S12 states the reference atmosphere as 59 F and 29.92 inHg, as the app uses.
- **What is estimated.** Bullet length. The app has no length input and uses `L = m / (1875 (pi / 4) d^2)`, a plain cylinder of density 1875 gr/in^3 (7.41 g/cm^3). Weight, diameter, twist, velocity, temperature and pressure are entered values. No measured length was found for any preset bullet (S17).
- **Stated limits in the source (S12).** The original rule assumes a constant-density bullet, applies to solid bullets, and underestimates plastic-tipped bullets. Length appears in the `(1 + L^2)` term and linearly, both as total length. The velocity-correction wording in the extraction was garbled, so its validity range is unknown.
- **Sensitivity (derived arithmetic, not a measurement of a real bullet).** `d ln Sg / d ln L = -(1 + 3 L^2) / (1 + L^2)`, about -2.8 to -2.9 for the presets. A bullet 10% longer than assumed lowers the estimate by about 24%; one 10% shorter raises it by about 34 to 36% (the table's 0.90 and 1.10 columns against 1.00):

| Preset | Estimated length (cal) | SG at length x0.85 / x0.90 / x1.00 / x1.10 / x1.20 |
| --- | --- | --- |
| .223 55 gr | 3.32 | 4.76 / 4.06 / 3.02 / 2.30 / 1.79 |
| .243 95 gr | 4.50 | 2.00 / 1.70 / 1.25 / 0.95 / 0.73 |
| 6.5 Creedmoor 140 gr | 5.17 | 2.76 / 2.34 / 1.72 / 1.30 / 1.01 |
| .308 168 gr | 3.90 | 4.03 / 3.43 / 2.53 / 1.92 / 1.49 |
| 6.5 PRC 143 gr | 5.28 | 2.73 / 2.31 / 1.70 / 1.28 / 0.99 |

- **How to read the estimate, without changing the app.** It is an index that depends on an assumed shape, not a measurement of a bullet. A value near 1.0 can sit on either side of 1.0 once a real length is used (the 6.5 Creedmoor and 6.5 PRC rows cross 1.0 at about 20% extra length). The estimate feeds the spin-drift term, so the spin-drift value inherits that uncertainty. The Stage 9.1 warning below 1.0 already says this. Tipped bullets are expected to be underestimated by the formula itself (S12).
- Preset BCs for the 168 gr (.462) and 190 gr (.533) coincide with Sierra's published G1 values (S17). The other presets compared did not match a Sierra entry (for example the 95 gr preset .379 against Sierra's .490 for its 95 gr MatchKing). The presets are described in the app as typical values.

### 3.4 Spin drift, Coriolis, wind and angled shots (investigation 4)

**Spin drift.** Implementation: `1.25 (SG + 1.2) t^1.83` inches, with the sign set by twist direction.

- Source: the primary equation was not opened. S14 attributes it to Litz (book, no page). S13 (Applied Ballistics) gives no equation and states only "8-9 inches at 1000 yards" for a typical trajectory and "no more than 10 to 12 inches".
- Arithmetic: SG 1.4 at 1.9 s gives 10.52 in, matching the example quoted in S14. The app equals the formula for the three cases tested.
- App values at 1000 yd for sample bullets: 11.86 in (.308 175 gr G7, SG 2.36), 13.15 in (.308 168 gr G1, SG 2.53) and 7.97 in (6.5 mm 140 gr G7, SG 1.72). The 13.15 in value is above S13's "10 to 12" bound; S13 names no bullet, so this is a note and not a failure.
- Validity at SG below 1.0 is unknown. The coefficients are empirical. Not independently checked.

**Wind (lag rule).** Implementation: deflection `w (t - x / v0)`, with `t` from the no-wind trajectory. A separate 3D point-mass integration with the wind inside the drag law gives the same deflection to 0.006% or better:

| Case | Range | App | Independent 3D | Difference |
| --- | --- | --- | --- | --- |
| 10 mph, G7 175 gr | 500 yd | 20.774 in | 20.774 in | -0.0001 in |
| 10 mph, G7 175 gr | 1000 yd | 105.096 in | 105.097 in | -0.0011 in |
| 20 mph, G1 168 gr | 1000 yd | 221.515 in | 221.528 in | -0.0133 in |

The agreement shows the lag rule reproduces the crosswind response of this point-mass model. It does not validate wind behavior in flight: wind is uniform along the path, there is no vertical wind component, and the lag-rule source was not opened.

**Coriolis.** Implementation: horizontal `2 Omega sin(lat) integral(x dt)` and vertical `2 Omega cos(lat) sin(az) integral(x dt)`, Omega 7.292115e-5 rad/s, azimuth from north. Directions and signs match the independent full-vector integration `a = -2 Omega x v` and the qualitative statements in S13 (horizontal zero at the equator, vertical zero firing north or south, up when firing east). The magnitudes do not:

| Case, .308 175 gr G7 0.243, 2700 fps, 45 N, firing east | 500 yd | 1000 yd | 1500 yd |
| --- | --- | --- | --- |
| App (closed form), horizontal and vertical | 0.665 in | 3.622 in | 10.652 in |
| Independent full-vector integration, horizontal | 0.585 in | 2.720 in | 7.240 in |
| Independent over app | 0.88 | 0.75 | 0.68 |

Cause, tested (4d in `stage10-independent.py`): the closed form treats the sideways velocity that Coriolis creates as if drag did not act on it. Removing drag (BC 1e6) makes the two agree exactly (2.063 in both). The ratio of independent to app falls as drag grows: BC 5 gives 0.989, BC 0.5 gives 0.883, BC 0.243 gives 0.751, BC 0.15 gives 0.675. At 60 N firing southeast, 1500 yd, the horizontal terms are 13.046 in (app) and 8.805 in (independent).

This is a difference between a closed-form approximation and a full solution of the same point-mass equations. It does not show which is closer to a real bullet. For orientation, S13 gives 2.5 to 3.0 in for 45 N at 1000 yd for an unnamed typical trajectory; the independent value for this bullet is 2.72 in and the app's is 3.62 in. The earlier Stage 5 audit noted the app's 3.34 in for a different bullet sat outside that range. Neither number is a measurement.

Other differences from a full treatment: the horizontal term from vertical velocity (included in the independent run, absent in the app) is small compared with the drag effect; flat fire and horizontal firing are assumed. The vertical term uses the same closed form and shows the same pattern: at 45 N firing east the horizontal and vertical terms are equal, 3.622 in each in the app and 2.720 in each in the independent run at 1000 yd.

**Angled shots and the level-shot difference.**

- The angled branch (rotated frame, gravity components `g sin(theta)` and `g cos(theta)`) agrees with a separate solution in an inertial frame with gravity vertical and the sight line tilted (hit the point at slant range with the sight 1.5 in above the bore): elevation hold to 1.1e-5 MOA and drop at the zero angle to 0.0002 in, over 16 cases from -45 to +30 degrees and 300 to 1500 yd. The range input is slant range, which is what a rangefinder gives. The lag rule also uses slant distance. For flat fire this is consistent; it was not separately validated for steep angles.
- The level branch reports `-drop/x`, the angle of the zero-launch trajectory's miss, while the angled branch re-solves the launch angle. Against the re-solved level hold, the level shortcut is low by 0.0002 MOA at 500 yd, 0.005 MOA at 1000 yd, 0.014 MOA at 1200 yd and 0.026 MOA at 1500 yd (6.5 mm G7 case). A 0.0001 degree slope therefore changes the hold by 0.0052 MOA at 1000 yd (the Stage 8 number, 0.0016 mil). This is small compared with every other uncertainty and does not show which branch is closer to reality.

### 3.5 Independent implementation comparison (investigation 5)

**What was done.** `tests/tools/stage10-independent.py` is a separately written program (Python 3, numpy 2.5.3, scipy 1.18.1, DOP853 at 1e-11; app side Node 22, model 1.0.0). It uses the same drag law, the same tables (read from `index.html`) and, for the trajectory cases, the app's atmosphere formulas, so it tests the trajectory physics and the implementation, not the tables or the atmosphere constants. It was written by the same author as the app, from published equations.

**What could not be done.** No independently maintained ballistic program could be run. `pip` and package installs are off, raw GitHub files are not on the fetch allowlist, and the JBM Ballistics output tables on the two walkthrough pages found (loadoutroom.com and thearmsguide.com) are images with no readable numbers. The `py_ballisticcalc` documentation lists table structure and no values. So there is no external output with recorded inputs, versions and outputs to compare against.

**Results.** All 18 cases, 32 to 58 values per quantity, are in `tests/validation/stage10/independent-results.json` and `.txt`. Summary of the maximum |app - independent|:

| Quantity | Max difference |
| --- | --- |
| Zero launch angle | 3.4e-6 mrad |
| Drop | 0.00018 in |
| Time of flight | 3.3e-8 s |
| Velocity | 4.7e-5 fps |
| Elevation hold, level (Coriolis added back) | 0.036 MOA (the level shortcut above) |
| Elevation hold, angled | 1.1e-5 MOA |
| Crosswind deflection | 0.013 in |
| Coriolis horizontal and vertical | up to 4.24 in and 3.40 in at 1500 yd (the drag effect above) |

**Disagreements are explained, not removed.** The Coriolis difference is a modeling approximation (3.4); the level-shot difference is the shortcut (3.4). Nothing was changed to make either agree.

### 3.6 Existing reference datasets (investigation 6)

Reference values live in `tests/validation/references.json` (16 datasets, 3 tolerances, 2 table points, 1 trajectory case, 3 excluded sources). It is unchanged (SHA-256 `e09638be17a730645f6cf50e27c54129484ed90d4cb0c10ceb2cc9295d52abd3`, identical before and after Stage 10; `tests/golden/baseline.json` `1ed3b62d1f239b3572d71d638a54bdb301accdf88b8b1cf8a45aba5d55ef05c3`; `tests/validation/measured-doppler.json` `cba721faf1b9d99c394c1a9ac5fa5c3644f525b0f2bf3decb183cb476aae2f11`). The tolerances are unchanged: Cd 0.005, velocity 1.0%, drop the larger of 2% or 0.3 in.

**Where each dataset came from**

| Datasets | Page type | Read |
| --- | --- | --- |
| FEDERAL-GM-6.5CM-130 (G7 and G1 .560, average and long range, 4 records) | Manufacturer page (federalpremium.com) | R1; fresh re-read now |
| HORNADY-LE-140-OTMA (trajectory case) | Manufacturer page (hornadyle.com) | R3; fresh re-read now. Pairing owner-corrected. |
| FEDERAL-GM308M-168 (G7 .224 and G1 .462, 4 records) | Manufacturer page (federalpremium.com) for G7; G1 .462 from a third-party-hosted PDF (R8) | R5, R6, R8 |
| FEDERAL-GM308M2-175-G1 (2 records) | Distributor catalogue (le.vistaoutdoor.com), BC .505 unlabeled | R7 |
| HORNADY-SPIRE-180, ROUNDNOSE-180, CORR-TEST 1 to 4 (6 records) | Manufacturer page, stored URL `.../team-hornady/external-ballistics`; the read used `.../ballistic-information/ballistic-resources/external-ballistics` | R4 |
| Retailer copy | ammunitiontogo.com | R2: BC .286 against the manufacturer's .287 (known, record not changed) |

**Fresh re-read (this stage), different prompt, direct from the manufacturer pages.**

- Federal 6.5 CM 130 gr page: the 20 distinct page cells (6 velocities, 6 energies, 3 average-range and 5 long-range trajectory values), compared as 42 checks across the four stored records, all equal the stored values (0 mismatches), and the page prints BC .560 (unlabeled) and G7 .287 as stored. The long-range table's 200 yd cell is an image (the zero marker), consistent with the stored zero of 200 yd; the reader labeled that table "zero 100", which is the reader's inference.
- Hornady LE 140 gr OTM-A: velocities 2700 (muzzle), 2553, 2412, 2274, 2141, 2013 and energies 2266, 2027, 1808, 1608, 1425, 1259 and trajectory -1.5, 0, -3.8, -13.7, -30.2, -54.4 match the stored rows, with the 50 yd column a placeholder (0 / N/A / 0) and 2553 fps at 100 yd, which is the owner-corrected pairing.

**Findings from the review**

- All reads, including these, come from a summarizing page reader. No raw page or PDF was obtained. Original-source agreement is therefore corroboration.
- `tests/tools/independent-integrator.py` still hardcodes the discarded shifted pairing (2553 fps at 50 yd) as "as read from Hornady". The stored data is correct; the old tool's printed comparison is stale. Not edited in this stage.
- The Hornady dataset records cite the short URL, which could not be opened in this session. Whether it redirects to the page that was read is unresolved.
- Two datasets rest on pages that are not the manufacturer's own pages (the Vista distributor catalogue and the third-party-hosted PDF). They are the weakest provenance and should be rechecked against the manufacturer first.
- The Hornady atmosphere question is unchanged: still a supported hypothesis, not confirmed. For scale, a 1.8% lower air density moves the 1000 yd drop of the test bullet by 5.9 in (0.56 MOA).

## 4. Reproducible test cases

Run from the repository root:

```
node tests/tools/stage10-app-outputs.js          # writes tests/validation/stage10/app-outputs.json
python3 -I tests/tools/stage10-independent.py     # writes independent-results.json; text in independent-results.txt
node tests/tools/compare-g-tables.js              # table copies (unchanged tool)
node --test tests/stage10.test.js                 # guard tests
```

Exact inputs (all with sight height 1.5 in, zero 100 yd, 59 F, sea level, dry air unless stated; `v0` in fps, BC dimensionless):

| Case | Inputs |
| --- | --- |
| level-G7-175 | G7, BC 0.243, 2700 fps, 175 gr, .308, twist 10; ranges 100, 300, 500, 800, 1000, 1200 |
| level-G1-168 | G1, BC 0.462, 2650 fps, 168 gr; same ranges |
| level-G7-65cm | G7, BC 0.305, 2710 fps, 140 gr, .264, twist 8; 100, 500, 1000, 1500 |
| wind10-G7-175, wind20-G1-168 | as above with 10 mph from the right, 20 mph from the left |
| cori-lat45-east / west / north, cori-lat-45S-east, cori-lat60-az135, cori-eq-east | G7 0.243, 2700 fps, 175 gr, latitude and azimuth as named; 500, 1000, 1500 yd |
| angle+15, -15, +30, -45, +0.0001 | G7 0.243, 2700 fps, 175 gr, slope in degrees |
| hot-high, cold-low | 95 F, 10,000 ft, 60% RH; 14 F sea level |

Atmosphere grid: temperatures -40 to 130 F, altitudes 0 to 15,000 ft, RH 0, 50, 100 (140 points); stability grid: 8 presets by 3 temperatures by 3 altitudes (72 points).

## 5. Verified facts, assumptions and conclusions

**Verified facts (checked in this stage, with the scope stated)**

- The solver, drag tables, reference data, tolerances, golden baseline and model version are unchanged from Stage 9.1.
- The app's Miller formula equals the printed equation of S12 and a separate coding.
- The app's altitude-to-pressure expression equals the 1976 troposphere with the S6 constants to 0.044% at 15,000 ft.
- The app's trajectory integration, zero solution, wind lag-rule response and angled-shot geometry reproduce a separately written integration of the same equations to the figures in 3.4 and 3.5.
- The app's closed-form Coriolis displacement exceeds a full-vector integration of the same drag model by 14% to 47% for the sample bullet, and matches it with drag removed.
- Fresh reads of two manufacturer pages agree with the stored values (20 Federal page cells and the 5 Hornady LE distance rows; 0 mismatches).

**Assumptions in effect**

- G1 and G7 values are correct as tabulated; unverified.
- Uniform atmosphere, uniform wind, point mass (no yaw, jump or velocity-banded BC), a single BC.
- Bullet length from a 1875 gr/in^3 cylinder.
- The independent program is a fair check of the app's equations; it shares the author, the drag law and the tables.

**Conclusions (inference, not measurement)**

- The model's equations are implemented as written. This says nothing about whether they describe real bullets.
- The atmosphere formulas are consistent with the standards and models opened, to well below the size of the other uncertainties, except the pressure-field mix-up and the unresolved Aberdeen question.
- The largest software-side discrepancy found is the Coriolis magnitude with drag. The largest unknowns are the table provenance, the assumed length behind the spin-drift term, and everything that only measured trajectories can settle.

## 6. Inaccessible sources and unresolved questions

**Inaccessible or not opened**

- The primary G-table sources: Lowry (1965), the Ordnance Department 1924 publication, McCoy's *Modern Exterior Ballistics*, Peelen (2006). alternatewars.com disallows automated access.
- NASA-TM-X-74335 itself (PDF fetch failed; text file not on the allowlist). The Wikipedia ISA page was not on the allowlist.
- Cramer (1993), Ostashev and Wilson, Alduchov and Eskridge (1996) full text: equations and constants were read from documentation of implementations and a university page.
- Litz, *Applied Ballistics for Long Range Shooting* (spin drift, lag-rule source). The Applied Ballistics papers opened contain no equations.
- Any independently maintained ballistic program output: none was runnable or readable (see 3.5).
- Bullet lengths: not on any Sierra, Hornady or Applied Ballistics page opened.
- Raw manufacturer pages and PDFs; the short Hornady URL.
- DTIC ADA439796 (fetch failed).

**Unresolved questions**

1. What is the primary source of each G1 and G7 point, and is the Mach 1.125 point in the original?
2. Were the Hornady LE and Federal tables computed with ICAO or Aberdeen air, and with which drag function?
3. What is the primary source and validity range of the spin-drift equation, especially for SG below 1.0?
4. How far do real bullet lengths differ from the estimate, and in which direction for tipped and boat-tail bullets?
5. Which Coriolis magnitude is closer to measurement for flat-fire bullets: the closed form or the drag-coupled integration?
6. Does the Hornady short URL lead to the page that was read?

## 7. Recommended corrections for a future, separately authorized stage

Nothing below was implemented. Items that change a calculated number need a model-version bump and regenerated golden baselines.

| Priority | Recommendation | Basis |
| --- | --- | --- |
| 1 | Obtain the primary G1 and G7 sources (or a licensed table with provenance) and compare every point and the interpolation convention; decide on Mach 1.125 only then. | 3.1; the tables are the foundation and are still UNVERIFIED. |
| 2 | Obtain measured trajectory data (drop at several ranges with stated bullet, atmosphere and zero) and compare. This is the gate for any physical-accuracy statement. | Stage 8 item; unchanged. |
| 3 | Replace the closed-form Coriolis with the drag-coupled solution, or document the magnitude limit, after checking McCoy's treatment. Size: 0.9 in at 1000 yd and 3.4 in at 1500 yd for the sample bullet. | 3.4. A calculation change. |
| 4 | Add an optional measured bullet-length input and say that the formula underestimates tipped bullets. Until then keep the estimate labeled as an estimate. | 3.3; sensitivity about -2.9% per +1% length. |
| 5 | Find the primary spin-drift source and its validity range, including SG below 1.0. | 3.4. |
| 6 | Run an independently maintained ballistic program in an environment with package access, with recorded versions, inputs and outputs, and compare. | 3.5. |
| 7 | Recheck the Vista-catalogue and third-party-PDF datasets against manufacturer pages, and obtain raw pages or PDFs for all datasets. | 3.6. |
| 8 | Use one elevation method for level and angled shots. | 3.4; at most 0.026 MOA here. Stage 8 item 7. |
| 9 | Correct the stale pairing in `tests/tools/independent-integrator.py` and the Hornady record URL. | 3.6. Documentation and tooling only. |
| 10 | Consider a moist-air speed-of-sound expression and geopotential altitude. | 3.2; 0.03 MOA and 0.04% at most. Low. |

## 8. Documentation and file changes in this stage

Changed or added files (all on `stage-10-scientific-verification`; `index.html`, the reference data, the golden baseline and the third-party tables are not among them):

- `docs/STAGE10_SCIENTIFIC_VERIFICATION.md` (this report)
- `docs/MODEL_SOURCES_STAGE10_ADDENDUM.md` (new; records what Stage 10 added to the source picture and why). `docs/MODEL_SOURCES.md` itself is deliberately not edited: existing guard tests pin it, and no existing conclusion was rewritten.
- `docs/MODEL_CHANGELOG.md` (an entry saying there was no model change)
- `tests/README.md`
- `tests/stage10.test.js`
- `tests/tools/stage10-app-outputs.js`
- `tests/tools/stage10-independent.py`
- `tests/validation/stage10/` (`app-outputs.json`, `independent-results.json`, `independent-results.txt`)

Test results and the final commit hash are in the hand-off message for this stage.
