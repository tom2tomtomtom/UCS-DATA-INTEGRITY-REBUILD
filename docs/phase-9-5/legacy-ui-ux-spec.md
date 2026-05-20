# Legacy UI UX Spec

Source: Tom-provided old dashboard UX report, 2026-05-21.

This document is the Phase 9.5 UI parity source of record. The rebuild must preserve the approved UX and workflow granularity while replacing the data plumbing underneath it. If this spec conflicts with immutable data laws, the data law wins and the conflict must be logged.

Recognisable UX is the target, not pixel-perfect fossilisation. Preserve stakeholder workflows, information density, route/control placement, table granularity, and mental model. Small improvements are allowed when they make source truth, warnings, unsupported metrics, or recovery actions clearer without reducing functionality.

Data-access granularity is part of the UX. The rebuild must preserve or improve the user's ability to drill from headline totals into rollup rows, Projects rows, project detail, source warnings, Float project/task/person rows, CSV rows, and source evidence. A simpler screen that removes access to underlying rows fails parity even if it looks cleaner.

## Data Law Overrides

Do not preserve old UX behaviour if it requires:

- hidden source rows,
- reduced data-access granularity,
- page-local recalculation,
- old selector output as truth,
- unsupported values rendered as zero,
- fuzzy search used for exact client drilldown,
- chat claims without evidence,
- source warnings made to look like approval.

## Global Header

The header is persistent across dashboard pages and has two rows.

Row 1 global controls:

- Uncommon eye logo on the far left.
- `OFFICE` label.
- office pill toggles: `All`, `LDN`, `UCX`, `USA`.
- office toggles can represent combined office scope where supported.
- active filter buttons use dark filled state, inactive buttons use outline or ghost state.
- `All` maps to the agency-wide view.
- `Clear all filters` text link, disabled when no filter is active.
- user email text on the right.
- synced project count text, for example `synced 1168 projects`.
- `Sync Now` button with circular refresh icon.
- syncing state changes button text to `Syncing...`.
- `Ask AI` button with chat icon, labelled as the chat assistant toggle.

Office scope semantics:

- `All` preserves the legacy URL value `office=Agency`.
- a single office preserves the legacy URL value, for example `office=LDN`.
- combined office selection must use `offices=LDN,UCX` as the canonical rebuild URL state.
- if both `office` and `offices` are present, `offices` wins and the UI must show the combined pill state.
- combined office scope must map into the display contract as an explicit office set, not as fuzzy search or an inferred label.
- `Clear all filters` resets office scope back to `office=Agency` unless a future approved default says otherwise.

Row 2 navigation tabs:

1. Department Rollup, `/dashboard`.
2. Projects, `/dashboard/projects`.
3. Float, `/dashboard/float`.
4. Approval Audit, `/dashboard/approval`.
5. Data Quality, `/dashboard/data-quality`, with red numeric badge.
6. Glossary, `/dashboard/glossary`.
7. Sync Audit, `/dashboard/audit`.
8. Sync Warnings, `/dashboard/admin/sync-warnings`.
9. Capacity Reduced, `/dashboard/admin/timeoffs`.
10. Users, `/dashboard/users`.

The active page is underlined.

## System Banners

### Sync Issues Alert

Preserve:

- red or orange alert bar below the header,
- warning icon,
- bold summary such as `3 issues found in last sync`,
- relative timestamp,
- `View details` link to Sync Audit,
- dismiss button,
- detailed explanatory paragraph summarising current data integrity issues.

### Exchange Rate Warning

Preserve:

- amber warning bar,
- bold `Exchange rate warning:` label,
- fallback-rate explanation,
- last-fetched timestamp,
- guidance to run sync to refresh,
- non-dismissible behaviour.

## Department Rollup Page

Route: `/dashboard`.

### Approval State Card

Preserve a pale yellow or cream bordered card with:

- `Approval state:` label,
- status copy explaining that dashboard totals can be source-backed and cross-view verified while source-sheet and Float gaps remain visible until reconciled or acknowledged.

### Data Freshness Indicator

Preserve a green freshness card with:

- green dot,
- `All sources fresh` text,
- per-source timestamps for Pipeline, Production Revenue, Fee Sheets, and Float.

