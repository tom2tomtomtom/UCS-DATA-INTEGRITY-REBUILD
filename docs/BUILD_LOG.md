# Build Log

This is the durable checkpoint log for the rebuild.

The controller updates this whenever a ticket completes, an agent reports back, a gate fails, or the next action changes.

## 2026-05-20

### Checkpoint: Phase 8 Schema Law Gate Added

Phase: 8

Ticket: `#71`

Status: implemented, local verification passed

What changed:

- added a pure schema law validator for the rebuild Supabase schema,
- added the initial integrity schema migration artifact without applying it remotely,
- created law-aligned tables for source batches, raw rows, parsed facts, conflicts, display snapshots, warning events, user overlays, and audit log,
- enabled RLS on all public app tables and revoked table access from `anon` and `authenticated`,
- added database-level update and delete guards for `raw_source_rows`,
- constrained `read_only_sql` facts to diagnostic-only evidence,
- added a Phase 8 verifier to keep schema and legacy-cache boundaries executable.

Verification:

- read the linked rebuild public schema with `supabase db dump --linked --schema public --file /tmp/ucs-rebuild-public-schema.sql`,
- confirmed no app tables existed before the migration artifact,
- `npm test -- tests/schema/schema-law-gate.test.ts tests/schema/phase8-verifier.test.ts` passed,
- `npm test` passed with 49 files passed, 15 skipped, 160 tests passed, and 79 todo,
- `npm run typecheck` passed,
- `node scripts/verify-phase8.mjs` passed,
- `npm run verify:phase8` passed, including Next build,
- staged secret scan found no supplied Supabase or source credentials in changed files.

Process notes:

- the migration has not been applied to remote Supabase in this ticket,
- old dashboard DB remains comparison evidence only,
- the remote public schema currently includes a pre-existing public `rls_auto_enable` SECURITY DEFINER helper and broad default privileges. This ticket does not mutate that remote posture, but the migration revokes defaults for new app tables and keeps the new immutability helper in `app_private`.

Next action:

- commit and push P8-B,
- close ticket `#71`,
- start `#72` read-only source snapshot import using the new schema law as the boundary.

### Checkpoint: Read-only Source Snapshot Import Added

Phase: 8

Ticket: `#72`

Status: implemented, local verification passed

What changed:

- added a read-only snapshot import planner that turns snapshot files into source batches, raw source rows, skipped rows, and a dry-run report,
- added deterministic raw row IDs and content hashes for imported snapshot evidence,
- kept skipped rows constrained to literally empty rows through the existing source row classifier,
- labelled legacy cache imports as `legacy_cache_imported_as_evidence_only`,
- added a redacted snapshot fixture covering fee sheet, pipeline, Float, and old cache evidence rows,
- added a dry-run source import script that emits classified counts without printing raw source payloads,
- extended the Phase 8 verifier to protect source import files from live source calls, Supabase clients, SQL writes, and migration execution.

Verification:

- `npm test -- tests/source-import/snapshot-import.test.ts tests/source-import/phase8-source-import-verifier.test.ts` passed,
- `npm run typecheck` passed,
- `node scripts/verify-phase8.mjs` passed,
- `npm test` passed with 51 files passed, 15 skipped, 165 tests passed, and 79 todo,
- `npm run typecheck` passed again after the full suite,
- `node scripts/verify-phase8.mjs` passed again after the full suite,
- prior P8-B GitHub CI run `26178292449` completed successfully.

Process notes:

- the importer does not call Google, Float, Supabase, or the old dashboard DB,
- the importer does not apply migrations or write database rows,
- the dry-run report is a classification report only. It is not display truth.

Next action:

- run `npm run verify:phase8`,
- commit and push P8-C,
- close ticket `#72`,
- start `#73` old vs new vs source dual-run comparator.

### Checkpoint: Dual-run Comparator Added

Phase: 8

Ticket: `#73`

Status: implemented, local verification passed

What changed:

- added a dual-run comparator for source snapshot, new display contract, and old dashboard comparison evidence,
- kept the old dashboard lane explicitly `comparisonOnly`,
- classified differences as `old_bug`, `new_bug`, `source_issue`, `intentional_change`, or `unresolved`,
- added row-level `comparisonKey` checks so hidden source rows cannot be masked by matching totals,
- added lane scope validation to block full-year or full-project evidence being compared against a scoped dashboard view,
- kept source warnings surfaced even when the numeric values match or when the old dashboard also differs,
- added a CLI comparator report that omits raw source refs and raw payloads.

Verification:

- `npm test -- tests/dual-run/dual-run-compare.test.ts` passed,
- `npm run typecheck` passed,
- `npm test -- tests/dual-run/phase8-dual-run-verifier.test.ts` passed,
- `node scripts/dual-run-compare.mjs fixtures/dual-run/p8d-basic.json` produced classified `old_bug` and `source_issue` rows without raw refs,
- `node scripts/verify-phase8.mjs` passed,
- `npm run verify:phase8` passed with 53 files passed, 15 skipped, 176 tests passed, 79 todo, typecheck, Next build, and Phase 8 verifier.

Process notes:

- a read-only sidecar review found missing hidden-row, source-warning, lane-scope, output-redaction, and TS/CLI parity concerns before commit,
- those concerns were converted into tests and implementation changes before this checkpoint,
- old dashboard output remains comparison evidence only and cannot be accepted as product truth by this comparator.

Next action:

- commit and push P8-D,
- close ticket `#73`,
- start `#74` named Sian/Yunni/Jade scenario report.

### Checkpoint: Named Scenario Report Added

Phase: 8

Ticket: `#74`

Status: implemented, local verification passed

What changed:

- added a stakeholder-safe named scenario report for the Gate 5 Sian/Yunni/Jade checks,
- covered LDN Q1 Design, UCS04787, UCS05186, UCS04154, PCS00250, USA00262, USA00323, BT raw-without-cache, TBC pipeline identity, archived production revenue, and exact client drilldown,
- classified each scenario as pass or warning with explicit owner, evidence checks, and next human action where needed,
- kept the report free of raw source refs and raw payloads,
- added a script for producing the report as JSON,
- extended the Phase 8 verifier so named scenarios remain part of the gate.

Verification:

- `npm test -- tests/scenarios/named-scenario-report.test.ts tests/scenarios/phase8-named-scenario-verifier.test.ts` passed,
- `npm run typecheck` passed,
- `node scripts/verify-phase8.mjs` passed,
- `npm run verify:phase8` passed with 55 files passed, 15 skipped, 181 tests passed, 79 todo, typecheck, Next build, and Phase 8 verifier.

Process notes:

- the report status is `warn`, not `pass`, because known Float/cache source warnings remain visible by design,
- the report has zero `fail` scenarios and no `new_code_bug` scenarios,
- this is deterministic scenario evidence, not live source approval.

Next action:

- commit and push P8-E,
- close ticket `#74`,
- start `#75` real-data UI screenshot and click proof.

### Checkpoint: UI Screenshot And Click Proof Added

Phase: 8

Ticket: `#75`

Status: implemented, browser proof recorded, local verification passed

What changed:

- added a deterministic UI proof manifest for dashboard home, Projects drilldown, project detail, Float diagnostics, Data Quality, Approval Audit, and chat evidence,
- added a manifest CLI that emits stakeholder-safe JSON and never includes raw source refs, raw payloads, or secrets,
- extended the Phase 8 verifier so the UI proof gate cannot drift out of the lockdown,
- found a real Sian-style UI/data contract leak during browser testing: department-scoped Projects rows showed Pipeline and Production Revenue as `£0` while the footer correctly said `Unsupported`,
- fixed the display contract so unsupported scoped metrics propagate into visible rows and CSV rows, not just footer totals.

Browser proof recorded:

- `http://localhost:3030/dashboard?office=LDN&from=2026-01-01&to=2026-03-31` rendered dashboard home and the Design rollup link,
- clicking Design opened `/dashboard/projects?office=LDN&from=2026-01-01&to=2026-03-31&department=Design`,
- Projects row and CSV now show Pipeline and Production Revenue as `Unsupported`, not `£0`,
- clicking UCS04787 opened `/dashboard/projects/UCS04787?office=LDN&from=2026-01-01&to=2026-03-31&department=Design&jobNumber=UCS04787`,
- project detail preserved scope and showed `FLOAT_VISIBLE_CACHE_MISSING_CACHE`,
- Float diagnostics showed PCS00250, BT raw/cache, UCS05186 duplicate/manual, and inactive/archive evidence,
- Data Quality showed named checks and `Needs Codex`,
- Approval Audit showed source trace and source-only law language,
- chat evidence route showed sources checked, warnings, confidence, and `Needs Codex`.

Screenshot artifacts:

- Playwright MCP screenshots were captured as `p8f-dashboard-home-final.png`, `p8f-projects-design-drilldown-fixed.png`, `p8f-project-detail-ucs04787-final.png`, `p8f-float-diagnostics-final.png`, `p8f-data-quality-final.png`, `p8f-approval-audit-final.png`, and `p8f-chat-evidence-final.png`,
- local ignored manifest written to `test-results/ui-proof/p8f/manifest.json`.

Verification so far:

- `npm test -- tests/ui/ui-proof-manifest.test.ts` passed after red-green,
- `npm test -- tests/ui/phase8-ui-proof-verifier.test.ts` passed after red-green,
- `npm test -- tests/display/display-totalling-laws.test.ts` passed after red-green for unsupported row and CSV propagation,
- `npm test -- tests/ui/projects-page.test.ts tests/ui/csv-export.test.ts` passed,
- `npm run verify:phase8` passed with 57 files passed, 15 skipped, 187 tests passed, 79 todo, typecheck, Next build, and Phase 8 verifier.

Process notes:

- this is deterministic fixture UI proof, not authenticated live source approval,
- it still materially caught and fixed a real dashboard display-contract bug,
- screenshots are not committed because UI proof artifacts can carry sensitive rendered data.

Next action:

- stage, secret-scan, commit, push,
- close ticket `#75` only after CI passes.

### Checkpoint: Phase 8 Verification Gate Started

Phase: 8

Ticket: `#76`

Status: build gate blocker fixed, doctrine review blocked only on commit and CI

What changed:

- found that `npm run build` still pointed at `verify:phase7`,
- wrote a failing Phase 8 verifier test for the active build gate,
- rewired `npm run build` to `npm run verify:phase8`,
- updated `scripts/verify-phase8.mjs` so the build script cannot drift back to an older phase gate,
- relaxed the Phase 7 verifier test so Phase 7 remains replayable without claiming current build ownership.

Read-only doctrine sweep so far:

- tracked secret scan for the known Supabase/Float secret prefixes returned no hits,
- old dashboard terms appear only in forbidden-path verifiers, law docs, or comparison-only import planning,
- no source mutation, sync, deploy, or destructive DB action was run,
- no live source API pull was run,
- old database output remains comparison evidence only.

Verification so far:

- `npm test -- tests/schema/phase8-verifier.test.ts tests/chat/phase7-verifier.test.ts` failed first because `build` still pointed at Phase 7,
- after the fix, the same focused test passed with 2 files passed and 4 tests passed,
- `npm run build` passed and showed `build` delegating to `verify:phase8`,
- `npm run build` passed with 57 files passed, 15 skipped, 187 tests passed, 79 todo, typecheck, Next build, and Phase 8 verifier.

