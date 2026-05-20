# Phase 1 Route And Navigation Inventory

Ticket: GitHub `#17`, P1-A: Route and Navigation Inventory

Source app inspected read-only: `/Users/tommyhyde/ucs-commercial-dashboard`

Screenshot manifest used: `reference/ui/current-app/manifest.md`

Old app commit from screenshot manifest: `c6f0fbd`

## Scope

This document inventories old dashboard routes and navigation surfaces for UX parity. It does not approve the old data layer, selector logic, sync behaviour, or mutation paths for reuse.

The rebuild must preserve useful route-level UX where lawful, while replacing business truth with the new display contract and source-traceable evidence model.

## Dashboard Route List

| Route | Old app file | Surface | Nav exposure | Screenshot / latency status | Preserve | Do not preserve |
|---|---|---|---|---|---|---|
| `/dashboard` | `src/app/dashboard/page.tsx` | Dashboard home, hero metrics, rollup views, date controls, warnings, freshness | Primary tab: `Department Rollup` | Captured: `2026-05-20_dashboard_default.png`, `2026-05-20_dashboard_ldn_q1_design_rollup.png`, `2026-05-20_dashboard_ldn_q1_month_rollup.png`. Manifest notes dashboard rollups around 20 to 38s. | Preserve dashboard entry point, top-line metrics, office/date scope, quick periods, department/month/role/client rollups, warning/freshness status. | Do not preserve page-local totals or old selector logic as authority. Manifest-visible slow SSR should not become a rebuild acceptance target. |
| `/dashboard/projects` | `src/app/dashboard/projects/page.tsx` | Projects table, drilldown table, filters, search, CSV, list/calendar toggle | Primary tab: `Projects` | Captured: default, LDN Q1 Design, UCS04787 search. Manifest notes Projects around 7 to 16s and horizontal overflow. | Preserve dense reconciliation table, search, active filter chips, CSV/export, source-only row visibility, scoped drilldown URL behaviour. | Do not preserve horizontal overflow, extremely tall reference captures, or local business calculations outside the display contract. |
| `/dashboard/projects/[jobNumber]` | `src/app/dashboard/projects/[jobNumber]/page.tsx` | Project detail, scoped source totals, monthly comparison, Float trace anchor, integrity chips | Linked from Projects rows and detail references | Not captured. Manifest blockers show project detail SSR often 32s to 2.5m, including UCS04889, UCS04787, UCS05186. | Preserve project-detail route, scoped back link, source-specific totals, Float trace section, warnings, unsupported labels. | Do not preserve brittle latency. Do not preserve legacy integrity table as product truth without a new law/contract. |
| `/dashboard/float` | `src/app/dashboard/float/page.tsx` | Float diagnostics overview, matching health, raw/cache/visible rendering audit, export compare | Primary tab: `Float` | Not captured. Manifest says HEAD check for scoped `/dashboard/float` returned 200 after about 75s, screenshot batch blocked. | Preserve Float diagnostics as a route, raw/cache/visible comparison, matching-health cards, Float problem list, export compare. | Do not preserve 75s SSR latency. Do not make diagnostics a second display authority. |
| `/dashboard/float/[floatProjectId]` | `src/app/dashboard/float/[floatProjectId]/page.tsx` | Float project trace detail | Linked from Float problems and Float-only rows | Not captured. Manifest lists trace IDs `10979146`, `11413292`, `10480262`, `11330982` as blocked by route batch latency. | Preserve direct Float trace route and scoped back link to Float overview. | Do not make Float trace editable or corrective. It is evidence only. |
| `/dashboard/data-quality` | `src/app/dashboard/data-quality/page.tsx` | Data Quality hub with overview, chase, issues, orphan revenue, Float problems, archived, diagnostics tabs | Primary tab: `Data Quality` with badge | Not captured. Manifest says first attempt timed out at 45s and later server log showed 200 after about 45s. | Preserve Data Quality as source-problem hub, visible chase/issues/orphan/Float/admin diagnostics tabs, badges. | Do not preserve confusing or hidden tab states. Do not let archived/orphan actions hide source rows in the rebuild. |
| `/dashboard/approval` | `src/app/dashboard/approval/page.tsx` | Approval Audit gates and checks | Primary tab: `Approval Audit` | Not captured. Manifest says first attempt timed out at 45s and later server log showed 200 after about 45s. | Preserve approval/readiness evidence route and gate language such as Same Scope, Source To Dashboard, Float Evidence, Source Problems Stay Visible. | Do not preserve old gate implementation as authority. Approval must be rebuilt against new contracts and law tests. |
| `/dashboard/audit` | `src/app/dashboard/audit/page.tsx` | Sync Audit from last sync run | Admin tab: `Sync Audit` | Not captured. Manifest says first attempt timed out at 45s and later server log showed 200 after about 45s. | Preserve admin visibility into sync/audit status as an operational surface. | Do not preserve any route that implies sync output is product truth outside the display contract. |
| `/dashboard/diagnostics` | `src/app/dashboard/diagnostics/page.tsx` | Latest parser diagnostics | Not in primary `TabNav`; also appears as Data Quality admin-only tab `diagnostics` | Not captured. Manifest says batch aborted, server log showed 200 after about 28s. | Preserve as admin/diagnostic evidence if still useful. | Do not treat diagnostics as user-facing truth or an alternative reconciliation layer. |
| `/dashboard/integrity` | `src/app/dashboard/integrity/page.tsx` | Integrity report and sync report | Not in primary `TabNav` | Not reached after batch abort. | Preserve only if mapped to a lawful evidence/verification need. | Do not preserve as duplicate Data Quality/Approval IA without a clear user workflow. |
| `/dashboard/chase` | `src/app/dashboard/chase/page.tsx` | Standalone chase list | Not in primary `TabNav`; Data Quality has `Chase List` tab | Not reached after batch abort. | Preserve chase workflow, likely inside Data Quality unless later UX inventory says standalone route is needed. | Do not preserve duplicate navigation that makes Sian/Yunni unsure which chase surface is current. |
| `/dashboard/readiness` | `src/app/dashboard/readiness/page.tsx` | Readiness score, tiers, quick wins, revenue risk, sync report | Not in primary `TabNav` | Not reached after batch abort. | Preserve readiness/quick-win evidence if connected to Approval/Data Quality. | Do not preserve as a separate destination unless Phase 1 IA decides it has a distinct required workflow. |
| `/dashboard/glossary` | `src/app/dashboard/glossary/page.tsx` | Glossary / data source explanation | Primary tab: `Glossary` | Not reached after batch abort. | Preserve plain-language source glossary. | Do not let glossary copy mask unsupported data states. |
| `/dashboard/admin/sync-warnings` | `src/app/dashboard/admin/sync-warnings/page.tsx` | Admin Float sync warnings, top orphan allocations | Admin tab: `Sync Warnings` | Not reached after batch abort. | Preserve admin warning visibility and source-problem framing for unmatched Float allocations. | Do not preserve "Hours Dropped" language if it implies hidden rows are acceptable. Rebuild should surface source-only rows honestly. |
| `/dashboard/admin/timeoffs` | `src/app/dashboard/admin/timeoffs/page.tsx` | Admin Float timeoffs/capacity reductions | Admin tab: `Capacity Reduced` | Not reached after batch abort. | Preserve capacity-reduction route only as separate Float source evidence. | Do not blend timeoffs into project booked hours or SOLD vs ALLOCATED totals. |
| `/dashboard/users` | `src/app/dashboard/users/page.tsx` | User management | Admin tab: `Users` | Not reached after batch abort. | Preserve admin-only user management if the rebuild includes user administration. | Do not preserve mutation forms in Phase 1 parity beyond documenting their existence. |