### Sheet Health Panel

Preserve a red or pink bordered panel with:

- title pattern `Sheet health`, count of projects needing attention, and source-sheet framing,
- three collapsible subsections for read errors, monthly total reconciliation warnings, and role-section reconciliation warnings,
- expandable project lists with project IDs linking to Google Sheets,
- explanatory copy that these rows still surface and the warning is traceability evidence.

Do not preserve any behaviour that hides rows because the health panel flags them.

### Sold vs Allocated Header

Preserve:

- `Sold vs Allocated` H1,
- selected date range subtitle,
- source explanation naming Fee Sheets, Pipeline, Production Revenue, and Float,
- explanation that disagreement is the signal and must be fixed in the source.

### View Toggles

Preserve pill toggles:

- `By Department`,
- `By Month`,
- `By Role`,
- `By Client`.

### Time Filters

Preserve:

- quick buttons: `Full year`, `Q1`, `Q2`, `Q3`, `Q4`,
- month buttons: `Jan` through `Dec`,
- custom date inputs for `from` and `to`,
- URL state for `office`, `from`, `to`, and `view`.

### KPI Cards

Preserve a three-card grid:

- `TOTAL SOLD`, with fee sheet plus production revenue source note and info tooltip.
- `CONFIDENCE`, with high, medium, and low segmented bar.
- `DATA COVERAGE`, with percentage and matched-allocation explanation.

### Float Sync Warnings

Preserve amber card with:

- `FLOAT SYNC WARNINGS` label,
- large hour total,
- count of Float projects needing source links fixed,
- link to Data Quality or Float detail.

### Lower Than Float Explanation

Preserve expandable `Why is this lower than Float?` section with:

- unlinked Fee Tracker explanation,
- archived-project exclusion explanation,
- tentative or internal non-billable exclusion explanation,
- guidance to link Float project IDs in the Fee Tracker.

### Chart

Preserve `Sold vs Allocated Hours by Department` chart:

- white card,
- vertical grouped bars,
- green allocated bars,
- blue sold bars,
- department x-axis,
- hours y-axis,
- legend.

### Rollup Table

Preserve sortable table columns:

1. dynamic dimension column, such as `DEPARTMENT`, `MONTH`, `ROLE`, or `CLIENT`,
2. `PIPELINE (£)`,
3. `SOLD (£)`,
4. `SOLD (HRS)`,
5. `ALLOCATED (HRS)`,
6. `UNALLOCATED (HRS)`,
7. `TOTAL (HRS)`,
8. `ALLOCATED (£)`,
9. `VARIANCE %`,
10. `STATUS`.

Preserve:

- sortable arrows,
- default sort state per view,
- sort toggling on every sortable header,
- info tooltips on source-sensitive columns,
- status badges for OK, Over, Gap, and Alert,
- total row,
- footer totals equal visible rows for supported metrics,
- CSV equality for any exported rollup rows,
- dimension row links into Projects with preserved scope,
- Production Revenue row treatment where lawful,
- Unmapped row treatment where source does not expose the split.

Do not preserve:

- pipeline shown in a department, role, or client slice unless source capability supports it,
- production revenue shown in a slice unless source capability supports it,
- unsupported values rendered as zero.

## Projects Page

Route: `/dashboard/projects`.

Preserve controls:

- `List` and `Calendar` view toggles,
- `Download CSV` button,
- search input with placeholder `Search by job number or client name...`,
- quick, month, and custom date controls,
- `+ Add filter` control.

The `+ Add filter` menu must expose only filters backed by the display contract:

- department,
- role,
- exact client,
- job number,
- row type,
- confidence,
- status,
- source issue,
- Float project ID.

Unknown filter fields must be unavailable, not silently ignored.

Preserve bulk action bars:

- Float orphan selection row with archive action,
- project bulk archive selection row with archive action.

Archive actions in rebuild must respect the mutation boundary. If write actions are not enabled, render as unavailable or hand off explicitly.

Preserve table columns:

1. `JOB #`,
2. `CLIENT`,
3. `PROJECT`,
4. `OFFICE`,
5. `SOLD (FEE SHEET)`,
6. `PIPELINE`,
7. `SOLD (HRS)`,
8. `ALLOCATED`,
9. `UNALLOCATED`,
10. `FLOAT VALUE (£)`,
11. `VARIANCE (HRS)`,
12. `CONFIDENCE`,
13. `LAST SYNC`,
14. `ACTIONS`.

Preserve:

- horizontal scroll for wide tables,
- row checkboxes,
- sortable headers,
- default sort by `SOLD (FEE SHEET)` descending unless an active query param overrides it,
- header click toggles ascending and descending state,
- negative variance styling,
- confidence badges,
- relative last-sync values,
- per-row action slot,
- row click to project detail,
- footer totals equal visible rows for supported metrics,
- CSV rows equal visible rows for supported metrics.

Calendar view:

- `Calendar` toggle uses a dark filled active state when selected,
- if no calendar data exists, show `No calendar data for this period.`,
- below the empty state preserve a `Breakdown` section with `By Department`, `By Month`, `By Role`, and `By Client` toggles,
- the breakdown must use the same display contract and active scope as list view.

## Project Detail Page

Route: `/dashboard/projects/[jobNumber]`.

Preserve:

- `Back to Projects` breadcrumb,
- title format `[Client Name] / [JOB#]`,
- subtitle format `[JOB#] · [OFFICE]`,
- relative sync badge,
- quick, month, and custom date controls,
- scoped back link.

Preserve six KPI cards:

1. `SOLD (FEE SHEET)`, sourced to CLIENT SUMMARY monthly fee.
2. `PIPELINE`, sourced to Jade's pipeline sheet.
3. `PRODUCTION REV`, sourced to PRODUCTION ONLY tab.
4. `SOLD HOURS`, sourced to CLIENT SUMMARY role detail.
5. `ALLOCATED HOURS`, sourced to Float named people.
6. `UNALLOCATED HOURS`, sourced to Float placeholder roles.

Preserve monthly table columns:

- `MONTH`,
- `SOLD (£)`,
- `SOLD (HRS)`,
- `ALLOCATED (HRS)`,
- `ALLOCATED (£)`,
- `VARIANCE`.

Preserve Profitability by Role:

- explanatory subtitle,
- role rows,
- total row,
- expandable role interaction to show allocated people where evidence exists.

Preserve Float Trace:

- heading and evidence subtitle,
- allocated, unallocated, and synced stats,
- table columns `FLOAT PROJECT`, `TASK`, `PERSON`, `DEPT / ROLE`, `DATES`, `HOURS`, `FLAGS`,
- individual task allocation rows,
- confirmed allocation flag where applicable.

Do not show pipeline or production revenue as numeric truth in a scoped detail context when source capability cannot support that slice.

## Stakeholder Workflows

### Sian LDN Q1 Design

Preserve and prove this exact workflow:

1. open Department Rollup,
2. select `office=LDN`,
3. select Q1, meaning `from=2026-01-01` and `to=2026-03-31`,
4. select `By Department`,
5. click the Design row,
6. Projects opens with `office=LDN`, Q1 dates, and `department=Design`,
7. Projects footer reconciles to the clicked rollup row for supported metrics,
8. CSV export reconciles to visible Projects rows,
9. project detail preserves office, dates, and department in the back link and scoped cards.

### Yunni Float Warning To Trace

Preserve and prove this exact workflow:

1. open Float Sync Warnings from Department Rollup or Data Quality,
2. navigate to the Float tab,
3. search by job number, project name, or Float ID,
4. see raw Float, cache, and visible dashboard classifications,
5. open matching Project Detail,
6. inspect Float Trace with task, person, date, hours, and flags,
7. use Export Compare where pasted Float data exists,
8. see duplicate/manual/inactive/orphan caveats without write actions.

### Jade Pipeline TBC

Preserve and prove this exact workflow:

1. open Department Rollup or Data Quality with an active date scope,
2. identify a Pipeline or TBC row,
3. drill into Projects with scope preserved,
4. see source evidence for Jade's Pipeline row,
5. keep TBC row identity distinct instead of merging all TBC into one row,
6. label Pipeline as unsupported in slices where the source cannot attribute it.

