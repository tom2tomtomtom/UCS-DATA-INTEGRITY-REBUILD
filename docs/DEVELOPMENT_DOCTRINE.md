# Development Doctrine

## Vision

Build the same UCS dashboard experience with a clean data integrity core.

Same UX means:

- Sian and Yunni recognise the dashboard,
- the same workflows are present,
- the same core pages exist,
- drilldowns feel familiar,
- exports remain useful.

Clean rebuild means:

- no old selector maze,
- no page-local business logic,
- no hidden source filters,
- no cache-as-truth,
- no chat answer outside evidence,
- no unsupported value presented as zero.

## Product Promise

For any visible number, the app can answer:

- What source rows created this number?
- What office/date/client/department/role/project scope is active?
- What sources support this cut?
- What sources do not support this cut?
- What rows were source-only?
- What conflicts exist?
- What confidence does the system have?
- What does a human need to fix at source?

## Chosen Stack

The rebuild should use the same broad app shape as the existing dashboard unless Tom explicitly changes it before code starts.

| Layer | Choice | Reason |
|---|---|---|
| App | Next.js App Router | Preserves current dashboard UX/server-rendered data flow |
| Language | TypeScript | Strong contracts for source facts and display laws |
| UI | React, Tailwind, existing dashboard patterns | Same user experience, minimal UX relearning |
| Database | Supabase Postgres | Current operational pattern and source archive fit |
| ORM/query | Drizzle or typed SQL, chosen before schema work | Must support precise source-row queries |
| Tests | Vitest plus Playwright | Unit/contract and deterministic UI coverage |
| Deployment | Railway | Current project deployment expectation |
| Source APIs | Google Sheets read-only, Float API read-only | Preserve source evidence without mutation |

Do not switch stack because a greenfield repo feels like permission to start again creatively.

Stack changes require an ADR before implementation.

## Architecture

The app has five layers.

```txt
Source Pulls
  -> Immutable Raw Source Archive
    -> Parsed Source Facts
      -> Canonical Source Queries
        -> One Dashboard Display Contract
          -> UI, CSV, Chat, Verify, Approval
```

No layer may skip ahead.

No UI may query raw source tables directly.

No script may calculate product totals outside the display contract.

## Layer 0: Raw Source Archive

Purpose:

- preserve exactly what was pulled,
- make parser mistakes recoverable,
- prove whether a row existed at a point in time.

Sources:

- fee tracker,
- fee sheets,
- pipeline,
- production revenue,
- Float projects,
- Float tasks,
- Float people,
- Float availability/time off if used.

Minimum batch fields:

```ts
type SourceBatch = {
  id: string;
  source: "fee_tracker" | "fee_sheet" | "pipeline" | "production_revenue" | "float";
  startedAt: string;
  completedAt?: string;
  status: "running" | "success" | "partial" | "failed";
  pulledBy: "sync" | "manual" | "test" | "backfill";
  sourceVersion?: string;
  warnings: SourceWarning[];
};
```

Minimum row fields:

```ts
type RawSourceRow = {
  id: string;
  batchId: string;
  source: SourceBatch["source"];
  sourceDocumentId?: string;
  sourceTab?: string;
  sourceRowNumber?: number;
  sourceObjectId?: string;
  raw: unknown;
  contentHash: string;
  observedAt: string;
};
```

Rules:

- raw rows are immutable,
- parser failure never deletes raw evidence,
- latest batch does not erase previous evidence without deletion proof,
- source row identity must survive into parsed facts.

## Layer 1: Parsed Source Facts

Purpose:

- convert raw source rows into typed facts,
- preserve source limitations,
- preserve conflicts,
- make every parsed number traceable.

Base fact:

