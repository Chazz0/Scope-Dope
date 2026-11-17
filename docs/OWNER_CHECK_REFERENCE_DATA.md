# Owner check sheet: reference data against the original manufacturer pages

Status: **NOT DONE.** Optional. The owner has said they will not check data by hand, and this is no longer asked of them: `docs/REFERENCE_DATA_AUDIT.md` is the automated, multi-read corroboration. No entry below has been checked against a raw page by anyone but a page-reading tool.

Where this sits: the owner check and the second-manufacturer reproduction are separate criteria in `docs/STAGE5_COMPLETION.md`, both WAIVED in narrowed form by the owner on 2026-11-16 22:23 (1 complete, 7 waived, 0 open; complete except waived items). Completing this sheet would settle only the owner check. It would not make the data independently verified, and physical accuracy stays NOT DEMONSTRATED. The reviewer item is WAIVED and counts as nothing here.

How to use: open each URL yourself. For every row, write what the page shows in the "Page shows" column and mark Match Y or N. If a value differs, **write down the page value and leave the recorded value alone**. Corrections are made later in a separate commit that cites this sheet, so nothing is silently changed. Cells the source leaves blank or as an image placeholder are meant to stay empty ("none").

Generated from `tests/validation/references.json` by `node tests/tools/make-owner-check-sheet.js --write`. Do not edit the recorded columns by hand.

## Hornady LE 6.5 Creedmoor 140 gr OTM-A (item 81480)

URL: https://www.hornadyle.com/rifle-ammunition/140-gr-otm-a

Also confirm: which distance each column is labeled, and that the 50 yd column really is the placeholder.

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G1) | 0.608 | | | |
| Muzzle velocity (fps) | 2700 | | | |
| Muzzle energy (ft-lb) | 2266 | | | |
| Bullet weight (gr) | 140 | | | |
| Muzzle trajectory (in) | -1.5 | | | |
| 50 yd velocity / energy / trajectory | none (placeholder 0 / N/A / 0) | | | |
| 100 yd velocity / energy / trajectory | 2553 fps / 2027 ft-lb / 0 in | | | |
| 200 yd velocity / energy / trajectory | 2412 fps / 1808 ft-lb / -3.8 in | | | |
| 300 yd velocity / energy / trajectory | 2274 fps / 1608 ft-lb / -13.7 in | | | |
| 400 yd velocity / energy / trajectory | 2141 fps / 1425 ft-lb / -30.2 in | | | |
| 500 yd velocity / energy / trajectory | 2013 fps / 1259 ft-lb / -54.4 in | | | |

## FEDERAL-GM-6.5CM-130-G7: Gold Medal Berger 6.5 Creedmoor 130 gr Berger AR Hybrid OTM, part GM65CRDBH130

URL: https://www.federalpremium.com/rifle/gold-medal/gold-medal-berger/11-GM65CRDBH130.html

Read by a page-reading tool, not seen by the author. Tables are labeled Muzzle/100/200/300/400/500 Y (velocity, energy) and 50/100/200/300 Y (Average Range). The 130 gr and 2875 fps figures reproduce the printed energies (energy check in tests). A second person has not reproduced this copy.

Cell notes: {"100":"The Average Range 100 yd trajectory cell is an image placeholder (symbol.gif) with no value. It is left null and not inferred as 0.","400":"Average Range table stops at 300 yd.","500":"Average Range table stops at 300 yd."}

Tables excluded and why: {"Long Range trajectory":"Excluded. Its zero range is not stated (the caption says zeroed at 100 yd but the 100 yd value is +1.6 in, so the caption does not describe this table), and its 200 yd cell is a placeholder.","Wind drift at 10 mph":"Not compared. The heading has no values on the page as read, and the crosswind model is a separate question."}

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G7) | 0.287 | | | |
| Muzzle velocity (fps) | 2875 | | | |
| Bullet weight (gr) | 130 | | | |
| Muzzle energy (ft-lb) | 2386 | | | |
| 50 yd velocity / energy / trajectory | none / none / -0.2 in | | | |
| 100 yd velocity / energy / trajectory | 2709 fps / 2119 ft-lb / none | | | |
| 200 yd velocity / energy / trajectory | 2550 fps / 1877 ft-lb / -3.2 in | | | |
| 300 yd velocity / energy / trajectory | 2396 fps / 1657 ft-lb / -11.8 in | | | |
| 400 yd velocity / energy / trajectory | 2247 fps / 1457 ft-lb / none | | | |
| 500 yd velocity / energy / trajectory | 2104 fps / 1277 ft-lb / none | | | |
| Zero range (yd) | 100 (page caption) | | | |
| Sight height (in) | 1.5 | | | |

## HORNADY-SPIRE-180-G1-0.425: Hornady External Ballistics page, 30 cal 180 gr spire point

