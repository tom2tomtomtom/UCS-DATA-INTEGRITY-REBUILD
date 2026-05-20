# Environment And Supabase Strategy

## Purpose

The rebuild needs the old credentials locally, but must not accidentally mutate or depend on the old production data model.

This document defines how environment variables and Supabase should be handled.

## Local Environment Migration

The old app currently uses these env names:

```txt
ANTHROPIC_API_KEY
CRON_SECRET
DATABASE_URL
FEE_TRACKER_SPREADSHEET_ID
FLOAT_API_KEY
GOOGLE_SERVICE_ACCOUNT_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

The rebuild repo includes `.env.example` with the old names plus rebuild-specific names.

Rules:

- real `.env` and `.env.local` files are local only,
- never commit secrets,
- `.gitignore` must ignore `.env` and `.env.*`,
- `.env.example` contains names only,
- local env migration is a copy step, not a code commit.

Recommended local setup:

```bash
cp /Users/tommyhyde/ucs-commercial-dashboard/.env /Users/tommyhyde/UCS-DATA-INTEGRITY-REBUILD/.env.local
```

Then review `.env.local` before running code:

- current `DATABASE_URL` points at the old dashboard database,
- for rebuild app work, replace it with the new rebuild database,
- if old DB comparison is needed, move the old value to `LEGACY_DATABASE_URL`.

## Supabase Decision

Use a separate Supabase database/project for the rebuild.

Do not build the new app directly on the old production schema.

Reason:

- the old schema reflects old assumptions,
- the rebuild needs raw source archive tables,
- old tables can create accidental authority paths,
- test fixtures and law checks need isolated data,
- source preservation needs append/supersede semantics from the start.

## Supabase Environments

Minimum environments:

| Environment | Purpose | Data |
|---|---|---|
| local | developer work | fixtures and local snapshots |
| test | automated tests | deterministic fixtures |
| staging | dual-run against real snapshots | read-only source pulls or imported snapshots |
| production | final dashboard | approved source archive and display contract |

Rules:

- tests do not run against production,
- staging can compare to old production through `LEGACY_DATABASE_URL`,
- production does not depend on old DB tables,
- local can use old secrets only for read-only probes.

## Old Supabase Database

The old Supabase database is legacy comparison evidence, not rebuild truth.

Allowed uses:

- inspect old app output,
- compare old vs new during dual run,
- extract source snapshots,
- migrate users if required,
- preserve historical context.

Forbidden uses:

- reuse old selector output as truth,
- write rebuild facts into old tables,
- make new display contract query old dashboard aggregate tables,
- keep old `float_allocations` cache as canonical,
- rely on old pipeline mirror as canonical.

## New Supabase Schema Shape

The new schema should start with law-aligned tables.

Core tables:

```txt
source_batches
raw_source_rows
parsed_facts
source_conflicts
display_contract_snapshots
warning_events
user_overlays
audit_log
```

Stream-specific fact tables may be added only if they preserve raw row IDs and do not become private display authorities.

## Migration Approach

### Phase 1: Schema From Laws

Create migrations from the immutable laws, not from the old database.

Start with:

- raw source archive,
- parsed fact model,
- warning lifecycle,
- user overlay model,
- audit log.

### Phase 2: Import Fixtures

Seed deterministic fixtures:

- law fixtures,
- named Sian/Yunni scenarios,
- redacted real-shape fixtures.

### Phase 3: Import Snapshots

Import source snapshots from old app or direct sources.

Rules:

- imported old data is labelled as imported,
- old cache tables are treated as cache evidence,
- old raw/source rows are preferred where available,
- missing raw evidence is a warning, not truth.

### Phase 4: Dual Run

New app reads new schema.

Old app is compared through `LEGACY_DATABASE_URL` or exported files.

Differences are classified:

- old bug,
- new bug,
- source issue,
- intentional behavior change,
- unresolved.

## Credentials

Use separate keys per environment.

Rules:

- `SUPABASE_SERVICE_ROLE_KEY` is server-only,
- never expose service role to browser,
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` can be browser-visible but RLS must protect data,
- Google and Float keys stay server-side,
- live source probes are read-only.

## RLS And Permissions

RLS should exist from the first production migration.

Minimum roles:

- viewer,
- finance reviewer,
- data owner,
- admin.

Rules:

- viewers inspect,
- data owners acknowledge warnings,
- admins can trigger explicit sync if built,
- nobody mutates source systems from diagnostics,
- archive is dashboard overlay only.

## Open Supabase Decisions

Decide before app code:

1. New Supabase project name and owner.
2. Whether raw source JSON lives fully in Postgres or large payloads go to storage with indexed metadata.
3. Whether staging uses live source pulls or imported snapshots only.
4. How users are migrated from old dashboard.
5. Whether old production DB gets a read-only credential for dual run.

## Immediate Local Action

For now:

- copy old `.env` to `.env.local`,
- keep it ignored by git,
- create `.env.example`,
- use old DB only as legacy comparison until the new schema exists,
- do not run migrations against old Supabase from this repo.
