# Source research report (Stage 5, 2026-11-16)

Status: Stage 5 is **NOT COMPLETE** (0 complete, 1 waived, 7 open). Physical accuracy is **NOT DEMONSTRATED**.
This report records what was retrieved, how, and what could not be established. Nothing here changes the solver, BCs, drag tables, atmosphere defaults, tolerances or golden baselines.

## How data was retrieved, and the limit on it

- The workspace has no direct network access from the shell, and the container browser cannot reach the manufacturer sites. Every page was read through WebFetch, which returns a **model-written extraction**, not raw HTML. It can shift table columns (an earlier read produced a false 2.8–5.9% discrepancy for that reason).
- Mitigation used: each table read more than once, with different prompts; cross-checks against a second site that republishes the same table (a retailer, the Vista law-enforcement catalogue); reads that were internally inconsistent were excluded rather than guessed.
- Consequence: agreement below is **corroboration**, not independent verification. No raw page, PDF or download was obtained for any manufacturer table.
- Safari and Claude in Chrome were not available in this session.

## Manufacturer pages read (all accessed 2026-11-16)

| Id | Page | Reader | Cells compared |
| --- | --- | --- | --- |
| R1 | https://www.federalpremium.com/rifle/gold-medal/gold-medal-berger/11-GM65CRDBH130.html | WebFetch | 21 |
| R2 | https://www.ammunitiontogo.com/20rds-6-5mm-creedmoor-federal-gold-medal-berger-130gr-hybrid-otm-ammo (retailer copy) | WebFetch | 17 |
| R3 | https://www.hornadyle.com/rifle-ammunition/140-gr-otm-a | WebFetch | 19 |
| R4 | https://www.hornady.com/team-hornady/ballistic-information/ballistic-resources/external-ballistics | WebFetch | 96 |
| R5 | https://www.federalpremium.com/rifle/gold-medal/gold-medal-sierra-matchking/11-GM308M.html | WebFetch | 40 |
| R6 | https://le.vistaoutdoor.com/ammunition/federal/rifle/details.aspx?id=150 | WebFetch | 40 |
| R7 | https://le.vistaoutdoor.com/ammunition/federal/rifle/details.aspx?id=151 | WebFetch | 20 |

Result (`node tests/tools/audit-reference-data.js`): **252 of 253 cells agree** with `tests/validation/references.json`. One mismatch: the retailer (R2) shows the Federal G7 BC as .286; the manufacturer page and the record show .287. The record was not changed. One note: R2 shows a 200 yd drop of 0 where the record holds an empty placeholder (not copied). Full detail in `docs/REFERENCE_DATA_AUDIT.md`.

Excluded from the comparisons, with reasons (in `references.json` under `excludedSources`): Hornady CX/GMX 140 gr (garbled, internally inconsistent read), Hornady 308 168 BTHP Match (no BC published), Federal 223 (page not reachable through the allowlist).

## Drag tables (G1, G7)

- Searched for an authoritative original (Ingalls/BRL/Lowry-era tabulations). None could be opened. Only secondary copies were found: the open-source `ballistics-engine` Rust crate (docs.rs), whose README attributes its tables to Lowry (1965) and BRL without verification, and a Go library copy, spot-checked on 20 rows (identical).
- `node tests/tools/compare-g-tables.js`: **G1 79 of 79 points identical** to the Rust copy. **G7 83 of 83 shared Mach points identical**, plus one point the copy has and the app lacks, Mach 1.125 (copy 0.3987; app interpolates 0.39845, difference −0.00025, inside the 0.005 tolerance).
- The copies share a likely lineage, so agreement does not verify either. **The origin of the app's tables is not established. Neither table is Verified.** Precision and interpolation: both are linear interpolation of tabulated points, as in the app; no gap larger than the table spacing was found beyond the Mach 1.125 point.

## Hornady BC offset and atmosphere

- Hornady's External Ballistics page says BCs and tables "in this book" are adjusted to Aberdeen standard conditions (sea level, 59 F, 29.53 inHg, 78% RH). hornady.com/bc says ICAO (59 F, 29.92 inHg, 0%). The 4DOF technical document states no standard atmosphere and uses Doppler-measured Cd vs Mach. The "book" is unnamed and undated. **No Hornady source says which atmosphere the LE 81480 table used.**
- Aberdeen air is 1.80% less dense than ICAO (1.2029 vs 1.2249 kg/m3), which is the size of the earlier ~1.8% effective-BC offset.
- Round 2 evidence: with G1 BCs, the Aberdeen run reproduces Hornady and Federal tables to rounding (mean |velocity error| about 0.02%); ICAO gives 0.36–0.53%. This strongly supports the hypothesis that those tables were generated at Aberdeen conditions. It is **not** manufacturer confirmation. Aberdeen is not selected as correct, the offset is not called resolved, and both atmosphere runs are kept.
- The Federal G7 BC on the .308 168 gr page does not reproduce its own table in either atmosphere (7 of the 10 total misses). The G1 variant for the same table passes.