URL: https://www.hornady.com/team-hornady/external-ballistics

Printed BC 0.425, sectional density 0.271.

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G1) | 0.425 | | | |
| Muzzle velocity (fps) | 3000 | | | |
| Bullet weight (gr) | 180 | | | |
| Muzzle energy (ft-lb) | 3597 | | | |
| Muzzle trajectory (in) | -1.5 | | | |
| 50 yd velocity / energy / trajectory | 2887 fps / 3331 ft-lb / -0.2 in | | | |
| 100 yd velocity / energy / trajectory | 2777 fps / 3082 ft-lb / 0 in | | | |
| 200 yd velocity / energy / trajectory | 2565 fps / 2629 ft-lb / -3 in | | | |
| 300 yd velocity / energy / trajectory | 2362 fps / 2230 ft-lb / -11.3 in | | | |
| 400 yd velocity / energy / trajectory | 2169 fps / 1880 ft-lb / -25.9 in | | | |
| 500 yd velocity / energy / trajectory | 1985 fps / 1574 ft-lb / -47.8 in | | | |
| Zero range (yd) | 100 (column header) | | | |
| Sight height (in) | 1.5 | | | |

## HORNADY-ROUNDNOSE-180-G1-0.241: Hornady External Ballistics page, 30 cal 180 gr round nose

URL: https://www.hornady.com/team-hornady/external-ballistics

Printed BC 0.241. A round-nose bullet fits the G1 shape poorly, so a larger difference here would say something about G1 BC use, not necessarily about the engine.

Known energy inconsistency to look at: {"50":"Printed energy 3139 ft-lb; 2803 fps at 180 gr gives 3141.1, a 2.05 ft-lb gap, just over the 2 ft-lb check. Not corrected. It may be a typo in the source or in the page read. Only the velocity and drop are compared, never the energy, so this does not enter any comparison."}

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G1) | 0.241 | | | |
| Muzzle velocity (fps) | 3000 | | | |
| Bullet weight (gr) | 180 | | | |
| Muzzle energy (ft-lb) | 3597 | | | |
| Muzzle trajectory (in) | -1.5 | | | |
| 50 yd velocity / energy / trajectory | 2803 fps / 3139 ft-lb / -0.2 in | | | |
| 100 yd velocity / energy / trajectory | 2614 fps / 2731 ft-lb / 0 in | | | |
| 200 yd velocity / energy / trajectory | 2259 fps / 2040 ft-lb / -3.6 in | | | |
| 300 yd velocity / energy / trajectory | 1933 fps / 1493 ft-lb / -14.1 in | | | |
| 400 yd velocity / energy / trajectory | 1639 fps / 1073 ft-lb / -34 in | | | |
| 500 yd velocity / energy / trajectory | 1385 fps / 767 ft-lb / -67 in | | | |
| Zero range (yd) | 100 (column header) | | | |
| Sight height (in) | 1.5 | | | |

## HORNADY-CORR-TEST1: Hornady External Ballistics page, correction test #1 (Standard conditions)

URL: https://www.hornady.com/team-hornady/external-ballistics

Printed correction BCs are the page's stated results. The page's correction equations are images that did not load, so the BC corrections were not recomputed here.

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G1) | 0.338 | | | |
| Muzzle velocity (fps) | 2900 | | | |
| Uncorrected BC used in the worked example | 0.338 | | | |
| Muzzle trajectory (in) | -1.5 | | | |
| Stated conditions | {"tempF":59,"pressInHg":29.53,"humidity":78,"altFt":0} | | | |
| 100 yd velocity / energy / trajectory | 2627 fps / none / 0 in | | | |
| 200 yd velocity / energy / trajectory | 2371 fps / none / -3.6 in | | | |
| 300 yd velocity / energy / trajectory | 2129 fps / none / -13.3 in | | | |
| 400 yd velocity / energy / trajectory | 1901 fps / none / -30.8 in | | | |
| 500 yd velocity / energy / trajectory | 1690 fps / none / -57.9 in | | | |
| Zero range (yd) | 100 (column header) | | | |
| Sight height (in) | 1.5 | | | |

## HORNADY-CORR-TEST2: Hornady External Ballistics page, correction test #2 (Higher temperature)

URL: https://www.hornady.com/team-hornady/external-ballistics

Printed correction BCs are the page's stated results. The page's correction equations are images that did not load, so the BC corrections were not recomputed here.

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G1) | 0.355 | | | |
| Muzzle velocity (fps) | 2900 | | | |
| Uncorrected BC used in the worked example | 0.338 | | | |
| Muzzle trajectory (in) | -1.5 | | | |
| Stated conditions | {"tempF":89,"pressInHg":29.53,"humidity":78,"altFt":0} | | | |
| 100 yd velocity / energy / trajectory | 2640 fps / none / 0 in | | | |
| 200 yd velocity / energy / trajectory | 2395 fps / none / -3.5 in | | | |
| 300 yd velocity / energy / trajectory | 2162 fps / none / -13.1 in | | | |
| 400 yd velocity / energy / trajectory | 1943 fps / none / -30.1 in | | | |
| 500 yd velocity / energy / trajectory | 1739 fps / none / -56.4 in | | | |
| Zero range (yd) | 100 (column header) | | | |
| Sight height (in) | 1.5 | | | |

