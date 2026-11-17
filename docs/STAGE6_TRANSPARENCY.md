# Stage 6: safety and transparency (branch `stage-6-safety-transparency`)

Purpose: the app must separate a calculated estimate from an independently verified result, and say so when inputs are incomplete, outside the conditions that were compared, limited by the model, or not covered by reference data. This stage changes no calculation.

## What changed

- One panel in the HUD, under the result numbers (`#assess`). Its summary line is always shown: **"Calculated estimate. Not independently verified."**, followed by whether similar loads were compared with manufacturer tables, and a count of warnings and notes. Tap it to open the list. It opens by itself when there is a warning, until the user opens or closes it.
- `assessResult(inp, ctx)` in `index.html`, between `/*ASSESS_START*/` and `/*ASSESS_END*/`, outside the calculation block. It is pure: it reads the inputs, returns text, and writes nothing, so it cannot alter a result or saved data.
- When inputs are invalid the panel gives only the standing label and says there is no result until the highlighted fields are fixed (Stage 3 behavior is unchanged).
- Not changed: the solver, BCs, drag tables, tolerances, default atmospheres, golden baseline, saved rifles and user data. The calculation block is byte-identical to Stage 5 (test).

## What it reports

| Kind | Trigger | Message id |
| --- | --- | --- |
| Warning | distance beyond 500 yd | `range` |
| Warning | muzzle velocity outside 2600 to 3000 fps | `muzzle` |
| Warning | G1 BC outside .241 to .608, or G7 BC outside .224 to .287 | `bc` |
| Warning | caliber not .264 or .308 in, or weight outside 130 to 180 gr | `caliber` |
| Warning | temperature outside 29 to 89 F | `temp` |
| Warning | pressure (entered, or estimated from altitude) outside 21 to 31 inHg | `pressure` |
| Warning | humidity outside 0 to 78% | `humidity` |
| Warning | no reference comparison covers the load | `noref` |
| Note | pressure not entered (estimated from altitude), latitude blank (no Coriolis), twist 0 (no spin drift) | `pressureEst`, `noLat`, `noTwist` |
| Note | wind, spin drift, Coriolis, angled shot, temperature-adjusted velocity in use (no reference comparison) | `wind`, `spin`, `coriolis`, `angle`, `vtemp` |
| Note | always: limits of the model | `limits` |

The ranges are the span of conditions the manufacturer-table comparisons covered (`VALIDATED` in `index.html`). A test rebuilds that span from `tests/validation/references.json`, so the warnings cannot drift from the evidence.

## How to read it

- **Inside the ranges is not "accurate".** The ranges say what was compared, with manufacturer tables, within pre-registered tolerances. Nothing was compared with measured bullet flight. Physical accuracy: NOT DEMONSTRATED. The panel never says a result is accurate, verified, safe or guaranteed (test).
- **Outside the ranges is not "wrong".** It means no comparison was made there.
- The muzzle velocity warning looks at the velocity the user entered. The app still calculates from that entered value; factory reference velocities never replace it.

## Limits of this stage

- The Chart tab range card does not carry its own warnings yet. The HUD panel covers the distance shown there.
- Ranges are the extent of the data, not a map of where the model is good or bad. Gaps inside them (for example G7 BCs between .224 and .287 only) are not flagged.
- Wording is fixed text; it was not user-tested.

## Tests

- `tests/assess.test.js` (10): envelope derived from the reference data; no warning inside the envelope; each out-of-range input warns; load with no reference data says so; unvalidated effects named; incomplete inputs reported; limits always listed; no message calls a result accurate, verified, guaranteed or safe; purity; the calculation block, golden baseline, solver tests and tolerances unchanged.
- `tests/browser/transparency.check.js` (6): label always shown; default load has no warning and lists assumptions; a long distance warns and leaves the dial unchanged; an entered velocity outside the span warns and is not replaced; invalid input is not assessed; no sideways scroll at 400 px.
