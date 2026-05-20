# Phase 1 Table, Column, Control, And CSV Inventory

Ticket: GitHub `#19`, P1-C.

Status: Phase 1 reference inventory only. This document maps the old app UX surface so Phase 6 can rebuild it on top of the new display contract. It must not be used as data logic, source truth, or permission to copy old selectors.

Old app inspected read-only:

- Repo: `/Users/tommyhyde/ucs-commercial-dashboard`
- Screenshot manifest: `/Users/tommyhyde/UCS-DATA-INTEGRITY-REBUILD/reference/ui/current-app/manifest.md`
- Captured old app commit in manifest: `c6f0fbd`

## Laws Protected

- One display contract: all rebuilt table numbers must come from the new display contract, not page-local totals, CSV-only totals, or copied old selectors.
- Source rows are never disposable: source-only, pipeline-only, production-only, Float-only, TBC, placeholder, pencil, orphan, inactive, archived, and duplicate rows remain visible unless an explicit law says otherwise.
- Unsupported is not zero: blank, unavailable, or unattributable values must render/export as unsupported or blank with reason, not as `0`.
- Scope must survive clicks: office, date range, department, role, client, search, job number, and Float project ID must survive table drilldowns and exports.
- Warn honestly: WARN states should name source conflicts or source limitations, not hide product failures.

## Screenshot Evidence Inspected

| Screenshot | Route / State | Evidence Used |
|---|---|---|
| `reference/ui/current-app/2026-05-20_dashboard_default.png` | `/dashboard`, default Agency FY2026 | Top-level rollup layout, warning/banner placement, tab/nav context. |
| `reference/ui/current-app/2026-05-20_dashboard_ldn_q1_design_rollup.png` | `/dashboard?office=LDN&from=2026-01-01&to=2026-03-31&view=department` | LDN Q1 Design rollup entry point and rollup table shape. |
| `reference/ui/current-app/2026-05-20_dashboard_ldn_q1_month_rollup.png` | `/dashboard?office=LDN&from=2026-01-01&to=2026-03-31&view=month` | Monthly reconciliation rollup shape. |
| `reference/ui/current-app/2026-05-20_projects_default.png` | `/dashboard/projects` | Default Projects table, CSV/search controls, horizontal overflow issue. |
| `reference/ui/current-app/2026-05-20_projects_ldn_q1_design.png` | `/dashboard/projects?office=LDN&from=2026-01-01&to=2026-03-31&department=design` | Department-filtered Projects table, active filter chip, footer totals, breakdown rollup. |
| `reference/ui/current-app/2026-05-20_projects_search_ucs04787.png` | `/dashboard/projects?office=LDN&from=2026-01-01&to=2026-12-31&search=UCS04787` | Search workflow for named project investigation. |

Screenshot blockers also matter: project detail, Float, Data Quality, Approval, Audit, Diagnostics, and named Float traces were not captured because old SSR routes were slow or the capture batch was aborted. Their shapes below come from old app files and should be recaptured by P1-D.

## Rollup Tables

Old app files inspected:

- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/rollup-table.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/app/dashboard/projects/page.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/app/dashboard/page.tsx`

Visible rollup views:

- Department rollup.
- Month rollup.
- Role rollup.
- Client rollup.
- Projects page `Breakdown` reuses the same rollup table with `By Department`, `By Month`, `By Role`, `By Client` controls.

Rollup table columns:

| Column | Preserve? | Notes |
|---|---:|---|
| Dynamic first column: `Department`, `Month`, `Role`, or `Client` | Yes | Rows can drill into Projects with current scope. Expand/collapse child rows may appear when child rows exist. |
| `Pipeline (£)` | Yes, but only where source supports it | Body cells render blank/unsupported where Pipeline has no per-row attribution; footer carries the source total. Do not turn unsupported row cells into zero. |
| `Sold (£)` | Yes | Tooltip/source popover pattern should survive, but source text must be rebuilt from new traces. |
| `Sold (hrs)` | Yes | If hours are unavailable, show unsupported/pending state rather than zero. |
| `Allocated (hrs)` | Yes | Named-person Float hours. |
| `Unallocated (hrs)` | Yes when present | Placeholder/person-unassigned Float hours. Column appears only when non-zero in old UI. Rebuild may keep stable columns if that is clearer. |
| `Total (hrs)` | Yes when unallocated exists | Allocated plus unallocated. |
| `Allocated (£)` | Yes with caution | Derived value. Must come from display contract and be labelled as derived/source-limited. |
| `Variance %` | Yes with caution | Derived state. Preserve the reconciliation role, not old calculation code. |
| `Status` | Yes | Old statuses include OK, Gap, Alert, Over, Pending, Uncosted. Status must be contract-backed. |

Controls and behaviours:

- Sortable headers across metric columns.
- Expand/collapse control for parent rows when child rows exist.
- Drill links from rollup rows into Projects while preserving scope.
- Footer totals visible and source-backed.
- Allocation-thin warning appears when Float allocation coverage is partial or sold hours are unavailable.
- Empty state says no data for the period.

Do not preserve:

- Body-level `Pipeline (£)` dashes without an explicit unsupported reason.
- Any page-local fallback totals.
- Derived variance/status that can disagree with the display contract.

## Projects Table

Old app files inspected:

- `/Users/tommyhyde/ucs-commercial-dashboard/src/app/dashboard/projects/page.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/project-table.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/project-search.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/project-view-toggle.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/download-csv-button.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/lib/dashboard/project-export.ts`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/lib/dashboard/display-contract.ts`

Top controls:

| Control | Preserve? | Notes |
|---|---:|---|
| `List` / `Calendar` project view toggle | Yes | `pview=list` default, `pview=calendar` alternate. Calendar data is currently empty in inspected code, so preserve control only if backed by real contract data. |
| `Download CSV` | Yes | CSV must match visible rows and footer for supported metrics. |
| Search input | Yes | Debounced search by job number or client. Scope must remain in URL. |
| Date range / quick period controls | Yes | Covered by P1-B; included here because they frame table exports. |
| Active filter chips | Yes | Department, role, search, client chips remove individual filters. |
| `Add filter` picker | Yes | Department, role, client options. |
| Bulk archive project selector | Preserve only if lawful | Old UI lets users select visible fee-tracker projects and archive them. Rebuild must not add mutation before the mutation boundary allows it. |
| Bulk archive Float orphan selector | Preserve as workflow shape only | Old UI lets users select Float-only rows and archive/dismiss them. Rebuild should initially show the diagnostic control as disabled or out-of-scope unless mutation is explicitly implemented later. |

Visible columns:

| Column | Preserve? | Notes |
|---|---:|---|
| `Job #` | Yes | Fee-tracker rows link to project detail. Float-only rows link to Float trace. TBC pipeline rows show project name in place of job number. Row badges appear here. |
| `Client` | Yes | Normalised display name. |
| `Project` | Yes | Includes canon disagreement chips where available. Long project names wrap in old UI. |
| `Office` | Yes | LDN, UCX, USA, or relevant office label. |
| Dynamic sold fee label, e.g. `Sold (Fee Sheet)` or `Design Fee` | Yes | Label changes under filtered scopes. Must distinguish fee-sheet sold from total sold where relevant. |
| `Pipeline` | Yes | Jade Pipeline value by row where attributable. Unsupported or no match must be blank/dash with reason, not zero. |
| `Sold (hrs)` | Yes | For source-only non-fee rows, old CSV blanks this. Rebuild should show unsupported where needed. |
| `Allocated` | Yes | Linked to Float trace when value exists. |
| `Unallocated` | Yes | Linked to Float trace when value exists. |
| `Float Value (£)` | Yes with caution | Derived from project blended rate in old UI. Must not become an independent authority. |
| `Variance (hrs)` | Yes with caution | Sold hours minus allocated plus unallocated. Non-fee source-only rows should show unsupported. |
| `Confidence` | Yes with caution | Old score is derived. Rebuild can preserve badge slot only if confidence law exists. |
| `Last Sync` | Yes as freshness surface | Preserve freshness badge concept, but avoid hydration-mismatch relative text. |
| `Actions` | Preserve shape only | Archive action is a mutation and should remain disabled/unimplemented until allowed. |