## HORNADY-CORR-TEST3: Hornady External Ballistics page, correction test #3 (Higher barometric pressure)

URL: https://www.hornady.com/team-hornady/external-ballistics

Printed correction BCs are the page's stated results. The page's correction equations are images that did not load, so the BC corrections were not recomputed here.

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G1) | 0.322 | | | |
| Muzzle velocity (fps) | 2900 | | | |
| Uncorrected BC used in the worked example | 0.338 | | | |
| Muzzle trajectory (in) | -1.5 | | | |
| Stated conditions | {"tempF":59,"pressInHg":31,"humidity":78,"altFt":0} | | | |
| 100 yd velocity / energy / trajectory | 2614 fps / none / 0 in | | | |
| 200 yd velocity / energy / trajectory | 2346 fps / none / -3.6 in | | | |
| 300 yd velocity / energy / trajectory | 2094 fps / none / -13.6 in | | | |
| 400 yd velocity / energy / trajectory | 1858 fps / none / -31.5 in | | | |
| 500 yd velocity / energy / trajectory | 1641 fps / none / -59.5 in | | | |
| Zero range (yd) | 100 (column header) | | | |
| Sight height (in) | 1.5 | | | |

## HORNADY-CORR-TEST4: Hornady External Ballistics page, correction test #4 (Higher altitude)

URL: https://www.hornady.com/team-hornady/external-ballistics

Printed correction BCs are the page's stated results. The page's correction equations are images that did not load, so the BC corrections were not recomputed here. The page labels this 'Higher Altitude' but lists altitude as sea level; the 21.00 inHg pressure is used as printed.

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G1) | 0.448 | | | |
| Muzzle velocity (fps) | 2900 | | | |
| Uncorrected BC used in the worked example | 0.338 | | | |
| Muzzle trajectory (in) | -1.5 | | | |
| Stated conditions | {"tempF":29,"pressInHg":21,"humidity":78,"altFt":0} | | | |
| 100 yd velocity / energy / trajectory | 2693 fps / none / 0 in | | | |
| 200 yd velocity / energy / trajectory | 2495 fps / none / -3.3 in | | | |
| 300 yd velocity / energy / trajectory | 2306 fps / none / -12.2 in | | | |
| 400 yd velocity / energy / trajectory | 2124 fps / none / -27.6 in | | | |
| 500 yd velocity / energy / trajectory | 1952 fps / none / -50.8 in | | | |
| Zero range (yd) | 100 (column header) | | | |
| Sight height (in) | 1.5 | | | |

## FEDERAL-GM-6.5CM-130-G7-LONGRANGE: Gold Medal Berger 6.5 CM 130 gr, Long Range trajectory table

URL: https://www.federalpremium.com/rifle/gold-medal/gold-medal-berger/11-GM65CRDBH130.html

Federal Long Range table: zero 200 yd. Evidence: Federal's law-enforcement page for GM308M captions the Long Range trajectory 'for a 200 yards zero with a sight height of 1.5 inches' (le.vistaoutdoor.com id=150 and id=151), and a retailer copy of the 6.5 CM 130 gr data prints 0 at 200 yd. The federalpremium.com page's own caption says 100 yd for both tables, which cannot describe the Long Range table (its 100 yd value is +1.6 in).

Cell notes: {"200":"Image placeholder on the Federal page, left null. A retailer copy prints 0, consistent with a 200 yd zero, but that is a secondary copy and is not used as a value."}

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G7) | 0.287 | | | |
| Muzzle velocity (fps) | 2875 | | | |
| Bullet weight (gr) | 130 | | | |
| 50 yd velocity / energy / trajectory | none / none / 0.6 in | | | |
| 100 yd velocity / energy / trajectory | none / none / 1.6 in | | | |
| 200 yd velocity / energy / trajectory | none / none / none | | | |
| 300 yd velocity / energy / trajectory | none / none / -6.9 in | | | |
| 400 yd velocity / energy / trajectory | none / none / -20 in | | | |
| 500 yd velocity / energy / trajectory | none / none / -40 in | | | |
| Zero range (yd) | 200 (page caption) | | | |
| Sight height (in) | 1.5 | | | |

## FEDERAL-GM308M-168-G7-AVG: Gold Medal Sierra MatchKing 308 Win 168 gr, Average Range (100 yd zero)