## Secondary Pages

### Float

Route: `/dashboard/float`.

Preserve:

- Float overview,
- matching health/status table,
- raw/cache/visible classification,
- project trace links,
- duplicate/manual Float candidates,
- inactive or archived Float warnings,
- paste-only Export Compare,
- ambiguous match warnings,
- dashboard-only rows missing from pasted export.

Float is diagnostic-only. It must not mutate Float, archive source projects, or become a second source of truth.

### Data Quality

Route: `/dashboard/data-quality`.

Preserve:

- red issue-count badge behaviour,
- tabbed issue hub including Float issues where available,
- source problem rows,
- orphan/source-only rows,
- archive mismatch visibility,
- named-check visibility for Sian, Jade, and Yunni scenarios,
- links back to affected dashboard pages with scope preserved.

### Approval Audit

Route: `/dashboard/approval`.

Preserve:

- pass, warn, and fail gate presentation,
- source approval and stakeholder approval as separate statuses,
- named scenario evidence,
- no-cutover status,
- warnings that remain real source limitations.

Approval Audit must not convert WARN into approval language.

### Sync Audit

Route: `/dashboard/audit`.

Preserve:

- sync run list,
- last sync timestamp,
- sync phase and status,
- issue details linked from the sync issues banner,
- evidence-safe summary text.

Any generated paragraph must be evidence-generated from checks, not model-invented.

### Sync Warnings

Route: `/dashboard/admin/sync-warnings`.

Preserve:

- admin warning table,
- source, project, severity, and message fields,
- links to affected project/source traces,
- filters by source and severity.

### Capacity Reduced

Route: `/dashboard/admin/timeoffs`.

Preserve:

- Float time-off or capacity-reduction evidence,
- person, date, hours, and source identity,
- clear separation from booked project hours,
- latest-batch awareness so historic time-off rows do not inflate current capacity.

### Users

Route: `/dashboard/users`.

Preserve:

- user list,
- email,
- role/access display,
- invite or role-management slots where lawful.

User mutation actions must respect the mutation boundary.

## Chat Parity States

Preserve global chat states:

- closed,
- open idle,
- working/progress signal,
- evidence trace visible,
- warning visible,
- confidence visible,
- error state,
- `Needs Codex` handoff.

Chat must receive active dashboard scope and answer only from evidence.

## Screenshot Cross-Reference

The route and state screenshot requirements live in `docs/UI_SCREENSHOT_REFERENCE_PLAN.md`. Phase 9.5 cannot pass unless every required old route/state has either a screenshot reference or a documented blocker.

## Other Pages

Preserve route availability:

- Float, `/dashboard/float`,
- Approval Audit, `/dashboard/approval`,
- Data Quality, `/dashboard/data-quality`,
- Glossary, `/dashboard/glossary`,
- Sync Audit, `/dashboard/audit`,
- Sync Warnings, `/dashboard/admin/sync-warnings`,
- Capacity Reduced, `/dashboard/admin/timeoffs`,
- Users, `/dashboard/users`.

## Design System

Preserve:

- clean sans-serif typography,
- small-caps labels,
- large bold numerals,
- small grey explanatory body text,
- green for OK, positive, in-range, or fresh,
- amber or yellow for warning and medium confidence,
- red or pink for alert, error, and sheet health problems,
- orange for gap,
- blue or purple for over-allocated,
- dark filled button state for active tabs and filters.

Preserve interactions:

- pill toggles,
- collapsible rows,
- sortable tables,
- clickable table rows,
- expandable info sections,
- source tooltips,
- horizontal table scroll,
- in-row checkboxes,
- row actions.

## URL State

Preserve URL state shape:

```txt
?office=[Agency|LDN|UCX|USA]&offices=LDN,UCX&from=YYYY-MM-DD&to=YYYY-MM-DD&view=[department|month|role|client]&pview=[list|calendar]
```

Exact client, department, role, job, and Float IDs must be represented with exact params, not fuzzy search.

## Data Freshness

Preserve relative timestamps and explicit sync surfaces, but avoid hydration drift. Server-rendered relative timestamps must be stable or hydrated deliberately.
