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

## Blockers

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
