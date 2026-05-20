# Railway Deployment Strategy

## Purpose

The rebuild must deploy to Railway without touching or replacing the old dashboard until cutover is approved.

Railway setup is part of the product safety system, not a last-mile detail.

## Current CLI State

Railway CLI is installed and authenticated locally.

Do not assume the CLI is linked to the correct project. Always verify before deploying or changing variables.

## Deployment Principle

Create a separate Railway project/service for the rebuild.

Do not deploy the rebuild into the old UCS dashboard Railway service.

Do not reuse old production environment variables blindly.

## Environments

Required Railway environments:

| Environment | Purpose | Data |
|---|---|---|
| staging | dual-run, stakeholder QA, screenshot proof | new Supabase staging, optional read-only legacy DB |
| production | final cutover | new Supabase production |

Optional:

- preview environments for pull requests once CI exists.

## Service Naming

Recommended:

- Project: `UCS Data Integrity Rebuild`
- Service: `ucs-data-integrity-rebuild`
- Staging domain: Railway-generated until QA is ready
- Production domain: only assigned after cutover approval

## When To Create Railway Project

Do not create or deploy a Railway service before:

- app skeleton exists,
- build command exists,
- health route exists,
- `.env.example` is current,
- new Supabase decision is made,
- CI at least runs tests/build,
- mutation guard defaults to read-only.

## Build Strategy

Preferred initial deployment:

- Next.js standalone build,
- Dockerfile or Railway Railpack, chosen explicitly before deployment,
- Node version pinned,
- build uses only public env vars at build time,
- server secrets are runtime only.

The old app used a Dockerfile with Node alpine and Next standalone. That can be referenced, but not copied blindly.

## Required App Routes Before Railway Deploy

Before first deploy:

- `/api/health` returns app/version status,
- `/api/readiness` checks database connection and required env presence without exposing secrets,
- `/dashboard` can render a safe shell or fixture-backed view,
- error page does not leak secrets.

## Environment Variables

Railway variables must be set per environment.

Required from `.env.example`:

- `APP_ENV`
- `MUTATION_GUARD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `GOOGLE_SERVICE_ACCOUNT_KEY`
- `FEE_TRACKER_SPREADSHEET_ID`
- `FLOAT_API_KEY`
- `ANTHROPIC_API_KEY`
- `CRON_SECRET`

Optional:

- `LEGACY_DATABASE_URL`, staging only and read-only if possible.
- `PIPELINE_SHEET_ID`
- `PRODUCTION_REVENUE_SHEET_ID`

Rules:

- production `DATABASE_URL` points to new Supabase production,
- staging `DATABASE_URL` points to new Supabase staging,
- old DB goes only in `LEGACY_DATABASE_URL`,
- `MUTATION_GUARD=read_only` until mutation features are explicitly built and tested,
- never paste secrets into docs or commits.

## Scheduled Jobs

No scheduled sync should exist at first deploy.

Scheduled source pulls are allowed only after:

- raw source archive exists,
- source staleness policy is implemented,
- sync can run without mutating source systems,
- sync status is visible in the dashboard,
- failures cannot erase current facts.

If built, scheduled sync should be explicit:

- separate job or protected endpoint,
- `CRON_SECRET`,
- logs source batch ID,
- never triggered by chat or integrity tests as a side effect.

## Deployment Gates

Before staging deploy:

```bash
npm test
npm run build
```

Once tests exist, staging deploy also requires:

```bash
npm run verify
npm run e2e
```

Before production deploy:

- all law tests pass,
- deterministic UI tests pass,
- in-dashboard integrity tests pass,
- Sian/Yunni/Jade named scenarios pass,
- dual-run differences are classified,
- old app URL remains available for rollback/reference,
- Railway deployment commit matches local `main`.

## Verification After Deploy

After every Railway deploy, verify:

- deployment status is success,
- commit hash matches local commit,
- `/api/health` passes,
- `/api/readiness` passes,
- dashboard shell loads,
- no server logs show missing env or database errors,
- app is using the intended Supabase URL.

## Rollback And Cutover

Before cutover:

- keep old app live,
- new app uses separate Railway domain,
- compare old vs new through dual run,
- classify differences,
- do not switch production domain until approval gates pass.

Rollback plan:

- old app remains unchanged,
- production domain can remain pointed at old app until final cutover,
- new app deployment can be rolled back independently.

## Do Not Do

- Do not link this repo to the old Railway project by accident.
- Do not deploy to old UCS dashboard service.
- Do not set old production DB as new `DATABASE_URL`.
- Do not run migrations from Railway against the old Supabase DB.
- Do not create scheduled sync before raw source archive exists.
- Do not call Railway success the same as data correctness.
