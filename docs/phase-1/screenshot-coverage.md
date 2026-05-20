# Phase 1 Screenshot Coverage And Recapture Plan

Ticket: GitHub `#20`, P1-D: Screenshot Coverage and Recapture Plan.

This document maps the screenshot evidence that exists in `reference/ui/current-app/` against the visual reference requirements in `docs/UI_SCREENSHOT_REFERENCE_PLAN.md` and the click-path requirements in `docs/UX_PARITY_REQUIREMENTS.md`.

Screenshots are visual parity evidence only. They do not approve old data logic, do not prove source accuracy, and do not replace source-to-contract tests.

## Evidence Read

Manifest section used: `reference/ui/current-app/manifest.md`.

Current screenshot files present:

| File | Manifest route | Manifest state | Image size observed |
|---|---|---|---|
| `reference/ui/current-app/2026-05-20_dashboard_default.png` | `/dashboard` | default load | 1440 x 2256 |
| `reference/ui/current-app/2026-05-20_dashboard_ldn_q1_design_rollup.png` | `/dashboard?office=LDN&from=2026-01-01&to=2026-03-31&view=department` | department rollup, Design visible | 1440 x 2200 |
| `reference/ui/current-app/2026-05-20_dashboard_ldn_q1_month_rollup.png` | `/dashboard?office=LDN&from=2026-01-01&to=2026-03-31&view=month` | monthly reconciliation rollup | 1440 x 1497 |
| `reference/ui/current-app/2026-05-20_projects_default.png` | `/dashboard/projects` | Projects table default | 2088 x 23556 |
| `reference/ui/current-app/2026-05-20_projects_ldn_q1_design.png` | `/dashboard/projects?office=LDN&from=2026-01-01&to=2026-03-31&department=design` | Projects drilldown filtered by department | 1917 x 6492 |
| `reference/ui/current-app/2026-05-20_projects_search_ucs04787.png` | `/dashboard/projects?office=LDN&from=2026-01-01&to=2026-12-31&search=UCS04787` | search filtering | 1440 x 1596 |

Manifest metadata to preserve with the set:

| Field | Value |
|---|---|
| Capture date | 2026-05-20 |
| Old app repo | `/Users/tommyhyde/ucs-commercial-dashboard` |
| Old app commit | `c6f0fbd` |
| Old app URL | `http://localhost:3001` |
| Auth mode | local server with server-side `E2E_AUTH_BYPASS=1` |
| Data mode | live Supabase data via transaction-pooler override |
| Primary viewport | 1440 x 1000 full-page screenshots |

## Coverage Matrix

### Required Routes