Doctrine steward review:

- returned `BLOCKED` because the build-gate fix was still uncommitted at review time,
- accepted the doctrine checks in code inspection: old DB is comparison evidence only, differences are classified, source rows are not hidden, no committed secrets were found, and Phase 8 verifier forbids source/live DB/write paths,
- required action is to commit the P8-G gate changes, push, and require CI success before closing `#76` or parent `#9`.

Remaining before closing Phase 8:

- stage, secret-scan, commit, push,
- close `#76` and parent `#9` only after CI passes.

### Checkpoint: Phase 8 Closed And Phase 9 Ticketed

Phase: 9

Tickets: parent `#10`, child tickets `#77` through `#82`

Status: ticketed, implementation not started

Phase 8 closure evidence:

- `#70` through `#76` are closed,
- final Phase 8 commit `72be9e1` pushed to `origin/main`,
- GitHub CI run `26183355683` passed,
- parent Phase 8 ticket `#9` is closed.

Phase 9 child tickets:

- `#77` Launch Readiness And No-Deploy Gate,
- `#78` Health And Readiness Routes,
- `#79` Railway Target And Env Verification,
- `#80` Railway Build Configuration,
- `#81` Staging Deploy And Post-Deploy Health,
- `#82` Final Acceptance Report And Stakeholder Caveats.

Boundary for Phase 9:

- do not create or deploy a Railway service until launch readiness, health/readiness routes, target verification, and build configuration are proven,
- do not deploy to the old UCS dashboard Railway service,
- do not cut over a production domain during staging deploy,
- do not create scheduled sync jobs,
- do not run DB migrations or source writes as part of launch,
- old DB remains comparison evidence only.

Next action:

- implement `#77` first,
- keep actual Railway deployment behind the later target and health gates.

### Checkpoint: P9-A Launch Readiness No-Deploy Gate

Phase: 9

Ticket: `#77`

Status: implemented, local verification passed

What changed:

- added a pure launch readiness report builder,
- added a safe launch readiness report CLI,
- added `npm run verify:phase9`,
- added a Phase 9 verifier that keeps `npm run build` on the Phase 8 gate and protects P9-A no-deploy markers,
- exported launch readiness types from the shared library.

Current readiness report:

- status: `fail`,
- pass: `npm run build` delegates to Phase 8,
- pass: `npm run verify:phase9` exists,
- pass: required `.env.example` keys are declared without values,
- pass: package scripts do not contain `railway up`, `supabase db push`, migration, or DB push commands,
- pass: no Railway mutating command has been recorded,
- fail: `/api/health` is missing,
- fail: `/api/readiness` is missing.

Why this is acceptable for P9-A:

- P9-A is the no-deploy readiness gate, not the health route implementation,
- the readiness report must block launch until health and readiness routes exist,
- `#78` owns those routes next.

Verification:

- red: launch tests failed because the readiness module, script, and Phase 9 verifier did not exist,
- green: `npm test -- tests/launch/launch-readiness.test.ts tests/launch/phase9-verifier.test.ts` passed with 2 files passed and 6 tests passed,
- `node scripts/launch-readiness-report.mjs` emitted safe JSON with explicit `fail` status and health/readiness blockers,
- `npm run verify:phase9` passed with 59 files passed, 15 skipped, 193 tests passed, 79 todo, typecheck, Next build, Phase 8 verifier, and Phase 9 verifier.

Boundary kept:

- no Railway deploy,
- no Railway variable mutation,
- no DB migration,
- no source sync,
- no source mutation,
- no committed secrets.

Next action:

- stage, secret-scan, commit, push,
- close `#77` after CI,
- start `#78` health and readiness routes.

### Checkpoint: P9-B Health And Readiness Routes

Phase: 9

Ticket: `#78`

Status: implemented, local verification passed

What changed:

- added `/api/health`,
- added `/api/readiness`,
- added runtime readiness checks for required env, mutation guard, Supabase URL/ref, database host, and legacy DB separation,
- extended the Phase 9 verifier to protect health/readiness route files and route tests.

Runtime behaviour:

- `/api/health` returns app name, environment, status, and commit metadata when available,
- `/api/readiness` returns pass/warn/fail checks without exposing env values,
- readiness identifies the Supabase project ref and database host,
- readiness returns `503` if blockers exist,
- readiness never connects to a database and never mutates sources, DB, Railway, sync, or deploy state.

Verification:

- red: route tests failed because `app/api/health/route.ts` and `app/api/readiness/route.ts` did not exist,
- green: `npm test -- tests/launch/health-readiness-routes.test.ts` passed with 1 file passed and 3 tests passed,
- green: `npm test -- tests/launch/health-readiness-routes.test.ts tests/launch/phase9-verifier.test.ts tests/launch/launch-readiness.test.ts` passed with 3 files passed and 9 tests passed,
- `node scripts/launch-readiness-report.mjs` now returns `pass`,
- `npm run verify:phase9` passed with 60 files passed, 15 skipped, 196 tests passed, 79 todo, typecheck, Next build, Phase 8 verifier, and Phase 9 verifier.

Local smoke checks:

- dev server started on `http://localhost:3031`,
- `GET /api/health` returned `200`,
- `GET /api/readiness` returned `200`,
- readiness summary showed `mutationGuard: read_only`,
- readiness summary showed the rebuild Supabase ref `nxrzhwqsswhjgeouxsyr`,
- no secret values were printed.

Boundary kept:

- no Railway deploy,
- no Railway variable mutation,
- no DB migration,
- no source sync,
- no source mutation,
- no committed secrets.

Next action:

- stage, secret-scan, commit, push,
- close `#78` after CI,
- start `#79` Railway target and env verification.

### Checkpoint: P9-C Railway Target And Env Verification

Phase: 9

Ticket: `#79`

Status: implemented, local verification passed with one launch blocker

What changed:

- added a pure Railway target and env-plan analyser,
- added a safe `scripts/railway-readiness-report.mjs` report,
- extended the Phase 9 verifier to protect Railway target tests, report scripts, and launch-blocking markers,
- exported Railway target types from the shared launch library.

Read-only Railway status:

- `railway whoami` succeeds locally,
- `railway status --json` was run read-only and returned `No linked project found. Run railway link to connect to a project`,
- the repo is currently not linked to any Railway project/service,
- this prevents accidental deployment into the old dashboard, but blocks staging deploy until a separate rebuild Railway target is linked.

Current Railway readiness report:

- status: `fail`,
- pass: Railway status was inspected,
- fail: Railway project/service is not linked,
- pass: `DATABASE_URL` points to the new rebuild Supabase host,
- pass: `LEGACY_DATABASE_URL` is present only as comparison evidence and is distinct from `DATABASE_URL`,
- pass: production domain is not being cut over in this phase,
- pass: no Railway deploy or variable mutation command has been recorded.

Verification:

- red: Railway target tests failed because the target contract and report script did not exist,
- green: `npm test -- tests/launch/railway-target.test.ts` passed with 1 file passed and 6 tests passed,
- green: `npm test -- tests/launch/phase9-verifier.test.ts tests/launch/railway-target.test.ts` passed with 2 files passed and 8 tests passed,
- `npm run typecheck` passed,
- `node scripts/railway-readiness-report.mjs` emitted safe JSON and did not print database URLs or secret values.

Boundary kept:

- no Railway deploy,
- no Railway variable mutation,
- no Railway project creation,
- no Railway link mutation,
- no DB migration,
- no source sync,
- no source mutation,
- no committed secrets.

Next action:

- stage, secret-scan, commit, push,
- close `#79` after CI,
- start `#80` Railway build configuration,
- do not start staging deploy until a separate rebuild Railway target is explicitly linked and rechecked.

### Checkpoint: P9-D Railway Build Configuration

Phase: 9

Ticket: `#80`

Status: implemented, local verification passed

What changed:

- pinned the Node runtime with `engines.node=20.x`,
- added the production `start` script as `next start`,
- added `railway.json` using Railpack,
- set Railway build command to `npm run build`,
- set Railway start command to `npm run start`,
- set Railway healthcheck path to `/api/health`,
- left pre-deploy command and scheduled jobs unset,
- extended the Phase 9 verifier to protect the Railway build/start/runtime markers.

Build config decision:

- use Railpack first,
- do not copy the old dashboard Dockerfile,
- keep `npm run build` as the gate that runs tests, typecheck, Next build, and Phase 8 verifier,
- no migration, source sync, or scheduled job runs during Railway startup.

Verification:

- red: build config tests failed because Node was ranged, `start` was missing, and `railway.json` did not exist,
- green: `npm test -- tests/launch/railway-build-config.test.ts` passed with 1 file passed and 3 tests passed,
- green: `npm test -- tests/launch/phase9-verifier.test.ts tests/launch/railway-build-config.test.ts` passed with 2 files passed and 5 tests passed,
- `node scripts/verify-phase9.mjs` passed,
- `npm run verify:phase9` passed with 62 files passed, 15 skipped, 205 tests passed, 79 todo, typecheck, Next build, Phase 8 verifier, and Phase 9 verifier,
- production `npm run start` smoke on `http://localhost:3032` passed,
- `GET /api/health` returned `200`,
- `GET /api/readiness` returned `200`.

Boundary kept:

- no Railway deploy,
- no Railway variable mutation,
- no Railway project/service creation,
- no Railway link mutation,
- no DB migration,
- no source sync,
- no source mutation.

Next action:

- stage, secret-scan, commit, push,
- close `#80` after CI.

### Checkpoint: P1-G And P1-H Screenshot Recaptures

Phase: 1 follow-up evidence

Tickets: `#23`, `#24`

Status: captured, local verification pending

What changed:

- recaptured long-timeout project-detail routes from the old dashboard,
- recaptured Float and diagnostic/admin routes from the old dashboard,
- added two capture reports under `reference/ui/current-app`,
- updated the current-app screenshot manifest,
- updated the Phase 1 screenshot coverage plan with the new evidence.

Capture environment:

- old app repo: `/Users/tommyhyde/ucs-commercial-dashboard`,
- old app URL: `http://localhost:3001`,
- auth mode: server-side `E2E_AUTH_BYPASS=1`,
- viewport: 1440 x 1000,
- method: isolated Playwright browser context per route,
- data mode: live old dashboard read-only rendering.

Captured project-detail evidence:

- `UCS04889` LDN Q1 Design detail, HTTP 200,
- `UCS04787` LDN FY detail, HTTP 200,
- `UCS05186` LDN FY detail, HTTP 200,
- `UCS04154` LDN FY detail, HTTP 200,
- `PCS00250` LDN FY unavailable state, HTTP 404,
- `USA00262` USA FY detail, HTTP 200,
- `USA00323` USA FY detail, HTTP 200.

Captured Float and diagnostic evidence:

- Float overview LDN Q1, HTTP 200,
- Float traces `10979146`, `11413292`, and `10480262`, HTTP 200,
- Float trace `11330982` unavailable state, HTTP 404,
- Data Quality, Approval Audit, Sync Audit, Parser Diagnostics, Data Integrity, Chase, Readiness, Glossary, admin sync warnings, admin timeoffs, and Users routes, HTTP 200.

Boundary kept:

- no old app source edits,
- no source-system mutation,
- no DB migration,
- no Railway deploy,
- no source sync,
- screenshots are visual reference only and not correctness proof.

Remaining screenshot work:

- `#25` deterministic fixture states remain open for unsupported-not-zero, row variants, exact client drilldown, Float export compare, chat states, TBC identity, archived production revenue, and false-zero guard fixtures.

### Checkpoint: Overnight Control Started

Phase: 0

Ticket: GitHub issues `#1` through `#16`

Status: setup in progress

What changed:

- added overnight build control doctrine,
- added execution ticket mirror,
- created GitHub phase tickets,
- created Phase 0 implementation tickets,
- created Doctrine Steward gate ticket,
- spawned read-only Doctrine Steward agent.

Verification:

- repository was clean and synced before ticketing started,
- GitHub issue creation completed,
- Supabase was already linked to the new rebuild project,
- new Supabase remains the default `DATABASE_URL`,
- old dashboard DB remains `LEGACY_DATABASE_URL`,
- mutation guard remains `read_only`.

Open blockers:

- `PIPELINE_SHEET_ID` is still blank,
- `PRODUCTION_REVENUE_SHEET_ID` is still blank,
- Phase 0 scaffold is not implemented yet,
- Doctrine Steward final report is pending.

Next action:

- commit and push ticketing/control docs,
- spawn bounded Phase 0 implementation agents only after their file ownership is explicit,
- keep product UI blocked until display contract and law tests exist.

### Checkpoint: Doctrine Steward Returned

Phase: 0

Ticket: `#16`

Status: `PROCESS_WARN`, governance gaps found before implementation agents started

What the steward found:

- warning language needed to distinguish data warnings from process warnings,
- Doctrine Steward cadence and artifact requirements were missing,
- later phases were phase-ticketed but not implementation-ticketed,
- local issue ID map was missing,
- agent final report schema was underspecified,
- scope compliance diff check was not mandatory,
- placeholders needed a graduation trigger,
- implementation agents needed the broader doctrine doc set, not only the short overnight set.

Action taken:

- updated overnight control to use `DATA_WARN` and `PROCESS_WARN`,
- added required Doctrine Steward checkpoints,
- added implementation-ticket rule before each phase,
- added required agent final report schema,
- added scope compliance check,
- added context checkpoint protocol,
- added placeholder graduation rule,
- added local GitHub issue map.

Next action:

- run doc verification,
- commit and push governance docs,
- then spawn bounded Phase 0 implementation agents.

### Checkpoint: Objective Added

Phase: 0

Ticket: `#1`

Status: human objective captured before implementation

What changed:

- added `OBJECTIVE.md` at repo root,
- recorded the human reason for the rebuild,
- anchored the product to Sian, Jade, and Yunni's trust problem,
- confirmed the app is a source-traceable disagreement spotter, not a sheet replacement or auto-correction engine.

Verification:

- `OBJECTIVE.md` contains the five required sections from the `rethink` pre-code rule,
- product UI remains blocked until Phase 0 scaffold and law tests exist.

Next action:

- commit and push this checkpoint,
- then spawn bounded Phase 0 implementation agents.

### Checkpoint: Red Room Prebuild Review

Phase: 0

Ticket: `#1`

Status: `PROCESS_WARN`, no Phase 0 blocker after mitigation

What changed:

- added `docs/RED_ROOM_PREBUILD_REVIEW.md`,
- promoted `OBJECTIVE.md`, overnight controls, execution tickets, and build log into the required startup docs,
- checked current env posture,
- confirmed stack is pinned in doctrine,
- kept Phase 0 green and later phases blocked.

Worst plausible failures identified:

- incomplete doctrine read by agents,
- stack drift before package setup,
- accidental remote Supabase mutation,
- old DB used as product truth,
- missing Pipeline and Production Revenue sheet IDs,
- secrets pasted into chat need rotation before production,
- UI parity confused with logic parity,
- screenshot gaps hidden,
- placeholder tests becoming permanent ceremony,
- chat becoming a second dashboard,
- unsupported values becoming zeros,
- fixture cleanliness hiding real source mess.

Next action:

- commit and push red room docs,
- spawn bounded Phase 0 agents only after disjoint write sets are restated.

### Checkpoint: Phase 0 Build Started

Phase: 0

Ticket: `#1`

Status: in progress

Worker split:

- `#11` P0-A owns package, TypeScript, Vitest, and CI files.
- `#12` P0-B owns `fixtures/**`.
- `#13` P0-C owns canon and display contract types under `src/lib/canon/**` and `src/lib/display/**`.
- `#14` P0-D owns pending law and scenario tests under `tests/**`.
- Controller owns `scripts/verify-phase0.mjs` and build-log checkpoints.

Verification target:

- `npm test`,
- `npm run typecheck`,
- `npm run verify:phase0`,
- no product UI,
- no remote migrations,
- no committed secrets.

Open blockers:

- Phase 0 workers have not returned yet.

### Checkpoint: Phase 0 Scaffold Integrated

Phase: 0

Tickets: `#1`, `#11`, `#12`, `#13`, `#14`, `#15`

Status: integrated, awaiting Doctrine Steward acceptance

What changed:

- added package, TypeScript, Vitest, lockfile, and CI scaffold,
- added fixture and golden scenario scaffold,
- added canon source types, `DashboardScope`, unsupported metric state, source trace types, and display contract interface,
- added Phase 0 `buildDashboardDisplayContract` stub that returns unsupported totals rather than invented data,
- added 17 pending test files with 85 todo tests,
- added `scripts/verify-phase0.mjs`,
- wired `npm run verify:phase0` and Phase 0 `npm run build` to the verifier.

Verification:

- `npm ci` passed,
- `npm run verify:phase0` passed,
- `npm run build` passed as the Phase 0 verifier,
- `npm audit --omit=dev` found 0 vulnerabilities,
- no product UI directories exist,
- no Supabase migrations exist,
- no committed secret patterns were found.

Process warnings:

- full `npm audit` still reports 2 moderate dev-dependency vulnerabilities through the current Next/PostCSS dependency chain,
- Next and React are dev-only in Phase 0 because there is no runtime UI or deployment yet,
- before UI or Railway work begins, the Next/PostCSS advisory must be rechecked and resolved or explicitly accepted.

Next action:

- get Doctrine Steward acceptance,
- commit and push Phase 0 scaffold if accepted.

### Checkpoint: Doctrine Steward Accepted Phase 0 Scaffold

Phase: 0

Tickets: `#1`, `#11`, `#12`, `#13`, `#14`, `#15`, `#16`

Status: `PROCESS_WARN`, commit allowed

Doctrine Steward result:

- blocking findings: none,
- Phase 0 criteria satisfied,
- phase order clean,
- `npm run verify:phase0` passed,
- `npm run build` passed as the Phase 0 verifier,
- `npm audit --omit=dev` found 0 vulnerabilities,
- no product UI directories,
- no live sync implementation,
- no chat implementation,
- no remote migration files,
- no source-system mutation code.

Accepted process warnings:

- `src/lib/index.ts` is accepted as part of P0-C because it is only a shared type/export barrel for canon and display contract types.
- full `npm audit` reports 2 moderate dev-dependency advisories through the current Next/PostCSS chain. This is not a Phase 0 blocker because there is no runtime UI or deployment and production audit is clean. It must be rechecked before UI or Railway work.
- all tests are `todo` by design. Placeholder graduation remains mandatory before any covered behaviour ships.
- fixture slots do not yet prove real Sian/Yunni/Jade scenarios.

Next action:

- commit and push Phase 0 scaffold,
- update GitHub issues with verification evidence,
- then plan Phase 1 implementation tickets only after Phase 0 is closed.

### Checkpoint: Phase 1 Ticketing Started

Phase: 1

Ticket: `#2`

Status: in progress

What changed:

- created bounded Phase 1 implementation tickets `#17` through `#22`,
- mirrored Phase 1 implementation tickets into `docs/EXECUTION_TICKETS.md`.

Worker split:

- `#17` P1-A owns `docs/phase-1/route-inventory.md`,
- `#18` P1-B owns `docs/phase-1/scope-filter-workflows.md`,
- `#19` P1-C owns `docs/phase-1/table-export-inventory.md`,
- `#20` P1-D owns `docs/phase-1/screenshot-coverage.md`,
- `#21` P1-E owns Phase 1 assembly and exit check,
- `#22` P1-F is read-only Doctrine Steward review.

Phase boundary:

- Phase 1 is documentation and UX reference mapping only,
- no product UI,
- no source archive code,
- no parsers,
- no display aggregation,
- no chat implementation,
- no migrations,
- no source-system mutation.

Next action:

- spawn read-only Phase 1 agents for `#17` through `#20`,
- integrate into Phase 1 assembly after their reports return.

### Checkpoint: Phase 1 Worker Reports Integrated

Phase: 1

Tickets: `#17`, `#18`, `#19`, `#20`, `#21`

Status: candidate integrated, awaiting Doctrine Steward review

What changed:

- integrated route/navigation, scope/filter, table/export, and screenshot coverage worker reports,
- added `docs/phase-1/ux-parity-map.md`,
- added `docs/phase-1/phase-1-exit-check.md`,
- created follow-up screenshot evidence tickets `#23`, `#24`, and `#25`,
- updated `docs/EXECUTION_TICKETS.md` with the follow-up evidence tickets.

Preserved UX now mapped:

- dashboard home and rollups,
- Projects table, filters, active chips, footer, and CSV,
- project detail,
- Float diagnostics and Float trace,
- Data Quality, Approval, admin, glossary, and diagnostic surfaces,
- chat shell and evidence requirements.

Do-not-preserve rules now explicit:

- old selectors are not product truth,
- unsupported values are not zero,
- source-only rows stay visible,
- fuzzy search is not exact client/job identity,
- CSV cannot be a second authority,
- chat cannot answer outside an EvidencePack,
- old route latency, horizontal overflow, and hydration mismatch are not parity targets.

Verification so far:

- `npm test` passed with 17 skipped files and 85 todo tests,
- `git diff --check` passed.

Accepted process warnings:

- screenshot coverage remains partial,
- project detail, Float, diagnostic, admin, and chat screenshots need follow-up capture,
- deterministic screenshot states depend on later fixture and UI harness work,
- Phase 1 can only exit after Doctrine Steward review confirms these warnings are honestly tracked.

Next action:

- run the full Phase 1 verification command set,
- dispatch Doctrine Steward review for `#22`,
- fix any doctrine findings before closing or pushing Phase 1.

### Checkpoint: Doctrine Steward Accepted Phase 1 Candidate

Phase: 1

Tickets: `#17`, `#18`, `#19`, `#20`, `#21`, `#22`

Status: `PROCESS_WARN`, commit allowed

Initial Doctrine Steward finding:

- `BLOCKED`: `docs/DEVELOPMENT_DOCTRINE.md` still contained an older phase table that could authorize Source Archive work inside Phase 1.

Action taken:

- aligned `docs/DEVELOPMENT_DOCTRINE.md` with `docs/BUILD_PHASES.md` and `docs/EXECUTION_TICKETS.md`,
- made `BUILD_PHASES` and `EXECUTION_TICKETS` the authoritative phase references,
- confirmed Phase 1 is UX parity mapping only and Source Archive starts in Phase 2.