URL: https://www.federalpremium.com/rifle/gold-medal/gold-medal-sierra-matchking/11-GM308M.html

The page labels .224 as G7 explicitly.

Cell notes: {"100":"Average Range 100 yd cell is an image placeholder, left null."}

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G7) | 0.224 | | | |
| Muzzle velocity (fps) | 2650 | | | |
| Bullet weight (gr) | 168 | | | |
| Muzzle energy (ft-lb) | 2619 | | | |
| 50 yd velocity / energy / trajectory | none / none / -0.1 in | | | |
| 100 yd velocity / energy / trajectory | 2460 fps / 2257 ft-lb / none | | | |
| 200 yd velocity / energy / trajectory | 2277 fps / 1935 ft-lb / -4.3 in | | | |
| 300 yd velocity / energy / trajectory | 2103 fps / 1650 ft-lb / -15.3 in | | | |
| 400 yd velocity / energy / trajectory | 1936 fps / 1398 ft-lb / none | | | |
| 500 yd velocity / energy / trajectory | 1778 fps / 1179 ft-lb / none | | | |
| Zero range (yd) | 100 (page caption) | | | |
| Sight height (in) | 1.5 | | | |

## FEDERAL-GM308M-168-G7-LONG: Gold Medal Sierra MatchKing 308 Win 168 gr, Long Range (200 yd zero)

URL: https://www.federalpremium.com/rifle/gold-medal/gold-medal-sierra-matchking/11-GM308M.html

Federal Long Range table: zero 200 yd. Evidence: Federal's law-enforcement page for GM308M captions the Long Range trajectory 'for a 200 yards zero with a sight height of 1.5 inches' (le.vistaoutdoor.com id=150 and id=151), and a retailer copy of the 6.5 CM 130 gr data prints 0 at 200 yd. The federalpremium.com page's own caption says 100 yd for both tables, which cannot describe the Long Range table (its 100 yd value is +1.6 in). Variant note as for the Average Range dataset.

Cell notes: {"200":"Image placeholder, left null."}

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G7) | 0.224 | | | |
| Muzzle velocity (fps) | 2650 | | | |
| Bullet weight (gr) | 168 | | | |
| Muzzle energy (ft-lb) | 2619 | | | |
| 50 yd velocity / energy / trajectory | none / none / 1 in | | | |
| 100 yd velocity / energy / trajectory | none / none / 2.1 in | | | |
| 200 yd velocity / energy / trajectory | none / none / none | | | |
| 300 yd velocity / energy / trajectory | none / none / -8.9 in | | | |
| 400 yd velocity / energy / trajectory | none / none / -25.5 in | | | |
| 500 yd velocity / energy / trajectory | none / none / -51.5 in | | | |
| Zero range (yd) | 200 (page caption) | | | |
| Sight height (in) | 1.5 | | | |

## FEDERAL-GM308M-168-G1-AVG: Gold Medal Sierra MatchKing 308 Win 168 gr, Average Range (100 yd zero)

URL: https://www.federalpremium.com/rifle/gold-medal/gold-medal-sierra-matchking/11-GM308M.html

The page labels .462 only 'Ballistic Coefficient' without naming the drag function. Registered as G1 by convention (a variant); a mismatch could reflect that assumption.

Cell notes: {"100":"Average Range 100 yd cell is an image placeholder, left null."}

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G1) | 0.462 | | | |
| Muzzle velocity (fps) | 2650 | | | |
| Bullet weight (gr) | 168 | | | |
| Muzzle energy (ft-lb) | 2619 | | | |
| 50 yd velocity / energy / trajectory | none / none / -0.1 in | | | |
| 100 yd velocity / energy / trajectory | 2460 fps / 2257 ft-lb / none | | | |
| 200 yd velocity / energy / trajectory | 2277 fps / 1935 ft-lb / -4.3 in | | | |
| 300 yd velocity / energy / trajectory | 2103 fps / 1650 ft-lb / -15.3 in | | | |
| 400 yd velocity / energy / trajectory | 1936 fps / 1398 ft-lb / none | | | |
| 500 yd velocity / energy / trajectory | 1778 fps / 1179 ft-lb / none | | | |
| Zero range (yd) | 100 (page caption) | | | |
| Sight height (in) | 1.5 | | | |

## FEDERAL-GM308M-168-G1-LONG: Gold Medal Sierra MatchKing 308 Win 168 gr, Long Range (200 yd zero)

URL: https://www.federalpremium.com/rifle/gold-medal/gold-medal-sierra-matchking/11-GM308M.html

Federal Long Range table: zero 200 yd. Evidence: Federal's law-enforcement page for GM308M captions the Long Range trajectory 'for a 200 yards zero with a sight height of 1.5 inches' (le.vistaoutdoor.com id=150 and id=151), and a retailer copy of the 6.5 CM 130 gr data prints 0 at 200 yd. The federalpremium.com page's own caption says 100 yd for both tables, which cannot describe the Long Range table (its 100 yd value is +1.6 in). Variant note as for the Average Range dataset.