## Navigation And Chrome Inventory

### Layout Chrome

Old app dashboard routes share `src/app/dashboard/layout.tsx`.

Observed route-level chrome:

- Auth guard redirects unauthenticated users to `/login`.
- `TopBar` appears above all dashboard pages.
- `TabNav` appears below the top bar.
- `AuditBanner` appears above route content.
- Exchange-rate warning appears when fallback rates are active.
- `ChatPanel` is mounted globally across dashboard routes.

File evidence:

- `src/app/dashboard/layout.tsx:24-31` authenticates and redirects.
- `src/app/dashboard/layout.tsx:48-64` renders `TopBar`, `TabNav`, `AuditBanner`, optional exchange warning, route content, and `ChatPanel`.

Preserve:

- Shared dashboard chrome.
- Audit/warning surface above route content.
- Chat entry available across dashboard surfaces.
- Scope-aware navigation where lawful.

Do not preserve:

- Hydration mismatch risk from relative age text noted in the manifest.
- `/api/sync` 401 noise from local auth-bypass runs.

### Primary Tabs

Primary tab definitions live in `src/components/dashboard/tab-nav.tsx`.

Primary tabs:

- `Department Rollup` -> `/dashboard`
- `Projects` -> `/dashboard/projects`
- `Float` -> `/dashboard/float`
- `Approval Audit` -> `/dashboard/approval`
- `Data Quality` -> `/dashboard/data-quality`
- `Glossary` -> `/dashboard/glossary`