Doctrine Steward re-review:

- blocking findings: none,
- accepted process warning: screenshot coverage remains partial,
- missing visual evidence is honestly tracked by GitHub `#23`, `#24`, and `#25`,
- current changes are docs only,
- no product UI, source archive, parser, display logic, chat tool, migration, deploy, sync, Supabase mutation, or source-system mutation was introduced.

Verification after the fix:

- `npm test` passed with 17 skipped files and 85 todo tests,
- `npm run verify:phase0` passed,
- `npm run build` passed,
- `npm audit --omit=dev` found 0 vulnerabilities,
- `git diff --check` passed,
- em dash/en dash scan over touched docs found no matches.

Next action:

- commit and push Phase 1 UX parity map,
- update and close GitHub `#17` through `#22`,
- keep screenshot follow-up issues `#23` through `#25` open.

### Checkpoint: Phase 2 Ticketing Started

Phase: 2

Ticket: `#3`

Status: ticketed, implementation not started

What changed:

- created bounded Phase 2 implementation tickets `#26` through `#32`,
- mirrored Phase 2 implementation tickets into `docs/EXECUTION_TICKETS.md`.

Worker split:

- `#26` P2-A owns source archive domain types and type tests,
- `#27` P2-B owns raw row classifier and skipped-row ledger,
- `#28` P2-C owns immutable in-memory archive store,
- `#29` P2-D owns read-only source pull interface,
- `#30` P2-E owns development source row browser helpers,
- `#31` P2-F owns Phase 2 verification gate and closure docs,
- `#32` P2-G is read-only Doctrine Steward review.

Phase boundary:

- Phase 2 preserves raw source evidence,
- no product UI,
- no source parsers,
- no canon queries,
- no display aggregation,
- no chat investigation tools,
- no live source pulls,
- no migrations applied,
- no source-system mutation.

Implementation discipline:

- use test-driven development,
- write failing tests before implementation code,
- do not graduate any Phase 2 behaviour without active tests,
- stop if implementation starts correcting or reconciling source data.

Next action:

- commit and push Phase 2 ticketing,
- spawn bounded Phase 2 implementation agents with disjoint write sets.

### Checkpoint: P2-A Source Archive Domain Types

Phase: 2

Ticket: `#26`

Status: implemented, awaiting commit

TDD evidence:

- red: `npm test tests/source-archive/source-archive-types.test.ts` failed because `../../src/lib/source-archive` did not exist,
- green: added source archive domain types and public exports,
- focused test passed with 5 active tests,
- `npm run typecheck` passed,
- full `npm test` passed with 1 active file and 17 skipped law scaffold files.

What changed:

- added source archive version and source list,
- added source archive batch type,
- added raw archived source row type,
- added skipped source row type and allowed-drop evidence,
- added read-only source pull metadata type,
- exported source archive domain contracts from `src/lib/index.ts`.

Boundary kept:

- no parser facts,
- no display rows,
- no product UI,
- no live source calls,
- no migration,
- no source-system mutation.

Next action:

- commit and push P2-A,
- close GitHub `#26`,
- start P2-B/P2-C/P2-D/P2-E on top of the shared types.

### Checkpoint: P2-B To P2-E Source Archive Slices Integrated

Phase: 2

Tickets: `#27`, `#28`, `#29`, `#30`

Status: implemented, awaiting commit

TDD evidence from workers:

- P2-B red: focused test failed because `row-classifier` module was missing,
- P2-B green: focused classifier test passed with 5 active tests,
- P2-C red: focused test failed because `archive-store` module was missing,
- P2-C green: focused archive-store test passed with 6 active tests,
- P2-D red: focused test failed because `source-pull` module was missing,
- P2-D green: focused source-pull test passed with 3 active tests,
- P2-E red: focused test failed because `source-row-browser` module was missing,
- P2-E green: focused source-row-browser test passed with 6 active tests.

What changed:

- added pure raw row classifier and skipped-row ledger helper,
- added immutable in-memory source archive store,
- added read-only source pull interface and fixture adapter helper,
- added development source row browser query helpers,
- wired Phase 2 source archive exports through the source archive barrel and root library export.

Verification after integration:

- `npm test` passed with 5 active files and 17 skipped law scaffold files,
- `npm run typecheck` passed,
- `npm run build` passed,
- `npm audit --omit=dev` found 0 vulnerabilities,
- `git diff --check` passed,
- em dash/en dash scan over touched docs and code found no matches.

Boundary kept:

- no parser facts,
- no display rows,
- no product UI,
- no live source calls,
- no migration,
- no source-system mutation,
- no old dashboard selector truth.

Next action:

- run the full pre-commit gate,
- commit and push P2-B through P2-E,
- close GitHub `#27` through `#30`,
- then build Phase 2 verification gate in `#31`.

### Checkpoint: P2-F Phase 2 Verification Gate

Phase: 2

Ticket: `#31`

Status: implemented, awaiting commit

What changed:

- added `scripts/verify-phase2.mjs`,
- added `npm run verify:phase2`,
- updated `npm run build` to run the Phase 2 gate.

The gate checks:

- Phase 2 source archive files and tests exist,
- Phase 2 has active source archive tests,
- source archive exports are wired,
- out-of-phase UI/parser/query/db directories are absent,
- migration SQL is absent,
- source archive code does not import live source clients or environment variables,
- source archive code does not reference parser facts or dashboard display contracts.

Verification:

- `npm run verify:phase2` passed,
- `npm run build` passed through `verify:phase2`,
- `npm audit --omit=dev` found 0 vulnerabilities,
- `git diff --check` passed.

Boundary kept:

- gate does not start live source pulls,
- gate does not need production credentials,
- gate does not apply migrations,
- gate does not permit Phase 2 behaviours to remain as todo tests.

Next action:

- commit and push P2-F,
- close GitHub `#31`,
- run Doctrine Steward review for `#32`.

### Checkpoint: Phase 2 Doctrine Steward Accepted

Phase: 2

Ticket: `#32`

Status: `PROCESS_WARN`, verifier hardening in progress

Doctrine Steward result:

- blocking findings: none,
- current source archive code does not parse, tally, create UI/display rows, pull live sources, mutate source systems, apply migrations, deploy, or use old selectors as truth,
- accepted process warning: `scripts/verify-phase2.mjs` had forbidden string checks but did not yet catch native `fetch(` or hard-coded `http://` and `https://` live source pulls.

Action taken:

- hardened `scripts/verify-phase2.mjs` to reject native fetch call shapes, `http://`, and `https://` inside `src/lib/source-archive`,
- adjusted the native fetch check so the allowed read-only adapter method named `fetch` is not treated as a network call.

Verification to run:

- `npm run verify:phase2`,
- `npm run build`,
- `npm audit --omit=dev`,
- `git diff --check`,
- em dash/en dash scan.

### Checkpoint: Phase 3 Ticketing Started

Phase: 3

Ticket: `#4`

Status: ticketed, implementation not started

What changed:

- created bounded Phase 3 implementation tickets `#33` through `#40`,
- mirrored Phase 3 implementation tickets into `docs/EXECUTION_TICKETS.md`.

Worker split:

- `#33` P3-A owns parser fact contracts and warning model,
- `#34` P3-B owns fee-sheet parser and fixtures,
- `#35` P3-C owns Pipeline parser and fixtures,
- `#36` P3-D owns Production Revenue parser and fixtures,
- `#37` P3-E owns Float parser and fixtures,
- `#38` P3-F owns parser fixture manifest and golden parsed fact checks,
- `#39` P3-G owns Phase 3 verification gate,
- `#40` P3-H is read-only Doctrine Steward review.

Phase boundary:

- Phase 3 may parse archived raw rows into parser facts,
- no canon queries,
- no display aggregation,
- no product UI,
- no chat investigation tools,
- no live source pulls,
- no migrations applied,
- no source-system mutation.

Implementation discipline:

- use test-driven development,
- write failing parser tests before parser code,
- every parsed fact must carry raw row IDs and batch ID,
- additive status must be explicit,
- stop if parser code starts building dashboard totals or display rows.

Next action:

- commit and push Phase 3 ticketing,
- start P3-A before source-specific parsers.

### Checkpoint: P3-A Parser Fact Contracts

Phase: 3

Ticket: `#33`

Status: implemented, awaiting commit

TDD evidence:

- red: `npm test tests/parsers/parser-contracts.test.ts` failed because `../../src/lib/parsers` did not exist,
- green: added parser contract types and shared helpers,
- focused parser contract test passed with 4 active tests,
- full `npm test` passed with 6 active files and 17 skipped law scaffold files,
- `npm run typecheck` passed,
- `git diff --check` passed.

What changed:

- added explicit parser additive status model,
- added parser fact evidence helper requiring batch ID, raw row IDs, source refs, and additive status,
- added parser warning helper requiring source refs and raw row IDs,
- added parser result shape that has facts, warnings, capabilities, and source row counts only,
- exported parser contracts from the root library.

Boundary kept:

- no source-specific parser logic,
- no display rows,
- no dashboard totals,
- no product UI,
- no live source calls,
- no source-system mutation.

Next action:

- commit and push P3-A,
- close GitHub `#33`,
- spawn source-specific parser workers for P3-B through P3-E.

### Checkpoint: P3-B Through P3-E Parser Integration And Phase 3 Gate

Phase: 3

Tickets: `#34`, `#35`, `#36`, `#37`, `#39`

Status: implemented locally, push-blocking verification passed, awaiting commit

What changed:

- added fee-sheet parser fixtures and parser,
- added Pipeline parser fixtures and parser,
- added Production Revenue parser fixtures and parser,
- added Float parser fixtures and parser,
- exported source-specific parsers from the parser barrel and root library,
- added `scripts/verify-phase3.mjs`,
- rewired `npm run build` to the Phase 3 verifier instead of the old Phase 2 verifier.

TDD and gate evidence:

- red: `npm run verify:phase3` failed because the script did not exist,
- first green attempt failed on a too-strict unknown-status marker in the verifier,
- fixed the verifier to check the actual `unknown-status` test coverage marker,
- `npm run verify:phase3` passed,
- `npm run build` passed,
- `npm audit --omit=dev` found 0 vulnerabilities,
- `git diff --check` passed,
- em dash/en dash scan returned no matches.

Boundary kept:

- parsers consume archived source rows only,
- parser facts carry raw row IDs, batch IDs, source refs, and explicit additive status,
- CLIENT SUMMARY, V-tab, TBC, archived, inactive, duplicate, manual duplicate, and multi-person cases are represented in fixtures and tests,
- no canon queries,
- no display rows,
- no product UI,
- no live source pulls,
- no migrations,
- no source-system mutation.

Next action:

- commit and push the parser integration checkpoint,
- close GitHub `#34`, `#35`, `#36`, `#37`, and `#39`,
- then implement parser fixture manifest ticket `#38`.

### Checkpoint: P3-F Parser Fixture Manifest

Phase: 3

Ticket: `#38`

Status: implemented locally, push-blocking verification passed, awaiting commit

What changed:

- added `fixtures/parsed-facts/manifest.json`,
- added manifest documentation to `fixtures/parsed-facts/README.md`,
- added parser fixture manifest tests,
- extended the Phase 3 verifier to require the manifest and manifest tests.

