# P1-B Scope, Filter, URL State, And Workflow Inventory

Ticket: GitHub `#18`, P1-B

Old app inspected read-only: `/Users/tommyhyde/ucs-commercial-dashboard`

New repo write set: `docs/phase-1/scope-filter-workflows.md`

## Purpose

This document inventories the current app's scope and filter behavior so the rebuild can preserve the approved workflows without preserving scope loss, fuzzy drilldowns, or second-authority calculations.

Law protected: Law 4, Scope Is Explicit And Preserved.

Related laws protected: Law 3, One Display Contract Owns All Visible Numbers; Law 5, Unsupported Is Not Zero; Law 7, Raw, Cache, And Visible Must Reconcile Or Warn.

## Old App Files Inspected

- `src/app/dashboard/page.tsx`
- `src/app/dashboard/projects/page.tsx`
- `src/app/dashboard/projects/[jobNumber]/page.tsx`
- `src/app/dashboard/float/page.tsx`
- `src/app/dashboard/float/[floatProjectId]/page.tsx`
- `src/app/dashboard/data-quality/page.tsx`
- `src/app/dashboard/approval/page.tsx`
- `src/components/dashboard/tab-nav.tsx`
- `src/components/dashboard/top-bar.tsx`
- `src/components/dashboard/filter-cookie-sync.tsx`
- `src/components/dashboard/date-range-picker.tsx`
- `src/components/dashboard/project-search.tsx`
- `src/components/dashboard/add-filter-picker.tsx`
- `src/components/dashboard/active-filter-chip.tsx`
- `src/components/dashboard/project-table.tsx`
- `src/components/dashboard/chat-panel.tsx`
- `src/lib/filter-cookies.ts`
- `src/lib/hooks/use-dashboard-filters.ts`
- `src/lib/dashboard/display-contract.ts`
- `src/lib/dashboard/project-export.ts`
- `src/app/api/chat/route.ts`
- `src/lib/chat/tools.ts`
- `src/lib/db/select/dashboard-view.ts`

## Filter Model Inventory

### Canonical Rebuild Scope

The rebuild scope must model the Law 4 fields directly:

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

### Old App URL Parameters

| Param | Old app meaning | Old app surfaces | Preserve? | Rebuild requirement |
|---|---|---|---|---|
| `office` | `Agency`, `LDN`, `UCX`, `USA`; `Agency` means all allowed offices | Dashboard, Projects, Float, Approval, Data Quality, Chat | Preserve intent, rename internally to `ALL` if useful | Store explicit `office` in scope. Do not infer from project header. |
| `from` | Inclusive start date | Dashboard, Projects, Project Detail, Float, Approval, Data Quality, Chat | Preserve | Every drilldown, export, chat answer, and trace must carry it. |
| `to` | Inclusive end date | Dashboard, Projects, Project Detail, Float, Approval, Data Quality, Chat | Preserve | Every drilldown, export, chat answer, and trace must carry it. |
| `view` | Rollup breakdown: `department`, `month`, `role`, `client` | Dashboard, Projects | Preserve as UI state, not data scope | It chooses the displayed rollup, but does not replace `department`, `role`, or `client` scope. |
| `department` | Department slice key, for example `design` | Projects, Project Detail | Preserve | Must survive Projects, Project Detail, CSV, Chat, and Float trace where relevant. |
| `role` | Role slice label | Projects, Project Detail | Preserve | Must be exact role scope, not fuzzy label search. |
| `client` | Client slice from rollup option list | Projects, Project Detail | Preserve and tighten | Must be exact client drilldown. Do not implement client drilldown as `search`. |
| `search` | Fuzzy filter over job number, client name, project name | Projects | Preserve as a separate ad hoc search field | Never use `search` as client or job drilldown. It is not identity. |
| `jobNumber` | Present in old display contract filters but normally path based in UI | Project Detail path, contract helper | Preserve as scope field | Project detail scope should include exact `jobNumber`. |
| `floatProjectId` | Path param on Float detail, not a URL query param | Float Detail path | Preserve as scope field | Float trace scope should include exact `floatProjectId` when present. |
| `pview` | Projects presentation mode: list or calendar | Projects | Preserve as UI state only | Must not affect totals or CSV semantics. |
| `month` | Legacy hook value in `useDashboardFilters` | Top bar hook only | Do not preserve as data scope | Date range is `from` and `to`; month drilldown should use those. |
| `tab` | Data Quality tab | Data Quality | Preserve as UI state only | Must preserve active scope when tab changes. |
| `severity`, `page` | Data Quality chase filters/pagination | Data Quality | Preserve as local UI state | Must not override dashboard scope. |
| `sample`, `fast` | Approval audit options | Approval | Preserve as local UI state | Must preserve office/from/to and not become product truth. |