Row types:

| Row Type | Old label / treatment | Preserve Requirement |
|---|---|---|
| `fee_tracker` | Normal project row with job detail link and optional archive checkbox. | Preserve as default row type. |
| `pipeline_only` | `Pipeline only`; if job number is `TBC`, show `Pipeline (TBC)` and project name as the row identity. | Preserve. TBC rows are source evidence, not noise. |
| `prod_only` | `Production` or `Production (NEGOTIATING/TBC/UNKNOWN)`. Counted in Sold in old app. | Preserve visibility and source distinction. Rebuild must not silently merge or hide these. |
| `float_only` | `Float only`, Float ID shown, link to Float trace, dismiss/archive controls. | Preserve visibility. Archive/dismiss must wait for mutation rules. |

Footer:

- `Total (N projects)` label.
- Totals for sold fee, pipeline visible row sum, sold hours, allocated hours, unallocated hours, Float value, and variance hours.
- Pipeline footer can show a separate source total when it differs from visible row sum.
- TBC pipeline note can show included amount/count.
- Footer must equal CSV for supported visible metrics.

CSV/export controls:

- Button: `Download CSV`.
- Client-side CSV generation with headers and rows from the display contract in old Projects page.
- Filename: `projects.csv`.
- Required rebuilt rule: exported rows must be generated by the same display contract as visible rows.

CSV headers in old app:

| Header |
|---|
| `Job Number` |
| `Client` |
| `Project Name` |
| `Office` |
| `Row Type` |
| `Source Type` |
| `Source Sheet` |
| `Source Row` |
| `Source Job Key` |
| `Float Project ID` |
| `Sold (GBP)` |
| `Fee Sheet Sold (GBP)` |
| `Production Revenue (GBP)` |
| `Production Source Sheet` |
| `Production Source Rows` |
| `Production Status` |
| `Production Source Project` |
| `Pipeline (GBP)` |
| `Sold Hours` |
| `Allocated Hours` |
| `Unallocated Hours` |
| `Float Value (GBP)` |
| `Variance Hours` |
| `Confidence Score` |

Do not preserve:

- Horizontal overflow shown in `2026-05-20_projects_default.png` and `2026-05-20_projects_ldn_q1_design.png`.
- Extremely tall full-page Projects table as the only navigable pattern.
- Archive/dismiss controls as live mutations before rebuild mutation rules allow them.
- Any unsupported source-only metric exported as numeric zero.
- Any old `Confidence` formula unless the new law/test suite owns it.
- The old ambiguity where `Pipeline` source total can differ from visible row sum without a first-class reconciliation row/warning.

## Project Detail

Old app files inspected:

- `/Users/tommyhyde/ucs-commercial-dashboard/src/app/dashboard/projects/[jobNumber]/page.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/profitability-table.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/float-trace-table.tsx`

Sections and table shapes:

| Section | Columns / Controls | Preserve Requirement |
|---|---|---|
| Header | Back to Projects link, client/job title, job number, office, freshness badge. | Preserve. Back link must preserve active scope. |
| Scope controls | Date range picker plus department, role, client active filter chips. | Preserve. Unsupported source slices must be explicit. |
| KPI cards | Sold Fee Sheet, Pipeline, Production Rev, Sold Hours, Allocated Hours, Unallocated Hours. | Preserve as per-source cards. Pipeline/prod-rev should show unsupported when not attributable to department/role slices. |
| Sold vs Allocated by Month | Month, Sold (£), Sold (hrs), Allocated (hrs), Allocated (£), Variance. | Preserve for supported project scopes. |
| Profitability by Role | Role, Sold Hrs, Sold £/$, Rate £/$/hr, Alloc Hrs, Alloc £/$, Variance £/$, Variance %. Expandable person rows show person, rate, alloc hours, alloc value. Footer totals included. | Preserve only as derived display-contract output. |
| Float Trace | Float Project, Task, Person, Dept / Role, Dates, Hours, Flags. Header totals for allocated/unallocated and latest sync. Optional footer compares trace totals to dashboard totals. | Preserve. This is core Yunni evidence. |
| Integrity Issues | Severity, label/diagnosis, detail/suggested fix. | Preserve as warning/evidence surface. |
| Project Checklist | Fee sheet linked, Fee data extracted, Role section parsed, Hours allocated in Float, Pipeline entry exists, No open integrity issues. | Preserve only if each item is contract/evidence-backed. |
| Open Fee Sheet link | External Google Sheets link. | Preserve if available and safe. |

Do not preserve:

- Old project-detail route latency as an acceptable UX state.
- Legacy integrity table as truth when new canon disagreement evidence exists.
- Unsupported Pipeline or Production Revenue slices rendered as numeric zero.

## Float Diagnostics

Old app files inspected:

- `/Users/tommyhyde/ucs-commercial-dashboard/src/app/dashboard/float/page.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/app/dashboard/float/[floatProjectId]/page.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/float-export-compare.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/float-trace-table.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/lib/db/select/float-trace.ts`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/lib/float/export-compare.ts`

Float overview controls:

- Date range picker.
- Scope inherited from office/date URL or cookie defaults.
- Links from problem rows into `/dashboard/float/[floatProjectId]`.
- Paste-only Float export compare textarea. It is diagnostic-only and no-write.

Float overview cards:

- Scheduled Hours.
- Allocated.
- Unallocated.
- Float Projects.
- Active Staff Records.
- Active Contractor Records.
- Inactive Records.
- Placeholders.
- Task Records.
- Matching Health cards: Matched, Float Only, Duplicates, Missing IDs, Inactive With Hours, Placeholder Rows.

Dashboard Float Rendering Audit table:

| Column |
|---|
| `Status` |
| `Project` |
| `Match` |
| `Raw Weekday` |
| `Cache` |
| `Visible` |
| `Dashboard Issue` |

Float Problems table:

| Column |
|---|
| `Issue` |
| `Project` |
| `Hours` |
| `Detail` |

Float Export Compare table:

| Column |
|---|
| `Export Row` |
| `Dashboard Match` |
| `Export Hours` |
| `Dashboard Hours` |
| `Delta` |

Float trace detail table:

| Column |
|---|
| `Float Project` |
| `Task` |
| `Person` |
| `Dept / Role` |
| `Dates` |
| `Hours` |
| `Flags` |

Preserve:

- Raw/cache/visible comparison as a diagnostic, no-write surface.
- Duplicate/manual/ambiguous match visibility.
- Inactive, tentative, placeholder, non-billable, unallocated, and missing-export warnings.
- Direct Float trace route by Float project ID.

Do not preserve:

- Treating Float diagnostics as a second source of product totals.
- Any paste/export compare result writing back to source systems or app state.
- Old route latency as acceptable.

## Data Quality

Old app files inspected:

- `/Users/tommyhyde/ucs-commercial-dashboard/src/app/dashboard/data-quality/page.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/data-quality-tabs.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/data-health-report.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/chase-list-client.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/integrity-table.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/orphan-revenue-table.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/archived-projects.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/diagnostics-list.tsx`

Tabs:

- Overview.
- Chase List.
- All Issues.
- Orphan Revenue.
- Float Problems.
- Archived.
- Parser Diagnostics, admin only.

Overview / health report grouped issue table:

| Column |
|---|
| `Job #` |
| `Client` |
| `Severity` |
| `Diagnosis` |
| `Responsible` |
| `Revenue at Risk` |