Cell notes: {"200":"Image placeholder, left null."}

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G1) | 0.462 | | | |
| Muzzle velocity (fps) | 2650 | | | |
| Bullet weight (gr) | 168 | | | |
| Muzzle energy (ft-lb) | 2619 | | | |
| 50 yd velocity / energy / trajectory | none / none / 1 in | | | |
| 100 yd velocity / energy / trajectory | none / none / 2.1 in | | | |
| 200 yd velocity / energy / trajectory | none / none / none | | | |
| 300 yd velocity / energy / trajectory | none / none / -8.9 in | | | |
| 400 yd velocity / energy / trajectory | none / none / -25.5 in | | | |
| 500 yd velocity / energy / trajectory | none / none / -51.5 in | | | |
| Zero range (yd) | 200 (page caption) | | | |
| Sight height (in) | 1.5 | | | |

## FEDERAL-GM308M2-175-G1-AVG: Gold Medal Sierra MatchKing 308 Win 175 gr (GM308M2), Average Range (100 yd zero), law-enforcement page

URL: https://le.vistaoutdoor.com/ammunition/federal/rifle/details.aspx?id=151

BC 0.505 is not labeled G1 or G7 on the page; registered as G1 by convention (a variant). 24 in test barrel printed.

Cell notes: {"100":"Zero-point symbol image, left null."}

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G1) | 0.505 | | | |
| Muzzle velocity (fps) | 2600 | | | |
| Bullet weight (gr) | 175 | | | |
| Muzzle energy (ft-lb) | 2627 | | | |
| 50 yd velocity / energy / trajectory | none / none / -0.1 in | | | |
| 100 yd velocity / energy / trajectory | 2427 fps / 2290 ft-lb / none | | | |
| 200 yd velocity / energy / trajectory | 2262 fps / 1987 ft-lb / -4.4 in | | | |
| 300 yd velocity / energy / trajectory | 2102 fps / 1717 ft-lb / -15.7 in | | | |
| 400 yd velocity / energy / trajectory | 1949 fps / 1476 ft-lb / none | | | |
| 500 yd velocity / energy / trajectory | 1803 fps / 1264 ft-lb / none | | | |
| Zero range (yd) | 100 (page caption) | | | |
| Sight height (in) | 1.5 | | | |

## FEDERAL-GM308M2-175-G1-LONG: Gold Medal Sierra MatchKing 308 Win 175 gr (GM308M2), Long Range (200 yd zero), law-enforcement page

URL: https://le.vistaoutdoor.com/ammunition/federal/rifle/details.aspx?id=151

Caption on this page states a 200 yd zero. BC label as above.

Cell notes: {"200":"Zero-point symbol image, left null."}

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G1) | 0.505 | | | |
| Muzzle velocity (fps) | 2600 | | | |
| Bullet weight (gr) | 175 | | | |
| Muzzle energy (ft-lb) | 2627 | | | |
| 50 yd velocity / energy / trajectory | none / none / 1 in | | | |
| 100 yd velocity / energy / trajectory | none / none / 2.2 in | | | |
| 200 yd velocity / energy / trajectory | none / none / none | | | |
| 300 yd velocity / energy / trajectory | none / none / -9.1 in | | | |
| 400 yd velocity / energy / trajectory | none / none / -25.8 in | | | |
| 500 yd velocity / energy / trajectory | none / none / -51.8 in | | | |
| Zero range (yd) | 200 (page caption) | | | |
| Sight height (in) | 1.5 | | | |

## FEDERAL-GM-6.5CM-130-G1-0.560: Gold Medal Berger 6.5 Creedmoor 130 gr Berger AR Hybrid OTM, part GM65CRDBH130

URL: https://www.federalpremium.com/rifle/gold-medal/gold-medal-berger/11-GM65CRDBH130.html

Variant registered before running: the same Federal table with the page's other BC, 0.560, which the page labels only 'Ballistic Coefficient'. Registered as G1 by convention. The G7 .287 dataset is unchanged and both are reported.

Read by a page-reading tool, not seen by the author. Tables are labeled Muzzle/100/200/300/400/500 Y (velocity, energy) and 50/100/200/300 Y (Average Range). The 130 gr and 2875 fps figures reproduce the printed energies (energy check in tests). A second person has not reproduced this copy.

Cell notes: {"100":"The Average Range 100 yd trajectory cell is an image placeholder (symbol.gif) with no value. It is left null and not inferred as 0.","400":"Average Range table stops at 300 yd.","500":"Average Range table stops at 300 yd."}