```ts
type ParsedFactBase = {
  id: string;
  source: "fee_sheet" | "pipeline" | "production_revenue" | "float";
  sourceLayer: string;
  rawRowIds: string[];
  batchId: string;
  jobNumber?: string;
  floatProjectId?: string;
  client?: string;
  sourceClient?: string;
  canonicalClient?: string;
  projectName?: string;
  sourceProjectName?: string;
  office?: "LDN" | "USA" | "UCX" | "UNKNOWN";
  month?: string;
  from?: string;
  to?: string;
  department?: string;
  role?: string;
  person?: string;
  amountGbp?: number;
  amountOriginal?: number;
  originalCurrency?: string;
  hours?: number;
  status?: string;
  isAdditive: boolean;
  confidence: "high" | "medium" | "low";
  warnings: string[];
};
```

Rules:

- facts can conflict,
- facts can be non-additive,
- facts can be unsupported for a scope,
- facts are never hidden because another fact is cleaner.

## Layer 2: Canonical Source Queries

Purpose:

- expose typed facts by scope,
- return capability metadata,
- avoid UI row construction.

Required APIs:

```ts
selectSoldFacts(scope)
selectPipelineFacts(scope)
selectProductionRevenueFacts(scope)
selectFloatFacts(scope)
selectSourceIssues(scope)
```

Rules:

- no product display totals,
- no page-specific filtering,
- no fuzzy search,
- no source-only hiding,
- no archive hiding.

## Layer 3: Display Contract

Purpose:

- be the only authority for what the dashboard displays.

Required API:

```ts
buildDashboardDisplayContract({
  scope,
  soldFacts,
  pipelineFacts,
  productionRevenueFacts,
  floatFacts,
  sourceIssues,
}): DashboardDisplayContract
```

Required output:

```ts
type DashboardDisplayContract = {
  scope: DashboardScope;
  generatedAt: string;
  visibleRows: DashboardProjectRow[];
  heroTotals: DashboardTotals;
  footerTotals: DashboardTotals;
  rollups: {
    byDepartment: RollupRow[];
    byRole: RollupRow[];
    byMonth: RollupRow[];
    byClient: RollupRow[];
  };
  csvRows: DashboardCsvRow[];
  unsupported: UnsupportedMetric[];
  reconciliation: ReconciliationCheck[];
  sourceTrace: SourceTraceSummary[];
  warnings: DisplayWarning[];
  confidence: "high" | "medium" | "low";
};
```

Consumers:

- dashboard hero,
- rollup tables,
- Projects table,
- Projects footer,
- CSV export,
- project detail,
- Float diagnostics,
- Data Quality,
- Approval,
- verify scripts,
- chat evidence.

## Layer 4: UX

Preserve the useful current dashboard UX:

- dashboard home,
- office/date filters,
- quick filters,
- department rollup,
- role rollup,
- month rollup,
- client rollup,
- Projects table,
- CSV export,
- project detail,
- Float diagnostics,
- Data Quality,
- Approval/Readiness,
- chat panel.

Improve only where needed to make truth clearer:

- unsupported labels,
- compact source trace,
- warning badges,
- "Needs Codex" handoff,
- source-only row labels,
- row-type badges,
- scoped back links.

## Scope

Canonical scope:

```ts
type DashboardScope = {
  office: "LDN" | "USA" | "UCX" | "ALL";
  from: string;
  to: string;
  department?: string;
  role?: string;
  client?: string;
  search?: string;
  jobNumber?: string;
  floatProjectId?: string;
};
```

Rules:

- all route params become `DashboardScope`,
- exact client drilldown uses `client`,
- fuzzy table search uses `search`,
- links preserve scope,
- project detail remains scoped,
- unsupported source cuts are explicit.

## Source Capability Matrix

| Source | Project | Month | Office | Client | Department | Role | Person |
|---|---:|---:|---:|---:|---:|---:|---:|
| Fee sheet sold | Yes | Yes | Yes | Yes | Yes | Sometimes | No |
| Pipeline | Yes or source row | Yes | Sometimes | Yes | No | No | No |
| Production revenue | Yes or source row | Yes | Sometimes | Yes | No | No | No |
| Float tasks | Yes or Float ID | Yes via expansion | Sometimes | Sometimes | Sometimes | Sometimes | Yes |

Display rule:

- supported and zero means zero,
- unsupported means unsupported,
- partially supported means value with warning.

## Source-Specific Contracts

### Fee Sheets

Must:

- read first-tab Float ID,
- preserve CLIENT SUMMARY evidence,
- preserve V-tab evidence,
- ingest zero-fee/nonzero-hour rows,
- distinguish totals from detail rows,
- preserve row-level office,
- detect template drift.

Must not:

- silently discard CLIENT SUMMARY when V-tabs exist,
- sum raw parser rows without additive proof,
- infer zero sold hours from missing role detail,
- check formula health against irrelevant cells.

### Pipeline

Must:

- preserve every row,
- preserve source project names,
- keep TBC rows split by source row,
- keep no-job rows visible,
- keep pipeline out of department/role attribution unless source supports it.

Must not:

- collapse TBC into one key,
- hide unmatched rows,
- let a DB mirror use different identity from the live source path.

### Production Revenue

Must:

- preserve every status,
- preserve blank/unknown status as `UNKNOWN`,
- prevent confirmed/negotiating key collision,
- surface archived-project revenue,
- surface no-job rows with source identity and attribution warning.

Must not:

- count prod-rev in hero while hiding it in Projects/CSV,
- default no-job office without warning,
- delete production revenue because a matched project is archived.

### Float

Must:

- store raw projects, tasks, people,
- use fee-sheet Float ID as canonical join key for original fee-sheet job,
- preserve manual duplicates,
- preserve archived/inactive projects with hours,
- separate raw task hours, expanded allocation hours, cache hours, and visible hours,
- show task expansion math,
- classify raw/cache/visible deltas.

Must not:

- silently auto-correct Float IDs,
- compare different date scopes,
- treat raw task span hours as monthly dashboard hours without labelling,
- hide placeholder/pencil/orphan work,
- green-light stale cache.

## Chat

Chat is read-only.

Chat answers from:

- display contract,
- evidence pack,
- source traces,
- warnings,
- unresolved conflicts.

Chat cannot:

- archive,
- sync,
- deploy,
- edit,
- write to source systems,
- invent unsupported findings,
- answer from raw parser rows as totals.

Chat must say `Needs Codex` when the question requires:

- code changes,
- browser UI testing,
- repo inspection beyond its tools,
- sync/deploy action,
- source mutation,
- stakeholder communication.

## Development Phases

### Phase 0: Freeze UX

Deliver:

- UX parity map,
- current route list,
- screenshots,
- key click paths,
- CSV column list,
- chat affordance list.

### Phase 1: Immutable Source Archive

Deliver:

- raw source batches,
- raw source rows,
- pull logs,
- source browser.

Acceptance:

- every non-empty source row is findable.

### Phase 2: Parsers

Deliver:

- parser contracts,
- parsed facts,
- parser warnings,
- fixtures.

Acceptance:

- every skipped row is explained,
- every parser row has source identity.

### Phase 3: Display Contract

Deliver:

- `buildDashboardDisplayContract`,
- source capability matrix,
- unsupported metrics,
- reconciliation checks.

Acceptance:

- generated scope tests pass before UI is attached.

### Phase 4: UI Parity

Deliver:

- same core dashboard UX,
- all surfaces wired to display contract,
- no page-local business totals.

Acceptance:

- deterministic UI tests prove drilldowns and totals.

### Phase 5: Chat And Diagnostics

Deliver:

- evidence-pack chat,
- Float diagnostics,
- Data Quality,
- Approval.

Acceptance:

- trap prompts cannot produce unsupported claims.

### Phase 6: Dual Run And Cutover

Deliver:

- side-by-side comparison with old app,
- classified differences,
- launch gate report.

Acceptance:

- differences are explained as old bug, new bug, source issue, or intentional change.

## Definition Of Done

A feature is done only when:

- the law exists,
- the test exists,
- the contract supports it,
- UI uses the contract,
- CSV uses the contract,
- chat can explain it or says `Needs Codex`,
- real-data gate runs when applicable,
- docs are updated.
