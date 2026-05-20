# Source Contracts

This document defines what each source can claim, what it cannot claim, and how the app must surface limitations.

## Shared Source Contract

Every source adapter must produce:

- source batch,
- raw source row,
- parser facts,
- parser warnings,
- dropped-row ledger,
- source capability metadata.

Every parsed fact must include:

- source,
- source layer,
- raw row IDs,
- batch ID,
- source document or API object ID,
- source tab and row number where available,
- parsed values,
- confidence,
- warnings,
- additive status.

## Sold, Fee Sheets

### Source Owner

Jade and project leads.

### Source Meaning

Fee sheets represent sold fee and sold hours. They may include CLIENT SUMMARY data, V-tab data, roles, departments, months, and project metadata.

### Required Fields

- job number,
- client,
- project name,
- office,
- fee-sheet Float ID from first tab,
- month,
- department where available,
- role where available,
- sold fee,
- sold hours,
- source tab,
- source row/cell identity.

### Capabilities

| Capability | Status |
|---|---|
| Project | Supported |
| Month | Supported |
| Office | Supported at row level |
| Client | Supported |
| Department | Supported when parser can identify department |
| Role | Partially supported |
| Person | Unsupported |

### Laws

- first-tab Float ID is authoritative for original fee-sheet Float join,
- CLIENT SUMMARY and V-tabs must remain auditable,
- zero-fee/nonzero-hour rows ingest,
- parser rows are additive only when proven,
- row-level office beats project header office for scoped totals.

### Required Warnings

- CLIENT SUMMARY/V-tab disagreement,
- shifted template,
- formula damage in metric cells,
- missing Float ID,
- duplicate job number,
- role rows absent,
- unsupported role mapping,
- zero fee with hours.

## Pipeline

### Source Owner

Jade.

### Source Meaning

Pipeline represents expected or possible future revenue. It is its own stream and does not become sold fee.

### Required Fields

- source row ID,
- job number if present,
- stable TBC identity if no useful job number,
- client,
- project name,
- month/date,
- amount,
- status where present,
- source label.

### Capabilities

| Capability | Status |
|---|---|
| Project | Supported when job/project exists, otherwise source row |
| Month | Supported |
| Office | Partially supported |
| Client | Supported |
| Department | Unsupported |
| Role | Unsupported |
| Person | Unsupported |

### Laws

- every non-empty row surfaces,
- TBC rows are split by source row,
- source project name is preserved exactly,
- canonical client may supplement but not replace source client,
- department/role pipeline is unsupported unless the source changes.

### Required Warnings

- no job number,
- TBC row,
- unmatched project,
- ambiguous client,
- unsupported department/role slice.

## Production Revenue

### Source Owner

Production team and Jade.

### Source Meaning

Production revenue is real or expected production-only revenue. It can count in commercial headline revenue where product rules say so, but it does not automatically support department or role attribution.

### Required Fields

- source row ID,
- job number if present,
- project name,
- client,
- month/date,
- amount,
- status,
- office or office inference,
- source row identity.

### Capabilities

| Capability | Status |
|---|---|
| Project | Supported when job/project exists, otherwise source row |
| Month | Supported |
| Office | Partially supported |
| Client | Supported |
| Department | Unsupported |
| Role | Unsupported |
| Person | Unsupported |

### Laws

- every status surfaces,
- blank status becomes `UNKNOWN`,
- non-confirmed rows cannot collide with confirmed rows,
- archived project revenue remains visible,
- no-job revenue remains visible with attribution warning.

### Required Warnings

- status collision,
- blank/unknown status,
- no job number,
- archived matched project,
- unsupported department/role slice,
- office inferred rather than sourced.

## Float

### Source Owner

Resourcing team.

### Source Meaning

Float represents planned and allocated work. It is task and people evidence, not a single simple project total.

### Required Raw Objects

- projects,
- tasks,
- people,
- task assignments/splits,
- time off or availability if used by expansion logic.

### Required Parsed Fields

- Float project ID,
- project code/name,
- task ID,
- person ID/name,
- department,
- role,
- task date range,
- hours,
- tentative flag,
- active/archive state,
- expansion rule,
- month,
- allocated/unallocated classification.

### Capabilities

| Capability | Status |
|---|---|
| Project | Supported by Float ID |
| Month | Supported through expansion |
| Office | Partially supported |
| Client | Partially supported |
| Department | Partially supported |
| Role | Partially supported |
| Person | Supported |

### Laws

- fee-sheet Float ID is the join key for original fee-sheet work,
- manual duplicates remain evidence,
- archived/inactive jobs with hours surface,
- raw task hours, expanded hours, cache rows, and visible dashboard rows are separate,
- raw/cache/visible mismatches warn or fail,
- placeholder/pencil/orphan work surfaces.

### Required Warnings

- missing fee-sheet Float ID,
- duplicate Float candidates,
- manual duplicate,
- inactive with hours,
- archived with hours,
- raw without cache,
- cache without raw,
- raw/cache delta,
- unsupported role or department mapping,
- export/dashboard mismatch,
- multi-person split ambiguity.

## Source Capability Matrix

| Source | Project | Month | Office | Client | Department | Role | Person | Notes |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Fee sheet sold | Yes | Yes | Yes | Yes | Yes | Partial | No | Role support depends on parser confidence |
| Pipeline | Partial | Yes | Partial | Yes | No | No | No | TBC/no-job rows are source rows |
| Production revenue | Partial | Yes | Partial | Yes | No | No | No | Status and no-job rows must surface |
| Float | Yes | Yes | Partial | Partial | Partial | Partial | Yes | Month depends on expansion semantics |

## Unsupported Output Contract

Every unsupported metric must include:

```ts
type UnsupportedMetric = {
  metric: string;
  scope: DashboardScope;
  source: string;
  reason: string;
  displayLabel: "Unsupported";
  severity: "info" | "warn";
};
```

Unsupported metrics are never exported as numeric zero.
