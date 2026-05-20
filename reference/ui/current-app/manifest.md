# Current App UI Screenshot Manifest

## Capture Metadata

Date: 2026-05-20

Old app repo: `/Users/tommyhyde/ucs-commercial-dashboard`

Old app commit: `c6f0fbd`

Old app URL: `http://localhost:3001`

Auth mode: local server with server-side `E2E_AUTH_BYPASS=1`

Data mode: live Supabase data via transaction-pooler override

Viewport: 1440 x 1000 primary viewport, full-page screenshots

Captured by: Codex UI reference photographer/designer agent

Output folder: `/Users/tommyhyde/UCS-DATA-INTEGRITY-REBUILD/reference/ui/current-app`

## Environment Notes

- The first local run against the default Supabase session pool hit `EMAXCONNSESSION`. The capture run was restarted with the same live database through the transaction-pooler port.
- The old app is slow on several SSR routes. Observed server timings were roughly 20 to 38 seconds for dashboard rollups, 7 to 16 seconds for Projects, 45 seconds for Data Quality and Approval, 75 seconds for Float, and 90 seconds to 2.5 minutes for some project details.
- `/api/sync` returned 401 during the local auth-bypass session. This is visible only as local console/network noise, not as an on-page blocker.
- Current app console showed a hydration mismatch in `AuditBanner` because relative age text changed between SSR and hydration, for example `56m ago` vs `57m ago`.
- Projects full-page screenshots expanded wider than the 1440 viewport because the current Projects table has horizontal overflow.

## Screenshots

| File | Route | Scope | State | Data Mode | Known Issues Visible | Notes |
|---|---|---|---|---|---|---|
| `2026-05-20_dashboard_default.png` | `/dashboard` | Agency FY2026 | default load | live | Audit warning banner visible, Data Quality badge visible, sync control visible | 1440 viewport, full-page output 1440 x 2256 |
| `2026-05-20_dashboard_ldn_q1_design_rollup.png` | `/dashboard?office=LDN&from=2026-01-01&to=2026-03-31&view=department` | LDN Q1 | department rollup, Design visible | live | Audit warning banner visible, source/freshness warnings visible | Covers Sian LDN Q1 Design rollup entry point |
| `2026-05-20_dashboard_ldn_q1_month_rollup.png` | `/dashboard?office=LDN&from=2026-01-01&to=2026-03-31&view=month` | LDN Q1 | monthly reconciliation rollup | live | Audit warning banner visible | Covers Monthly Rollup preservation target |
| `2026-05-20_projects_default.png` | `/dashboard/projects` | Agency FY2026 | projects table default | live | Horizontal overflow, very tall table, audit warning banner visible | Full-page output expanded to 2088 x 23556 because table exceeds viewport width |
| `2026-05-20_projects_ldn_q1_design.png` | `/dashboard/projects?office=LDN&from=2026-01-01&to=2026-03-31&department=design` | LDN Q1 Design | Projects drilldown filtered by department | live | Horizontal overflow, active filter chip visible | Covers Sian LDN Q1 Design Projects drilldown |
| `2026-05-20_projects_search_ucs04787.png` | `/dashboard/projects?office=LDN&from=2026-01-01&to=2026-12-31&search=UCS04787` | LDN FY2026 search | search filtering | live | Audit warning banner visible | Covers named UCS04787 Projects table/search access |

## Long-Timeout Recapture Addendum

Capture date: 2026-05-20 UTC

Method: isolated Playwright browser context per route, 1440 x 1000 viewport, full-page screenshots, server-side `E2E_AUTH_BYPASS=1`, old app served from `http://localhost:3001`.

Reports:

- `2026-05-20_p1g_project_detail_capture_report.json`
- `2026-05-20_p1h_float_diagnostics_capture_report.json`

### P1-G Project Detail And Named Scenario Captures

