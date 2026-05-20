# Phase 1 UX Parity Map

Tickets integrated: GitHub `#17`, `#18`, `#19`, `#20`, `#21`.

Follow-up screenshot tickets: GitHub `#23`, `#24`, `#25`.

Status: Phase 1 assembly candidate, pending Doctrine Steward review in GitHub `#22`.

## Purpose

This map separates the approved old dashboard experience from the old dashboard implementation.

The rebuild must feel familiar to Sian, Jade, and Yunni, but it must not inherit old selectors, old reconciliation shortcuts, old page-local totals, old chat claims, or old mutation paths.

Phase 1 is reference mapping only. It does not approve product UI code, parsers, sync code, database schema, display calculations, chat investigation code, deployment, source-system mutation, or Supabase migration.

## Source Evidence

| Source | Output |
|---|---|
| P1-A, `#17` | `docs/phase-1/route-inventory.md` |
| P1-B, `#18` | `docs/phase-1/scope-filter-workflows.md` |
| P1-C, `#19` | `docs/phase-1/table-export-inventory.md` |
| P1-D, `#20` | `docs/phase-1/screenshot-coverage.md` |
| Current screenshots | `reference/ui/current-app/*.png` |
| Current screenshot manifest | `reference/ui/current-app/manifest.md` |

## Parity Decision

Approved parity means preserving workflows, visible surfaces, dense information design, and route shapes where lawful.

It does not mean copying old data plumbing.

The old app is evidence for UX. The new app must use the new source archive, parser facts, canon queries, and display contract for every number.

## Preserve Routes And Surfaces

These routes remain part of the intended product shape unless a later phase proves a route is duplicate or unsafe:

| Surface | Route | Preserve |
|---|---|---|
| Dashboard home | `/dashboard` | top-line metrics, office/date scope, quick periods, department/month/role/client rollups, freshness and warning surfaces |
| Projects | `/dashboard/projects` | dense reconciliation table, filters, search, active chips, CSV, source-only row visibility, footer totals |
| Project detail | `/dashboard/projects/[jobNumber]` | scoped source cards, monthly comparison, profitability by role, Float trace, back links, source warnings |
| Float diagnostics | `/dashboard/float` | matching health, raw/cache/visible audit, Float problem list, paste-only export compare |
| Float trace | `/dashboard/float/[floatProjectId]` | direct read-only trace for Float project/task/person evidence |
| Data Quality | `/dashboard/data-quality` | source-problem hub, chase/issues/orphan/Float/archive/admin diagnostic tabs |
| Approval Audit | `/dashboard/approval` | readiness gates and evidence checks |
| Sync Audit | `/dashboard/audit` | operational sync/audit visibility |
| Diagnostics | `/dashboard/diagnostics` | parser and source diagnostics for admin/developer use |
| Integrity | `/dashboard/integrity` | keep only if it has a distinct evidence workflow after Phase 5 |
| Chase | `/dashboard/chase` | keep workflow, likely inside Data Quality if the standalone route is duplicate |
| Readiness | `/dashboard/readiness` | keep only if distinct from Approval/Data Quality |
| Glossary | `/dashboard/glossary` | plain-language source and metric explanations |
| Admin sync warnings | `/dashboard/admin/sync-warnings` | admin warning evidence for unmatched Float and source anomalies |
| Admin timeoffs | `/dashboard/admin/timeoffs` | Float capacity-reduction evidence, separate from project booked hours |
| Users | `/dashboard/users` | admin-only user management if rebuild includes user admin |

## Preserve Global Chrome

The rebuild should keep the same high-level operating shape:

- shared dashboard layout with auth guard,
- `TopBar` above route content,
- primary `TabNav` below the top bar,
- page-level audit/warning banner,
- exchange-rate or source-rate warning surface where needed,
- chat entry available across dashboard routes,
- office filter buttons,
- date range controls and quick periods,
- Clear All Filters,
- sync status surface,
- Ask AI button.

Do not preserve:

- hydration mismatch from relative age text,
- local auth-bypass `/api/sync` noise,
- route latency as an acceptable target,
- richer scope being dropped by tab changes,
- sync mutation from chat or route-level diagnostics.

