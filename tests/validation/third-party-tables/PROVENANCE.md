# Provenance of the files in this folder

`g1.csv` and `g7.csv` are a **secondary** transcription of the drag-table data files in the open-source `ballistics-engine` crate (read through docs.rs on 2026-11-16, by a summarizing reader; the files were not downloaded from the crate repository). The crate's own README attributes its tables to Lowry (1965) and BRL, with no verification. Its origin is unknown to this project.

These files are **not authoritative**. They are kept only so `tests/tools/compare-g-tables.js` can show whether the tables in `index.html` agree with another copy. Agreement between two copies of unknown origin does not verify either against a published original, and the tables stay Unverified.

Result when this was written: G1, 79 of 79 points identical. G7, 83 of 83 shared Mach points identical, plus one extra point in the secondary copy at Mach 1.125 that `index.html` does not have.