| File | Route | HTTP | State | Image size | Notes |
|---|---|---:|---|---|---|
| `2026-05-20_p1g_project_ucs04889_ldn_q1_design.png` | `/dashboard/projects/UCS04889?office=LDN&from=2026-01-01&to=2026-03-31&department=design` | 200 | scoped project detail | 1440 x 4176 | Captures Sian LDN Q1 Design project-detail click target. |
| `2026-05-20_p1g_project_ucs04787_ldn_fy.png` | `/dashboard/projects/UCS04787?office=LDN&from=2026-01-01&to=2026-12-31` | 200 | named project detail | 1440 x 11092 | Captures UCS04787 detail page for Float mismatch visual reference. |
| `2026-05-20_p1g_project_ucs05186_ldn_fy.png` | `/dashboard/projects/UCS05186?office=LDN&from=2026-01-01&to=2026-12-31` | 200 | named project detail | 1440 x 4697 | Captures UCS05186 duplicate/manual Float scenario page. |
| `2026-05-20_p1g_project_ucs04154_ldn_fy.png` | `/dashboard/projects/UCS04154?office=LDN&from=2026-01-01&to=2026-12-31` | 200 | named project detail | 1440 x 5855 | Captures UCS04154 fee-sheet Float ID join scenario page. |
| `2026-05-20_p1g_project_pcs00250_ldn_fy.png` | `/dashboard/projects/PCS00250?office=LDN&from=2026-01-01&to=2026-12-31` | 404 | unavailable project detail | 1440 x 1000 | Evidence that old app did not expose this project detail route in this scope, despite the Float warning existing elsewhere. |
| `2026-05-20_p1g_project_usa00262_usa_fy.png` | `/dashboard/projects/USA00262?office=USA&from=2026-01-01&to=2026-12-31` | 200 | named USA project detail | 1440 x 13595 | Captures USA00262 false-zero sold-hours guard visual reference. |
| `2026-05-20_p1g_project_usa00323_usa_fy.png` | `/dashboard/projects/USA00323?office=USA&from=2026-01-01&to=2026-12-31` | 200 | named USA project detail | 1440 x 12578 | Captures USA00323 false-zero sold-hours guard visual reference. |

### P1-H Float And Diagnostic Route Captures

| File | Route | HTTP | State | Image size | Notes |
|---|---|---:|---|---|---|
| `2026-05-20_p1h_float_overview_ldn_q1.png` | `/dashboard/float?office=LDN&from=2026-01-01&to=2026-03-31` | 200 | Float overview | 1440 x 17034 | Captures raw/cache/visible Float diagnostics overview shape. |
| `2026-05-20_p1h_float_10979146.png` | `/dashboard/float/10979146` | 200 | Float trace | 1440 x 9516 | Captures named Float trace detail. |
| `2026-05-20_p1h_float_11413292.png` | `/dashboard/float/11413292` | 200 | Float trace | 1440 x 2851 | Captures named Float trace detail. |
| `2026-05-20_p1h_float_10480262.png` | `/dashboard/float/10480262` | 200 | Float trace | 1440 x 4325 | Captures UCS04154 fee-sheet-linked Float trace. |
| `2026-05-20_p1h_float_11330982.png` | `/dashboard/float/11330982` | 404 | unavailable Float trace | 1440 x 1000 | Evidence that old app did not expose this Float trace route even though PCS00250 warning existed in the Float overview. |
| `2026-05-20_p1h_data_quality.png` | `/dashboard/data-quality` | 200 | Data Quality | 1440 x 44245 | Very tall source-problem hub reference. Do not preserve excessive height as a design target. |
| `2026-05-20_p1h_approval.png` | `/dashboard/approval` | 200 | Approval Audit | 1440 x 11572 | Captures approval gate language and layout. |
| `2026-05-20_p1h_audit.png` | `/dashboard/audit` | 200 | Sync Audit | 1440 x 1421 | Captures admin sync audit route. |
| `2026-05-20_p1h_diagnostics.png` | `/dashboard/diagnostics` | 200 | Parser Diagnostics | 1440 x 1000 | Captures diagnostics route. |
| `2026-05-20_p1h_integrity.png` | `/dashboard/integrity` | 200 | Data Integrity | 1440 x 15883 | Captures integrity report route. |
| `2026-05-20_p1h_chase.png` | `/dashboard/chase` | 200 | Chase List | 1440 x 3644 | Captures standalone chase route. |
| `2026-05-20_p1h_readiness.png` | `/dashboard/readiness` | 200 | Data Readiness | 1440 x 1531 | Captures readiness route. |
| `2026-05-20_p1h_glossary.png` | `/dashboard/glossary` | 200 | Glossary | 1440 x 2064 | Captures glossary route. |
| `2026-05-20_p1h_admin_sync_warnings.png` | `/dashboard/admin/sync-warnings` | 200 | Admin Sync Warnings | 1440 x 1253 | Captures admin sync warnings route under auth bypass. |
| `2026-05-20_p1h_admin_timeoffs.png` | `/dashboard/admin/timeoffs` | 200 | Admin Timeoffs | 1440 x 2368 | Captures capacity-reduced route under auth bypass. |
| `2026-05-20_p1h_users.png` | `/dashboard/users` | 200 | Users | 1440 x 1000 | Captures users route under auth bypass. |

