# Identity And Matching Policy

## Purpose

Most old dashboard failures were identity failures disguised as maths failures.

This policy defines how the rebuild matches source rows without silently rewriting truth.

## Principle

Matching creates relationships. It does not erase original identity.

Every matched display row must preserve:

- source job number,
- canonical job number if one exists,
- source project name,
- canonical project name if one exists,
- source client,
- canonical client if one exists,
- source Float project ID,
- canonical Float project ID if one exists,
- source row IDs.

## Identity Tiers

### Tier 1: Explicit Source Identifier

Highest confidence.

Examples:

- fee-sheet first-tab Float ID,
- Float API project ID,
- Google Sheet row ID or tab/row number,
- source system object ID.

Rules:

- Tier 1 identifiers win over name/code inference.
- Tier 1 identifiers are never silently replaced.
- Conflicting Tier 1 identifiers become a warning.

### Tier 2: Canonical Business Identifier

High confidence when clean.

Examples:

- `UCS04787`,
- `USA00262`,
- `PCS00250`.

Rules:

- Normalisation may remove spaces and case differences.
- Normalisation may not merge different prefixes.
- One business ID can have multiple source rows.
- Multiple source rows are grouped only with visible contributing identities.

### Tier 3: Source Label

Useful for display and diagnostic matching.

Examples:

- pipeline project name,
- production revenue project name,
- Float project name,
- client label.

Rules:

- Source labels are preserved exactly.
- Canonical labels may be added for grouping.
- Source labels are never overwritten for export reconciliation.

### Tier 4: Fuzzy Or Heuristic Candidate

Diagnostic only.

Examples:

- Float name contains job number,
- similar client name,
- project code typo,
- manual duplicate candidate.

Rules:

- Fuzzy matches can suggest.
- Fuzzy matches cannot become canonical without explicit evidence.
- Fuzzy matches must be shown as candidates with confidence.

## Float Join Rule

The fee-sheet first-tab Float ID is the authoritative join key for the original fee-sheet Float job.

If another Float job has the same job code or name:

- show it as duplicate/manual candidate,
- do not replace the explicit fee-sheet Float ID,
- do not hide either row,
- classify hours by source identity.

## Client Matching Rule

There are two client fields:

- `sourceClient`, exactly as written in the source,
- `canonicalClient`, normalised for exact drilldowns and grouping.

Rules:

- exact client drilldown uses `canonicalClient`,
- fuzzy search uses `search`,
- `search` is never a drilldown key,
- CSV can include both source and canonical client when useful.

## TBC And No-Job Rule

TBC and blank-job rows need stable source identity.

Examples:

- `TBC:pipeline:<sheetRowNumber>`,
- `NO_JOB:production_revenue:<sheetRowNumber>`.

Rules:

- do not collapse TBC rows into one bucket,
- do not hide no-job rows with value,
- do not invent a job number,
- show source project name and row identity.

## Archive Identity Rule

Archive state is not identity.

Rules:

- archived rows retain their source identity,
- archived matched rows remain traceable,
- archived duplicates remain evidence,
- archive can change visibility defaults only when the source value is still reachable and counted honestly.

## Required Tests

- fee-sheet Float ID beats Float project code,
- duplicate/manual Float project remains visible,
- TBC rows preserve row identity,
- no-job production revenue preserves row identity,
- exact client drilldown differs from fuzzy search,
- canonical client grouping preserves source client labels,
- archived duplicate still appears in diagnostics.