## Round 2 validation (registered before running)

108 new comparisons: 101 within tolerance, 7 outside. Combined with round 1: **211 compared, 201 within, 10 outside**. Tolerances unchanged (Cd 0.005; velocity 1%; drop the larger of 2% or 0.3 in). Counts by round and atmosphere: `node tests/tools/summarize-validation.js`. The 10 misses are the 3 round 1 ICAO misses plus 5 ICAO and 2 Aberdeen misses, all in FEDERAL-GM308M-168-G7-AVG/LONG.

## Formula sources

| Component | Source found | Opened? | Outcome |
| --- | --- | --- | --- |
| Atmosphere density, speed of sound | 1976 Standard Atmosphere constants (1.225 kg/m3, 340.294 m/s) | constants via secondary pages only; the 1976 document was not opened | engine within 2e-5 of the constants |
| Humid-air density / saturation vapour pressure | Magnus-type formula, Alduchov and Eskridge | search results only, not opened | unverified |
| Miller stability | Miller (arXiv 1410.5340) printed form | yes | engine formula equals printed form (relative difference 0). The engine estimates bullet length from weight instead of taking it as input; that estimate is not from the source |
| Spin drift | 1.25(SG+1.2)·t^1.83 in; Applied Ballistics gyroscopic-drift PDF and an uncited Rust crate | the formula appears only in the crate, as text; the Applied Ballistics PDF was found by search and not opened | engine 9.31 in at 1000 yd vs a 8–9 in range: OUTSIDE (a range is not a formula check) |
| Coriolis | standard 2Ω sin(lat) form | original not opened | engine 3.34 in vs 2.5–3.0 in range: OUTSIDE; direction and sign checks pass |
| Crosswind lag time | Sierra lag-time method | worked example reproduced: 88.0 in/s × (1.552759 − 3000/2700) ≈ 38.9 in, page says "about 39 in"; the equation image itself was missing | consistent with the engine's form |

Labels: all components stay Unverified. The only Verified item is the BC to SI factor 703.0696 by arithmetic.

## Measured data

`tests/validation/measured-doppler.json` (classification MEASURED): Doppler-radar drag coefficients for .308 bullets from arXiv 1608.06500 (https://arxiv.org/abs/1608.06500), Table 1 and A1. `node tests/tools/compare-measured.js`: **21 of 26 rows within 3% at the nominal sound speed; 19 of 26 at every assumed sound speed.** Outside: Sp FB 200 G1 +8.3%, NP 220 G1 (.469) +3.3%, NP 220 G1 (.445) +7.3%, NET 150 G1 +6.5%, NBT 125 G7 −3.4%. The two-velocity checks differ by −2.3% to −18.9%. This is measured drag at about 100 m for one paper's shots. It is not a trajectory comparison. **No measured trajectory data was found. Physical accuracy is NOT DEMONSTRATED.**

## Could not be independently established

1. The raw text of any manufacturer table (only page-reader extractions).
2. The authoritative origin of the app's G1 and G7 tables.
3. Which atmosphere Hornady used for the LE 81480 table.
4. The original sources for the spin-drift and Coriolis equations, the 1976 atmosphere document, and the humid-air formula.
5. The bullet-length estimate used for Miller stability.
6. Any measured trajectory (drop or drift) dataset.
7. Hornady CX/GMX, Hornady 308 168 BTHP, Federal 223 data.

Sources: [Hornady external ballistics](https://www.hornady.com/team-hornady/ballistic-information/ballistic-resources/external-ballistics), [Federal 6.5 CM page](https://www.federalpremium.com/rifle/gold-medal/gold-medal-berger/11-GM65CRDBH130.html), [Federal .308 page](https://www.federalpremium.com/rifle/gold-medal/gold-medal-sierra-matchking/11-GM308M.html), [Hornady LE 140 gr](https://www.hornadyle.com/rifle-ammunition/140-gr-otm-a), [Doppler drag paper](https://arxiv.org/abs/1608.06500), [Miller stability paper](https://arxiv.org/abs/1410.5340), [Applied Ballistics gyroscopic drift](https://appliedballisticsllc.com/wp-content/uploads/2021/06/Gyroscopic-Drift-and-Coriolis-Effect.pdf), [ballistics-engine spin drift source](https://docs.rs/ballistics-engine/0.33.0/src/ballistics_engine/spin_drift.rs.html).