Admin tabs:

- `Sync Audit` -> `/dashboard/audit`
- `Sync Warnings` -> `/dashboard/admin/sync-warnings`
- `Capacity Reduced` -> `/dashboard/admin/timeoffs`
- `Users` -> `/dashboard/users`

File evidence:

- `src/components/dashboard/tab-nav.tsx:9-16` defines primary tabs.
- `src/components/dashboard/tab-nav.tsx:18-23` defines admin tabs.
- `src/components/dashboard/tab-nav.tsx:28-34` carries only `office`, `from`, and `to` across tabs.
- `src/components/dashboard/tab-nav.tsx:36-39` includes admin tabs only for `userRole === "admin"`.
- `src/components/dashboard/tab-nav.tsx:50-63` builds tab links and shows the Data Quality chase badge.

Preserve:

- Primary nav order and admin-gated tabs.
- Office/from/to scope carryover at minimum.
- Data Quality badge behaviour if backed by the new contract/evidence model.

Do not preserve:

- Dropping richer scope (`department`, `role`, `client`, `search`, `jobNumber`, `Float project ID`) when route transitions need it. Immutable scope must survive clicks in the rebuild.

### Top Bar Controls

Top bar source: `src/components/dashboard/top-bar.tsx`.

Controls:

- Logo.
- Office buttons: All/Agency, LDN, UCX, USA.
- Clear All Filters.
- User email.
- Sync status.
- Sync Now button.
- Ask AI button.

File evidence:

- `src/components/dashboard/top-bar.tsx:122-135` renders office controls.
- `src/components/dashboard/top-bar.tsx:138-140` renders Clear All Filters.
- `src/components/dashboard/top-bar.tsx:142-178` renders sync status and Sync Now.
- `src/components/dashboard/top-bar.tsx:179-189` toggles Ask AI.

Preserve:

- Office controls in persistent chrome.
- Clear filters.
- Sync/status visibility as an operational status surface.
- Ask AI entry point.

Do not preserve:

- Sync mutation from ordinary chat or route inventory work. Rebuild mutation boundaries must be explicit.

## Secondary Navigation And Tab Surfaces

### Dashboard Rollup Views

Route: `/dashboard`

Search param: `view`

Known views from source:

- `department` default
- `month`
- `role`
- `client`

File evidence:

- `src/app/dashboard/page.tsx:60-81` reads `office`, `from`, `to`, and `view`.
- `src/app/dashboard/page.tsx:183-240` branches into department, month, role, and client rollup rows.

Preserve:

- Department, Monthly Rollup, Role, and Client rollups.
- Drilldowns from rollup rows into Projects with scoped params.

Do not preserve:

- Unsupported source values rendered as zero in scoped rollups. The old app has local zero placeholders in some rollup transformations; the rebuild must show unsupported as unsupported.

### Projects Surface

Route: `/dashboard/projects`

Search params from page signature:

- `office`
- `month`
- `search`
- `department`
- `role`
- `client`
- `view`
- `from`
- `to`
- `pview`

File evidence:

- `src/app/dashboard/projects/page.tsx:47-83` reads Projects search params and builds scoped project links.
- `src/app/dashboard/projects/page.tsx:137-145` builds display-contract rows and CSV rows.
- `src/app/dashboard/projects/page.tsx:155-216` builds department/month/role/client breakdown rows.
- `src/components/dashboard/project-table.tsx:92-100` links Float-only rows to Float trace and normal rows to project detail `#float-trace`.

Preserve:

- Search, active filters, department/role/client/month drilldowns.
- Project detail links carrying scope.
- CSV/export parity with visible rows.
- Source-only row badges for pipeline-only, prod-only, and Float-only rows.

Do not preserve:

- Any table footer or CSV total that can diverge from the display contract.
- Horizontal overflow noted in screenshot manifest.

### Project Detail

Route: `/dashboard/projects/[jobNumber]`

Search params from page signature:

- `from`
- `to`
- `department`
- `role`
- `client`
- `office`

File evidence:

- `src/app/dashboard/projects/[jobNumber]/page.tsx:47-81` reads scope, selects dashboard view, builds scoped display contract, and selects Float trace.
- `src/app/dashboard/projects/[jobNumber]/page.tsx:149-186` renders scoped back link, date controls, and active filter chips.
- `src/app/dashboard/projects/[jobNumber]/page.tsx:189-220` renders source-specific KPI cards and unsupported labels for department/role-scoped pipeline and production revenue.

