# Security, Permissions, And Mutation Boundary

## Purpose

The rebuild must be trusted with sensitive source access while remaining safe. Most dashboard features are read-only. Mutations must be explicit, authorised, and isolated.

## Source Access

Google Sheets:

- read-only by default,
- service account or OAuth scopes must be documented,
- no write scope unless a separate ADR approves it.

Float:

- read-only API access by default,
- no archive/edit/write calls from dashboard diagnostics,
- no automatic correction in Float.

Database:

- raw source rows are immutable,
- parsed facts are append/supersede,
- user overlays can mutate only overlay tables.

## Mutation Boundary

Allowed product mutations:

- dashboard-only archive overlay,
- warning acknowledgement,
- saved view/filter preference,
- admin-triggered sync if explicitly built and permissioned.

Forbidden side effects:

- integrity test starts sync,
- chat starts sync,
- chat archives project,
- export compare writes mappings,
- Float diagnostic changes Float,
- parser silently rewrites source identity,
- source warning resolution without fresh evidence.

## Roles

Minimum roles:

- viewer,
- finance reviewer,
- data owner,
- admin.

Rules:

- viewers can inspect,
- data owners can acknowledge warnings,
- admins can trigger sync if built,
- only authorised roles can use dashboard archive overlay,
- no role can mutate source systems from diagnostic features.

## Audit Log

Every mutation must log:

- actor,
- timestamp,
- action,
- before value,
- after value,
- reason,
- affected source refs or display row refs.

## Required Tests

- chat cannot call mutation tools,
- integrity tests cannot write,
- archive overlay does not change source facts,
- warning acknowledgement does not resolve warning,
- export compare is read-only,
- unauthorised user cannot mutate overlays.