| Required route | Coverage status | Current evidence | Required next action |
|---|---|---|---|
| `/dashboard` | Partial | `2026-05-20_dashboard_default.png`, `2026-05-20_dashboard_ldn_q1_design_rollup.png`, `2026-05-20_dashboard_ldn_q1_month_rollup.png` | Recapture missing USA, UCX, full-year, latest-month, custom range, role/client/no-warning states. |
| `/dashboard/projects` | Partial | `2026-05-20_projects_default.png`, `2026-05-20_projects_ldn_q1_design.png`, `2026-05-20_projects_search_ucs04787.png` | Recapture role, exact client, source-only, pipeline-only, production-only, Float-only, archived, selected archive controls, footer, CSV visible states. |
| `/dashboard/projects/[jobNumber]` | Blocked | Manifest blockers for UCS04889, UCS04787, UCS05186, UCS04154, PCS00250, USA00262, USA00323 | Isolated long-timeout project-detail captures, then deterministic fixtures for exact warning variants. |
| `/dashboard/float` | Blocked | Manifest says `HEAD` returned 200 after about 75s, screenshot aborted | Isolated long-timeout capture. Deterministic fixture later for raw/cache/visible classification variants. |
| `/dashboard/float/[floatProjectId]` | Blocked | Manifest names Float IDs `10979146`, `11413292`, `10480262`, `11330982` | Isolated long-timeout captures for named IDs, then fixture-backed trace coverage. |
| `/dashboard/data-quality` | Blocked | Manifest says first attempt timed out at 45s and server later returned 200 | Isolated long-timeout capture. |
| `/dashboard/approval` | Blocked | Manifest says first attempt timed out at 45s and server later returned 200 | Isolated long-timeout capture. |
| `/dashboard/audit` | Blocked | Manifest says first attempt timed out at 45s and server later returned 200 | Isolated long-timeout capture. |
| `/dashboard/diagnostics` | Blocked | Manifest says capture aborted and server showed 200 after about 28s | Isolated recapture. |
| `/dashboard/integrity` | Missing | Manifest says not reached after batch abort | Isolated route capture. |
| `/dashboard/chase` | Missing | Manifest says not reached after batch abort | Isolated route capture. |
| `/dashboard/readiness` | Missing | Manifest says not reached after batch abort | Isolated route capture. |
| `/dashboard/glossary` | Missing | Manifest says not reached after batch abort | Isolated route capture. |
| `/dashboard/admin/sync-warnings` | Missing | Manifest says not reached after batch abort | Isolated route capture or unavailable-state capture if admin gate blocks. |
| `/dashboard/admin/timeoffs` | Missing | Manifest says not reached after batch abort | Isolated route capture or unavailable-state capture if admin gate blocks. |
| `/dashboard/users` | Missing | Manifest says not reached after batch abort | Isolated route capture or unavailable-state capture if admin gate blocks. |

### Required States

