# Warning Lifecycle Policy

## Purpose

Warnings are product evidence. They cannot become noise, and they cannot be hidden just because they are uncomfortable.

## Warning States

Allowed states:

- `open`,
- `acknowledged`,
- `source_fixed_pending_refresh`,
- `resolved_by_source`,
- `resolved_by_code`,
- `wont_fix_source_limitation`,
- `superseded`.

Forbidden states:

- hidden,
- dismissed_without_trace,
- auto_resolved_without_evidence.

## State Meanings

`open`:

- active issue, visible in product.

`acknowledged`:

- human has seen it, but it remains visible and counted.

`source_fixed_pending_refresh`:

- human says source was fixed, app needs a fresh pull/parse.

`resolved_by_source`:

- fresh source evidence proves the warning no longer applies.

`resolved_by_code`:

- tests prove dashboard/parser/contract bug fixed.

`wont_fix_source_limitation`:

- the source cannot support the requested metric. Product must show unsupported.

`superseded`:

- replaced by a newer warning with trace.

## Rules

- Acknowledgement is not resolution.
- Archive is not resolution.
- Dismiss is not resolution.
- A warning can be hidden from default view only if a filter clearly says acknowledged/resolved items are hidden.
- Every warning keeps source refs, owner, scope, first seen, last seen, status, and resolution evidence.

## Source Ownership

Default owners:

- Pipeline: Jade,
- Production Revenue: Jade or production owner,
- Fee tracker: Yunni or project owner,
- Fee sheet: project owner or preparer,
- Float: Yunni/resourcing,
- Dashboard code: Tom/Codex.

Owner is evidence routing, not blame.

## Required Tests

- acknowledged warning remains traceable,
- source-fixed warning does not resolve until fresh parse,
- archived row warning remains visible in diagnostics,
- unsupported source limitation remains visible as unsupported,
- resolved warning stores resolution evidence.
