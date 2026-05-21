# Go No-Go Readiness

## Current Status

Staging is deployed. A read-only Phase 10 source snapshot artifact now exists locally. Not ready for production cutover or stakeholder accuracy approval yet.

Ready to continue Phase 10 named evidence classification and Phase 9.5 UI parity acceptance work.

The doctrine foundation, staged Railway deployment, health checks, acceptance report, and first source snapshot artifact are in place. The next work is source evidence classification, UI parity intake, and stakeholder review prep, not production launch.

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

Status: staging deployed. Required source stream env is present for Sold, Pipeline, Production Revenue, and Float.

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

Status: done through Phase 9. Artifact-backed Phase 10 source approval readiness has run. Named evidence proof still contains warnings.

## No-Go Conditions

Do not start production cutover or stakeholder approval language if:

- source stream env is incomplete,
- source snapshots are missing or stale,
- named scenario evidence is missing,
- UI UX spec has not been converted into parity rules,
- implementation would query legacy DB as product truth,
- implementation would make chat a second dashboard,
- source WARNs would be flattened into success language.

## First Build Task Once Ready

The next coding task should continue Phase 10 source approval:

1. classify the remaining warning scenarios from the source snapshot,
2. tie warning scenarios to display-contract rows where currently `not_checked`,
3. convert the old-site UI UX spec into executable parity tests,
4. prepare the stakeholder review pack without approval language,
5. keep production cutover blocked.

Do not start with production cutover or UI redesign.

## Current Go/No-Go

Go for Phase 10 warning classification and Phase 9.5 UI spec intake.

No-go for production cutover, stakeholder accuracy approval, source-system mutation, scheduled sync, or UI redesign.