## Original First-Batch Blockers

These blockers are preserved as history from the first capture batch. Items covered in the long-timeout recapture addendum above are no longer open screenshot blockers, except where the recapture intentionally recorded an unavailable state such as HTTP 404.

| Route / Scenario | Scope | State Requested | Blocker |
|---|---|---|---|
| `/dashboard/projects/UCS04889?office=LDN&from=2026-01-01&to=2026-03-31&department=design` | LDN Q1 Design | project detail after scoped click | Project detail SSR did not reach `domcontentloaded` within 150 seconds in Playwright. Server log later showed this route returning 200 after about 2.5 minutes, so the blocker is route latency, not auth or missing data. |
| `/dashboard/projects/UCS04787?office=LDN&from=2026-01-01&to=2026-12-31` | UCS04787 | project detail and Float warning candidate | Initial 90 second timeout. Later attempt was aborted while stopping the hung capture process. Server log showed one UCS04787 request returning 200 after about 90 seconds and another after about 32 seconds. Needs an isolated long-timeout capture. |
| `/dashboard/projects/UCS05186?office=LDN&from=2026-01-01&to=2026-12-31` | UCS05186 | duplicate/manual Float visibility candidate | Capture aborted after previous long-running project-detail route blocked the batch. Server log showed a UCS05186 project-detail request returning 200 after about 61 seconds. Needs isolated long-timeout capture. |
| `/dashboard/projects/UCS04154?office=LDN&from=2026-01-01&to=2026-12-31` | UCS04154 | fee-sheet Float ID join evidence | Not captured because project-detail batch was stopped after repeated long-running routes. Real project exists in selector with Float ID `10480262`. |
| `/dashboard/projects/PCS00250?office=LDN&from=2026-01-01&to=2026-12-31` | PCS00250 | cache-without-raw warning candidate | Not captured because project-detail batch was stopped after repeated long-running routes. Real project exists in selector with Float ID `11330982`. |
| `/dashboard/projects/USA00262?office=USA&from=2026-01-01&to=2026-12-31` | USA00262 | sold-hours guard project detail | Not captured because project-detail batch was stopped after repeated long-running routes. Real project exists in selector with Float ID `10748270`. |
| `/dashboard/projects/USA00323?office=USA&from=2026-01-01&to=2026-12-31` | USA00323 | sold-hours guard project detail | Not captured because project-detail batch was stopped after repeated long-running routes. Real project exists in selector with Float ID `11030276`. |
| `/dashboard/float` | Agency FY2026 | Float overview and rendering audit | A `HEAD` check for `/dashboard/float?office=LDN&from=2026-01-01&to=2026-03-31` returned 200 after about 75 seconds, but screenshot capture was aborted while project-detail routes were blocking the browser batch. Needs isolated long-timeout capture. |
| `/dashboard/float/[floatProjectId]` | `10979146`, `11413292`, `10480262`, `11330982` | Float trace details for UCS04787, UCS05186, UCS04154, PCS00250 | Not captured because Float batch was aborted after long-running project-detail routes. IDs were confirmed from live selector output. |
| `/dashboard/data-quality` | Agency FY2026 | Data Quality page | First screenshot attempt timed out at 45 seconds. Server log later showed 200 after about 45 seconds. Needs isolated long-timeout capture. |
| `/dashboard/approval` | Agency FY2026 | Approval Audit page | First screenshot attempt timed out at 45 seconds. Server log later showed 200 after about 45 seconds. Needs isolated long-timeout capture. |
| `/dashboard/audit` | Agency FY2026 | Sync Audit page | First screenshot attempt timed out at 45 seconds. Server log later showed 200 after about 45 seconds. Needs isolated long-timeout capture. |
| `/dashboard/diagnostics` | Agency FY2026 | Diagnostics page | Capture aborted while stopping the timed-out batch. Server log showed 200 after about 28 seconds. Needs isolated recapture. |
| `/dashboard/integrity` | Agency FY2026 | Integrity page | Not reached after batch abort. |
| `/dashboard/chase` | Agency FY2026 | Chase page | Not reached after batch abort. |
| `/dashboard/readiness` | Agency FY2026 | Readiness page | Not reached after batch abort. |
| `/dashboard/glossary` | Agency FY2026 | Glossary page | Not reached after batch abort. |
| `/dashboard/admin/sync-warnings` | Agency FY2026 | Admin sync warnings | Not reached after batch abort. |
| `/dashboard/admin/timeoffs` | Agency FY2026 | Admin timeoffs | Not reached after batch abort. |
| `/dashboard/users` | Agency FY2026 | Users page | Not reached after batch abort. |
| Chat open, working, evidence states | LDN Q1 | chat open/idle/working/evidence | Not captured because the long-running route batch was stopped before the chat sequence. |

