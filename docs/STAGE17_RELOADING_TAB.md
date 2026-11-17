# Stage 17: Reloading tab (development branch, not merged, not deployed)

Branch `stage-17-reloading-tab`, based on `main` at `3f8b9bc` (Stage 16 merge). Not merged. Not deployed.

## What it adds
- A fourth bottom tab, **Reloading**, after Rifle, with three screens: **Recipes** (dropdown of saved recipes plus "+ New recipe", details form, summary), **Inventory** (powder, primers, bullets, brass, equipment) and **Range** (sessions with typed shot velocities, average, sample SD, ES, group size, 1 to 5 impression rating, notes).
- A standing notice: record keeping only; nothing is load data, a safety check or a recommendation; nothing changes a calculation.
- Its own backup card: export code, add-only restore, a safety copy before any restore.

## What it does not touch
- The solver, assessment block, embedded scope module, reference data, tolerances, golden baseline, model version 1.0.0, `lib/scope-adjust.js`, `sw.js` and the manifest are byte-identical to `3f8b9bc` (guarded by `tests/stage17.test.js`).
- Rifle storage (`scopedope.v2`) is never read or written by the new code. The log lives under `scopedope.reload.v1`; the pre-restore safety copy under `scopedope.reload.backup`. The rifle backup code does not include the log.
- Removing only the new additions gives back the Stage 16 `index.html` exactly (test).

## The one link to a rifle
"Use average as muzzle velocity..." asks first, names the open rifle and both numbers, and does nothing until "Use N fps" is pressed. It then fills the Rifle tab's velocity box through the same input event as typing, so the app marks it as entered by the user and saves it with the rifle. An average outside the Rifle tab's 500 to 4500 fps range is not offered. Invalid shot entries block the offer.

## Application decisions (not from any source)
- Shot velocities must be plain numbers from 100 to 5000 fps; anything else (for example "2,800") is flagged and no statistics are shown until fixed.
- SD is the sample standard deviation and needs two or more shots; ES is highest minus lowest.
- Field limits: 80 characters per field, 200 for notes, 500 recipes, 5000 sessions, 200 shots per session on restore.

## Tests
Node 218/218 (7 new in `tests/stage17.test.js`). Browser: 14 suites, 234 checks (11 new in `tests/browser/stage17.check.js`). Upgrade check run with `OLD_REF=rollback-before-stage12-1-release`.

## Not tested
Real iPhone Safari, the light theme by eye, the live site (nothing is deployed).

## Open decisions for review
1. Should the reloading log be included in the rifle backup code later? It is separate today.
2. Keep the 100 to 5000 fps shot limits?
3. Deployment: pushing `main` publishes through GitHub Pages. Rollback point is `3f8b9bc`.
