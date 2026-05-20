# In-Dashboard Data Integrity Tests

## Purpose

The new dashboard must include data integrity tests inside the product, not only in developer scripts.

These tests exist so Sian, Yunni, Jade, and Tom can see whether the dashboard is faithfully reading and displaying the source data.

They are read-only. They never fix data. They never write back to source systems. They never become a separate source of truth.

## Core Rule

In-dashboard integrity tests must read from source evidence and compare through the official pipeline:

```txt
Source rows
  -> Raw source archive
  -> Parsed source facts
  -> Display contract
  -> Visible dashboard row/total/export/chat evidence
```

If a test cannot trace that path, it must return `UNRESOLVED`, not guess.

## Modes

### Mode 1: Snapshot Integrity

Reads from the immutable raw source archive already stored by the app.

Use this for:

- normal dashboard health,
- fast checks,
- repeatable evidence,
- historical comparisons,
- user-facing confidence.

### Mode 2: Live Source Probe

Performs a read-only pull from Google Sheets or Float and compares it with the latest stored source snapshot.

Use this for:

- "has the source changed since last sync?",
- Yunni's Float export mismatch,
- Sian's source-sheet spot checks,
- suspected stale sync.

Rules:

- live probes never write,
- live probes never replace stored data,
- live probes produce a warning if they disagree with the latest snapshot,
- live probes show timestamp and source identity.

## Test Statuses

### PASS

The source evidence, parser facts, display contract, and visible dashboard output agree within the allowed tolerance for a supported metric.

### WARN

The dashboard is being honest, but there is a source limitation, source conflict, stale source, cache/source mismatch, or unsupported metric.

Examples:

- cache has Float hours but raw Float canon has no current task rows,
- pipeline exists for a project but cannot support department attribution,
- production revenue has no job number and office is inferred.

### FAIL

The dashboard, parser, contract, UI, export, or chat is wrong.

Examples:

- source row exists but is not surfaced,
- visible dashboard hours do not equal display contract hours,
- CSV total differs from visible table footer,
- raw Float > 0 and cache = 0,
- inactive Float project contributes visible hours,
- unsupported metric is shown as zero.

### UNRESOLVED

The app does not yet have enough evidence to classify the result.

Examples:

- live Float API is unavailable,
- Google Sheet permission failed,
- source row exists but parser cannot identify the relevant cells,
- tool error prevents comparison.

## Required In-Dashboard Checks

### Source Coverage

For each stream:

- raw rows pulled,
- parsed rows produced,
- rows surfaced,
- rows unsupported,
- rows source-only,
- rows dropped,
- rows unresolved.

Dropped rows must list source row IDs. Unexplained dropped rows are `FAIL`.

### Same Scope, Same Number

For the active dashboard scope:

- hero totals,
- Projects footer,
- Projects visible row sum,
- CSV row sum,
- department rollup,
- role rollup,
- month rollup,
- client rollup,
- project detail.

Supported metrics must reconcile.

Unsupported metrics must be labelled unsupported.

### Source To Dashboard

For selected rows:

- source row value,
- parsed fact value,
- display contract value,
- rendered UI value,
- export value where applicable,
- delta,
- status.

### Float Trace Integrity

For each Float project or job:

- fee-sheet Float ID,
- matched Float project ID,
- raw Float task rows,
- task-person split evidence,
- expanded monthly allocation rows,
- allocation cache rows,
- visible dashboard row,
- Yunni export comparison where pasted/provided,
- raw/cache/visible classification.

### Source-Only Visibility

Tests must prove these row types are visible:

- pipeline-only,
- production-only,
- Float-only,
- archived with revenue,
- archived with hours,
- inactive Float with hours,
- manual duplicate Float,
- TBC/no-job rows.

### Chat Integrity

For any diagnostic answer chat gives:

- sources checked,
- display contract row used,
- warnings,
- unresolved checks,
- confidence,
- whether Codex is needed.

Chat cannot pass integrity unless its answer is supported by the evidence pack.

## Dashboard UI

The integrity page should show:

- current scope,
- last source snapshot time,
- last live probe time if run,
- status summary,
- failing checks first,
- warnings second,
- unresolved checks third,
- source row drilldown,
- source owner where known,
- "Needs Codex" where code/browser/sync/deploy action is required.

It should not hide warnings behind a success banner.

## Read-Only Policy

Allowed:

- read raw source archive,
- read parsed facts,
- read display contract,
- read rendered dashboard state,
- read Google Sheets through service account,
- read Float API,
- parse pasted export text,
- generate evidence pack.

Forbidden:

- writing Google Sheets,
- writing Float,
- archiving projects,
- starting sync as a side effect,
- running per-job resync as a side effect,
- mutating database facts,
- changing source mappings,
- deploying code,
- marking warnings resolved automatically.

## Named User Checks

The in-dashboard integrity suite must include:

- LDN Q1 Design rollup to Projects,
- UCS04787 Float hours,
- UCS05186 duplicate/manual Float row,
- UCS04154 explicit fee-sheet Float ID,
- PCS00250 cache-without-raw warning,
- USA00262 sold-hours false-zero guard,
- USA00323 sold-hours false-zero guard,
- BT raw-without-cache Float mismatch,
- archived production revenue visible in Projects/CSV,
- TBC pipeline row identity,
- exact client drilldown.

## Product Principle

The integrity page should make the dashboard more trustworthy by showing exactly where trust stops.

It should help the team say:

- this is correct,
- this is a real source issue,
- this is unsupported by the source,
- this is stale,
- this is a dashboard bug,
- this needs Codex.