## Named Scenario Status

| Scenario | Status |
|---|---|
| LDN Q1 Design rollup | Captured in `2026-05-20_dashboard_ldn_q1_design_rollup.png` |
| LDN Q1 Design Projects drilldown | Captured in `2026-05-20_projects_ldn_q1_design.png` |
| LDN Q1 Design project detail after click | Blocked by project-detail SSR latency |
| UCS04787 | Projects search captured, project detail and Float trace blocked by route latency |
| UCS05186 | Confirmed in live selector, screenshot blocked by route latency |
| UCS04154 | Confirmed in live selector with Float ID `10480262`, screenshot blocked by route latency |
| PCS00250 | Confirmed in live selector with Float ID `11330982`, screenshot blocked by route latency |
| USA00262 | Confirmed in live selector with Float ID `10748270`, screenshot blocked by route latency |
| USA00323 | Confirmed in live selector with Float ID `11030276`, screenshot blocked by route latency |
| TBC pipeline row identity | Not specifically captured |
| archived production revenue visibility | Not specifically captured |
| exact client drilldown | Not specifically captured |

## UX Patterns To Preserve

- Persistent top bar with office filter buttons, clear filters, sync status, Sync Now, and Ask AI.
- Tab navigation order and admin tabs visible for admin auth-bypass user.
- Audit warning banner as a first-class page-level status surface.
- Date range controls and quick-period controls within dashboard content.
- Dashboard hero metrics plus department/month rollup tables.
- Projects drilldown preserving office/date/filter scope in the URL.
- Active filter chip on Projects drilldown.
- CSV/export controls and dense reconciliation table layout on Projects.
- Searchable Projects table for named job-number investigation.

## Visual / UX Issues Not To Preserve

- Projects table overflows horizontally beyond the 1440 viewport in full-page capture.
- Some full-page Projects captures are extremely tall, making the reference useful but not ergonomic.
- Hydration mismatch in `AuditBanner` relative age text.
- Local auth-bypass session shows `/api/sync` 401 polling noise.
- Several SSR routes are slow enough to make visual QA brittle unless isolated with long timeouts or deterministic fixtures.