Tables excluded and why: {"Long Range trajectory":"Excluded. Its zero range is not stated (the caption says zeroed at 100 yd but the 100 yd value is +1.6 in, so the caption does not describe this table), and its 200 yd cell is a placeholder.","Wind drift at 10 mph":"Not compared. The heading has no values on the page as read, and the crosswind model is a separate question."}

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G1) | 0.56 | | | |
| Muzzle velocity (fps) | 2875 | | | |
| Bullet weight (gr) | 130 | | | |
| Muzzle energy (ft-lb) | 2386 | | | |
| 50 yd velocity / energy / trajectory | none / none / -0.2 in | | | |
| 100 yd velocity / energy / trajectory | 2709 fps / 2119 ft-lb / none | | | |
| 200 yd velocity / energy / trajectory | 2550 fps / 1877 ft-lb / -3.2 in | | | |
| 300 yd velocity / energy / trajectory | 2396 fps / 1657 ft-lb / -11.8 in | | | |
| 400 yd velocity / energy / trajectory | 2247 fps / 1457 ft-lb / none | | | |
| 500 yd velocity / energy / trajectory | 2104 fps / 1277 ft-lb / none | | | |
| Zero range (yd) | 100 (page caption) | | | |
| Sight height (in) | 1.5 | | | |

## FEDERAL-GM-6.5CM-130-G1-0.560-LONGRANGE: Gold Medal Berger 6.5 CM 130 gr, Long Range trajectory table

URL: https://www.federalpremium.com/rifle/gold-medal/gold-medal-berger/11-GM65CRDBH130.html

Variant registered before running: the same Federal table with the page's other BC, 0.560, which the page labels only 'Ballistic Coefficient'. Registered as G1 by convention. The G7 .287 dataset is unchanged and both are reported. Federal Long Range table: zero 200 yd. Evidence: Federal's law-enforcement page for GM308M captions the Long Range trajectory 'for a 200 yards zero with a sight height of 1.5 inches' (le.vistaoutdoor.com id=150 and id=151), and a retailer copy of the 6.5 CM 130 gr data prints 0 at 200 yd. The federalpremium.com page's own caption says 100 yd for both tables, which cannot describe the Long Range table (its 100 yd value is +1.6 in).

Cell notes: {"200":"Image placeholder on the Federal page, left null. A retailer copy prints 0, consistent with a 200 yd zero, but that is a secondary copy and is not used as a value."}

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G1) | 0.56 | | | |
| Muzzle velocity (fps) | 2875 | | | |
| Bullet weight (gr) | 130 | | | |
| 50 yd velocity / energy / trajectory | none / none / 0.6 in | | | |
| 100 yd velocity / energy / trajectory | none / none / 1.6 in | | | |
| 200 yd velocity / energy / trajectory | none / none / none | | | |
| 300 yd velocity / energy / trajectory | none / none / -6.9 in | | | |
| 400 yd velocity / energy / trajectory | none / none / -20 in | | | |
| 500 yd velocity / energy / trajectory | none / none / -40 in | | | |
| Zero range (yd) | 200 (page caption) | | | |
| Sight height (in) | 1.5 | | | |

## HORNADY-PH-300WM-200-ELDX-G1-.597: Hornady 300 Win Mag 200 gr ELD-X Precision Hunter, item 82002, Test Barrel (24 in) table

URL: https://www.hornady.com/ammunition/rifle/300-win-mag-200-gr-eld-x-precision-hunter

Hornady's BC page (https://www.hornady.com/bc) lists the 30 cal 200 gr ELD-X at G1 0.597 / G7 0.301 for Mach 2.25 and above (2512 fps), G1 0.588 / G7 0.295 at Mach 2.0 (2232 fps) and G1 0.578 / G7 0.291 at Mach 1.75 (1953 fps), corrected to ICAO. This dataset uses the G1 band (Mach 2.25 and above). The table runs 2860 to 2140 fps, so the one-BC approximation spans two bands. Zero 200 yd is inferred, not stated: the published trajectory is +1.6 in at 100 yd and 0 at 200 yd; sight height 1.5 in from the -1.5 in muzzle row. The page's table text was read twice by a summarizing page reader and both reads gave the same 18 numbers in the same order; the row and column labels are the reader's inference from that order. Energy cells check against 200 gr and the printed velocities (E = m v^2 / 450240). Diameter .308 assumed for a 30 caliber bullet; the page does not print it. BC values were not on the product page and come from the BC page. Registered before the first run.

