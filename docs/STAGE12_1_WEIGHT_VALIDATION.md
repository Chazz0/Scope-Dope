# Stage 12.1: Bullet Weight Input Validation

Branch `stage-12-1-weight-validation`, from the approved Stage 12 commit `f6cbe5ca009de5058039400602c6ed3e86a75b67`. Model version **1.0.0**, solver unchanged. Physical accuracy remains **NOT DEMONSTRATED**. This stage changes input validation only; it says nothing about ballistic accuracy.

## The defect

Stage 12 found that a preset-derived ballistic coefficient (BC) was rescaled for any weight greater than zero, even absurd ones. Typing a weight of `1e6` into the .308 preset set the BC to 2750.000. The app did show an error, but the error list named the BC the user never typed, and 2750 was saved in the profile.

## Weight limits

**Minimum 15 grains, maximum 800 grains.** These are the limits the app already used for the weight field and for validation; Stage 12.1 keeps them and applies them everywhere.

Rationale (a plausibility bound, not a measured or sourced value): 15 gr is about the lightest bullet used in small-bore rifles; 800 gr is above the heaviest common rifle bullets (.50 BMG bullets run roughly 650 to 750 gr). The bound sits alongside the existing diameter (0.17 to 0.6 in) and BC (0.05 to 1.2) bounds. Units are grains throughout. The limits are written in the code next to the helper that enforces them, and the release notes list them.

Consequence worth knowing: because preset BCs scale linearly with weight, a preset BC scaled to a very light or very heavy valid weight can fall outside 0.05 to 1.2 (for example the .308 preset at 15 gr gives 0.041, and every preset exceeds 1.2 near 800 gr). The weight is then accepted and the BC is flagged, with the existing message that the BC was scaled and the user should enter the bullet's published BC. No result is shown until it is fixed. This is unchanged behaviour.

## Changes (all in `index.html`, outside the solver block)

| Requirement | Change |
|---|---|
| Reject zero, negative, empty, non-numeric, infinite, out-of-range weights | The weight is read strictly (`weightOk`): the whole text must be a finite decimal or exponent number between 15 and 800. Loose parsing (`"168abc"` read as 168) no longer counts. |
| No preset-derived BC scaling for an invalid weight | The scaling branch runs only when `weightOk` is true. Otherwise the BC is left as it was and a message says it was not rescaled. The stored weight reference (`bcwt`) is also not updated to an invalid value. |
| Clear error naming field and range | New inline message under the weight field on the Rifle tab ("Bullet weight is 1e6 gr (allowed 15 to 800 gr)"). The HUD notice already showed the same text. |
| No results while invalid | Unchanged and re-tested: the dial shows a dash, the range card is empty, no CSV rows. |
| Valid weights keep normal scaling | Re-tested, including typing digit by digit. |
| Typed and fitted BC preserved | Unchanged and re-tested, including through invalid weights. |
| Bypass via load, save, switch, preset | The scaling base (anchor) is now set only from a valid weight with a valid BC. Otherwise it falls back to the selected preset's own numbers, or nothing for a custom load, so a legacy bad pair (1e6 gr, BC 2750) or another rifle's numbers can never become the base. |

The solver block is byte-identical to Stage 12. No solver, formula, drag table, reference data, tolerance, baseline or model-version change was made, and no accuracy disclosure was removed.

## Before and after: the 1e6 case

| | Before (Stage 12) | After |
|---|---|---|
| BC field after typing `1e6` | 2750.000 | 0.462 (unchanged) |
| Load message | "Bullet weight is 1000000 gr, so the ballistic coefficient was scaled to 2750.000..." | "Bullet weight 1e6 is outside the allowed 15 to 800 gr (or is not a number), so the ballistic coefficient was not rescaled." |
| Rifle tab error text beside the field | none | "Bullet weight is 1e6 gr (allowed 15 to 800 gr)." |
| HUD | no result, error list also blamed the BC | no result, error names only the weight |
| Saved BC | 2750.000 stored | stays 0.462; weight saved as typed and flagged |

Regression run before the fix (`tests/validation/stage12_1/regression-before-fix.txt`): 7 passed, 16 failed of 23. After the fix: 23 of 23. The tests that passed before the fix (typed and fitted BC preservation, switching, preset selection, saving) are the protections that already held and still do. The exact `index.html` diff is in `docs/STAGE12_1_INTERFACE_DIFF.txt`.

## Regression tests (`tests/browser/stage12-1.check.js`, 23 checks; `tests/stage12-1.test.js`, 5 checks)

Weights 0, -5, -0.0001, 14.99, 800.01, 1e6, 1e-6, 99999999999 and empty (no result, flagged, range message, BC not rescaled, empty range card, no implausible number on screen); stored weights `abc`, `Infinity`, `-Infinity`, `168abc`, `1e999`, `NaN`, blank and `0x10` (flagged, no result, never turned into a valid weight, still flagged after reload; text a number box cannot hold is saved as empty); boundaries 15 and 800 accepted as weights; valid scaling and digit-by-digit typing; typed BC and fitted BC preserved through invalid and valid weights; the old bad pair loading flagged and not rewritten; rifle switching without borrowing the other rifle's BC; preset selection recovering from an invalid weight; saving and reloading an invalid weight; error presentation at 360 px and 1280 px.

## Remaining notes

- Typed values are still saved as typed, including invalid ones, by design. Invalid text a number input cannot hold is saved as empty.
- A preset BC scaled to a valid but extreme weight can leave the BC range and is flagged (above).
- Physical accuracy: NOT DEMONSTRATED. The Stage 10 and Stage 11 conclusions are not altered.