### Old App Persistence Model

The old app stores selected filters in a cookie named `ucs.filters`. It tracks `office`, `from`, `to`, `department`, `role`, `search`, `view`, and `pview`. Server components merge cookie defaults with current `searchParams`, with URL values winning over cookies.

Approved behavior:

- URL state wins over cookie state.
- Missing params can be filled from last-known filters so navigation feels continuous.
- Date quick controls update `from` and `to`.

Confusing legacy behavior:

- Cookie state can invisibly reapply filters when a URL omits them. The rebuild can keep continuity, but the active scope must be visible and testable.
- `client` is missing from the cookie type and tracked keys in the inspected old app, even though Projects supports `client`. Client scope may be lost on navigation that relies on cookie fallback.
- Tab navigation preserves only `office`, `from`, and `to`, dropping `department`, `role`, `client`, `search`, `jobNumber`, and `floatProjectId`.
- `useDashboardFilters` still exposes `month` while the approved model uses `from` and `to`.

## URL Preservation Inventory

### Strong Preservation In Old App

- Dashboard rollup links build Projects URLs with `office`, `from`, `to`, and the clicked rollup field.
- Projects rollup links build Projects URLs with existing `office`, `from`, `to`, and active `department`, `role`, `client`, `search` as inputs, then override the clicked field.
- Projects table links to project detail include `from`, `to`, `office`, `department`, `role`, and `client`.
- Float-only rows link to `/dashboard/float/[floatProjectId]` with Projects link params.
- Project detail back link preserves `office`, `from`, `to`, `department`, `role`, and `client`.
- Float detail back link preserves `office`, `from`, and `to`.
- CSV rows are generated from the same old display contract rows that feed Projects table.

### Weak Or Missing Preservation In Old App

- Tab nav only forwards `office`, `from`, and `to`, so it drops active `department`, `role`, `client`, and `search`.
- Chat only sends `office`, `from`, and `to` to `/api/chat`; it does not send `department`, `role`, `client`, `search`, `jobNumber`, or `floatProjectId`.
- Chat `query_projects` uses fuzzy `ilike` for `client` and `jobNumber`.
- Projects `search` is fuzzy across job number, client name, and project name, which is fine for search but unsafe for drilldowns.
- Display contract `linkParamsFor` omits `search` and `jobNumber`, so table links intentionally drop search and cannot carry exact job scope through generic link params.
- Data Quality reads `office`, `from`, `to`, `tab`, `severity`, `search`, and `page`, but does not apply cookie defaults and its tab component must be separately checked by P1-C/P1-E before treating it as scope-safe.
- Approval hard-codes a UCS04787 Float trace as a reference check over LDN FY2026 while the page scope can be different. This is an approval-test artifact, not behavior to copy into the rebuild.

## Required Click Paths

### Sian Q1 Design

Approved path:

1. Open `/dashboard`.
2. Select `office=LDN`.
3. Select Q1, producing `from=2026-01-01&to=2026-03-31`.
4. Use Department rollup and click Design.
5. Land on `/dashboard/projects?office=LDN&from=2026-01-01&to=2026-03-31&department=design`.
6. Projects table, footer, and CSV are generated from the same scoped display contract.
7. Click a fee-tracker project.
8. Land on `/dashboard/projects/[jobNumber]?office=LDN&from=2026-01-01&to=2026-03-31&department=design`.
9. Project detail renders only the scoped row for that `jobNumber` and marks Pipeline and Production Revenue as unsupported for department scope.

Old-app evidence:

- Dashboard defaults and rollup links: `src/app/dashboard/page.tsx` lines 75 to 100 and 183 to 195.
- Projects params and display contract filters: `src/app/dashboard/projects/page.tsx` lines 63 to 83 and 137 to 145.
- Projects Design drill link: `src/app/dashboard/projects/page.tsx` lines 155 to 168.
- Project detail scoped contract: `src/app/dashboard/projects/[jobNumber]/page.tsx` lines 59 to 82.
- Project table link with link params: `src/components/dashboard/project-table.tsx` lines 597 to 599.

Preserve:

- The exact user journey and URL shape.
- Active filter chips for `department`, `role`, `client`, and `search`.
- Unsupported messaging for Pipeline and Production Revenue under department or role scope.

Fix:

- Treat `department=design` as explicit scope everywhere, including chat and tabs.
- Avoid the old pattern where display rows zero `pipelineFee` and `productionRevenue` for unsupported department scope. In the rebuild this must be an unsupported state, not numeric zero.

### Sian Monthly Reconciliation

Approved path:

1. Open `/dashboard`.
2. Select `office`, `from`, and `to`.
3. Switch rollup view to `view=month`.
4. Click a flagged month row.
5. Land on Projects with the same office and one-month `from`/`to` scope.
6. Projects shows matched rows plus source-only rows for that month.
7. Export CSV from Projects.
8. CSV row sum equals visible table footer for supported metrics.

Old-app evidence:

- Month rollup links set one-month `from` and `to`: `src/app/dashboard/page.tsx` lines 199 to 215.
- Projects reads `view`, `from`, `to`, and builds month breakdown: `src/app/dashboard/projects/page.tsx` lines 71 to 76 and 171 to 187.
- CSV uses display contract rows: `src/app/dashboard/projects/page.tsx` lines 137 to 145 and 267 to 270.
- CSV columns and row building: `src/lib/dashboard/project-export.ts` lines 29 to 54 and 89 to 125.

Preserve:

- Month row click narrows to the month by changing `from` and `to`.
- CSV export is a Projects action, not a separate totals authority.
- Source-only row identity remains in CSV via row type and source columns.

Fix:

- The old app's CSV exporter writes blank cells for zero and unsupported-like values. The rebuild must export unsupported as unsupported or blank with reason, never as a silent zero or ambiguous blank.
- Monthly reconciliation must include warning evidence where source streams disagree, not only visible row totals.

### Yunni Float Trace

Approved path:

1. Open `/dashboard/float?office=...&from=...&to=...`.
2. Search or click a project/job/Float ID from Projects or Float diagnostics.
3. See fee-sheet Float ID where the project has one.
4. See raw Float project/task evidence.
5. See allocation cache evidence.
6. See visible dashboard row.
7. See raw/cache/visible classification.
8. See duplicate/manual candidates.

Old-app evidence:

- Float page applies `office`, `from`, and `to`: `src/app/dashboard/float/page.tsx` lines 37 to 52.
- Float page builds rendering audit from dashboard-visible project rows: `src/app/dashboard/float/page.tsx` lines 54 to 68.
- Float rendering audit shows raw weekday, cache, visible, and issues: `src/app/dashboard/float/page.tsx` lines 185 to 205.
- Float problem links carry scoped `from`, `to`, and `office`: `src/app/dashboard/float/page.tsx` lines 80 to 81 and 215 to 225.
- Float detail reads `floatProjectId`, `office`, `from`, and `to`: `src/app/dashboard/float/[floatProjectId]/page.tsx` lines 31 to 44.
- Project table Float trace links preserve link params: `src/components/dashboard/project-table.tsx` lines 92 to 100 and 693 to 697.

Preserve:

- Float trace is diagnostic and no-write.
- Float trace compares raw Float, allocation cache, and visible dashboard values for the same office/date scope.
- Float-only rows can link directly to Float detail by `floatProjectId`.

Fix:

- Add explicit `floatProjectId` to canonical scope, even when it is represented as a path param.
- If a user arrives from a department, role, client, or job context, the Float trace surface should show that context or explicitly say it is operating at office/date/Float ID scope only.
- Do not let Float diagnostics become a second source of product truth.

### CSV Export

Approved path:

1. Apply any combination of `office`, `from`, `to`, `client`, `department`, `role`, and `search`.
2. Export CSV from Projects.
3. CSV is generated from the same display rows as the Projects table.
4. CSV includes source-only row type and source evidence columns.
5. Unsupported values export as unsupported or blank with reason, not zero.

Old-app evidence:

- Projects builds `displayContract` with active filters and passes its `csvHeaders` and `csvRows` to the download button: `src/app/dashboard/projects/page.tsx` lines 137 to 145 and 267 to 270.
- Display contract returns `csvRows: buildProjectCsvRows(rows)`: `src/lib/dashboard/display-contract.ts` lines 267 to 274.
- CSV headers include row type, source type, source sheet, source row, source job key, Float project ID, and source revenue metadata: `src/lib/dashboard/project-export.ts` lines 29 to 54.

Preserve:

- CSV is scoped by the same rows rendered in the Projects table.
- CSV carries source identity columns.

Fix:

- CSV must include the exported scope metadata or enough columns to prove the scope.
- Unsupported must not be collapsed to blank without reason.
- Exact client and job scopes must not be represented only as fuzzy search results.

### Chat

Approved path:

1. Ask a scoped question from any dashboard page.
2. Chat receives the active `DashboardScope`, not only office/date.
3. Chat lists evidence-backed checks.
4. Chat shows sources checked and confidence.
5. Chat marks unresolved conflicts.
6. Chat says `Needs Codex` for work requiring code, browser testing, repo inspection, source mutation, sync, deployment, or stakeholder communication.