Chase List controls and export:

- Search by job number or client.
- Severity buttons: All, Critical, Warning, Info.
- Sort select: Revenue, Severity, Client.
- Select all checkbox.
- Batch `Resync selected` and `Dismiss selected` controls in old UI. Preserve only as future mutation workflow, not Phase 1/early rebuild behaviour.
- CSV export button, filename `chase-list.csv`.
- Pagination controls Previous/Next.

Chase List CSV columns:

- Job Number.
- Client.
- Severity.
- Diagnosis.
- Responsible Person.
- Suggested Fix.
- Revenue at Risk (GBP).

All Issues / Integrity table:

| Column |
|---|
| `Project` |
| `Issue Type` |
| `Severity` |
| `Diagnosis` |
| `Responsible` |
| `Revenue at Risk` |
| Actions: `Dismiss all gaps`, `Dismiss`, `Archive` |

Orphan Revenue table:

| Column |
|---|
| `Job Number` |
| `Client` |
| `Project Name` |
| `Months` |
| `Total £` |

Float Problems tab table:

| Column |
|---|
| `Float Project ID` |
| `Project Name` |
| `Office` |
| `Category` |
| `Allocated` |
| `Unallocated` |

Archived table:

| Column |
|---|
| `Job #` |
| `Client` |
| `Project` |
| `Office` |
| `Fee (GBP)` |
| `Archived` |
| Action: `Unarchive` |

Parser Diagnostics cards:

- Confidence badge.
- Category.
- Pattern title.
- Affected project count.
- Revenue impact when present.
- Suggested code fix block when present.
- Raw detail expandable JSON.

Preserve:

- Source problem tabs and counts.
- Orphan Production and Float Problems as explicit, named surfaces.
- Search/filter/export controls for chase workflows.

Do not preserve:

- Live mutation controls until mutation boundary and tests exist.
- Parser diagnostics that encourage code changes without evidence and approval.
- Revenue-at-risk totals that mix currencies without scope warning.

## Approval Audit

Old app file inspected:

- `/Users/tommyhyde/ucs-commercial-dashboard/src/app/dashboard/approval/page.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/lib/accuracy/approval-audit.ts`

Controls:

- Date range picker.
- Sample links: Source sample 10, Source sample 25, Fast source check.

Gate summary cards:

- Gate 1: Same Scope, Same Number.
- Gate 2: Source To Dashboard.
- Gate 3: Float Evidence.
- Gate 4: Source Problems Stay Visible.
- Gate 5: Deployment Proof.

Checks table columns:

| Column |
|---|
| `Status` |
| `Check` |
| `Source` |
| `Dashboard` |
| `Delta` |
| `Detail` |

Visible Source Problems table:

| Column |
|---|
| `Kind` |
| `Project` |
| `Hours` |
| `Detail` |

Preserve:

- Approval as evidence, not approval by visual polish.
- Gate summaries with pass/warn/fail/manual counts.
- Source vs dashboard deltas with tolerance where relevant.

Do not preserve:

- Gate checks that depend on old selectors as truth.
- `fast=1` as an approval shortcut unless labelled as a partial check.

## Sync Audit

Old app files inspected:

- `/Users/tommyhyde/ucs-commercial-dashboard/src/app/dashboard/audit/page.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/sync-audit-view.tsx`

Sections:

- Reconciliation.
- Fee Tracker.
- Pre-scan.
- Fee Sheet Parse.
- Float.
- Database Write.

Tables:

| Section | Columns |
|---|---|
| Fee Tracker | Job Number, Client, Office, Has Sheet |
| Pre-scan invalid rows | Job Number, Client, Status, Error Reason |
| Fee Sheet Parse | Job Number, Client, Status, Sold Rows, Detail |
| Float | Job Number, Client, Status, Detail |
| Reconciliation | Job Number, Client, Office, Status, Reason |
| Database Write | Job Number, Status, Detail |

Controls:

- `<details>` expandable sections.
- Fee Sheet Parse filter buttons: All, With Data, Empty, Errors.
- Status badges: ok, no_data, error, skipped, warn, no_reference.

Preserve:

- Phase-grouped audit visibility.
- Empty states.
- Status badges with honest source/process meaning.

Do not preserve:

- Database write section as product truth.
- Any audit path that mutates state from the rebuild UI before mutation is in scope.

## Parser Diagnostics

Old app files inspected:

- `/Users/tommyhyde/ucs-commercial-dashboard/src/app/dashboard/diagnostics/page.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/diagnostics-list.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/sync-report.tsx`

Shape:

- Sync report summary at top.
- Diagnostics list as repeated cards, not a table.
- Each card has confidence, category, pattern, affected projects, optional revenue impact, suggested code fix, and raw detail expander.
- Admin-only route redirects non-admin users.

Preserve:

- Admin-only diagnostics.
- Raw detail expander.
- Suggested code fix as diagnostic evidence only, not auto-change.

## Cross-Surface Do-Not-Preserve Issues

- Projects horizontal overflow beyond the 1440 viewport.
- Extremely tall Projects pages with no virtualisation/pagination/summary affordance.
- Hydration mismatch caused by relative `AuditBanner` age text.
- Unsupported source slices shown as dashes without a reason, or exported as numeric zero.
- Mutation controls mixed into diagnostic views before the rebuild reaches mutation-safe phases.
- Old route latency for project detail, Float, Data Quality, Approval, Audit, and Diagnostics.
- Any old page-local calculation, CSV-only calculation, chat-only calculation, or selector copied as a second authority.
- Any source-only row hidden to make tables cleaner.

## References Inspected

Old app source files:

- `/Users/tommyhyde/ucs-commercial-dashboard/src/app/dashboard/projects/page.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/project-table.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/lib/dashboard/project-export.ts`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/rollup-table.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/app/dashboard/projects/[jobNumber]/page.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/profitability-table.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/app/dashboard/float/page.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/app/dashboard/float/[floatProjectId]/page.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/float-trace-table.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/float-export-compare.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/app/dashboard/data-quality/page.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/data-quality-tabs.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/data-health-report.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/chase-list-client.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/integrity-table.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/orphan-revenue-table.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/archived-projects.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/app/dashboard/approval/page.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/app/dashboard/audit/page.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/sync-audit-view.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/app/dashboard/diagnostics/page.tsx`
- `/Users/tommyhyde/ucs-commercial-dashboard/src/components/dashboard/diagnostics-list.tsx`

Rebuild reference files:

- `/Users/tommyhyde/UCS-DATA-INTEGRITY-REBUILD/OBJECTIVE.md`
- `/Users/tommyhyde/UCS-DATA-INTEGRITY-REBUILD/AGENTS.md`
- `/Users/tommyhyde/UCS-DATA-INTEGRITY-REBUILD/docs/OVERNIGHT_BUILD_CONTROL.md`
- `/Users/tommyhyde/UCS-DATA-INTEGRITY-REBUILD/docs/EXECUTION_TICKETS.md`
- `/Users/tommyhyde/UCS-DATA-INTEGRITY-REBUILD/docs/UX_PARITY_REQUIREMENTS.md`
- `/Users/tommyhyde/UCS-DATA-INTEGRITY-REBUILD/docs/UI_SCREENSHOT_REFERENCE_PLAN.md`
- `/Users/tommyhyde/UCS-DATA-INTEGRITY-REBUILD/reference/ui/current-app/manifest.md`
