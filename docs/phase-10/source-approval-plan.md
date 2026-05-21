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

- Source stream env is configured in staging for Sold, Pipeline, Production Revenue, and Float.
- UI UX parity spec is locked for implementation guidance.
- Source snapshots and stakeholder approvals are not complete.
- `SOURCE_SNAPSHOT_FILE` must point at an importable read-only snapshot file with non-empty rows for all four truth streams before `SOURCE_SNAPSHOTS_READY` can pass.
- `SOURCE_SNAPSHOT_STATUS=ready` is not accepted as a bypass. Snapshot readiness must be artifact-backed.

## Readiness Command

Run:

```bash
npm run source:approval:readiness
```

The command prints a safe JSON report. It must not print secret values. It can return `status: "fail"` while Phase 10 is blocked.

For artifact-backed snapshot approval, run it with:

```bash
SOURCE_SNAPSHOT_FILE=/path/to/source-snapshot.json npm run source:approval:readiness
```

The snapshot file must use the existing read-only source snapshot import shape. The gate only checks that the evidence exists and can be imported safely. It does not claim stakeholder approval or source accuracy by itself.

To create a local read-only snapshot artifact from staging credentials:

```bash
railway run --service ucs-data-integrity-rebuild --environment staging npm run source:snapshot:create -- --out test-results/source-snapshots/phase10-source-snapshot.json --max-rows 100
```

The snapshot output path is ignored by git. The command writes source data locally and prints only a row-count summary.

For the `#88` targeted Float evidence slice, include named scenarios and known Float project IDs:

```bash
railway run --service ucs-data-integrity-rebuild --environment staging npm run source:snapshot:create -- --out test-results/source-snapshots/phase10-source-snapshot.json --max-rows 100 --float-scenario-codes UCS04787,UCS05186,UCS04154,PCS00250,BT --float-project-ids 10480262
```

The Float adapter is read-only. It always reads projects first, then resolves target project IDs from matching scenario text or explicit `--float-project-ids`, then reads targeted tasks and the referenced people evidence. Allocated and unallocated hours are derived from Float tasks plus people/project metadata; there is no separate Float allocations endpoint in this contract. It accepts common Float response envelopes: a bare array, `{ "data": [...] }`, or a collection key such as `{ "tasks": [...] }`, `{ "people": [...] }`, and `{ "projects": [...] }`.

Live Float response shape still needs staging confirmation for every endpoint. The snapshot includes a `float:target-manifest` row with `requestedScenarioCodes`, `requestedProjectIds`, `resolvedProjectIds`, and `unresolvedScenarioCodes`; unresolved scenarios remain blockers for the named evidence pack rather than being guessed.

To create the stakeholder/no-cutover pack from that artifact:

```bash
SOURCE_SNAPSHOT_FILE=test-results/source-snapshots/phase10-source-snapshot.json npm run stakeholder:approval:pack
```

This pack is allowed to be `blocked`. It must stay blocked while named scenario warnings or missing stakeholder approvals remain.

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