Known energy inconsistency to look at: {"100":"Printed energy 3253 ft-lb; 2707 fps at 200 gr gives 3255.1, a 2.1 ft-lb gap, just over the 2 ft-lb check (0.06%). Not corrected. Added after the first run, when the transcription check flagged it; it may be rounding in the printed velocity or a page-read slip. Only velocity and drop are compared, never energy, so it enters no comparison."}

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G1) | 0.597 | | | |
| Muzzle velocity (fps) | 2860 | | | |
| Bullet weight (gr) | 200 | | | |
| Muzzle energy (ft-lb) | 3632 | | | |
| Muzzle trajectory (in) | -1.5 | | | |
| 100 yd velocity / energy / trajectory | 2707 fps / 3253 ft-lb / 1.6 in | | | |
| 200 yd velocity / energy / trajectory | 2558 fps / 2905 ft-lb / 0 in | | | |
| 300 yd velocity / energy / trajectory | 2414 fps / 2587 ft-lb / -6.9 in | | | |
| 400 yd velocity / energy / trajectory | 2274 fps / 2297 ft-lb / -19.9 in | | | |
| 500 yd velocity / energy / trajectory | 2140 fps / 2033 ft-lb / -39.5 in | | | |
| Zero range (yd) | 200 (column header) | | | |
| Sight height (in) | 1.5 | | | |

## HORNADY-PH-300WM-200-ELDX-G1-.588: Hornady 300 Win Mag 200 gr ELD-X Precision Hunter, item 82002, Test Barrel (24 in) table

URL: https://www.hornady.com/ammunition/rifle/300-win-mag-200-gr-eld-x-precision-hunter

Hornady's BC page (https://www.hornady.com/bc) lists the 30 cal 200 gr ELD-X at G1 0.597 / G7 0.301 for Mach 2.25 and above (2512 fps), G1 0.588 / G7 0.295 at Mach 2.0 (2232 fps) and G1 0.578 / G7 0.291 at Mach 1.75 (1953 fps), corrected to ICAO. This dataset uses the G1 band (Mach 2.0). The table runs 2860 to 2140 fps, so the one-BC approximation spans two bands. Zero 200 yd is inferred, not stated: the published trajectory is +1.6 in at 100 yd and 0 at 200 yd; sight height 1.5 in from the -1.5 in muzzle row. The page's table text was read twice by a summarizing page reader and both reads gave the same 18 numbers in the same order; the row and column labels are the reader's inference from that order. Energy cells check against 200 gr and the printed velocities (E = m v^2 / 450240). Diameter .308 assumed for a 30 caliber bullet; the page does not print it. BC values were not on the product page and come from the BC page. Registered before the first run.

Known energy inconsistency to look at: {"100":"Printed energy 3253 ft-lb; 2707 fps at 200 gr gives 3255.1, a 2.1 ft-lb gap, just over the 2 ft-lb check (0.06%). Not corrected. Added after the first run, when the transcription check flagged it; it may be rounding in the printed velocity or a page-read slip. Only velocity and drop are compared, never energy, so it enters no comparison."}

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G1) | 0.588 | | | |
| Muzzle velocity (fps) | 2860 | | | |
| Bullet weight (gr) | 200 | | | |
| Muzzle energy (ft-lb) | 3632 | | | |
| Muzzle trajectory (in) | -1.5 | | | |
| 100 yd velocity / energy / trajectory | 2707 fps / 3253 ft-lb / 1.6 in | | | |
| 200 yd velocity / energy / trajectory | 2558 fps / 2905 ft-lb / 0 in | | | |
| 300 yd velocity / energy / trajectory | 2414 fps / 2587 ft-lb / -6.9 in | | | |
| 400 yd velocity / energy / trajectory | 2274 fps / 2297 ft-lb / -19.9 in | | | |
| 500 yd velocity / energy / trajectory | 2140 fps / 2033 ft-lb / -39.5 in | | | |
| Zero range (yd) | 200 (column header) | | | |
| Sight height (in) | 1.5 | | | |

## HORNADY-PH-300WM-200-ELDX-G7-.301: Hornady 300 Win Mag 200 gr ELD-X Precision Hunter, item 82002, Test Barrel (24 in) table

URL: https://www.hornady.com/ammunition/rifle/300-win-mag-200-gr-eld-x-precision-hunter

Hornady's BC page (https://www.hornady.com/bc) lists the 30 cal 200 gr ELD-X at G1 0.597 / G7 0.301 for Mach 2.25 and above (2512 fps), G1 0.588 / G7 0.295 at Mach 2.0 (2232 fps) and G1 0.578 / G7 0.291 at Mach 1.75 (1953 fps), corrected to ICAO. This dataset uses the G7 band (Mach 2.25 and above). The table runs 2860 to 2140 fps, so the one-BC approximation spans two bands. Zero 200 yd is inferred, not stated: the published trajectory is +1.6 in at 100 yd and 0 at 200 yd; sight height 1.5 in from the -1.5 in muzzle row. The page's table text was read twice by a summarizing page reader and both reads gave the same 18 numbers in the same order; the row and column labels are the reader's inference from that order. Energy cells check against 200 gr and the printed velocities (E = m v^2 / 450240). Diameter .308 assumed for a 30 caliber bullet; the page does not print it. BC values were not on the product page and come from the BC page. Registered before the first run.

