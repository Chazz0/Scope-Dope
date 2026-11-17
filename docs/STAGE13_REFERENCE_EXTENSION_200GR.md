# Stage 13: reference comparisons extended to 200 grains

**Physical accuracy: NOT DEMONSTRATED.** This stage adds one published factory table to the comparisons. The table is a manufacturer's *calculated* trajectory, not measured bullet flight. Agreement with it says the model reproduces that table within the stated tolerances for the compared conditions. It does not show the model matches real bullets. No solver, drag table, model version (1.0.0), golden baseline or tolerance was changed.

## Why

A 300 Win Mag 200 gr load showed "outside the reference comparisons" because the earlier comparisons covered 130 to 180 gr only. The warning was correct. The owner chose to extend the comparisons rather than remove or reword the warning.

## What was added

Source: Hornady 300 Win Mag 200 gr ELD-X Precision Hunter (item 82002), test-barrel (24 in) table, plus Hornady's published ballistic coefficient page for the same bullet. The table text was read twice by a summarizing page reader; both reads gave the same 18 numbers in the same order. The row and column labels are the reader's inference from that order.

| Item | Value |
|---|---|
| Muzzle | 2860 fps |
| 100 / 200 / 300 / 400 / 500 yd velocity | 2707 / 2558 / 2414 / 2274 / 2140 fps |
| Drop (in) | +1.6 / 0.0 / -6.9 / -19.9 / -39.5 |
| Sight height | 1.5 in (from the -1.5 in muzzle row) |
| Zero | 200 yd, **inferred** from 0.0 at 200 yd; the page does not state it |
| Diameter | 0.308 in, **assumed** for a 30 caliber bullet; not printed on the page |

Four datasets were registered **before any run** (commit 8eb45d6), covering both of Hornady's published coefficient bands, because the table spans two bands and the model uses a single coefficient: G1 0.597 and 0.588, G7 0.301 and 0.295. Each runs under both atmospheres (ICAO and Hornady Aberdeen). Nothing was tuned after seeing results.

## Results (tolerances unchanged)

40 comparisons (4 datasets x 2 atmospheres x 5 ranges): **38 match, 2 differ.**

| Dataset | Atmosphere | Range | Velocity (table vs model) | Error | Tolerance | Drop |
|---|---|---|---|---|---|---|
| G1 0.588 | ICAO | 500 yd | 2140 vs 2113.5 fps | **-1.24%** | 1% | within tolerance (-0.49 in) |
| G7 0.295 | ICAO | 500 yd | 2140 vs 2112.8 fps | **-1.27%** | 1% | within tolerance (-0.49 in) |

- ICAO velocity errors run from -0.12% to -0.76% for the two high-speed bands and to -1.27% for the lower-speed band at 500 yd. All Aberdeen velocity errors are within -0.73%. All drops are within tolerance.
- The model is slower than the table at every range in every run (consistent sign), which suggests the single-coefficient approximation across two bands, not scatter.
- Diagnostic only, not applied: fitting a coefficient to the Aberdeen data gives G1 0.6116 for the 0.588 set (+4.0%) and G7 0.3071 for the 0.295 set (+4.1%).
- The two misses are reported, not hidden, and are listed explicitly in `tests/validation.test.js`.

## What the widened envelope means

`VALIDATED` in `index.html` (outside the solver) is a coarse span over all compared datasets. It changed from weight 130 to 180 gr to 130 to 200 gr, and G7 coefficient 0.224 to 0.287 to 0.224 to 0.301. A load inside those spans no longer shows the "caliber" or "no reference" warning, **even though only one 200 gr table was compared.** All other warnings (range beyond 500 yd, muzzle velocity, coefficient range, temperature, pressure, humidity, stability, caliber outside 0.264 and 0.308) still apply. Being inside the span does not establish that a result is right.

## Not changed

Solver block, drag tables, model version 1.0.0, tolerances, golden baseline, earlier reference data, and every accuracy disclosure. Guards: `tests/stage13.test.js`; earlier pinning tests now compare the earlier data exactly and ignore only the round-3 additions (`tests/helpers/refs-pin.js`).

## Limits

Calculated manufacturer table only; zero and diameter inferred; one cartridge; no measured flight; 500 yd maximum; two datasets miss the 1% velocity tolerance at 500 yd under ICAO conditions.