Preserve:

- Project detail as a first-class drilldown.
- Scoped back links.
- Source-specific totals.
- Unsupported labels where source attribution does not exist.
- Float trace section.

Do not preserve:

- Legacy DB integrity issue lookup as source of truth without rebuilding it through the new laws.

### Float Surfaces

Routes:

- `/dashboard/float`
- `/dashboard/float/[floatProjectId]`

File evidence:

- `src/app/dashboard/float/page.tsx:29-53` reads office/from/to and selects dashboard and Float audit evidence.
- `src/app/dashboard/float/page.tsx:54-68` builds raw/cache/visible rendering audit input.
- `src/app/dashboard/float/page.tsx:100-127` renders scheduled/allocated/unallocated/people/task/matching health cards.
- `src/app/dashboard/float/page.tsx:129-213` renders Dashboard Float Rendering Audit.
- `src/app/dashboard/float/page.tsx:215-260` renders Float Problems and links problem rows to `/dashboard/float/[floatProjectId]`.
- `src/app/dashboard/float/[floatProjectId]/page.tsx:21-45` reads route params and selects Float trace.
- `src/app/dashboard/float/[floatProjectId]/page.tsx:53-70` renders scoped back link and `FloatTraceTable`.

Preserve:

- Float overview.
- Float project trace route.
- Matching health.
- Raw/cache/visible classification.
- Duplicate/manual/inactive/source-warning evidence.

Do not preserve:

- Diagnostic route as a second product total authority.
- Any mutation or auto-correction of Float joins.

### Data Quality Tabs

Route: `/dashboard/data-quality`

Search param: `tab`

Known tabs:

- `overview`
- `chase`
- `issues`
- `orphans`
- `float`
- `archived`
- `diagnostics` admin-only

File evidence:

- `src/components/dashboard/data-quality-tabs.tsx:14-51` defines tabs and admin-only diagnostics.
- `src/components/dashboard/data-quality-tabs.tsx:66-77` preserves existing query params while switching tabs and resets pagination.
- `src/app/dashboard/data-quality/page.tsx:28-59` reads office/from/to/tab/severity/search/page.
- `src/app/dashboard/data-quality/page.tsx:118-123` renders `DataQualityTabs`.
- `src/app/dashboard/data-quality/page.tsx:125-172` renders overview, chase, issues, orphans, and Float tab bodies.

Preserve:

- Data Quality hub and tabs.
- Badges for chase/issues.
- Admin-only diagnostics.
- Search/severity/page workflow for chase/issues where still lawful.

Do not preserve:

- Hidden archive/restore behaviour that could make source rows disappear from the rebuilt evidence model.

## Non-Primary Routes And Admin Surfaces

The following routes exist in old app files but are not all primary-user tabs:

| Route | Old app file | Notes |
|---|---|---|
| `/dashboard/diagnostics` | `src/app/dashboard/diagnostics/page.tsx` | Standalone diagnostics page. Not listed in primary `TabNav`; Data Quality has an admin-only diagnostics tab. |
| `/dashboard/integrity` | `src/app/dashboard/integrity/page.tsx` | Integrity report and sync report. Not listed in primary `TabNav`. Needs IA decision before preserving as standalone. |
| `/dashboard/chase` | `src/app/dashboard/chase/page.tsx` | Standalone chase list. Data Quality has Chase List tab, so standalone route may be redundant. |
| `/dashboard/readiness` | `src/app/dashboard/readiness/page.tsx` | Readiness route. Not listed in primary `TabNav`; overlaps Approval/Data Quality framing. |
| `/dashboard/admin/sync-warnings` | `src/app/dashboard/admin/sync-warnings/page.tsx` | Admin tab. Source problem inventory for unmatched Float allocations. |
| `/dashboard/admin/timeoffs` | `src/app/dashboard/admin/timeoffs/page.tsx` | Admin-only redirect enforced in route file. Capacity reduction evidence from Float timeoffs. |
| `/dashboard/users` | `src/app/dashboard/users/page.tsx` | Admin user management; non-admin users see access denied. |

Preserve decision:

- Preserve admin visibility to operational/source-problem surfaces.
- Treat standalone non-primary routes as parity candidates, not guaranteed IA. P1-B/P1-E should decide whether `diagnostics`, `integrity`, `chase`, and `readiness` remain standalone routes or fold into Data Quality/Approval.

## API And Mutation Surface Notes

This ticket did not inspect API internals beyond route discovery and top-bar references. The old app contains API routes under `src/app/api`, including chat, diagnostics, sync, readiness archive, issue dismiss, orphan dismiss, users-related server actions, and validation.