TDD evidence:

- red: `npm test -- tests/parsers/parser-fixture-manifest.test.ts` failed because `fixtures/parsed-facts/manifest.json` did not exist,
- green: added the manifest and README notes,
- focused manifest test passed with 3 active tests,
- `npm run build` passed with 11 passed test files, 49 active tests, typecheck, and Phase 3 verification,
- `npm audit --omit=dev` found 0 vulnerabilities,
- `git diff --check` passed,
- em dash/en dash scan returned no matches.

Boundary kept:

- manifest lists parsed fact JSON only, not screenshots,
- every existing parser source fixture and expected parsed fact fixture is declared,
- named regressions are either covered by a parser fixture or explicitly deferred with a `PROCESS_WARN` reason,
- USA template named fixtures, PCS cache-without-raw, BT raw-cache, and LDN Q1 Design display-scope checks are marked as later-phase work instead of false coverage.

Next action:

- commit and push P3-F,
- close GitHub `#38`,
- start P3-H Doctrine Steward review for parsers.

### Checkpoint: Phase 3 Doctrine Steward Accepted

Phase: 3

Tickets: `#4`, `#40`

Status: `ACCEPTED_WITH_PROCESS_WARN`, Phase 3 can close

Doctrine Steward result:

- blocking findings: none,
- P3-H can close,
- parent Phase 3 can close with manifest process warnings carried forward.

Evidence:

- `npm run build` passed with 11 passed test files, 49 active tests, typecheck, and Phase 3 verification,
- `npm audit --omit=dev` found 0 vulnerabilities,
- `git diff --check` passed,
- `node scripts/verify-phase3.mjs` passed,
- parser code had no forbidden live pull, display, selector, environment, HTTP, Supabase, or SQL mutation references,
- no Supabase migration SQL exists.

Accepted process warnings carried forward:

- `LDN_Q1_DESIGN` display reconciliation is deferred to Phase 5 and Phase 6,
- `PCS00250` cache-vs-raw reconciliation is deferred to Phase 4 and Phase 5,
- `USA00262` and `USA00323` named USA template fixtures are deferred to Phase 8 real data dual run,
- `BT_RAW_CACHE` raw/cache comparison is deferred to Phase 4 and Phase 5.

Next action:

- commit and push the Phase 3 acceptance log,
- close GitHub `#40` and parent `#4`,
- create bounded Phase 4 implementation tickets before starting canon query code.

### Checkpoint: Phase 4 Ticketing Started

Phase: 4

Ticket: `#5`

Status: ticketed, implementation not started

What changed:

- created bounded Phase 4 implementation tickets `#41` through `#47`,
- mirrored Phase 4 implementation tickets into `docs/EXECUTION_TICKETS.md`.

Worker split:

- `#41` P4-A owns canon query contracts and scope predicate,
- `#42` P4-B owns sold fee-sheet source fact selector,
- `#43` P4-C owns Pipeline and Production Revenue source fact selectors,
- `#44` P4-D owns Float source fact selector and raw/cache warning shell,
- `#45` P4-E owns source fact set assembly and capability index,
- `#46` P4-F owns Phase 4 verification gate,
- `#47` P4-G is read-only Doctrine Steward review.

Phase boundary:

- Phase 4 may expose scoped parser facts and source capability metadata,
- no display rows,
- no product UI,
- no CSV rows,
- no dashboard totals,
- no live source pulls,
- no database calls,
- no migrations applied,
- no deploys,
- no sync,
- no source-system mutation,
- no old dashboard selector truth.

Next action:

- commit and push Phase 4 ticketing,
- start P4-A before source-specific canon query selectors.

### Checkpoint: P4-A Canon Query Contracts And Initial Phase 4 Gate

Phase: 4

Tickets: `#41`, partial `#46`

Status: implemented locally, push-blocking verification passed, awaiting commit

What changed:

- added canon query result contracts,
- added explicit scope predicate for office, date, department, role, exact client, search, job number, and Float ID,
- added unsupported scope metric helpers,
- exported canon query contracts from the root library,
- added initial `scripts/verify-phase4.mjs`,
- rewired `npm run build` to Phase 4 verification.

TDD evidence:

- red: focused P4-A tests failed because `src/lib/canon-queries` did not exist,
- green: focused P4-A tests passed with 5 active tests,
- red: `npm run verify:phase4` failed because the script did not exist,
- green: `npm run verify:phase4` passed with 13 passed test files, 54 active tests, typecheck, and Phase 4 verification,
- `npm run build` passed with 13 passed test files, 54 active tests, typecheck, and Phase 4 verification,
- `npm audit --omit=dev` found 0 vulnerabilities,
- `git diff --check` passed,
- em dash/en dash scan returned no matches.

Boundary kept:

- canon query contracts return source facts, capabilities, unsupported metrics, warnings, and scope only,
- no display rows,
- no CSV rows,
- no visible rows,
- no dashboard rows,
- no dashboard totals,
- no live source pulls,
- no database calls,
- no source-system mutation.

Next action:

- commit and push P4-A plus the initial Phase 4 gate,
- close GitHub `#41`,
- keep `#46` open until source-specific selectors are added to the final Phase 4 verifier.

### Checkpoint: P4-B Through P4-F Source Fact Selectors

Phase: 4

Tickets: `#42`, `#43`, `#44`, `#45`, `#46`

Status: implemented locally, push-blocking verification passed, awaiting commit

What changed:

- added sold fee-sheet source fact selector,
- added Pipeline source fact selector,
- added Production Revenue source fact selector,
- added Float source fact selector and raw/cache warning shell,
- added source fact set assembly from parser results,
- added source capability profile and capability index helpers,
- expanded `scripts/verify-phase4.mjs` to require all Phase 4 selector files, tests, and exports.

TDD evidence:

- P4-B red: sold selector tests failed on missing `canon-queries/sold`,
- P4-C red: Pipeline and Production Revenue selector tests failed on missing selector modules,
- P4-D red: Float selector tests failed on missing `canon-queries/float`,
- P4-E red: source fact set and capability tests failed on missing modules,
- P4-F red: expanded verifier failed first on over-strict coverage markers,
- green: `npm run verify:phase4` passed with 19 passed test files, 71 active tests, typecheck, and Phase 4 verification,
- `npm run build` passed with 19 passed test files, 71 active tests, typecheck, and Phase 4 verification,
- `npm audit --omit=dev` found 0 vulnerabilities,
- `git diff --check` passed,
- em dash/en dash scan returned no matches,
- forbidden canon-query scan returned no live source, display, selector, database, SQL mutation, or aggregation matches.

Boundary kept:

- selectors expose scoped source facts only,
- source-only rows remain facts,
- unsupported source capability becomes unsupported metadata, not zero,
- archive and active states remain overlays, not hide rules,
- exact client filtering remains distinct from search,
- Float raw/cache named issues are left unresolved unless cache facts exist,
- no display rows,
- no CSV rows,
- no visible rows,
- no dashboard rows,
- no dashboard totals,
- no live source pulls,
- no database calls,
- no source-system mutation.

Next action:

- commit and push P4-B through P4-F,
- close GitHub `#42`, `#43`, `#44`, `#45`, and `#46`,
- run P4-G Doctrine Steward review.

### Checkpoint: Phase 4 Doctrine Steward Accepted

Phase: 4

Tickets: `#5`, `#47`

Status: `ACCEPTED_WITH_PROCESS_WARN`, Phase 4 can close

Doctrine Steward result:

- blocking findings: none,
- P4-G can close,
- parent Phase 4 can close with process warnings carried forward.

Evidence:

- `npm run build` passed with 19 passed test files, 71 active tests, typecheck, and Phase 4 verification,
- `npm audit --omit=dev` found 0 vulnerabilities,
- `git diff --check` passed,
- forbidden canon-query scans returned no live source, display, selector, database, SQL mutation, or aggregation matches,
- em dash/en dash scan returned no matches.

Accepted process warnings carried forward:

- `LDN_Q1_DESIGN` display reconciliation remains deferred to Phase 5 and Phase 6,
- `USA00262` and `USA00323` named USA template fixtures remain deferred to Phase 8 real data dual run,
- `PCS00250` and `BT_RAW_CACHE` remain open `PROCESS_WARN` raw/cache Float issues unless scoped cache facts exist.

Next action:

- commit and push the Phase 4 acceptance log,
- close GitHub `#47` and parent `#5`,
- create bounded Phase 5 implementation tickets before starting display contract code.

### Checkpoint: Phase 5 Ticketing Started

Phase: 5

Ticket: `#6`

Status: ticketed, implementation not started

What changed:

- created bounded Phase 5 implementation tickets `#48` through `#54`,
- mirrored Phase 5 implementation tickets into `docs/EXECUTION_TICKETS.md`.

Worker split:

- `#48` P5-A owns display contract result shape and totalling laws,
- `#49` P5-B owns project row builder and source-only rows,
- `#50` P5-C owns rollups, scope preservation, and unsupported Pipeline/Production slices,
- `#51` P5-D owns Float raw/cache/visible reconciliation checks,
- `#52` P5-E owns CSV rows, trace rows, and approval contract outputs,
- `#53` P5-F owns Phase 5 verification gate,
- `#54` P5-G is read-only Doctrine Steward review.

Phase boundary:

- Phase 5 may build the pure display contract, visible rows, rollups, CSV rows, traces, approval outputs, unsupported flags, and reconciliation checks,
- no product UI pages,
- no live source pulls,
- no database calls,
- no old dashboard selectors,
- no migrations applied,
- no deploys,
- no sync,
- no source-system mutation.

Next action:

- commit and push Phase 5 ticketing,
- start P5-A before project rows or rollups.

### Checkpoint: P5-A Display Contract Shape And Initial Phase 5 Gate

Phase: 5

Tickets: `#48`, partial `#53`

Status: implemented locally, push-blocking verification passed, awaiting commit

What changed:

- replaced the Phase 0 display contract stub with additive-only sold fee and sold hours totals,
- preserved unsupported metrics as unsupported instead of zero,
- added source trace summaries for supported sold totals,
- kept visible rows, rollups, CSV rows, reconciliation, and approval outputs empty for later Phase 5 tickets,
- added initial `scripts/verify-phase5.mjs`,
- rewired `npm run build` to Phase 5 verification.

TDD evidence:

- red: display contract tests failed because totals were still unsupported and confidence was low,
- green: focused display contract tests passed with 4 active tests,
- red: `npm run verify:phase5` failed because the script did not exist,
- first verifier run failed on an over-strict `displayRows` coverage marker,
- green: `npm run verify:phase5` passed with 21 passed test files, 75 active tests, typecheck, and Phase 5 verification,
- `npm run build` passed with 21 passed test files, 75 active tests, typecheck, and Phase 5 verification,
- `npm audit --omit=dev` found 0 vulnerabilities,
- `git diff --check` passed,
- em dash/en dash scan returned no matches.

Boundary kept:

- additive facts can contribute to supported totals,
- non-additive source summary facts remain evidence and do not double count,
- unsupported metrics remain unsupported, not zero,
- contract remains pure and takes facts and scope as input,
- no project rows or rollups yet,
- no product UI pages,
- no live source pulls,
- no database calls,
- no old dashboard selectors,
- no source-system mutation.

