# Go No-Go Readiness

## Current Status

Not ready to build app code yet.

The doctrine foundation is pushed, env is migrated locally, and initial UI screenshots exist. The remaining work is small but important: finish the reference capture, make Supabase/Railway decisions, and turn the laws into the first pending tests.

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

Status: done locally, pending new Supabase decision.

### Supabase

- New Supabase project or local/staging database decision is made.
- Old production DB is not the rebuild `DATABASE_URL`.
- If old DB is used, it is only `LEGACY_DATABASE_URL`.

Status: not done.

### Railway

- Railway strategy is documented.
- No service is created until app skeleton, health route, readiness route, and build exist.
- Rebuild will use a separate Railway service.

Status: documented, not created.

### Tests

- Initial law test files exist, even if pending.
- Fixture folder shape exists.
- CI skeleton exists.

Status: not done.

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