Route-level notes relevant to UX parity:

- Chat panel is globally mounted and uses `/api/chat` from the old app. Preserve chat shell UX, but rebuild as read-only evidence agent.
- Top bar polls and posts `/api/sync`. Preserve sync status visibility, but do not preserve mutation capability in Phase 1 and do not let chat trigger sync.
- Project/archive/orphan/user actions exist in the old app. They are documented as legacy surfaces only. They are not approved for rebuild implementation by this inventory.

## Screenshot Manifest Availability Summary

Captured:

- `/dashboard`
- `/dashboard?office=LDN&from=2026-01-01&to=2026-03-31&view=department`
- `/dashboard?office=LDN&from=2026-01-01&to=2026-03-31&view=month`
- `/dashboard/projects`
- `/dashboard/projects?office=LDN&from=2026-01-01&to=2026-03-31&department=design`
- `/dashboard/projects?office=LDN&from=2026-01-01&to=2026-12-31&search=UCS04787`

Blocked or not reached:

- Project detail routes exist but need isolated long-timeout capture. Observed old app responses ranged from about 32s to 2.5m.
- `/dashboard/float` exists and returned 200 to a scoped HEAD check after about 75s, but screenshot capture was blocked.
- `/dashboard/data-quality`, `/dashboard/approval`, and `/dashboard/audit` exist and returned 200 later, around 45s, after screenshot attempts timed out.
- `/dashboard/diagnostics` exists and server log showed 200 after about 28s, but capture batch was aborted.
- `/dashboard/integrity`, `/dashboard/chase`, `/dashboard/readiness`, `/dashboard/glossary`, `/dashboard/admin/sync-warnings`, `/dashboard/admin/timeoffs`, `/dashboard/users`, and chat states were not reached after the batch abort.

## Route-Level Preserve List

Preserve:

- `/dashboard` as the core dashboard home.
- `/dashboard/projects` as the dense reconciliation table and CSV/export surface.
- `/dashboard/projects/[jobNumber]` as scoped project detail.
- `/dashboard/float` and `/dashboard/float/[floatProjectId]` as diagnostic evidence routes.
- `/dashboard/data-quality` as the source-problem hub.
- `/dashboard/approval` as approval/readiness evidence route.
- `/dashboard/glossary` as plain-language source explanation.
- Admin tabs for audit, sync warnings, capacity/timeoffs, and users, subject to later mutation-boundary decisions.
- Shared top bar, tab nav, audit banner, warning/freshness status, and global chat entry.

## Route-Level Do-Not-Preserve List

Do not preserve:

- Slow SSR as acceptable UX.
- Horizontal table overflow on Projects.
- Hydration mismatch in `AuditBanner` relative age text.
- Local auth-bypass `/api/sync` 401 polling noise.
- Any page-local business total as a second authority.
- Any hidden source row, archive action, dismiss action, or sync action that makes evidence disappear.
- Any chat, diagnostics, sync, approval, or CSV path that can answer product truth outside the display contract.
- Scope loss across clicks. In the rebuild, office, from, to, department, role, exact client, search, job number, and Float project ID must survive whenever relevant.

## Verification Evidence

Read-only old app files inspected:

- `src/app/dashboard/layout.tsx`
- `src/components/dashboard/tab-nav.tsx`
- `src/components/dashboard/top-bar.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/projects/page.tsx`
- `src/app/dashboard/projects/[jobNumber]/page.tsx`
- `src/app/dashboard/float/page.tsx`
- `src/app/dashboard/float/[floatProjectId]/page.tsx`
- `src/app/dashboard/data-quality/page.tsx`
- `src/components/dashboard/data-quality-tabs.tsx`
- `src/components/dashboard/project-table.tsx`
- `src/lib/dashboard/display-contract.ts`
- Route file discovery under `src/app/dashboard/**/page.tsx`

Read-only rebuild docs inspected:

- `OBJECTIVE.md`
- `AGENTS.md`
- `docs/OVERNIGHT_BUILD_CONTROL.md`
- `docs/EXECUTION_TICKETS.md`
- `docs/UX_PARITY_REQUIREMENTS.md`
- `docs/UI_SCREENSHOT_REFERENCE_PLAN.md`
- `reference/ui/current-app/manifest.md`

Commands used were read-only inspection commands: `pwd`, `ls`, `sed`, `rg`, `find`, `git status --short --branch`, and `nl`.

No deployment, SSH, migration, Supabase mutation, source-system mutation, old-app write, package/src/test/fixture/reference screenshot change, or screenshot recapture was performed.
