# ADR 0001: Clean Rebuild Around Immutable Data Laws

## Status

Accepted.

## Context

The existing UCS Commercial Dashboard proved the product need but accumulated too many authority paths:

- source sync tables,
- direct sheet readers,
- old selectors,
- new selectors,
- cache tables,
- page-local row builders,
- CSV builders,
- chat tools,
- approval scripts,
- diagnostic scripts.

This caused repeated whackamole. One surface could be fixed while another still answered from an older path.

The business requirement is stricter than a normal dashboard:

- every source row must surface,
- contradictions must remain visible,
- unsupported must not look like zero,
- Float raw/cache/visible layers must stay separate,
- UI/export/chat/verification must agree.

## Decision

Build a clean rebuild in this repo around immutable laws and one display contract.

The same UX is preserved, but old implementation authority is not.

The display contract becomes the only official product answer for dashboard numbers.

## Consequences

Positive:

- fewer hidden authority paths,
- testable data laws,
- source trace for every number,
- clearer chat boundaries,
- safer Sian/Yunni/Jade acceptance.

Negative:

- slower upfront build,
- more fixtures and tests before UI,
- some old code cannot be reused,
- messy source problems remain visible rather than cosmetically solved.

## Non-Goals

- Clean the source systems automatically.
- Hide source-only rows.
- Replace human source ownership.
- Make warnings disappear.
- Redesign the UX before data laws are proven.
