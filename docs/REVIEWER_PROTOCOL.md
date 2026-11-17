# Independent reviewer protocol: reproduce the Hornady comparison from the original manufacturer data

Purpose: remove the chance that the engine is being checked against reference numbers that were copied wrongly.
The project's copy has already been wrong once (a page-reader output that shifted every row one distance column).
This protocol produces a second copy made without the project's copy.

## Who can be the reviewer

Someone who did not write the engine or the project's transcription, and who has not seen the project's copy of the
numbers. The project owner has seen those numbers, so the owner's check is valuable but is an **owner check**, not an
independent review. The compare tool only labels a review independent if the reviewer says so and says they did not see
the project values first.

## What the reviewer is given

Only these: the page address, `tests/validation/reviewer-template.json` (blank), and this protocol.
The reviewer must not be shown the project's copy in `tests/validation/references.json`, the engine's output, or any
validation report until they have finished and saved their transcription.

## What the reviewer does

1. Open the original manufacturer page (https://www.hornadyle.com/rifle-ammunition/140-gr-otm-a). Not a retailer
   copy, not a screenshot someone else made, not a tool's summary.
2. Fill in `source`: the date, how the page was reached, and the file name of a screenshot saved with the review.
3. Fill in `published`: muzzle velocity, bullet weight, the G1 and G7 BC if shown, the barrel, and every stated condition
   (zero, sight height, atmosphere), or write "not stated".
4. For each distance column (Muzzle, 50, 100, 200, 300, 400, 500) copy velocity, energy and trajectory. Put exactly what
   the page shows in `rawText`. If a cell is missing, N/A or a placeholder, leave the number `null`. Do not fix or guess.
5. Set `reviewer.name`, say honestly whether they are independent of the project, and whether they saw the project
   values before transcribing.
6. Return the file. Do not edit it after seeing the project's numbers.

## What happens next

Run `node tests/tools/compare-reviewer.js <file>`. It prints every cell where the reviewer and the project differ, then
compares the engine with the **reviewer's** numbers, so a mistake in the project's copy cannot hide.

- Where the two copies differ, the reviewer's copy governs the engine comparison. Both results are reported.
- A difference is investigated. It is not settled by choosing whichever copy fits the engine.
- Only a genuine review is saved as `tests/validation/reviewer-results.json`. Fixtures are never saved under that name.

## What an independent review shows

It shows that the reference numbers were copied correctly. It does not show the engine is right, and it covers one
table. Reproducing more than one manufacturer table is part of the completion criteria in `docs/STAGE5_COMPLETION.md`.
Even then, agreement with published tables is reference agreement, not physical accuracy.
