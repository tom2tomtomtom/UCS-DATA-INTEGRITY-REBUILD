# Go No-Go Readiness

## Current Status

Staging is deployed. Not ready for production cutover or stakeholder accuracy approval yet.

Ready to start Phase 10 source approval scaffolding and source readiness checks.

The doctrine foundation, staged Railway deployment, health checks, and acceptance report are in place. The next work is source approval and UI parity intake, not production launch.

## Ready To Start App Code When

### Documentation

- `AGENTS.md` and `CLAUDE.md` are current.
- Immutable laws are complete enough for Phase 0.
- Source contracts, identity policy, tolerance policy, staleness policy, warning lifecycle, mutation boundary, Supabase, Railway, and chat specs are pushed.
- Client requirements capture includes email/vault learning.

Status: done for current stage. Keep updating when Phase 9.5 and Phase 10 evidence lands.

### UI Reference

- Core screenshots are captured.
- Manifest records route, scope, state, old app commit, auth mode, data mode, and blockers.
- Remaining required route captures are either complete or explicitly deferred.

Status: waiting for Tom's full old-site UI UX design spec. This blocks UI parity approval, not source approval setup.

### Environment

- `.env.example` is committed.
- `.env.local` exists locally and is ignored.
- Old database credentials are treated as legacy comparison only.

Status: staging deployed with known source-stream gaps.

### Supabase

- New Supabase project or local/staging database decision is made.
- Old production DB is not the rebuild `DATABASE_URL`.
- If old DB is used, it is only `LEGACY_DATABASE_URL`.

Status: new Supabase project is in use for staging. Old database remains legacy comparison only.

### Railway

- Railway strategy is documented.
- Rebuild service exists in the `staging` environment.
- `production` remains intentionally empty.
- Rebuild uses a separate Railway service.

Status: staging deployed. No production cutover.

### Tests

- Initial law test files exist, even if pending.
- Fixture folder shape exists.
- CI skeleton exists.

Status: done through Phase 9. Next tests are Phase 10 source approval readiness and named evidence proof.

## No-Go Conditions

Do not start production cutover or stakeholder approval language if:

- source stream env is incomplete,
- source snapshots are missing,
- named scenario evidence is missing,
- UI UX spec has not been converted into parity rules,
- implementation would query legacy DB as product truth,
- implementation would make chat a second dashboard,
- source WARNs would be flattened into success language.

## First Build Task Once Ready

The next coding task should be Phase 10 source approval scaffolding:

1. complete staging env for Pipeline and Production Revenue sheet IDs,
2. run `npm run source:approval:readiness`,
3. build read-only source snapshot evidence,
4. generate named Sian/Jade/Yunni scenario pack,
5. keep production cutover blocked.

Do not start with production cutover or UI redesign.

## Current Go/No-Go

Go for Phase 10 source approval setup and Phase 9.5 UI spec intake.

No-go for production cutover, stakeholder accuracy approval, source-system mutation, scheduled sync, or UI redesign.
