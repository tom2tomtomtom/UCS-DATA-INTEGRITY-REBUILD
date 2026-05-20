# UI Screenshot Reference Plan

## Purpose

The rebuild must preserve the useful existing UX while replacing the data integrity engine.

Screenshots are the visual contract. They prevent the rebuild from drifting into a different product while the backend is being rebuilt.

Screenshots are reference evidence, not proof of data accuracy. They must be paired with contract tests and source checks.

## Storage Location

Store screenshots in:

```txt
reference/ui/current-app/
```

Use this filename pattern:

```txt
YYYY-MM-DD_route_scope_state.png
```

Each screenshot set must include a manifest:

```txt
reference/ui/current-app/manifest.md
```

Manifest fields:

```txt
Date:
Old app commit:
Old app URL:
Auth mode:
Data mode: live | deterministic fixture
Viewport:
Route:
Scope:
State:
Notes:
Known issues visible:
```

## Required Routes

Capture all dashboard pages that exist in the old app:

- `/dashboard`
- `/dashboard/projects`
- `/dashboard/projects/[jobNumber]`
- `/dashboard/float`
- `/dashboard/float/[floatProjectId]`
- `/dashboard/data-quality`
- `/dashboard/approval`
- `/dashboard/audit`
- `/dashboard/diagnostics`
- `/dashboard/integrity`
- `/dashboard/chase`
- `/dashboard/readiness`
- `/dashboard/glossary`
- `/dashboard/admin/sync-warnings`
- `/dashboard/admin/timeoffs`
- `/dashboard/users`

If a route is admin-only or unavailable, capture the unavailable state and note why.

## Required States

### Global Dashboard

- default load,
- LDN,
- USA,
- UCX,
- Q1,
- full year,
- latest month,
- custom date range,
- warning banner visible,
- freshness badge visible.

### Rollups

- department rollup,
- role rollup,
- month rollup,
- client rollup,
- a flagged row,
- a no-warning row,
- pipeline/prod-rev unsupported state where relevant.

### Projects

- default table,
- filtered by department,
- filtered by role,
- exact client drilldown,
- search filtering,
- source-only rows visible,
- pipeline-only row,
- production-only row,
- Float-only row,
- archived row,
- selected row with archive controls,
- CSV export control visible,
- table footer visible.

### Project Detail

- normal matched project,
- scoped department project detail,
- scoped role project detail,
- project with missing role data,
- project with Float warning,
- project with source-only/prod-only evidence,
- source trace links.

### Float Diagnostics

- Float overview,
- project trace,
- raw/cache/visible comparison,
- duplicate/manual Float candidates,
- inactive/archived Float warning,
- export compare empty,
- export compare with pasted sample,
- ambiguous match warning,
- dashboard-only rows missing from export.

### Chat

- closed state,
- open idle state,
- working/progress state,
- evidence/source trace visible,
- warning visible,
- confidence visible,
- `Needs Codex` visible.

## Named Scenario Screenshots

These are mandatory because they came from real client pain:

- LDN Q1 Design rollup,
- LDN Q1 Design Projects drilldown,
- LDN Q1 Design project detail after click,
- UCS04787 project detail and Float trace,
- UCS05186 duplicate/manual Float visibility,
- UCS04154 fee-sheet Float ID join evidence,
- PCS00250 cache-without-raw warning,
- USA00262 sold-hours guard,
- USA00323 sold-hours guard,
- TBC pipeline row identity,
- archived production revenue visibility,
- exact client drilldown.

## Viewports

Capture at least:

- desktop: 1440 x 1000,
- laptop: 1280 x 900,
- mobile: 390 x 844 for core pages only.

Core mobile pages:

- dashboard,
- Projects,
- project detail,
- Float diagnostics,
- chat.

## How To Capture

Preferred:

- deterministic Playwright with auth bypass and fixture/test DB.

Secondary:

- live authenticated Playwright when access is stable.

Fallback:

- manual browser screenshots, but still save with manifest entries.

## What Screenshots Must Not Do

- They must not become data approval.
- They must not justify preserving a broken data path.
- They must not hide known bugs.
- They must not replace source-to-contract tests.

## Acceptance

Phase 1 is not complete until:

- all required routes have screenshots or documented blockers,
- named Sian/Yunni scenarios have screenshots,
- manifest records commit, auth mode, data mode, and known issues,
- screenshots are referenced by `docs/UX_PARITY_REQUIREMENTS.md`.