Old-app evidence:

- Chat panel reads only `office`, `from`, and `to` from URL state: `src/components/dashboard/chat-panel.tsx` lines 68 to 71.
- Chat POST body sends only `message`, `startDate`, `endDate`, `office`, and `history`: `src/components/dashboard/chat-panel.tsx` lines 146 to 151.
- Chat API parses only `message`, `startDate`, `endDate`, `office`, and `history`: `src/app/api/chat/route.ts` lines 897 to 909.
- Chat context is built only from date range and offices: `src/app/api/chat/route.ts` lines 927 to 933.
- Chat `query_projects` can filter by client, job number, department, role, and office, but client and job number use fuzzy `ilike`: `src/app/api/chat/route.ts` lines 318 to 364.
- Chat tool schemas advertise client substring and job number substring search: `src/lib/chat/tools.ts`.

Preserve:

- Chat is read-only.
- Chat uses evidence and confidence.
- Chat can refuse exhaustive row dumps and point to CSV/Codex.

Fix:

- Chat must receive the complete `DashboardScope`.
- Chat exact client drilldown must use `client`, not `search`, and not fuzzy substring matching.
- Chat project detail investigations must carry `jobNumber` and active office/date/department/role/client scope.
- Chat should mark `Needs Codex` for repo inspection, browser testing, sync, deployment, source mutation, or stakeholder communication.

## Approved Behavior To Preserve

- Office buttons with an all-offices option.
- Date quick controls for year, quarter, month, and custom range.
- Rollup views by department, month, role, and client.
- Clickable rollup rows that drill into Projects.
- Projects list and calendar presentation mode as UI state.
- Active filter chips that can clear one filter at a time.
- Add-filter menu for department, role, and client.
- Search as a fuzzy, exploratory Projects filter.
- Project detail back links preserving scope.
- Float trace links from allocated and unallocated hours.
- Projects CSV export from visible scoped rows.
- Chat panel as read-only investigation surface.

## Confusing Legacy Behavior Not To Preserve

- Treating `Agency` as the internal all-office value across data logic. The rebuild should use canonical `ALL` internally and only render user-facing copy as needed.
- Dropping scope when using top-level tab navigation.
- Omitting `client` from cookie-persisted filters while supporting it in Projects.
- Sending only office/date scope into Chat.
- Using fuzzy `search` or fuzzy `client` matching for exact drilldown.
- Rendering unsupported Pipeline or Production Revenue under department/role scope as zero-like output.
- Project detail local calculations for profitability and monthly variance that are not contract-owned.
- Approval checks that inspect a hard-coded Float trace outside the page scope.
- Hidden cookie fallback that changes active scope without an obvious visible state.

## Risks And Required Rebuild Tests

| Risk | Old-app evidence | Required rebuild test or guard |
|---|---|---|
| Scope lost across nav tabs | `tab-nav.tsx` only copies `office`, `from`, `to` | Tab navigation preserves full active scope or visibly resets it with user intent. |
| Client drilldown becomes fuzzy search | `rowMatchesSearch` searches job, client, project; chat uses `ilike` client | Exact client drilldown test. Search remains separate. |
| Job detail loses active slice | Project links omit `search` and do not model `jobNumber` in URL query | Projects to Project Detail preserves `office`, `from`, `to`, `department`, `role`, `client`, `jobNumber`; search behavior is explicit. |
| Chat answers full scope when user is scoped | Chat sends only office/date | Chat request includes full `DashboardScope`; evidence pack records it. |
| CSV and table disagree | Old app uses shared display rows but CSV blanks unsupported-like values | CSV equals visible table footer for supported metrics and exports unsupported with reason. |
| Unsupported shown as zero | Department/role scope sets Pipeline and Production Revenue to zero in display rows | Unsupported metric type prevents numeric zero where source capability is absent. |
| Float trace loses drilldown context | Float detail only accepts office/from/to plus path ID | Float trace scope includes `floatProjectId` and preserves or explicitly reports upstream slice. |
| Cookie silently changes scope | Cookie fallback fills missing params | Active scope object is visible/testable, and URL remains canonical for shared links. |

## Claims Made

- The old app mostly preserves `office`, `from`, and `to` across dashboard navigation.
- The old app preserves `department`, `role`, and `client` well inside Projects and Project Detail, but not across global tabs or Chat.
- The old app has separate fuzzy `search`; it should stay separate from exact client/job drilldowns.
- The old app CSV is generated from Projects display rows, but unsupported export semantics need tightening.
- The old app Float trace has the right diagnostic shape, but `floatProjectId` must be explicit in rebuild scope.
- No old app data logic should be copied into the rebuild from this inventory.