Next action:

- commit and push P5-A plus the initial Phase 5 gate,
- close GitHub `#48`,
- keep `#53` open until the full Phase 5 verifier covers all display modules.

### Checkpoint: P5-B Through P5-F Display Contract Integrated

Phase: 5

Tickets: `#49`, `#50`, `#51`, `#52`, `#53`

Status: implemented locally, push-blocking verification passed, awaiting commit

What changed:

- added scoped project rows with source labels, trace refs, warnings, confidence, source-only row types, and explicit Float ID separation,
- added display rollups for department, role, client, and month,
- added scope-preserving link helpers and exact client drilldown support,
- added Float raw/cache/visible reconciliation checks for missing cache, cache-only, raw/cache deltas, and inactive visible hours,
- added CSV rows, compact trace rows, and approval output helpers derived from display contract rows,
- integrated project rows, rollups, CSV rows, and Float reconciliation into `buildDashboardDisplayContract`,
- tightened `scripts/verify-phase5.mjs` so the Phase 5 gate requires all display modules, tests, exports, scope guards, named Float checks, and no forbidden live source or old selector paths.

TDD evidence:

- P5-B red: project row tests failed on missing `display/project-rows`,
- P5-C red: rollup and scope-preservation tests failed on missing `display/rollups`,
- P5-D red: Float reconciliation tests failed on missing `display/float-reconciliation`,
- P5-E red: CSV, trace, and approval tests failed on missing modules,
- controller red: scoped project row test failed because out-of-scope USA, April, and Strategy facts leaked into rows,
- controller red: top-level display contract integration test failed because `visibleRows` was still empty,
- controller red: scoped Float reconciliation test failed because out-of-scope Float facts entered the active dashboard scope,
- green: focused display tests passed with 9 display test files and 26 active display tests,
- green: `npm run verify:phase5` passed with 28 passed test files, 98 active tests, 85 todo tests, typecheck, and Phase 5 verification.

Boundary kept:

- one display contract now owns visible rows, rollups, CSV, and reconciliation,
- rows and Float checks scope their own facts instead of trusting callers,
- raw Float facts do not become visible dashboard Float hours,
- source-only rows remain visible,
- unsupported remains unsupported, not zero,
- raw parser summaries remain non-additive unless explicitly marked additive,
- exact client filtering remains separate from search,
- no product UI pages,
- no live source pulls,
- no database calls,
- no old dashboard selectors,
- no migrations applied,
- no deploys,
- no sync,
- no source-system mutation.

Next action:

- run final build, audit, diff, and punctuation hygiene checks,
- commit and push P5-B through P5-F,
- close GitHub `#49`, `#50`, `#51`, `#52`, and `#53`,
- run P5-G Doctrine Steward review before closing parent Phase 5.

### Checkpoint: Phase 5 Doctrine Steward Accepted

Phase: 5

Tickets: `#6`, `#54`

Status: `ACCEPTED_WITH_PROCESS_WARN`, Phase 5 can close

Doctrine Steward result:

- blocking findings: none,
- P5-G can close,
- parent Phase 5 can close with process warnings carried forward.

Evidence:

- `npm run verify:phase5` passed with 28 passed test files, 98 active tests, 85 todo tests, typecheck, and Phase 5 verification,
- `npm run build` passed and delegates to `verify:phase5`,
- `npm audit --omit=dev` found 0 vulnerabilities,
- full `npm audit` still reports the known dev-only `next -> postcss` advisory,
- `git diff --check` passed,
- forbidden display/test scan returned no live source, database, old selector, SQL mutation, product UI path, or source-system mutation matches,
- no SQL migrations, `src/app`, `src/pages`, `src/components`, or `src/lib/db` exist,
- em dash/en dash scan returned no matches,
- GitHub CI for commit `8f07295` completed successfully.

Accepted process warnings carried forward:

- full `npm audit` dev-only Next/PostCSS advisory remains accepted while there is no product UI or deploy,
- `LDN_Q1_DESIGN` is covered at the display contract and rollup level, but UI parity remains Phase 6 work,
- `USA00262` and `USA00323` named USA template checks remain deferred to Phase 8 real-data dual run,
- `PCS00250` and `BT_RAW_CACHE` are represented in Float reconciliation, but remain source/data warnings unless scoped cache/raw facts resolve them.

Next action:

- close GitHub `#54` and parent `#6`,
- create bounded Phase 6 UI parity implementation tickets before starting any product UI work.

### Checkpoint: Phase 6 Ticketing Started

Phase: 6

Ticket: `#7`

Status: ticketed, implementation not started

What changed:

- created bounded Phase 6 implementation tickets `#55` through `#62`,
- mirrored Phase 6 implementation tickets into `docs/EXECUTION_TICKETS.md`.

Worker split:

- `#55` P6-A owns Next app shell, dashboard chrome, and deterministic contract fixture boundary,
- `#57` P6-B owns dashboard home rollups from display contract,
- `#58` P6-C owns Projects table, scope filters, footer, and CSV export,
- `#56` P6-D owns project detail and Float diagnostics surfaces,
- `#59` P6-E owns Data Quality, in-dashboard integrity, Approval, and Glossary,
- `#61` P6-F owns read-only chat shell and `Needs Codex` handoff states,
- `#60` P6-G owns deterministic UI verification gate and Playwright setup,
- `#62` P6-H is read-only Doctrine Steward review.

Phase boundary:

- Phase 6 may create product UI pages, deterministic fixture providers, UI components, CSV download surfaces, chat shell states, and deterministic UI tests,
- UI must consume display contract output or explicit fixture contract output,
- no live source pulls,
- no database calls,
- no old dashboard selectors,
- no migrations applied,
- no deploys,
- no sync,
- no source-system mutation,
- no page-local business totals.

Next action:

- commit and push Phase 6 ticketing,
- start P6-A shell and verification gate before filling individual pages.

### Checkpoint: P6-A Shell And Initial Phase 6 Gate

Phase: 6

Tickets: `#55`, partial `#60`

Status: implemented locally, push-blocking verification passed, awaiting commit

What changed:

- added Next App Router root layout, dashboard route, and redirect from `/` to `/dashboard`,
- added dashboard shell chrome with top bar, primary tabs, explicit scope strip, warning banner, and chat entry slot,
- added deterministic fixture contract provider backed by `buildDashboardDisplayContract`,
- added the first UI shell render test,
- added `next.config.ts` to pin the workspace root for Next/Turbopack,
- added initial `scripts/verify-phase6.mjs`,
- rewired `npm run build` to `verify:phase6`,
- updated GitHub CI to run the current build gate instead of the Phase 0 gate.

TDD evidence:

- red: UI shell test failed because `dashboard-chrome` and `fixture-contract` did not exist,
- green: UI shell test passed after adding the chrome and fixture provider,
- TypeScript caught the required `children` prop mismatch in the React render test, then passed after the prop was made optional,
- `npm run verify:phase6` passed with 29 passed test files, 99 active tests, 85 todo tests, typecheck, Next production build, and Phase 6 shell verification.

Boundary kept:

- the UI shell reads a deterministic display contract fixture,
- shell chrome does not calculate business totals,
- no live source pulls,
- no database calls,
- no old dashboard selectors,
- no migrations applied,
- no deploys,
- no sync,
- no source-system mutation.

Next action:

- commit and push P6-A plus the initial Phase 6 gate,
- close GitHub `#55`,
- keep `#60` open until deterministic UI tests cover all required Phase 6 surfaces.

### Checkpoint: P6-B Dashboard Home Rollups

Phase: 6

Tickets: `#57`, partial `#60`

Status: implemented locally, push-blocking verification pending

What changed:

- added dashboard home component for hero metrics and rollup tables,
- rendered headline metrics from `contract.heroTotals`,
- rendered Department, Role, Month, and Client rollups from `contract.rollups`,
- linked rollup rows to Projects with scoped query params,
- labelled unsupported rollup metrics as unsupported,
- replaced the dashboard placeholder panel with the contract-backed dashboard home,
- expanded `scripts/verify-phase6.mjs` with P6-B markers.

TDD evidence:

- red: dashboard home test failed because `dashboard-home` did not exist,
- green: focused dashboard home test passed after adding the contract renderer,
- focused app shell plus dashboard home tests passed,
- TypeScript passed after integration.

Boundary kept:

- dashboard home formats contract metrics but does not query source facts,
- no page-local business totals,
- no live source pulls,
- no database calls,
- no old dashboard selectors,
- no source-system mutation.

Next action:

- run full `npm run build`, audit, diff, and punctuation checks,
- commit and push P6-B,
- close GitHub `#57`.

### Checkpoint: P6-C Projects Table And CSV Export

Phase: 6

Tickets: `#58`, partial `#60`

Status: implemented locally, push-blocking verification pending

What changed:

- added `/dashboard/projects` route with explicit scope parsing from query params,
- added Projects table component rendered from `contract.visibleRows`,
- added active scope chips for office/from/to/department/role/client/search,
- added row-type badges for matched, Float-only, Pipeline-only, and Production Revenue-only rows,
- added scoped project links preserving office/from/to and job number,
- added footer row rendered from `contract.footerTotals`,
- added CSV text and data URI helpers rendered from `contract.csvRows`,
- expanded `scripts/verify-phase6.mjs` with P6-C file and marker checks.

TDD evidence:

- red: Projects and CSV tests failed because `projects-table` and `csv-export` did not exist,
- green: focused Projects and CSV tests passed after adding the contract renderers,
- Next build initially failed on exact optional scope assignment, then passed after scope assignment was made explicit,
- focused Projects and CSV tests plus Next build passed.

Boundary kept:

- Projects table renders contract rows and contract footer totals,
- CSV export renders contract CSV rows,
- exact `client` and fuzzy `search` stay separate query params,
- source-only rows stay visible,
- no page-local business totals,
- no live source pulls,
- no database calls,
- no old dashboard selectors,
- no source-system mutation.

Next action:

- run full `npm run build`, audit, diff, and punctuation checks,
- commit and push P6-C,
- close GitHub `#58`.

### Checkpoint: P6-D Project Detail And Float Diagnostics

Phase: 6

Tickets: `#56`, partial `#60`

Status: implemented locally, push-blocking verification pending

What changed:

- extended deterministic Float fixture evidence for BT raw-without-cache and UCS05186 duplicate/manual visibility,
- added project detail component and `/dashboard/projects/[jobNumber]` route,
- added Float diagnostics component plus `/dashboard/float` and `/dashboard/float/[floatProjectId]` routes,
- project detail renders KPI cards, scope, back link, Float reconciliation checks, and source trace from contract evidence,
- Float diagnostics renders fee-sheet and Float IDs, raw/cache/visible checks, PCS00250, BT raw/cache, UCS04787, UCS05186, and archived/manual candidate states,
- expanded `scripts/verify-phase6.mjs` with P6-D file and marker checks.

TDD evidence:

- red: project detail and Float diagnostics tests failed because the components did not exist,
- green: focused tests passed after adding contract-backed components,
- project detail first exposed a fixture capability gap where department-scoped detail lost Float hours, fixed by adding department attribution to the deterministic UCS04787 Float facts,
- Next build passed after adding the routes,
- focused project detail, Float diagnostics, and Projects tests passed,
- TypeScript passed after integration.