| State group | Required state | Coverage status | Current evidence or blocker | Required next action |
|---|---|---|---|---|
| Global Dashboard | default load | Covered | `2026-05-20_dashboard_default.png` | Keep as visual reference. |
| Global Dashboard | LDN | Covered for Q1 Design and Q1 month | `2026-05-20_dashboard_ldn_q1_design_rollup.png`, `2026-05-20_dashboard_ldn_q1_month_rollup.png` | Add non-Design LDN state only if Phase 1 gate needs it. |
| Global Dashboard | USA | Missing | No current file | Recapture with USA FY or named USA guard scope. |
| Global Dashboard | UCX | Missing | No current file | Recapture or document unavailable state if old app lacks data. |
| Global Dashboard | Q1 | Covered for LDN | LDN Q1 dashboard files | Keep as visual reference. |
| Global Dashboard | full year | Partial | `2026-05-20_dashboard_default.png` uses Agency FY2026 | Add office-specific FY if needed for parity. |
| Global Dashboard | latest month | Missing | No current file | Recapture deterministic or live scoped route. |
| Global Dashboard | custom date range | Missing | No current file | Recapture deterministic or live scoped route. |
| Global Dashboard | warning banner visible | Covered | Dashboard and Projects files show audit warnings per manifest | Keep as warning surface reference. |
| Global Dashboard | freshness badge visible | Partial | Manifest records Data Quality badge and source/freshness warnings on dashboard captures | Recapture if badge detail is not legible enough for rebuild designers. |
| Rollups | department rollup | Covered | `2026-05-20_dashboard_ldn_q1_design_rollup.png` | Keep. |
| Rollups | role rollup | Missing | No current file | Recapture deterministic preferred; old role casing was a recent source of drift. |
| Rollups | month rollup | Covered | `2026-05-20_dashboard_ldn_q1_month_rollup.png` | Keep. |
| Rollups | client rollup | Missing | No current file | Recapture deterministic preferred. |
| Rollups | flagged row | Partial | Audit warning visible; month rollup intended as reconciliation reference | Recapture exact flagged row if visual detail matters. |
| Rollups | no-warning row | Missing | No current file | Deterministic fixture preferred, because live source may currently warn. |
| Rollups | pipeline/prod-rev unsupported state | Missing | No current file | Deterministic fixture required so unsupported is visible without inventing live data. |
| Projects | default table | Covered | `2026-05-20_projects_default.png` | Keep, but do not preserve horizontal overflow. |
| Projects | filtered by department | Covered | `2026-05-20_projects_ldn_q1_design.png` | Keep. |
| Projects | filtered by role | Missing | No current file | Recapture after role route is stable. |
| Projects | exact client drilldown | Missing | Manifest marks exact client drilldown not specifically captured | Deterministic fixture preferred to avoid fuzzy search masquerading as exact client. |
| Projects | search filtering | Covered | `2026-05-20_projects_search_ucs04787.png` | Keep. |
| Projects | source-only rows visible | Missing | No current file | Deterministic fixture required. |
| Projects | pipeline-only row | Missing | No current file | Deterministic fixture required. |
| Projects | production-only row | Missing | No current file | Deterministic fixture required. |
| Projects | Float-only row | Missing | No current file | Deterministic fixture required. |
| Projects | archived row | Missing | Manifest marks archived production revenue visibility not captured | Deterministic fixture preferred; live recapture if known row exists. |
| Projects | selected row with archive controls | Missing | No current file | Deferred until mutable row controls are lawful in rebuild UI tests. |
| Projects | CSV export control visible | Partial | Manifest says CSV/export controls visible on Projects default | Recapture tighter screenshot if control is not reviewable in tall full-page image. |
| Projects | table footer visible | Partial | Projects captures are extremely tall | Recapture viewport-targeted footer or deterministic component capture. |
| Project Detail | normal matched project | Blocked | Project-detail routes timed out or were aborted | Isolated long-timeout capture. |
| Project Detail | scoped department detail | Blocked | UCS04889 LDN Q1 Design detail timed out past 150s | Isolated long-timeout capture. |
| Project Detail | scoped role detail | Missing | No current file | Deterministic fixture preferred after role contract is ready. |
| Project Detail | missing role data | Missing | No current file | Deterministic fixture required for unsupported-not-zero proof. |
| Project Detail | Float warning | Blocked | UCS04787 detail blocked by route latency | Isolated long-timeout capture, then deterministic warning fixture. |
| Project Detail | source-only/prod-only evidence | Missing | No current file | Deterministic fixture required. |
| Project Detail | source trace links | Missing | No current file | Deterministic fixture required when source trace UX exists. |
| Float Diagnostics | overview | Blocked | `/dashboard/float` returned slowly and screenshot was aborted | Isolated long-timeout capture. |
| Float Diagnostics | project trace | Blocked | Float detail route screenshots not captured | Isolated long-timeout capture. |
| Float Diagnostics | raw/cache/visible comparison | Missing | No current file | Deterministic fixture required. |
| Float Diagnostics | duplicate/manual candidates | Blocked | UCS05186 candidate blocked by route latency | Isolated long-timeout plus deterministic fixture. |
| Float Diagnostics | inactive/archived warning | Missing | No current file | Deterministic fixture required. |
| Float Diagnostics | export compare empty | Missing | No current file | Deterministic fixture or local UI state capture. |
| Float Diagnostics | export compare with pasted sample | Missing | No current file | Deterministic Playwright capture with fixture sample. |
| Float Diagnostics | ambiguous match warning | Missing | No current file | Deterministic fixture required. |
| Float Diagnostics | dashboard-only rows missing from export | Missing | No current file | Deterministic fixture required. |
| Chat | closed state | Partial | Top bar Ask AI visible per manifest, but chat state not separately captured | Recapture closed and open states in one deterministic chat fixture. |
| Chat | open idle | Blocked | Manifest says chat sequence not reached | Deterministic fixture preferred. |
| Chat | working/progress | Blocked | Manifest says chat sequence not reached | Deterministic fixture required to avoid timing flake. |
| Chat | evidence/source trace visible | Blocked | Manifest says chat sequence not reached | Deterministic fixture required. |
| Chat | warning visible | Blocked | Manifest says chat sequence not reached | Deterministic fixture required. |
| Chat | confidence visible | Blocked | Manifest says chat sequence not reached | Deterministic fixture required. |
| Chat | `Needs Codex` visible | Blocked | Manifest says chat sequence not reached | Deterministic fixture required. |

