# UI Parity Acceptance Checklist

Parent issue: `#83`

Use this checklist when implementing or reviewing Phase 9.5. A page does not pass because it looks similar. It passes when the same stakeholder workflow works, the same controls exist, and every number still comes from the display contract.

Recognisable UX passes. Pixel-perfect copying is not required. Loss of current functionality or granularity fails.

Data-access granularity is mandatory. Removing drilldown paths, row evidence, CSV detail, task/person traces, or source-warning evidence fails even if the page looks cleaner.

## Global Chrome

- [ ] two-row persistent header exists,
- [ ] office toggles support `All`, `LDN`, `UCX`, `USA`, and lawful combined scopes,
- [ ] combined office scopes use `offices=LDN,UCX`, not a lossy single `office` value,
- [ ] Clear all filters state is visible and disabled when inactive,
- [ ] user email and synced project count are visible,
- [ ] Sync Now has idle and syncing states,
- [ ] Ask AI toggles chat assistant,
- [ ] primary and admin nav routes match the legacy route set,
- [ ] active page state is visible,
- [ ] Data Quality badge is evidence-backed.

## Banners

- [ ] sync issues alert appears when sync warnings exist,
- [ ] sync issues alert links to Sync Audit,
- [ ] sync issues alert can be dismissed without hiding underlying evidence,
- [ ] exchange-rate warning appears when fallback rates are active,
- [ ] exchange-rate warning is not dismissible.

## Department Rollup

- [ ] approval state card exists,
- [ ] data freshness card exists,
- [ ] Sheet Health panel has three collapsible warning groups,
- [ ] source-warning rows still surface,
- [ ] Sold vs Allocated description names the four truth streams,
- [ ] view toggles support department, month, role, and client,
- [ ] quick, month, and custom date controls update URL scope,
- [ ] KPI cards show Total Sold, Confidence, and Data Coverage,
- [ ] Float Sync Warnings card links to source detail,
- [ ] lower-than-Float explanation expands,
- [ ] department chart preserves sold and allocated bars,
- [ ] rollup table columns match the spec,
- [ ] rollup default sort state and header sort toggles are explicit,
- [ ] rollup footer totals equal visible rows for supported metrics,
- [ ] rollup CSV equals visible rows for supported metrics,
- [ ] rollup row links preserve scope into Projects,
- [ ] unsupported slice values are labelled, not shown as zero.

## Projects

- [ ] list and calendar toggles exist,
- [ ] calendar empty state is preserved until backed by data,
- [ ] Download CSV exists,
- [ ] search filters rows by job number or client name,
- [ ] quick, month, and custom date controls preserve scope,
- [ ] Add filter control exists,
- [ ] Add filter exposes only display-contract-backed fields,
- [ ] Float orphan and project bulk action bars exist or are explicitly unavailable under mutation guard,
- [ ] Projects table columns match the spec,
- [ ] Projects default sort is `SOLD (FEE SHEET)` descending unless URL state overrides it,
- [ ] sortable headers toggle ascending and descending state,
- [ ] table supports horizontal scroll,
- [ ] footer totals equal visible rows for supported metrics,
- [ ] CSV equals visible rows for supported metrics,
- [ ] row click preserves scope into project detail.
- [ ] Calendar empty state includes the Breakdown section with department, month, role, and client toggles.

## Project Detail

- [ ] back link preserves Projects scope,
- [ ] title and subtitle match legacy pattern,
- [ ] sync badge is visible,
- [ ] date controls exist,
- [ ] six KPI cards exist with source notes,
- [ ] unsupported KPI values are labelled, not shown as zero,
- [ ] monthly table columns match the spec,
- [ ] Profitability by Role table exists,
- [ ] role row expansion exists when allocation evidence exists,
- [ ] Float Trace section exists,
- [ ] Float Trace columns match the spec,
- [ ] task/person/date/hour flags are source-traceable.

## Stakeholder Workflows

- [ ] Sian LDN Q1 Design rollup to Projects to project detail to CSV is proven,
- [ ] Yunni Float warning to Float tab to Project Detail Float Trace to Export Compare is proven,
- [ ] Jade Pipeline or TBC row to rollup to Projects to source evidence is proven.

## Chat

- [ ] chat closed state exists,
- [ ] chat open idle state exists,
- [ ] chat working/progress signal exists,
- [ ] chat evidence trace is visible,
- [ ] chat warnings and confidence are visible,
- [ ] chat error state exists,
- [ ] `Needs Codex` handoff is visible when evidence is incomplete or work requires repo/browser/sync/deploy.

## Other Routes

- [ ] Float route exists,
- [ ] Approval Audit route exists,
- [ ] Data Quality route exists,
- [ ] Glossary route exists,
- [ ] Sync Audit route exists or has an explicit blocked route decision,
- [ ] Sync Warnings route exists or has an explicit blocked route decision,
- [ ] Capacity Reduced route exists or has an explicit blocked route decision,
- [ ] Users route exists or has an explicit blocked route decision.
- [ ] Float route includes raw/cache/visible, duplicate/manual, inactive/archive, and export compare states or blockers.
- [ ] Data Quality route includes issue tabs, source-only rows, named checks, and scoped links or blockers.
- [ ] Approval Audit route keeps source approval separate from stakeholder approval.
- [ ] Sync Audit route links from sync issue banner and uses evidence-generated text.
- [ ] Sync Warnings route supports source and severity review.
- [ ] Capacity Reduced route separates time-off/capacity from project booked hours.
- [ ] Users mutation controls respect mutation guard.

## Visual System

- [ ] typography uses small labels and bold numeric values,
- [ ] color semantics match the spec,
- [ ] active controls use dark filled state,
- [ ] warnings use amber, red, or pink consistently,
- [ ] status badges preserve OK, Over, Gap, and Alert categories,
- [ ] dense operational layout is preserved,
- [ ] small improvements make truth clearer without reducing functionality or granularity,
- [ ] data-access granularity is preserved from summary to source evidence,
- [ ] no marketing page, hero page, or decorative redesign is introduced.

## Stop Conditions

- [ ] any page-local business calculation is a fail,
- [ ] reduced data-access granularity is a fail,
- [ ] old selector output as truth is a fail,
- [ ] unsupported metrics displayed as zero are a fail,
- [ ] hidden source rows are a fail,
- [ ] fuzzy search used for exact client drilldown is a fail,
- [ ] chat claims without evidence are a fail,
- [ ] Sync Now and archive actions must be disabled, unavailable, or explicit handoff while mutation guard is read-only,
- [ ] `All sources fresh` must be evidence-backed,
- [ ] archived real source rows must still surface where immutable laws require them,
- [ ] old behaviour that violates immutable laws is not preserved.
