# Phase 9.5 UI UX Parity Intake

Parent issue: `#83`

Implementation issue: `#84`

## Purpose

The rebuild must preserve the approved old-site UX while replacing the data plumbing underneath it. The UI spec Tom is collecting becomes the visual and workflow contract for stakeholder approval.

This phase is a waiting gate. It does not block Phase 10 source approval work that can run without the design spec, but it does block stakeholder UI approval and production cutover.

## Intake Contract

When the old-site UI UX spec arrives, convert it into:

- route and navigation parity rules,
- table, card, CSV, filter, tab, and drilldown parity rules,
- stakeholder workflows for Sian, Jade, and Yunni,
- screenshot reference requirements,
- Playwright workflow checks,
- preserve, improve, and forbid classifications.

## Classifications

### Preserve

Use this for signed-off behaviour that does not violate data law:

- current navigation shape,
- table granularity,
- filter surfaces,
- drilldown routes,
- stakeholder workflow order,
- CSV export affordances,
- diagnostic visibility already useful to Sian, Jade, or Yunni.

### Improve Carefully

Use this only when the change makes truth clearer without reducing function or granularity:

- labels that distinguish source WARN from dashboard FAIL,
- compact source traces,
- missing-data explanations,
- unsupported-source labels,
- visible scope chips or breadcrumbs when they prevent mistaken comparisons.

### Forbid

Do not preserve old behaviour if it violates the rebuild laws:

- hidden source rows,
- page-local recalculation,
- old selector output as truth,
- unsupported metrics shown as zero,
- pipeline or production revenue attributed to slices that cannot support it,
- chat claims without evidence,
- UI that lets a warning look like an approval.

## Required Proof

Before UI parity can pass:

- each approved old page has a screenshot reference,
- each named stakeholder workflow has a Playwright or fixture proof,
- each UI deviation has a reason and owner approval,
- each number shown in UI still comes from the display contract,
- source approval remains separate from UI approval.

## Current Status

Pending external input from Tom.

Allowed in the meantime:

- source approval readiness work,
- source snapshot planning,
- named evidence pack scaffolding,
- issue/ticket setup,
- non-UI docs and tests.

Blocked until spec arrives:

- UI redesign,
- final UI parity sign-off,
- stakeholder approval pack,
- production cutover.
