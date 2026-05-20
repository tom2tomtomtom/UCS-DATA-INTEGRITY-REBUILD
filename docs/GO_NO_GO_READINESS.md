# Go No-Go Readiness

## Current Status

Not ready to build product UI yet.

Ready to start Phase 0 scaffolding once this ADR is pushed.

The doctrine foundation is pushed, env is migrated locally, initial UI screenshots exist, and the key product/infrastructure decisions are now made. The next work is not product UI. It is test and contract scaffolding.

## Ready To Start App Code When

### Documentation

- `AGENTS.md` and `CLAUDE.md` are current.
- Immutable laws are complete enough for Phase 0.
- Source contracts, identity policy, tolerance policy, staleness policy, warning lifecycle, mutation boundary, Supabase, Railway, and chat specs are pushed.
- Client requirements capture includes email/vault learning.

Status: mostly done.

### UI Reference

- Core screenshots are captured.
- Manifest records route, scope, state, old app commit, auth mode, data mode, and blockers.
- Remaining required route captures are either complete or explicitly deferred.

Status: in progress.

### Environment

- `.env.example` is committed.
- `.env.local` exists locally and is ignored.
- Old database credentials are treated as legacy comparison only.

Status: done locally.

### Supabase

- New Supabase project or local/staging database decision is made.
- Old production DB is not the rebuild `DATABASE_URL`.
- If old DB is used, it is only `LEGACY_DATABASE_URL`.

Status: decision made. New Supabase project/database required before real app data work.

### Railway

- Railway strategy is documented.
- No service is created until app skeleton, health route, readiness route, and build exist.
- Rebuild will use a separate Railway service.

Status: decision made. Create only after app skeleton, health route, readiness route, and build exist.

### Tests

- Initial law test files exist, even if pending.
- Fixture folder shape exists.
- CI skeleton exists.

Status: not done. This is the next required work.

## No-Go Conditions

Do not start product implementation if:

- no new Supabase decision exists,
- tests do not exist for the law being implemented,
- screenshots/UX reference are missing for the surface being rebuilt,
- implementation would copy old selectors,
- implementation would query legacy DB as product truth,
- implementation would make chat a second dashboard.

## First Build Task Once Ready

The first coding task should be Phase 0 test scaffolding:

1. package/test setup,
2. fixture folders,
3. pending law tests,
4. CI skeleton,
5. typed `DashboardScope`,
6. empty `buildDashboardDisplayContract` interface.

Do not start with UI pages.

## Current Go/No-Go

Go for Phase 0 scaffolding.

No-go for product UI, live source sync, chat implementation, Railway deploy, or production data migration.