Boundary kept:

- project detail and Float diagnostics use display contract rows and reconciliation checks,
- fixture gaps are labelled as pending rather than invented live comparisons,
- no archive action,
- no sync action,
- no Float mutation,
- no live source pulls,
- no database calls,
- no old dashboard selectors.

Next action:

- run full `npm run build`, audit, diff, and punctuation checks,
- commit and push P6-D,
- close GitHub `#56`.

### Checkpoint: P6-E Data Quality, Approval, And Glossary

Phase: 6

Tickets: `#59`, partial `#60`

Status: implemented locally, push-blocking verification pending

What changed:

- added Data Quality dashboard component and `/dashboard/data-quality` route,
- added Approval Audit component and `/dashboard/approval` route,
- added Glossary route,
- Data Quality shows FAIL, WARN, and UNRESOLVED states, named user checks, owners, and `Needs Codex`,
- Approval uses `buildApprovalOutputFromDisplayContract`,
- Glossary explains unsupported vs zero, source-only rows, confidence, scope, and `Needs Codex`,
- expanded `scripts/verify-phase6.mjs` with P6-E file and marker checks.

TDD evidence:

- red: Data Quality and Approval tests failed because the components did not exist,
- green: focused tests passed after adding contract-backed components,
- Next build passed after adding the routes.

Boundary kept:

- Data Quality and Approval render contract warnings, reconciliation, and approval output,
- no separate approval total model,
- no source mutation,
- no live source pulls,
- no database calls,
- no old dashboard selectors.

Next action:

- run full `npm run build`, audit, diff, and punctuation checks,
- commit and push P6-E,
- close GitHub `#59`.

### Checkpoint: P6-F Chat Shell

Phase: 6

Tickets: `#61`, partial `#60`

Status: implemented locally, push-blocking verification pending

What changed:

- added read-only chat shell component,
- added deterministic `/dashboard/chat-demo` route,
- chat shell renders active scope, working state, evidence sources, confidence, warnings, and `Needs Codex` reasons,
- expanded `scripts/verify-phase6.mjs` with P6-F file and marker checks.

TDD evidence:

- red: chat shell test failed because `chat-shell` did not exist,
- green: focused chat shell test passed after adding the shell,
- Next build passed after adding the demo route.

Boundary kept:

- chat shell does not run tools,
- chat shell does not generate diagnostic claims,
- chat shell does not mutate, sync, deploy, or call live sources,
- Phase 7 remains responsible for `EvidencePack`, read-only tools, claim guard, and investigation orchestration.

Next action:

- run full `npm run build`, audit, diff, and punctuation checks,
- commit and push P6-F,
- close GitHub `#61`.

### Checkpoint: P6-H Scope Blocker Fix

Phase: 6

Tickets: `#60`, `#62`

Status: blocker fixed locally, final verification pending

Doctrine Steward blocker:

- P6-H review found that `/dashboard/float`, `/dashboard/float/[floatProjectId]`, `/dashboard/chat-demo`, `/dashboard/data-quality`, `/dashboard/approval`, and `/dashboard/glossary` dropped query scope back to default fixture scope.

What changed:

- added shared `scopeFromSearchParams` helper,
- added scope preservation tests for destination page query params and route identity overrides,
- rewired Projects, project detail, Float, Float trace, Data Quality, Approval, Glossary, and chat demo routes to use the shared scope parser,
- expanded `scripts/verify-phase6.mjs` with scope parser and route scope markers.

TDD evidence:

- red came from P6-H Doctrine Steward review rather than a unit failure,
- added regression tests for scope parser,
- focused scope, chat, Float, Data Quality, and Approval tests passed,
- Next build passed and now marks destination pages dynamic because they preserve search params.

Boundary kept:

- scope is parsed from URL params only,
- no live source pulls,
- no database calls,
- no old dashboard selectors,
- no source-system mutation.

Next action:

- run full `npm run build`, audit, diff, and punctuation checks,
- commit and push the blocker fix,
- rerun P6-H Doctrine Steward review.

### Checkpoint: P6-H Root Dashboard Scope Blocker Fix

Phase: 6

Tickets: `#60`, `#62`

Status: accepted by Doctrine Steward, commit pending

Doctrine Steward blocker:

- the first P6-H review accepted the named destination route fix but found that root `/dashboard` still hard-coded the default LDN Q1 fixture scope.

What changed:

- added a route-level regression test that renders `/dashboard` with explicit `office`, `from`, `to`, `department`, `role`, `client`, `search`, and `jobNumber` params,
- rewired root `/dashboard` to accept `searchParams` and build its contract through `scopeFromSearchParams`,
- expanded `scripts/verify-phase6.mjs` so the root dashboard route must include both `searchParams` and `scopeFromSearchParams`.

TDD evidence:

- red: `npm run test -- tests/ui/app-shell.test.ts` failed because the route still rendered `2026-03-31` instead of the requested `2026-12-31`,
- green: the same focused test passed after the route used the shared scope parser,
- full gate: `npm run build` passed with 38 test files, 111 passing tests, 85 todo tests, TypeScript, Next build, and Phase 6 verifier,
- hygiene: `npm audit --omit=dev`, `git diff --check`, and the punctuation scan passed.

Doctrine evidence:

- second P6-H read-only review returned `ACCEPTED`,
- reviewer found no remaining Phase 6 scope leak,
- reviewer found no Supabase, live source reads, old selector use, database reads, fetch calls, or mutation paths in the Phase 6 UI surface.

Remaining Phase 6 warnings:

- Phase 6 has deterministic render tests but no Playwright browser run yet,
- 85 law and scenario tests remain as todo anchors for later real-data phases,
- verifier marker checks are supported by behavior tests, but are not AST-level proofs.

Next action:

- commit and push the root dashboard scope fix,
- close `#60`, `#62`, and parent `#7`,
- move into Phase 7 chat evidence agent work.

### Checkpoint: Phase 6 Closed And Phase 7 Ticketed

Phase: 7

Tickets: parent `#8`, child tickets `#63` through `#69`

Status: ticketed, implementation starting

Phase 6 closure evidence:

- commit `6990837` pushed to `origin/main`,
- GitHub CI run `26174344575` passed,
- `#60`, `#62`, and parent `#7` were closed with evidence comments.

Phase 7 child tickets:

- `#63` Evidence Pack, Stream Events, And Needs Codex Types,
- `#64` Playbook Router And Required Evidence Plans,
- `#65` Read-only Tactical Tools And Investigation Orchestrator,
- `#66` Claim Guard And Evidence-only Reporter,
- `#67` Chat API Route, Progress Events, And UI Evidence Trace,
- `#68` Phase 7 Verification Gate And Trap Prompt Suite,
- `#69` Doctrine Review Gate For Chat Evidence Agent.

Boundary for Phase 7:

- chat can investigate only by building an `EvidencePack`,
- chat tools are read-only,
- reporter prose can use only the evidence pack,
- source conflicts become unresolved checks,
- tool failures become evidence warnings,
- Needs Codex is required for repo, browser, mutation, sync, deploy, stakeholder, or incomplete-evidence work.

Next action:

- implement `#63` with tests first.

### Checkpoint: P7-A Evidence Pack Types

Phase: 7

Ticket: `#63`

Status: implemented locally, push-blocking verification pending

What changed:

- added typed `EvidencePack`, `ChatToolRun`, `EvidenceFact`, `EvidenceCheck`, `UnresolvedCheck`, `NeedsCodexDecision`, and `ChatStreamEvent` contracts,
- added `createEvidencePack` normalisation,
- added `recordToolError` so tool failures become warnings, unresolved checks, low confidence, and `Needs Codex`,
- added `needsCodexForTriggers`,
- added `evidenceEventFromPack` for compact evidence stream events without dropping warnings,
- added module entrypoints under `src/lib/chat`.

TDD evidence:

- red: `npm run test -- tests/chat/evidence-pack.test.ts` failed because `src/lib/chat` did not exist,
- green: focused evidence pack tests passed after implementation,
- typecheck passed after fixing exact optional property handling around `needsCodex`.

Boundary kept:

- no model call,
- no live source pull,
- no database call,
- no sync or deploy action,
- no mutation path,
- no reporter prose yet.

Next action:

- run full `npm run test`,
- commit and push P7-A,
- close `#63` after CI.

### Checkpoint: P7-B Playbook Router

Phase: 7

Ticket: `#64`

Status: implemented locally, push-blocking verification pending

What changed:

- added deterministic chat playbook definitions,
- added `routePlaybook` and `getPlaybook`,
- mapped named trap prompts to fixed evidence plans,
- mapped archive, sync-now, deploy, browser, code, and stakeholder requests to `Needs Codex`,
- activated chat law tests for false zero-hours traps and mutation handoff.

TDD evidence:

- red: `npm run test -- tests/chat/playbooks.test.ts` failed because `routePlaybook` and `getPlaybook` did not exist,
- first green attempt exposed a real routing bug where `sync Float now` was swallowed by the Float mismatch route,
- green: focused playbook and chat-law tests passed after the handoff trigger checked sync requests that include `now` or `run`,
- typecheck passed.

Boundary kept:

- routing is deterministic keyword logic,
- no model-only classification,
- no tool execution yet,
- no live source pull,
- no database call,
- no mutation path.

Next action:

- run full `npm run test`,
- commit and push P7-B,
- close `#64` after CI.

### Checkpoint: P7-C Tactical Tools And Orchestrator

Phase: 7

Ticket: `#65`

Status: implemented locally, push-blocking verification pending

What changed:

- added read-only tactical tool registry,
- added deterministic tool execution against fixture display contract and fixture fact set,
- added `runInvestigation` orchestration over required playbook tools,
- serial tools accumulate into the same `EvidencePack`,
- missing pasted Float export becomes unresolved evidence and triggers `Needs Codex`,
- simulated tool failures become warnings and unresolved checks instead of thrown answers.

TDD evidence:

- red: `npm run test -- tests/chat/orchestrator.test.ts` failed because `executeReadOnlyTool`, `listReadOnlyToolNames`, and `runInvestigation` did not exist,
- green: focused orchestrator tests passed after implementation,
- typecheck initially caught exact optional property mistakes around optional metric values,
- green: focused orchestrator tests and typecheck passed after optional values were only emitted when present.

Boundary kept:

- tools read from fixture display contract and archived fixture facts only,
- no live source pull,
- no database call,
- no old dashboard selector,
- no mutation tool,
- no sync or deploy action.

Next action:

- run full `npm run test`,
- commit and push P7-C,
- close `#65` after CI.

### Checkpoint: P7-D Claim Guard And Reporter

Phase: 7

Ticket: `#66`

Status: implemented locally, push-blocking verification pending

What changed:

- added claim guard with blocked-claim codes,
- added evidence-only reporter,
- blocked false zero-hours claims when the evidence pack contains nonzero hours,
- blocked dashboard-bug claims unless there is a failed evidence check,
- blocked confirmed Float mismatch language when required Float layers are missing or unresolved,
- activated Law 9 chat evidence-boundary tests for false-zero, tool-error, serial Float evidence, and Needs Codex handoff.

TDD evidence:

- red: `npm run test -- tests/chat/claim-guard.test.ts` failed because `validateEvidenceClaims` and `generateEvidenceReport` did not exist,
- green: focused claim-guard tests passed after implementation,
- focused Law 9 tests and typecheck passed.

Boundary kept:

- reporter receives only the `EvidencePack`,
- reporter does not run tools,
- reporter does not upgrade confidence,
- unresolved checks stay visible,
- warnings stay visible,
- no live source pull,
- no database call,
- no mutation path.

Next action:

- run full `npm run test`,
- commit and push P7-D,
- close `#66` after CI.

### Checkpoint: P7-E Chat Route And Evidence UI

Phase: 7

Ticket: `#67`

Status: implemented locally, push-blocking verification pending

What changed:

- added `/api/chat` route,
- route returns backward-compatible server-sent events,
- stream includes status, investigation, tool start, tool result, evidence, Needs Codex, and text events,
- route delegates investigation to the Phase 7 orchestrator and reporter,
- added `ChatEvidenceTrace`,
- chat shell now renders unresolved checks as well as sources, warnings, confidence, and Needs Codex.

TDD evidence:

- red: route/UI tests failed because `/api/chat` did not exist and chat evidence did not render unresolved checks,
- green: focused chat route and chat shell tests passed after implementation,
- typecheck passed.

Boundary kept:

- route has no model call,
- route has no live source pull,
- route has no database call,
- route has no mutation, sync, or deploy action,
- route streams only deterministic evidence-pack output.

Next action:

- run `npm run build`,
- commit and push P7-E,
- close `#67` after CI.

### Checkpoint: P7-F Verification Gate

Phase: 7

Ticket: `#68`

Status: implemented locally, push-blocking verification passed

What changed:

- added `scripts/verify-phase7.mjs`,
- added `verify:phase7`,
- rewired `npm run build` to run the Phase 7 gate,
- added verifier tests for package script wiring and chat evidence boundary markers,
- verifier checks required chat files, required trap tests, forbidden live source/model/mutation paths, and required evidence-agent markers.

TDD evidence:

- red: `npm run test -- tests/chat/phase7-verifier.test.ts` failed because `verify:phase7` and `scripts/verify-phase7.mjs` did not exist,
- green: focused verifier tests passed after adding the script and package wiring,
- full gate: `npm run build` passed with 46 test files, 148 passing tests, 79 todo tests, typecheck, Next build, and Phase 7 verifier,
- hygiene: `npm audit --omit=dev`, `git diff --check`, and punctuation scan passed.

Boundary kept:

- verifier blocks old dashboard selector references in chat,
- verifier blocks Supabase and Google source clients in chat,
- verifier blocks mutation-style tool execution,
- verifier blocks sync and deploy tool execution,
- verifier blocks model API references in chat.

Next action:

- commit and push P7-F,
- close `#68` after CI,
- run P7-G Doctrine Steward review.

### Checkpoint: P7-G Doctrine Blocker Fix

Phase: 7

Tickets: `#68`, `#69`

Status: blocker fixed locally, final review pending

Doctrine Steward blockers:

- route streamed reporter text even if the claim guard blocked the report,
- required tactical tools could fall through to a generic empty pass,
- high-confidence wording was not blocked when required evidence was missing,
- Phase 7 verifier did not catch those failures.

What changed:

- route now streams an error event instead of text when `report.guard.status` is blocked,
- unsupported fixture-backed tools now return unresolved evidence with `TOOL_NOT_FIXTURE_BACKED`,
- claim guard blocks high-confidence wording when unresolved required evidence exists,
- reporter accepts an optional draft override so route-bound guard blocking can be tested directly,
- Phase 7 verifier now checks for route guard enforcement, missing-tool unresolved evidence, and high-confidence missing-evidence guard markers.

TDD evidence:

- red: route, orchestrator, claim guard, and verifier tests failed against the Doctrine Steward blockers,
- green: focused blocker tests passed,
- full gate: `npm run build` passed with 46 test files, 151 passing tests, 79 todo tests, typecheck, Next build, and Phase 7 verifier.

Boundary kept:

- unimplemented required tools do not pretend to have evidence,
- blocked reports do not stream final text,
- missing evidence lowers confidence and triggers Needs Codex,
- no live source pull,
- no database call,
- no mutation, sync, or deploy action.

Next action:

- run hygiene checks,
- commit and push blocker fix,
- rerun P7-G Doctrine Steward review.

### Checkpoint: Phase 7 Closed And Phase 8 Ticketed

Phase: 8

Tickets: parent `#9`, child tickets `#70` through `#76`

Status: ticketed, implementation not started

Phase 7 closure evidence:

- commit `e8da4bd` pushed to `origin/main`,
- GitHub CI run `26177030195` passed,
- final P7-G Doctrine Steward re-review returned `ACCEPTED`,
- `#68`, `#69`, and parent `#8` were closed with evidence comments.

Phase 8 child tickets:

- `#70` Environment And Supabase Readiness Gate,
- `#71` New Supabase Schema Law Gate,
- `#72` Read-only Source Snapshot Import,
- `#73` Old vs New vs Source Dual-run Comparator,
- `#74` Named Sian Yunni Jade Scenario Report,
- `#75` Real-data UI Screenshot And Click Proof,
- `#76` Phase 8 Verification And Doctrine Gate.

Boundary for Phase 8:

- old database output is comparison evidence only,
- new display contract remains the only new UI authority,
- real sources enter through source archive/snapshot evidence,
- no source mutation,
- no migrations against old production,
- no deploy,
- no committed secrets.

Next action:

- implement `#70` before any schema, import, or dual-run code.

### Checkpoint: P8-A Environment And Supabase Readiness

Phase: 8

Ticket: `#70`

Status: ready with warnings, push-blocking verification pending

What changed:

- added a pure environment readiness analyser,
- added tests proving it redacts values, separates rebuild Supabase from legacy comparison DB, fails old/reused DB URLs, and fails non-read-only mutation guard,
- inspected local `.env.local` without printing secrets,
- confirmed `.env.local` and `supabase/.temp` are ignored and untracked,
- confirmed Supabase CLI is linked to project ref `nxrzhwqsswhjgeouxsyr`,
- confirmed Supabase project list reports `UCS-DATA-INTEGRITY-REBUILD` in `ap-northeast-2` as active and healthy.

Local readiness result:

- status: `warn`,
- pass: `DATABASE_URL` points at new rebuild Supabase ref,
- pass: `NEXT_PUBLIC_SUPABASE_URL` points at new rebuild Supabase ref,
- pass: `LEGACY_DATABASE_URL` is distinct from rebuild database,
- pass: service role, anon key, Float key, Google service account, fee tracker ID, and mutation guard are present,
- pass: `MUTATION_GUARD` is `read_only`,
- warn: `PIPELINE_SHEET_ID` is missing,
- warn: `PRODUCTION_REVENUE_SHEET_ID` is missing.

Supabase probe notes:

- `supabase status --linked` is not a valid CLI flag in this installed version,
- a read-only `supabase db dump --schema public --data-only` probe started pulling a Postgres Docker image and was stopped before being used for schema or data evidence,
- no migration, reset, push, sync, or source mutation command was run.

Boundary kept:

- no secrets committed,
- no secret values logged into tracked files,
- no migrations against old production,
- no data import,
- no source-system mutation,
- old DB remains comparison evidence only through `LEGACY_DATABASE_URL`.

Next action:

- run full tests and typecheck,
- commit and push P8-A,
- close `#70` after CI with warnings,
- do not begin `#72` source import until Pipeline and Production Revenue sheet IDs are resolved or intentionally mapped elsewhere.

### Checkpoint: P1-I Deterministic Fixture Screenshot States

Phase: 1

Ticket: `#25`

Status: implemented locally, verification pending

What changed:

- added deterministic fixture screenshot proof in `reference/ui/fixture-app`,
- added a manifest test that requires every Sian/Yunni/Jade fixture state to have a screenshot and named fixture rows,
- captured deterministic pages for rollups, unsupported department scope, Projects row variants, exact client vs fuzzy search, project detail, Float diagnostics, chat states, and Data Quality named checks,
- added a project-detail missing-role-allocation state so missing role evidence is shown as unavailable, not silently zero,
- added static Float Export Compare fixture states for empty export, pasted sample, ambiguous match, and dashboard-only rows.

Local verification:

- `npm test -- tests/ui/fixture-screenshot-reference.test.ts tests/ui/float-diagnostics.test.ts tests/ui/chat-shell.test.ts tests/ui/project-detail.test.ts`
- `npm run typecheck`

Boundary kept:

- fixture screenshots are visual proof only,
- no live source data or secrets are committed,
- no source system mutation, sync, deployment, or migration was run.

### Checkpoint: P9-F Acceptance Report Guard

Phase: 9

Ticket: `#82`

Status: drafted as not-ready report, deploy evidence still blocked by `#81`

What changed:

- added `docs/FINAL_ACCEPTANCE_REPORT.md`,
- recorded current launch status as `NOT READY`,
- separated code/CI, Railway staging, live health, live readiness, source approval, and stakeholder approval,
- listed current Railway blocker `RAILWAY_PROJECT_NOT_LINKED`,
- guarded the report with `tests/launch/final-acceptance-report.test.ts`,
- wired the report and its test into `scripts/verify-phase9.mjs`.

Boundary kept:

- no Railway project, service, variable, deployment, or domain mutation,
- no source system mutation,
- no secrets in the report,
- `#82` remains open until staging deploy and live health/readiness evidence exist.

### Checkpoint: P9-E/P9-F Staging Deployment

Phase: 9

Tickets: `#81`, `#82`

Status: staging deployed, source and stakeholder approval still pending

What changed:

- Railway target is linked to project `UCS Data Integrity Rebuild`, service `ucs-data-integrity-rebuild`, environment `staging`,
- old `ucs-data-integrity-dashboard` target was not touched,
- staging variables were set from local `.env.local` using stdin without printing values,
- `APP_ENV` was set to `staging`,
- `NODE_ENV` and `DATABASE_URL_TEST` stayed local-only,
- empty optional `PIPELINE_SHEET_ID` and `PRODUCTION_REVENUE_SHEET_ID` were not pushed as blank variables,
- initial CLI deployment `c823163d-4f4b-4571-8347-e63ed88032e4` succeeded,
- GitHub auto-deploy deployment `96d3cc9a-bba7-4519-a2cd-e88d7b969f28` then succeeded from `main`,
- Railway-generated staging URL is `https://ucs-data-integrity-rebuild-staging.up.railway.app`,
- `docs/FINAL_ACCEPTANCE_REPORT.md` was updated from blocked to staging deployed.

Live verification:

- `/api/health` returned `status: ok`, `environment: staging`, and commit `d15cbb2ef655830a4319e73fd5e763e7e4525e01`,
- `/api/readiness` returned `status: pass`, no blockers, and no warnings,
- `/dashboard` returned HTTP 200 HTML,
- deployment logs showed the Next.js server ready,
- no suspicious missing-env, database, exception, or runtime-failure lines were found,
- a non-blocking npm warning appeared in logs: `npm warn config production Use --omit=dev instead`.

Boundary kept:

- no production domain cutover,
- no source sync,
- no Supabase migrations,
- no source-system mutation,
- old dashboard remains rollback/reference until source and stakeholder approval.
