# Stage 16 pre-merge safeguard audit

**Physical accuracy: NOT DEMONSTRATED.** This audit checks data safety and software behaviour. It does not show any calculated correction is right.

Audited branch: `stage-16-scope-integration`. Pre-merge `main`: `b72dccb` (the released Stage 14 state).

## Results against the five checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Existing rifle data survives save, reload, export and import | **Pass**, with one disclosed finding below | `tests/browser/stage16-audit.check.js`: seven rifles (two complete, one partly filled, one legacy, three with invalid stored text), forced saves, every rifle opened twice with reloads, then export, import into a fresh app, and import of an old backup code. Every field compared; the legacy click value is retained; new scope fields stay empty |
| 2 | The legacy click value cannot silently generate scope adjustments | **Pass** | Legacy rifle shows no clicks on load, after reload, after switching away and back, when partly filled, and after import. The only conversion is the button, which leaves both correction factors empty, so clicks still do not appear. A Node test confirms no load, profile or save path calls the conversion |
| 3 | Rounding, positive and negative, exact halves, elevation and windage | **Pass**, with one disclosed limit below | `tests/stage16-audit.test.js`: every k x 0.125 from -2.6 to +2.6 on both axes at 0.25 per click, other graduations (0.5, 0.125), a tracking factor on elevation, just either side of a half, no negative zero. The same code is exercised inside the page |
| 4 | Incomplete or invalid scope settings never produce misleading clicks | **Pass** | 33 invalid or missing stored values (empty, wrong unit names, zero, negative, over 10, `1,5`, `0x10`, `NaN`, `Infinity`, `1e400`, factors out of range, windage factor 0.9999999, 1.0000001, 1.075, 2) each give no clicks on the HUD, no Dial or click columns on the range card, an "incomplete" status naming the field, a flag on the field and a "(scope not set)" mark. A valid control rifle shows clicks. The module rejects 60+ invalid configurations in Node |
| 5 | The production build contains the exact tested solver and module | **Pass** | There is no build step: the deployed file is `index.html` itself (plus `sw.js` and the manifest, both unchanged). The solver block, the assessment block and the embedded module are verified below. The module running in the page is exercised directly and compared with the library on 1,000+ cases |

## Findings (nothing hidden)

1. **Invalid stored text is normalised, not preserved.** A `<select>` cannot hold a unit that is not one of its options, and a number input cannot hold text such as `0.25abc`, so such a value is saved back as empty once that rifle has been opened. The app never writes such values itself; they could only come from hand-edited data. The rifle is incomplete either way and produces no clicks. An export taken before the rifle is opened still carries the original text. This is the same behaviour found in Stage 12.1 for non-numeric weights.
2. **Decimal half-clicks can round down.** At 0.1 per click, a correction of 0.15 is 1.4999999999999998 clicks in binary arithmetic, so it rounds to 1, not 2. Exact binary halves (multiples of 0.125 at 0.25 per click) round away from zero as designed. The exact count and the remainder are both reported, and the difference is half a click either way. This is tested and documented. A tolerance could be added later; I did not change the rounding rule during an audit.
3. **Import adds the exported profile as its own profile.** After import, imported rifles are under an added profile (not the one you were on). Behaviour is unchanged from before Stage 16.

## Unchanged, by hash

| Item | SHA-256 (pre-merge `main` b72dccb = this branch) |
|---|---|
| Solver block (`/*SOLVER_START*/` to `/*SOLVER_END*/`) | `af99238c3156f493cd07915e4dfd9a8280b491a7c76cd8e5ce316df83dbb8036` (identical) |
| Assessment block | `a0f3d0d1fdfcb08ad639eb2fae4216165fca44166ac218cd783f4b5015a23dbc` (identical) |
| `tests/validation/references.json` (reference data and tolerances) | `4ffc5f6cd31c639997867170e7cd240a60f13fddaef88975faea35030ecc56a2` (identical) |
| `tests/golden/baseline.json` | `1ed3b62d1f239b3572d71d638a54bdb301accdf88b8b1cf8a45aba5d55ef05c3` (identical) |
| Model version | 1.0.0 (inside the solver block) |
| `sw.js`, `manifest.webmanifest` | identical to `b72dccb` |

The embedded scope module block in `index.html` (`125a5fc6469fa9922f06fa8a2532f286b0c5e4b60683c79307a8d7e34a378efd`) contains `lib/scope-adjust.js` (`bc6628d82fb677567ae878dfb3870263a22f6160e81777e92d89661bffb9f9b8`) byte for byte, checked by test.

## Test results before merge

- Node: 211 of 211 pass.
- Browser: 13 suites, 223 checks, all pass (inputs 27, layout 9, stage12-1 23, stage12-audit 41, stage13 4, stage16-audit 6, stage16 17, stage9-1 14, stage9 24, step7 20, storage 27, transparency 6, upgrade 5). The upgrade suite uses `OLD_REF=rollback-before-stage12-1-release`, as before.

## Deployment

The site is served by GitHub Pages from `main`, so **pushing `main` deploys it.** The merge was made locally and `main` was **not pushed**, so nothing is deployed or published. Rollback point after deployment would be `b72dccb` (branch `rollback-before-stage14-release` is one step earlier; the Stage 14 state is `b72dccb`).