### Viewports

| Viewport requirement | Coverage status | Current evidence | Plan |
|---|---|---|---|
| Desktop 1440 x 1000 | Partial | All existing screenshots use 1440 x 1000 primary viewport, with full-page outputs | Continue desktop captures first. |
| Laptop 1280 x 900 | Missing | No current screenshot | Recapture core routes after desktop blocker list is reduced. |
| Mobile 390 x 844 core pages | Missing | No current screenshot | Defer until rebuild UI parity begins, unless Phase 1 gate explicitly requires old-app mobile evidence. |

## Named Scenario Coverage Map

| Scenario | Coverage status | Current evidence | Required next action |
|---|---|---|---|
| LDN Q1 Design rollup | Covered | `2026-05-20_dashboard_ldn_q1_design_rollup.png` | Preserve visual layout and scope controls. |
| LDN Q1 Design Projects drilldown | Covered | `2026-05-20_projects_ldn_q1_design.png` | Preserve URL scope and active filter chip. |
| LDN Q1 Design project detail after click | Blocked | Manifest blocker for `/dashboard/projects/UCS04889?office=LDN&from=2026-01-01&to=2026-03-31&department=design` | Isolated long-timeout capture. |
| UCS04787 project detail and Float trace | Partial and blocked | `2026-05-20_projects_search_ucs04787.png`; manifest says detail and Float trace blocked | Isolated long-timeout project-detail and Float trace captures. |
| UCS05186 duplicate/manual Float visibility | Blocked | Manifest says selector confirmed scenario but screenshot blocked | Isolated long-timeout capture, then deterministic duplicate/manual fixture. |
| UCS04154 fee-sheet Float ID join evidence | Blocked | Manifest says selector confirmed Float ID `10480262` but screenshot blocked | Isolated long-timeout capture for project and Float ID detail. |
| PCS00250 cache-without-raw warning | Blocked | Manifest says selector confirmed Float ID `11330982` but screenshot blocked | Isolated long-timeout capture, then deterministic cache-without-raw fixture. |
| USA00262 sold-hours guard | Blocked | Manifest says selector confirmed Float ID `10748270` but screenshot blocked | Isolated long-timeout project-detail capture, then deterministic false-zero guard fixture. |
| USA00323 sold-hours guard | Blocked | Manifest says selector confirmed Float ID `11030276` but screenshot blocked | Isolated long-timeout project-detail capture, then deterministic false-zero guard fixture. |
| TBC pipeline row identity | Missing | Manifest says not specifically captured | Deterministic fixture required. |
| archived production revenue visibility | Missing | Manifest says not specifically captured | Deterministic fixture preferred, live recapture if known archived row is stable. |
| exact client drilldown | Missing | Manifest says not specifically captured | Deterministic fixture required to prove exact client is not fuzzy search. |

## Exact Blockers From Current Manifest

Current blockers are copied as classifications from the manifest, not newly asserted screenshot proof.

