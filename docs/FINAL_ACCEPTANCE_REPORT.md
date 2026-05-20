# Final Acceptance Report

Issue: GitHub `#82`, P9-F.

Generated: 2026-05-21.

Launch status: STAGING DEPLOYED, SOURCE APPROVAL PENDING
Code and CI: PASS
Railway staging: PASS
Live health: PASS
Live readiness: PASS
Source approval: NOT APPROVED
Stakeholder approval: NOT APPROVED

This is a staging acceptance report, not a production cutover sign-off. The rebuild is deployed to a separate Railway staging service and the live health/readiness checks pass. Source-owner approval and stakeholder approval are still outstanding. Deployment evidence below is a verified snapshot taken when this report was generated, because GitHub auto-deploys from `main` can create a newer deployment after a documentation-only commit.

## Approval Split

| Gate | Status | Evidence |
|---|---|---|
| Code and CI | PASS | Commit `d15cbb2ef655830a4319e73fd5e763e7e4525e01`, CI run `26194024286` |
| Railway staging | PASS | Project `UCS Data Integrity Rebuild`, service `ucs-data-integrity-rebuild`, environment `staging` |
| Live deployment | PASS | Deployment `96d3cc9a-bba7-4519-a2cd-e88d7b969f28` |
| Live health | PASS | `/api/health` returns `status: ok`, `environment: staging`, commit `d15cbb2ef655830a4319e73fd5e763e7e4525e01` |
| Live readiness | PASS | `/api/readiness` returns `status: pass`, no blockers, no warnings |
| Dashboard shell | PASS | `/dashboard` returns HTTP 200 HTML |
| Source approval | NOT APPROVED | Source-owner review is after source snapshots and named scenario evidence |
| Stakeholder approval | NOT APPROVED | Sian, Jade, and Yunni have not approved the rebuild output |

The launch status must always separate deployed, healthy, source-approved, and stakeholder-approved. A green deployment is not the same as a source-approved dashboard.

## Live URLs

- Staging dashboard: `https://ucs-data-integrity-rebuild-staging.up.railway.app/dashboard`
- Health: `https://ucs-data-integrity-rebuild-staging.up.railway.app/api/health`
- Readiness: `https://ucs-data-integrity-rebuild-staging.up.railway.app/api/readiness`

No production domain has been cut over.

## Verified Evidence Snapshot

Verified app commit:

- `d15cbb2ef655830a4319e73fd5e763e7e4525e01` Record staging deployment acceptance

Green CI evidence:

- `26194024286`

Local gates run before deploy:

- `node scripts/railway-readiness-report.mjs`
- `npm run verify:phase9`

Railway target at verification time:

- project: `UCS Data Integrity Rebuild`
- service: `ucs-data-integrity-rebuild`
- environment: `staging`
- verified deployment: `96d3cc9a-bba7-4519-a2cd-e88d7b969f28`
- deploy source: GitHub auto-deploy from `main`
- deploy message: `Record staging deployment acceptance`

Runtime variables:

- `APP_ENV=staging`,
- `MUTATION_GUARD=read_only`,
- rebuild Supabase is the runtime database,
- legacy database is present only as `LEGACY_DATABASE_URL`,
- `NODE_ENV` and `DATABASE_URL_TEST` were not pushed from local `.env.local`,
- empty optional `PIPELINE_SHEET_ID` and `PRODUCTION_REVENUE_SHEET_ID` were not set as blank Railway variables.

Deterministic UI proof:

- `reference/ui/fixture-app/manifest.json`
- rollups, unsupported department scope, Projects row variants, exact client vs fuzzy search, project detail missing role allocation, Float diagnostics/export compare states, chat states, TBC pipeline identity, archived production revenue, and USA false-zero guards are represented in fixture screenshots.

Log check:

- deploy/runtime logs show the Next.js server started and is ready,
- no suspicious missing-env, database, exception, or runtime-failure lines were found,
- Railway logs include an npm warning line: `npm warn config production Use --omit=dev instead`. This is a non-blocking deploy warning, not an application health failure.

## Current Caveats

These caveats must go to any stakeholder report:

- This is staging only. Production cutover has not happened.
- Fixture screenshots prove UI states and laws, not live source correctness.
- Source approval is still outstanding. The four source streams must be checked through source snapshots and named scenario evidence before anyone calls the dashboard accurate.
- Stakeholder approval is still outstanding. Sian, Jade, and Yunni have not reviewed the rebuild against their live workflows.
- The old dashboard remains the rollback and reference surface until cutover approval.
- `PIPELINE_SHEET_ID` and `PRODUCTION_REVENUE_SHEET_ID` are not populated in staging yet, because local values were empty.

## Required Before Production Cutover

1. Run source snapshots against the four truth streams.
2. Run named Sian, Jade, and Yunni scenario evidence against staging.
3. Resolve or explicitly accept any source warnings.
4. Get source-owner approval.
5. Get stakeholder approval.
6. Cut over a production domain only after explicit approval.

## Do Not Claim

- Do not claim source approval from fixture screenshots.
- Do not claim stakeholder approval from CI or staging health checks.
- Do not claim production launch from staging deployment.
- Do not claim the old app has been replaced.
- Do not cut over the production domain without explicit approval.
