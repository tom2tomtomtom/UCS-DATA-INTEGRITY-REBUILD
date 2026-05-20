# ADR 0002: Rebuild Start Decisions

## Status

Accepted.

## Date

2026-05-20.

## Decisions

### 1. Supabase

Create a brand-new Supabase project/database for the rebuild.

The old dashboard database is legacy comparison evidence only. If used, it must be configured as `LEGACY_DATABASE_URL`, not as the rebuild `DATABASE_URL`.

### 2. First Data Mode

Start with fixtures and imported snapshots.

Do not start against live source pulls as the primary development mode.

Live read-only Google Sheets and Float probes come after the law tests, raw archive, parser contracts, and display contract are in place.

### 3. First Proof Slice

The first end-to-end proof slice is:

- LDN Q1 Design, for Sian's rollup-to-Projects concern,
- UCS04787 Float trace, for Yunni's Float-hours concern.

These become early golden scenarios.

### 4. UX

Maintain the current functionality and granularity.

Small improvements are allowed only when they make truth clearer:

- source trace,
- unsupported labels,
- warnings,
- row-type badges,
- scoped links,
- clearer Float raw/cache/visible evidence.

Do not redesign the product before the laws are executable.

### 5. Chat Timing

Build chat after the display contract exists.

Chat must not become a parallel source of truth.

### 6. Railway

Create Railway only after the app skeleton exists with:

- build command,
- health route,
- readiness route,
- env validation,
- mutation guard defaulting to read-only.

Use a separate Railway service for the rebuild.

## Consequences

- Phase 0 starts with scaffolding, fixtures, tests, and typed contracts.
- No UI pages yet.
- No live sync yet.
- No chat implementation yet.
- No Railway service yet.
- Supabase setup is the next infrastructure decision/action.