| Blocker class | Manifest evidence | Affected coverage |
|---|---|---|
| Supabase session pool pressure | Default session pool hit `EMAXCONNSESSION`; capture switched to transaction-pooler override | All live captures are environment-sensitive and should not be treated as deterministic. |
| Slow SSR routes | Manifest records dashboard rollups at about 20 to 38s, Projects at 7 to 16s, Data Quality and Approval at 45s, Float at 75s, and project details at 90s to 2.5 minutes | Project detail, Float, Data Quality, Approval, Audit, and diagnostics need isolated long-timeout capture. |
| Project detail `domcontentloaded` timeout | UCS04889 detail did not reach `domcontentloaded` within 150s, later server 200 after about 2.5 minutes | LDN Q1 Design project detail after click. |
| Long-running named project detail batch | UCS04787, UCS05186, UCS04154, PCS00250, USA00262, and USA00323 captures were timed out, aborted, or skipped after repeated long-running routes | All named project-detail scenario screenshots. |
| Float batch aborted | `/dashboard/float` returned 200 to a `HEAD` check after about 75s but screenshot capture was aborted; Float detail IDs were confirmed but not captured | Float overview and Float trace screenshots. |
| Secondary pages not reached | Integrity, Chase, Readiness, Glossary, admin sync warnings, admin timeoffs, and Users were not reached after batch abort | Required route coverage remains missing. |
| Chat sequence not reached | Chat open, idle, working, and evidence states were not captured because the long-running route batch stopped first | Chat visual parity remains missing. |
| Current visual flake | `AuditBanner` hydration mismatch from relative age text, `/api/sync` 401 network noise, Projects horizontal overflow and excessive full-page height | Do not preserve these as intended UI. |

## Recapture Plan

### Isolated Long-Timeout Captures

Use this track when the manifest proves the old app can eventually return the route, but batch capture timed out or was aborted.

| Priority | Capture target | Timeout guidance | Why this is isolated long-timeout |
|---|---|---|---|
| 1 | `/dashboard/projects/UCS04889?office=LDN&from=2026-01-01&to=2026-03-31&department=design` | 4 minutes per navigation | Needed for Sian LDN Q1 Design detail after scoped click. |
| 2 | `/dashboard/projects/UCS04787?office=LDN&from=2026-01-01&to=2026-12-31` | 3 minutes per navigation | Named Float mismatch detail; server previously returned after about 90s and 32s. |
| 3 | `/dashboard/projects/UCS05186?office=LDN&from=2026-01-01&to=2026-12-31` | 3 minutes per navigation | Duplicate/manual Float scenario; server previously returned after about 61s. |
| 4 | `/dashboard/projects/UCS04154?office=LDN&from=2026-01-01&to=2026-12-31` | 3 minutes per navigation | Fee-sheet Float ID join evidence. |
| 5 | `/dashboard/projects/PCS00250?office=LDN&from=2026-01-01&to=2026-12-31` | 3 minutes per navigation | Cache-without-raw warning candidate. |
| 6 | `/dashboard/projects/USA00262?office=USA&from=2026-01-01&to=2026-12-31` | 3 minutes per navigation | Sold-hours false-zero guard. |
| 7 | `/dashboard/projects/USA00323?office=USA&from=2026-01-01&to=2026-12-31` | 3 minutes per navigation | Sold-hours false-zero guard. |
| 8 | `/dashboard/float?office=LDN&from=2026-01-01&to=2026-03-31` | 3 minutes per navigation | Float overview was reachable slowly. |
| 9 | `/dashboard/float/10979146`, `/dashboard/float/11413292`, `/dashboard/float/10480262`, `/dashboard/float/11330982` | 3 minutes each | Named Float trace details from manifest-confirmed IDs. |
| 10 | `/dashboard/data-quality`, `/dashboard/approval`, `/dashboard/audit`, `/dashboard/diagnostics` | 2 minutes each | Server logs showed eventual 200s for the first four slow diagnostic routes. |
| 11 | `/dashboard/integrity`, `/dashboard/chase`, `/dashboard/readiness`, `/dashboard/glossary`, `/dashboard/admin/sync-warnings`, `/dashboard/admin/timeoffs`, `/dashboard/users` | 90 seconds each | Missing because the batch stopped, not because the manifest proved route failure. |

Rules for this track:

- Run one route per browser context or one small route family per process.
- Keep live Supabase access read-only.
- Use existing auth-bypass or authenticated local session only.
- Update the manifest only in a future capture ticket whose write set includes it.
- Capture unavailable/admin-blocked states as evidence instead of forcing access.

