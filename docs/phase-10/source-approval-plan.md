# Phase 10 Source Approval Plan

Parent issue: `#85`

Child issues:

- `#86` P10-A: Complete Staging Env For Four Source Streams
- `#87` P10-B: Source Approval Readiness Report
- `#88` P10-C: Named Sian Jade Yunni Evidence Pack
- `#89` P10-D: Stakeholder Approval Pack And No-Cutover Gate

## Purpose

Phase 10 proves staging against source evidence before anyone calls the rebuild accurate. Deploy health is not source approval. A green dashboard is not stakeholder approval.

## Required Source Streams

| Stream | Source owner | Required staging config | Approval question |
|---|---|---|---|
| Sold | Sian | `GOOGLE_SERVICE_ACCOUNT_KEY`, `FEE_TRACKER_SPREADSHEET_ID` | Do fee-sheet rows, sold values, and sold hours show without silent correction? |
| Pipeline | Jade | `GOOGLE_SERVICE_ACCOUNT_KEY`, `PIPELINE_SHEET_ID` | Do Jade's rows surface, including TBC identity, without false attribution in slices? |
| Production Revenue | Sian | `GOOGLE_SERVICE_ACCOUNT_KEY`, `PRODUCTION_REVENUE_SHEET_ID` | Does real production revenue surface even when project archive state is wrong? |
| Float | Yunni | `FLOAT_API_KEY` | Do Float allocations, duplicates, raw/cache/visible mismatches, and Float-only rows surface honestly? |

## Current Blockers

- `PIPELINE_SHEET_ID` was empty during Phase 9 env upload.
- `PRODUCTION_REVENUE_SHEET_ID` was empty during Phase 9 env upload.
- UI UX design spec is pending, which blocks UI approval but does not block source readiness.
- Source snapshots and stakeholder approvals are not complete.

## Readiness Command

Run:

```bash
npm run source:approval:readiness
```

The command prints a safe JSON report. It must not print secret values. It can return `status: "fail"` while Phase 10 is blocked.

## Named Scenario Evidence

Each named scenario must include:

- scope,
- source rows or source snapshot IDs checked,
- display contract result,
- UI surface checked,
- CSV result where relevant,
- chat evidence result where relevant,
- warnings,
- unresolved conflicts,
- approval status.

Required named scenarios:

- LDN Q1 Design rollup to Projects and detail,
- UCS04787 Float allocated/unallocated,
- UCS05186 duplicate/manual Float job,
- UCS04154 fee-sheet Float ID join,
- PCS00250 cache-without-raw warning,
- USA00262 sold-hours false-zero guard,
- USA00323 sold-hours false-zero guard,
- BT raw-without-cache Float mismatch,
- production revenue archived project visibility,
- TBC pipeline row identity,
- exact client drilldown.

## Exit Criteria

Phase 10 can exit only when:

- source stream env blockers are resolved or explicitly accepted as blockers,
- read-only source snapshots exist,
- named evidence pack is complete,
- every difference is classified,
- source warnings are not flattened into success language,
- Sian, Jade, and Yunni approval is either complete or explicitly not complete,
- production cutover remains blocked until approval is real.

## No-Cutover Rule

Do not attach a production domain, create a production Railway service, or tell stakeholders the dashboard is accurate until Phase 10 passes and Phase 9.5 UI parity is approved.
