# Source Staleness And Deletion Policy

## Purpose

The old system could confuse "not seen in this run" with "deleted", "sync stale" with "source wrong", and "cache exists" with "truth".

This policy makes source freshness and deletion explicit.

## Source Batch States

Each source pull has one state:

- `running`,
- `success`,
- `partial`,
- `failed`,
- `cancelled`.

Rules:

- failed and partial batches cannot delete previous evidence,
- a successful batch can mark rows absent only for the source scope it actually read,
- a cancelled batch is not freshness proof,
- parser failure does not imply source deletion.

## Row Lifecycle

Raw source rows are immutable.

Parsed facts can have lifecycle state:

- `current`,
- `superseded`,
- `not_seen_in_latest_batch`,
- `deleted_by_source_evidence`,
- `parser_failed_latest_batch`.

Rules:

- `not_seen_in_latest_batch` is not deletion,
- source deletion requires source-specific proof,
- previous facts remain auditable,
- visible dashboard can default to current facts but diagnostics must show stale/superseded facts when they explain mismatches.

## Staleness

Every displayed source stream must expose:

- latest successful batch time,
- latest attempted batch time,
- source freshness age,
- parser status,
- cache status where relevant.

Stale data is `WARN`, not hidden.

## Float Deletion

Float tasks can change or disappear.

Rules:

- absence from latest successful complete task pull can mark previous task as not current,
- cache rows from deleted/missing tasks must not remain green,
- deletion evidence must be source-scoped,
- deleted-task deltas must show in Float diagnostics.

## Google Sheet Changes

Sheets can change layout, formulas, and rows.

Rules:

- template drift creates parser warning,
- repaired formula rows clear old warnings only after fresh parse proves repair,
- moved rows retain new raw row identity and old historical identity,
- blank rows with previous value become row-change evidence, not silent deletion.

## Required Tests

- failed source pull does not delete current facts,
- partial source pull does not delete current facts,
- stale cache is warned,
- Float task not seen in latest complete pull is not silently visible,
- repaired Sheet Health warning clears only after fresh parse,
- latest snapshot timestamp appears in display contract and integrity page.
