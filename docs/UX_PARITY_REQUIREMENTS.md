# UX Parity Requirements

The rebuild should feel like the same dashboard to users, but with stricter truth underneath.

The visual reference set is defined in `docs/UI_SCREENSHOT_REFERENCE_PLAN.md`.

## Preserve

- dashboard home with top-line metrics,
- office/date controls,
- quick periods,
- department, role, month, and client rollups,
- Monthly Rollup as a working reconciliation view,
- Projects table,
- CSV export,
- project detail,
- Float tab,
- Data Quality,
- Approval/Readiness,
- chat panel.

## Improve Only For Truth

Allowed UX improvements:

- source trace under diagnostic answers,
- unsupported labels,
- warning badges,
- source-only row badges,
- clearer Float raw/cache/visible comparison,
- exact client drilldown,
- scoped back links,
- `Needs Codex` handoff.

Avoid:

- redesigning the product before the data laws are proven,
- landing pages,
- decorative UI work,
- moving controls in ways that slow Sian/Yunni workflows,
- hiding detail to make the page feel simpler.

## Required Click Paths

### Sian Q1 Design

1. Open dashboard.
2. Select LDN.
3. Select Q1.
4. Click Design rollup.
5. Projects page shows same scoped sold hours/revenue for supported metrics.
6. Pipeline/prod-rev are hidden or labelled unsupported if not attributable.
7. Clicking a project keeps scope on project detail.

### Sian Monthly Reconciliation

1. Open Monthly Rollup.
2. Select office/date scope.
3. See flags where source streams disagree.
4. Click a flagged month.
5. See Projects rows and source-only rows explaining the month.
6. Export CSV.
7. CSV matches visible rows for supported metrics.

### Yunni Float Trace

1. Open Float diagnostics.
2. Search project/job/Float ID.
3. See fee-sheet Float ID.
4. See raw Float project/task evidence.
5. See allocation cache evidence.
6. See visible dashboard row.
7. See raw/cache/visible classification.
8. See duplicate/manual candidates.

### CSV Export

1. Apply office/date/client/department/role scope.
2. Export CSV.
3. CSV row sum equals visible table footer for supported metrics.
4. Source-only rows retain row type.
5. Unsupported values export as unsupported or blank with reason, not zero.

### Chat

1. Ask "what errors can you see?"
2. Chat lists only evidence-backed checks.
3. Chat shows sources checked.
4. Chat shows confidence.
5. Chat marks unresolved conflicts.
6. Chat says `Needs Codex` for work requiring code/browser/sync/deploy.