## Primary Navigation

Primary tabs to preserve:

| Tab | Route |
|---|---|
| Department Rollup | `/dashboard` |
| Projects | `/dashboard/projects` |
| Float | `/dashboard/float` |
| Approval Audit | `/dashboard/approval` |
| Data Quality | `/dashboard/data-quality` |
| Glossary | `/dashboard/glossary` |

Admin tabs to preserve where the user is admin:

| Tab | Route |
|---|---|
| Sync Audit | `/dashboard/audit` |
| Sync Warnings | `/dashboard/admin/sync-warnings` |
| Capacity Reduced | `/dashboard/admin/timeoffs` |
| Users | `/dashboard/users` |

Data Quality badge behaviour may be preserved only if backed by the new evidence model.

## Canonical Scope

Every rebuilt route, link, export, diagnostic, and chat question must operate on an explicit scope.

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

Scope laws:

- `office`, `from`, and `to` are always explicit.
- `department`, `role`, `client`, `jobNumber`, and `floatProjectId` are exact identity or slice scope.
- `search` is fuzzy ad hoc search only.
- exact client drilldown must not be implemented with fuzzy `search`.
- `view`, `pview`, `tab`, `severity`, `page`, `sample`, and `fast` are UI state, not truth scope.
- URL values win over cookie/default values.
- cookie continuity is allowed only when the active scope remains visible and testable.
- chat must receive the active scope, not only office/date.

## Required User Workflows

### Sian Q1 Design

Required path:

1. Open `/dashboard`.
2. Select `office=LDN`.
3. Select Q1, meaning `from=2026-01-01` and `to=2026-03-31`.
4. Click the Design department rollup.
5. Land on `/dashboard/projects?office=LDN&from=2026-01-01&to=2026-03-31&department=design`.
6. Projects rows, footer, and CSV are generated from the same display contract.
7. Click a project.
8. Project detail keeps `office`, `from`, `to`, and `department`.
9. Pipeline and Production Revenue are hidden or labelled unsupported for department scope if the source cannot attribute them.

Preserve the journey. Fix old behaviour where unsupported Pipeline or Production Revenue could look like numeric zero.

### Sian Monthly Reconciliation

Required path:

1. Open `/dashboard`.
2. Apply office and date scope.
3. Switch to `view=month`.
4. Click a month row.
5. Projects shows the same one-month scope.
6. Source-only rows remain visible.
7. CSV exports the same visible rows and supported footer metrics.

Monthly rows must surface disagreements. They must not hide source-only rows to make totals look clean.

### Yunni Float Trace

Required path:

1. Open `/dashboard/float` with office/date scope.
2. Search or click a project, job, or Float ID.
3. See the fee-sheet Float ID where present.
4. See raw Float project/task/person evidence.
5. See allocation cache evidence.
6. See visible dashboard row evidence.
7. See raw/cache/visible classification.
8. See duplicate/manual/inactive/source-warning candidates.

Float diagnostics are no-write and diagnostic-only. They cannot become a second product truth.

### CSV Export

Required path:

1. Apply office/date/client/department/role/search scope.
2. Export CSV from Projects.
3. CSV comes from the same display rows as the Projects table.
4. CSV carries row type and source identity.
5. Unsupported values export as unsupported or blank with a reason, not as silent zero.

### Chat

Required path:

1. Ask a scoped question from any dashboard page.
2. Chat receives the active `DashboardScope`.
3. Chat runs read-only evidence tools.
4. Chat reports only evidence-backed findings.
5. Chat shows sources checked, confidence, warnings, and unresolved conflicts.
6. Chat says `Needs Codex` for code, browser testing, repo inspection, source mutation, sync, deployment, or stakeholder communication.

## Tables And Controls To Preserve

### Rollup Tables

Preserve:

- Department, Month, Role, and Client rollups,
- dynamic first column,
- Pipeline, Sold, Sold Hours, Allocated, Unallocated, Total Hours, Allocated Value, Variance, and Status columns where supported,
- sortable headers,
- expand/collapse where child rows exist,
- drill links into Projects,
- footer totals,
- allocation-thin and source-warning states,
- empty state.