### Deterministic Fixtures

Use this track when the required visual state is a data integrity edge case, a warning state, or a workflow state that should not depend on current live data.

| Fixture-backed scenario | Required reason |
|---|---|
| no-warning rollup row | Live data currently shows audit/source warnings; a clean row needs controlled data. |
| pipeline/prod-rev unsupported in department or role scope | Must prove unsupported is labelled and not zero. |
| Projects source-only, pipeline-only, production-only, Float-only, archived rows | Must prove every row type is visible without relying on live row availability. |
| exact client drilldown | Must prove exact client scope is not fuzzy search. |
| project detail missing role data | Must prove unsupported-not-zero on detail. |
| project detail source-only/prod-only evidence and source trace links | Must prove evidence preservation and traceability. |
| Float raw/cache/visible comparison | Must prove the diagnostic classification, not just a named live route. |
| Float duplicate/manual candidates | Must prove duplicate/manual warning shape even if live rows move. |
| Float inactive/archived warning | Must prove archived or inactive Float rows are warning states, not hidden data. |
| Float export compare empty and pasted-sample states | Must prove the comparison UI interaction deterministically. |
| ambiguous match warning and dashboard-only rows missing from export | Must prove Yunni diagnostic states without live-data timing flake. |
| Chat open, idle, working, evidence, warning, confidence, and `Needs Codex` states | Must prove read-only chat UX without depending on model latency or live tool routing. |
| TBC pipeline row identity | Must prove TBC rows do not collapse into hidden noise. |
| archived production revenue visibility | Must prove archived source rows remain visible. |
| USA00262 and USA00323 sold-hours guards | Must prove false-zero prevention, not just current live output. |

### Deferred

Use this track when the screenshot is lower value before the display contract and deterministic UI harness exist.

| Deferred item | Reason |
|---|---|
| Laptop 1280 x 900 full route set | Desktop visual gaps are larger and block Phase 1 first. |
| Mobile 390 x 844 core pages | Useful for UI parity, but less important than proving route/state coverage and named data integrity scenarios. |
| Selected row with archive controls | Mutable/archive controls should wait until rebuild mutation boundaries and UI tests define lawful behavior. |
| Full chat interaction with live model/tool calls | Visual parity should be deterministic first; live chat evidence belongs after chat evidence agent implementation. |

## Preserve Visual Notes

Preserve these old-app patterns unless a law requires clearer labels or warnings:

- Top bar with office filter buttons, clear filters, sync status, Sync Now, and Ask AI.
- Tab navigation order, including admin tabs when admin auth-bypass is active.
- Audit warning banner as a first-class page-level state surface.
- Date range and quick-period controls inside dashboard content.
- Dashboard hero metrics and dense department/month rollup tables.
- Projects drilldown keeping office/date/filter scope in the URL.
- Active filter chip on scoped Projects pages.
- CSV/export controls and dense Projects reconciliation table shape.
- Searchable Projects table for job-number investigation.

## Do-Not-Preserve Visual Notes

Do not carry these legacy issues into the rebuild:

- Projects table horizontal overflow beyond the 1440 viewport.
- Extremely tall Projects full-page captures as the only useful reference for table footer or controls.
- `AuditBanner` hydration mismatch caused by relative age text changing between SSR and hydration.
- Local auth-bypass `/api/sync` 401 polling noise.
- Brittle visual QA caused by slow SSR routes in batch capture.
- Any visual state that makes unsupported source capability look blank or zero.
- Any route or chat surface that drops scope while navigating.

## Verification Boundary

This ticket did not:

- add or edit screenshots,
- edit `reference/ui/current-app/manifest.md`,
- touch product UI,
- touch old app files,
- deploy, SSH, run migrations, mutate Supabase, or mutate source systems.

The only intended output is this coverage and recapture plan.