Known energy inconsistency to look at: {"100":"Printed energy 3253 ft-lb; 2707 fps at 200 gr gives 3255.1, a 2.1 ft-lb gap, just over the 2 ft-lb check (0.06%). Not corrected. Added after the first run, when the transcription check flagged it; it may be rounding in the printed velocity or a page-read slip. Only velocity and drop are compared, never energy, so it enters no comparison."}

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G7) | 0.301 | | | |
| Muzzle velocity (fps) | 2860 | | | |
| Bullet weight (gr) | 200 | | | |
| Muzzle energy (ft-lb) | 3632 | | | |
| Muzzle trajectory (in) | -1.5 | | | |
| 100 yd velocity / energy / trajectory | 2707 fps / 3253 ft-lb / 1.6 in | | | |
| 200 yd velocity / energy / trajectory | 2558 fps / 2905 ft-lb / 0 in | | | |
| 300 yd velocity / energy / trajectory | 2414 fps / 2587 ft-lb / -6.9 in | | | |
| 400 yd velocity / energy / trajectory | 2274 fps / 2297 ft-lb / -19.9 in | | | |
| 500 yd velocity / energy / trajectory | 2140 fps / 2033 ft-lb / -39.5 in | | | |
| Zero range (yd) | 200 (column header) | | | |
| Sight height (in) | 1.5 | | | |

## HORNADY-PH-300WM-200-ELDX-G7-.295: Hornady 300 Win Mag 200 gr ELD-X Precision Hunter, item 82002, Test Barrel (24 in) table

URL: https://www.hornady.com/ammunition/rifle/300-win-mag-200-gr-eld-x-precision-hunter

Hornady's BC page (https://www.hornady.com/bc) lists the 30 cal 200 gr ELD-X at G1 0.597 / G7 0.301 for Mach 2.25 and above (2512 fps), G1 0.588 / G7 0.295 at Mach 2.0 (2232 fps) and G1 0.578 / G7 0.291 at Mach 1.75 (1953 fps), corrected to ICAO. This dataset uses the G7 band (Mach 2.0). The table runs 2860 to 2140 fps, so the one-BC approximation spans two bands. Zero 200 yd is inferred, not stated: the published trajectory is +1.6 in at 100 yd and 0 at 200 yd; sight height 1.5 in from the -1.5 in muzzle row. The page's table text was read twice by a summarizing page reader and both reads gave the same 18 numbers in the same order; the row and column labels are the reader's inference from that order. Energy cells check against 200 gr and the printed velocities (E = m v^2 / 450240). Diameter .308 assumed for a 30 caliber bullet; the page does not print it. BC values were not on the product page and come from the BC page. Registered before the first run.

Known energy inconsistency to look at: {"100":"Printed energy 3253 ft-lb; 2707 fps at 200 gr gives 3255.1, a 2.1 ft-lb gap, just over the 2 ft-lb check (0.06%). Not corrected. Added after the first run, when the transcription check flagged it; it may be rounding in the printed velocity or a page-read slip. Only velocity and drop are compared, never energy, so it enters no comparison."}

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| BC (G7) | 0.295 | | | |
| Muzzle velocity (fps) | 2860 | | | |
| Bullet weight (gr) | 200 | | | |
| Muzzle energy (ft-lb) | 3632 | | | |
| Muzzle trajectory (in) | -1.5 | | | |
| 100 yd velocity / energy / trajectory | 2707 fps / 3253 ft-lb / 1.6 in | | | |
| 200 yd velocity / energy / trajectory | 2558 fps / 2905 ft-lb / 0 in | | | |
| 300 yd velocity / energy / trajectory | 2414 fps / 2587 ft-lb / -6.9 in | | | |
| 400 yd velocity / energy / trajectory | 2274 fps / 2297 ft-lb / -19.9 in | | | |
| 500 yd velocity / energy / trajectory | 2140 fps / 2033 ft-lb / -39.5 in | | | |
| Zero range (yd) | 200 (column header) | | | |
| Sight height (in) | 1.5 | | | |

## Hornady atmosphere statements

URL: https://www.hornady.com/team-hornady/ballistic-information/ballistic-resources/external-ballistics and https://www.hornady.com/bc

Check the quoted wording and whether any date or edition is shown.

| Entry | Recorded | Page shows | Match (Y/N) | Note |
| --- | --- | --- | --- | --- |
| External ballistics page: "These are standard conditions for the Aberdeen test site", sea level, 59 F, 29.53 inHg, 78% | as read by a page tool | | | |
| hornady.com/bc: "corrected back to ICAO Standard Atmosphere (Sea Level, 59 degrees F, 29.92 inHg, 0% Humidity)" | as read by a page tool | | | |