Fix:

- unsupported row-level Pipeline or Production Revenue must be labelled as unsupported,
- derived variance/status must come from the display contract,
- footer totals must not be page-local.

### Projects Table

Preserve:

- List/Calendar view toggle if backed by real contract data,
- Download CSV,
- search input,
- date range and quick period controls,
- active filter chips,
- Add Filter picker,
- dense table shape,
- row links to project detail or Float trace,
- row type badges,
- footer totals.

Preserve columns:

- Job Number,
- Client,
- Project,
- Office,
- scoped Sold fee label,
- Pipeline,
- Sold Hours,
- Allocated Hours,
- Unallocated Hours,
- Float Value,
- Variance Hours,
- Confidence,
- Last Sync,
- Actions slot.

Preserve row types:

- `fee_tracker`,
- `pipeline_only`,
- TBC pipeline identity,
- `prod_only`,
- `float_only`.

Do not preserve live mutation controls until the mutation boundary allows them. Archive and dismiss affordances may be represented as disabled, hidden, or future controls in early rebuild phases.

### Project Detail

Preserve:

- header and scoped back link,
- date/scope controls,
- active filter chips,
- source-specific KPI cards,
- Sold vs Allocated by Month,
- Profitability by Role,
- person-level allocation detail,
- Float Trace table,
- integrity/source warnings,
- project checklist only if every item is evidence-backed,
- Open Fee Sheet link where available.

Fix:

- Pipeline and Production Revenue under department/role scope must be unsupported if the source cannot attribute them.
- missing role data must be unsupported or warning, not zero.
- route latency must be improved.

### Float Diagnostics

Preserve:

- overview cards,
- Matching Health cards,
- Dashboard Float Rendering Audit table,
- Float Problems table,
- Float Export Compare textarea and result table,
- Float trace detail route.

Float rendering classifications must match the new laws:

- visible vs cache mismatch is `FAIL`,
- raw > 0 and cache = 0 is `FAIL`,
- cache > 0 and raw = 0 is `WARN`,
- non-trivial raw/cache delta is at least `WARN`,
- inactive Float contributing visible hours is `FAIL`.

## Do Not Preserve

The rebuild must explicitly avoid these old-app failures:

- old selectors as product truth,
- page-local totals,
- CSV-only totals,
- route-specific reinterpretation of scope,
- fuzzy search as exact client or job drilldown,
- unsupported values as zero,
- unsupported values as silent blank,
- hiding source-only rows,
- hiding archived production revenue if it is real source revenue,
- collapsing all TBC pipeline rows into one invisible bucket,
- chat answers without evidence packs,
- Float diagnostics as a second display authority,
- confidence formulas not owned by law tests,
- horizontal Projects table overflow,
- route latency of 45 seconds to 2.5 minutes,
- hydration mismatches,
- sync/mutation actions before the mutation boundary allows them.

## Screenshot Reference Status

Current visual evidence is partial and useful, not complete.

Covered:

- dashboard default,
- LDN Q1 department rollup,
- LDN Q1 month rollup,
- Projects default,
- Projects LDN Q1 Design,
- Projects search for UCS04787.

Blocked or missing:

- project detail,
- Float overview,
- Float trace,
- Data Quality,
- Approval,
- Audit,
- Diagnostics,
- Integrity,
- Chase,
- Readiness,
- Glossary,
- admin routes,
- exact client drilldown,
- role drilldown,
- source-only row states,
- unsupported states,
- chat states,
- mobile and laptop viewports.

The gaps are not hidden. They are tracked in:

- `#23`, long-timeout project detail and named scenario captures,
- `#24`, Float and diagnostic route captures,
- `#25`, deterministic fixture screenshot states.

## Phase 2 Handoff

Phase 2 must not use this document as a data model.

Phase 2 should use this map only to know which source facts and raw-row evidence the later UI must be able to explain.

Before parsers or display rows exist, Phase 2 must build the raw source archive and skipped-row ledger so no non-empty source row can vanish.
