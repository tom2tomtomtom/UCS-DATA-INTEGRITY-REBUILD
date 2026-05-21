# End Game Plan

Created: 2026-05-21

This is the handoff plan for taking the UCS Data Integrity Rebuild from deployed staging shell to a source-approved, stakeholder-approved dashboard with all live data.

If this document conflicts with another plan, apply the stricter data-integrity rule. A green deploy is not approval. A passing fixture test is not source approval. A clean-looking UI is not evidence that the four sources agree.

## The End State

The rebuild is finished only when all of the following are true:

- every non-empty row from the four truth streams is captured as source evidence,
- dirty data is imported and surfaced, not corrected or hidden,
- every visible dashboard number can trace back to source evidence,
- all dashboard pages, CSV exports, in-dashboard checks, and chat answers read from the same display contract,
- unsupported values are labelled as unsupported, not rendered as zero,
- source disagreements stay visible as the product, not as bugs to be smoothed away,
- Sian, Jade, and Yunni have reviewed their named workflows against staging evidence,
- production cutover has explicit approval after source and UI approval,
- the old dashboard is no longer needed as a manual cross-check for Sian.

The goal is not a prettier old dashboard. The goal is a trustworthy source-traceable reconciliation dashboard with the same recognisable UX and at least the same drilldown granularity.

## Current Verified State

Baseline before this document:

- repo: `/Users/tommyhyde/UCS-DATA-INTEGRITY-REBUILD`,
- branch: `main`,
- latest implementation commit: `158f0c1 Add rollup footer export contract`,
- local branch was clean and in sync with `origin/main`,
- CI passed on commit `158f0c1`,
- Railway staging deploy passed on commit `158f0c1`,
- Railway project: `UCS Data Integrity Rebuild`,
- Railway service: `ucs-data-integrity-rebuild`,
- Railway environment: `staging`,
- staging URL: `https://ucs-data-integrity-rebuild-staging.up.railway.app`,
- `npm run verify:phase9` had passed before the latest doc-only work,
- the rebuild Supabase project is distinct from the legacy dashboard database,
- old database access is comparison-only via `LEGACY_DATABASE_URL`.

Important current non-ready state:

- full live data import into rebuild Supabase is not complete,
- staging is not yet fully powered by imported live source DB tables,
- source-owner approval is not complete,
- stakeholder approval is not complete,
- production cutover is blocked,
- scheduled sync is not approved,
- source mutation is not approved,
- four named warning scenarios still require source/display classification before approval:
  - `UCS04787`,
  - `UCS05186`,
  - `PCS00250`,
  - `bt-raw-without-cache`.

## People And Their Approval Questions

### Sian

Sian owns the commercial trust question.

She needs to see:

- Sold vs Allocated at rollup level,
- the same scoped number when she clicks into Projects,
- the same scoped number when she clicks into Project Detail,
- pipeline only where it can be attributed,
- production revenue visible even when source archive state is wrong,
- project rows, footers, exports, and UI totals agreeing under the same scope.

Sian approval question:

> Can I use this dashboard instead of opening the source sheets to check whether Sold, Pipeline, Production Revenue, and Float disagree?

### Jade

Jade owns Pipeline.

She needs to see:

- her Pipeline rows surfaced exactly,
- TBC rows preserved with row identity,
- pipeline values not falsely attributed into department or role slices,
- pipeline rows with no sold match shown as source-only or pipeline-only evidence.

Jade approval question:

> Are my Pipeline rows present, traceable, and only attributed where the source data supports that attribution?

### Yunni

Yunni owns Float.

She needs to see:

- Float allocated and unallocated hours tied to the correct Float project ID,
- fee-sheet first-tab Float ID used as canonical join evidence when present,
- manual duplicates and archived Float projects exposed as conflicts,
- raw Float, cache, visible dashboard rows, and live Float evidence separated,
- Float-only and duplicated rows visible instead of silently removed.

Yunni approval question:

> Can I trust the dashboard to show what Float says, including wrong links and orphan allocations, without quietly choosing the wrong Float project?

## Scope Freeze

Until this plan exits, all work must be classified before it starts.

### Blocker

Blocks source approval, stakeholder approval, or production cutover.

Examples:

- full source rows cannot be imported,
- a source stream is missing,
- source rows are silently dropped,
- a UI number does not match the display contract,
- a CSV number does not match the visible rows,
- chat makes unsupported claims,
- a named Sian, Jade, or Yunni scenario is unresolved,
- old DB is accidentally treated as product truth.

### Trust Gap

Does not block staging development, but must be resolved or explicitly accepted before stakeholder approval.

Examples:

- a WARN state is real but needs explanation,
- UI parity is slightly weaker than old app granularity,
- source owner has not reviewed a named workflow,
- TODO tests exist for laws now covered elsewhere but not retired or implemented,
- a screenshot route is not yet captured.

### Polish

Helpful, but not allowed to delay the data path.

Examples:

- visual refinement,
- extra filters beyond legacy parity,
- nicer copy,
- extra chat niceties,
- convenience controls.

Rule: no polish can jump ahead of import, display contract, named scenario proof, UI parity, and approval gates.

## Immutable Laws For The End Game

These are the laws another developer must follow even under pressure.

1. Sources win.
   If the dashboard and the source sheets disagree, the dashboard is wrong or the disagreement is a visible source conflict.

2. Dirty data is data.
   Bad job numbers, duplicates, orphan Float allocations, archived-but-real revenue, and TBC pipeline rows must be imported or explicitly recorded as skipped with an allowed reason.

3. No silent reconciliation.
   The app must not choose between disagreeing sources without preserving the disagreement.

4. Raw rows are not totals.
   Parser rows can only become additive totals when their additive meaning is proven and encoded.

5. Unsupported is not zero.
   If a source cannot attribute a metric to department, role, client, or project, the UI must show `Unsupported`, not `0`.

6. One display contract.
   Pages, footers, CSV, charts, in-dashboard tests, approval output, and chat must consume the same display contract or an explicit derived view of it.

7. Scope must survive every click.
   `office`, `from`, `to`, `department`, `role`, exact `client`, `jobNumber`, and search state must survive rollup, Projects, Project Detail, CSV, and chat investigation where relevant.

8. Old dashboard is comparison-only.
   It can explain why users expect something, but it is not truth.

9. Chat is read-only evidence, not a second dashboard.
   It can investigate, cite sources, show warnings, and say `Needs Codex`. It cannot mutate source data, trigger sync, archive, deploy, or invent findings.

10. Approval is explicit.
    No source owner approval, no stakeholder approval, and no production cutover can be inferred from CI, deploy health, or fixture screenshots.

## Current Architecture Map

### Source Archive And Import

Relevant files:

- `src/lib/source-archive/types.ts`,
- `src/lib/source-archive/source-pull.ts`,
- `src/lib/source-archive/row-classifier.ts`,
- `src/lib/source-archive/archive-store.ts`,
- `src/lib/source-import/snapshot-import.ts`,
- `src/lib/source-import/snapshot-lifecycle.ts`,
- `scripts/create-source-snapshot.mjs`,
- `scripts/lib/live-source-snapshot.mjs`,
- `scripts/dry-run-source-import.mjs`.

Current state:

- read-only source snapshot machinery exists,
- dry-run import classification exists,
- snapshot artifacts are local and ignored,
- DB-writing import for the full live dataset is not yet complete or approved.

End-game requirement:

- add or complete a write import path that loads the rebuild Supabase staging database from a full source snapshot,
- keep it batch-based and traceable,
- keep the raw source rows immutable,
- never write back to Google Sheets, Float, or old dashboard DB.

### Parsers

Relevant files:

- `src/lib/parsers/fee-sheet.ts`,
- `src/lib/parsers/pipeline.ts`,
- `src/lib/parsers/production-revenue.ts`,
- `src/lib/parsers/float.ts`,
- `src/lib/parsers/types.ts`.

End-game requirement:

- parser facts must carry source row IDs,
- parser warnings must survive into Data Quality and approval output,
- additive status must be explicit,
- fee-sheet zero-fee nonzero-hour rows must not be dropped,
- V-tab and CLIENT SUMMARY disagreements must be preserved or flagged, not silently resolved.

### Canon Queries

Relevant files:

- `src/lib/canon-queries/sold.ts`,
- `src/lib/canon-queries/pipeline.ts`,
- `src/lib/canon-queries/production-revenue.ts`,
- `src/lib/canon-queries/float.ts`,
- `src/lib/canon-queries/capabilities.ts`,
- `src/lib/canon-queries/scope.ts`,
- `src/lib/canon-queries/source-fact-set.ts`.

End-game requirement:

- canon queries return source facts, not UI rows,
- canon queries preserve source-only rows,
- canon queries expose capability metadata for unsupported fields,
- canon queries must be backed by imported source evidence, not fixture-only rows, for final approval.

### Display Contract

Relevant files:

- `src/lib/display/contract.ts`,
- `src/lib/display/project-rows.ts`,
- `src/lib/display/rollups.ts`,
- `src/lib/display/project-detail-view.ts`,
- `src/lib/display/csv.ts`,
- `src/lib/display/rollup-export.ts`,
- `src/lib/display/approval-output.ts`,
- `src/lib/display/traces.ts`,
- `src/lib/display/float-reconciliation.ts`,
- `src/lib/display/float-export-compare.ts`.

Current state:

- the fixture display contract and several scope leaks have been fixed,
- Project Detail maths has moved into display layer helpers,
- rollup footer and export contracts have been added,
- fixture evidence can no longer pretend to be live Float evidence.

End-game requirement:

- every app route must consume the DB-backed display contract,
- no page may calculate business totals locally,
- rollup, Projects, Project Detail, CSV, approval, data quality, and chat must show the same scoped truth.

### UI

Relevant files:

- `src/app/dashboard`,
- `src/lib/ui/scope-params.ts`,
- `src/lib/ui/projects-view-state.ts`,
- `src/lib/ui/ui-proof.ts`,
- `src/lib/ui/fixture-contract.ts`,
- `docs/phase-9-5/legacy-ui-ux-spec.md`,
- `docs/phase-9-5/ui-parity-acceptance-checklist.md`,
- `docs/UX_PARITY_REQUIREMENTS.md`.

End-game requirement:

- keep the approved old UX recognisable,
- allow only small improvements that make source truth clearer,
- preserve granularity at least equal to the old app,
- do not preserve old behaviour that violates a data law,
- capture UI proof against staging and against deterministic fixtures.

### Chat

Relevant files:

- `src/lib/chat/evidence.ts`,
- `src/lib/chat/orchestrator.ts`,
- `src/lib/chat/playbooks.ts`,
- `src/lib/chat/tactical-tools.ts`,
- `src/lib/chat/claim-guard.ts`,
- `src/lib/chat/reporter.ts`,
- `src/lib/chat/needs-codex.ts`,
- `docs/CHAT_INVESTIGATION_AGENT_SPEC.md`.

End-game requirement:

- chat answers from an evidence pack,
- every important claim carries source-layer evidence,
- tool errors become warnings or unresolved checks,
- chat must say when Codex is needed for repo, browser, deploy, source mutation, or unsupported investigation,
- chat must never be allowed to write data or trigger production actions.

## End Game Workstreams

The rest of the build should run as these workstreams. They are ordered by dependency, not by taste.

### Workstream A: Freeze And Triage

Goal:

- stop the build becoming another roaming issue hunt,
- create one current blocker list,
- separate blocker, trust gap, and polish.

Actions:

1. Run current gates.
2. Count TODO, skipped, and failing tests.
3. Classify each TODO as:
   - implemented elsewhere and safe to retire,
   - required blocker,
   - trust gap,
   - future polish.
4. Open or update tickets for blocker items only.
5. Do not start new UX work until import and display contract gates are clear.

Commands:

```bash
npm run verify:phase9
rg -n "\\.todo|TODO|it\\.skip|describe\\.skip" tests src scripts
git status --short --branch
```

Pass gate:

- repo is clean after any doc or ticket updates,
- no failing tests,
- TODOs are classified,
- current blockers are written down.

Fail gate:

- any failing test,
- any unclassified TODO that touches a law,
- any new feature request accepted without blocker classification.

### Workstream B: Full Source Snapshot

Goal:

- create a complete read-only source snapshot from staging credentials for all four truth streams.

Actions:

1. Verify Railway target before using any secrets.
2. Run a small targeted snapshot first.
3. Run a full snapshot without the `--max-rows 100` cap for final approval.
4. Record row counts by stream.
5. Record unresolved Float scenario targets.
6. Save artifacts under `test-results/source-snapshots/`, which is ignored by git.

Commands:

```bash
railway status
railway run --service ucs-data-integrity-rebuild --environment staging npm run source:snapshot:create -- --out test-results/source-snapshots/targeted.json --max-rows 100 --float-scenario-codes UCS04787,UCS05186,UCS04154,PCS00250,BT --float-project-ids 10480262
railway run --service ucs-data-integrity-rebuild --environment staging npm run source:snapshot:create -- --out test-results/source-snapshots/full-live.json
SOURCE_SNAPSHOT_FILE=test-results/source-snapshots/full-live.json npm run source:approval:readiness
```

Pass gate:

- snapshot exists,
- all four streams have rows or explicit stream blockers,
- row counts are non-zero where the source is expected to be populated,
- source snapshot readiness passes for the artifact,
- no secret values are printed.

Fail gate:

- any source stream missing without an explicit blocker,
- Float scenarios cannot be resolved and are not recorded as blockers,
- snapshot command prints secrets,
- source row count looks capped for final approval.

### Workstream C: Import Into Rebuild Supabase Staging

Goal:

- load all source evidence into rebuild Supabase staging without mutating sources or legacy DB.

Current important gap:

- there is dry-run import machinery, but full DB write import must be completed or verified before this gate can pass.

Actions:

1. Dump the current rebuild Supabase schema before migrations.
2. Verify migration files against current schema.
3. Apply required migrations only after explicit approval.
4. Implement or finish an idempotent snapshot-to-DB import command.
5. Import `test-results/source-snapshots/full-live.json` into staging.
6. Verify batch IDs, row counts, skipped-row ledger, and immutable raw rows.
7. Keep legacy DB comparison-only.

Commands:

```bash
supabase db dump --linked --schema public --file /tmp/ucs-rebuild-public-before.sql
npm test -- tests/schema/schema-law-gate.test.ts tests/source-import/snapshot-import.test.ts
node scripts/dry-run-source-import.mjs test-results/source-snapshots/full-live.json
```

Expected new or completed command:

```bash
node scripts/import-source-snapshot.mjs test-results/source-snapshots/full-live.json --target staging --dry-run
node scripts/import-source-snapshot.mjs test-results/source-snapshots/full-live.json --target staging
```

Pass gate:

- imported source batch exists,
- raw row counts equal snapshot row counts minus allowed skipped rows,
- skipped rows have explicit allowed reasons,
- raw source rows are immutable,
- no source systems are mutated,
- no legacy DB table is used as product truth.

Fail gate:

- any non-empty row is dropped without evidence,
- import can update or delete raw rows,
- import writes to Google Sheets, Float, old dashboard DB, or production,
- import relies on fixture data for approval.

### Workstream D: DB-Backed Canon Queries And Display Contract

Goal:

- make the app render from imported source evidence, not fixture-only data.

Actions:

1. Wire canon queries to imported source facts.
2. Wire display contract to canon queries.
3. Remove fixture data from runtime routes, keep it only for deterministic tests.
4. Verify every route, CSV, approval output, data quality output, and chat investigation can receive the same contract.
5. Reject page-local maths.

Commands:

```bash
npm test -- tests/canon-queries tests/display
npm test -- tests/ui tests/chat
npm run typecheck
```

Suggested code search:

```bash
rg -n "fixture|mock|demo|sample|buildFixture|fixtureContract" src/app src/lib
rg -n "reduce\\(|sum|total|allocated|sold|pipeline|production" src/app
```

Pass gate:

- runtime routes use DB-backed contract,
- fixtures are limited to tests and fixture UI proof,
- business totals are in display/canon layers,
- no page-local total calculation remains except formatting or presentation.

Fail gate:

- UI route imports fixture contract for live runtime,
- Projects and rollups disagree under same scope,
- CSV and visible rows disagree,
- Project Detail recalculates independently.

### Workstream E: Source To DB To UI Verification

Goal:

- prove the exact same scoped truth appears in source evidence, imported DB, display contract, rendered UI, CSV, and chat where applicable.

Actions:

1. Extend source approval readiness to compare imported row counts.
2. Extend named scenario report to use imported live evidence.
3. Generate checks for base scope and scoped drilldowns.
4. Compare UI output against the display contract.
5. Compare CSV output against visible rows.
6. Ensure WARN means real source mismatch or source limitation.

Required named scenarios:

- LDN Q1 Design rollup to Projects and detail,
- UCS04787 Float allocated/unallocated,
- UCS05186 duplicate/manual Float job,
- UCS04154 fee-sheet Float ID join,
- PCS00250 cache-without-raw warning,
- USA00262 sold-hours false-zero guard,
- USA00323 sold-hours false-zero guard,
- BT raw-without-cache Float mismatch,
- production revenue archived project visibility,
- TBC pipeline row identity,
- exact client drilldown.

Commands:

```bash
npm test -- tests/scenarios tests/dual-run tests/display tests/ui tests/chat
node scripts/named-scenario-report.mjs
SOURCE_SNAPSHOT_FILE=test-results/source-snapshots/full-live.json npm run stakeholder:approval:pack
```

Pass gate:

- all named scenarios are `pass`, or warnings are explicitly source limitations with visible evidence,
- zero `new_code_bug`,
- zero hidden source rows,
- zero unsupported values rendered as zero,
- stakeholder pack is blocked only by real approvals or real source warnings.

Fail gate:

- any named scenario has unresolved source/display conflict,
- chat or UI claims source approval,
- a warning is flattened into success language,
- an old dashboard difference is copied into the rebuild as truth.

### Workstream F: UI Parity And Polish On Real Data

Goal:

- make the staging UI recognisable to Sian, Jade, and Yunni, with the approved old UX and the rebuild data laws.

Actions:

1. Run the old UX parity checklist route by route.
2. Verify top nav, office filters, time filters, view tabs, data freshness, banners, sheet health, rollups, Projects, Project Detail, Float, Data Quality, Approval, Sync Audit, Sync Warnings, Users, and chat shell.
3. Confirm every old drilldown has equal or better granularity.
4. Capture screenshots for every required route and named state.
5. Make small improvements only when they clarify source truth or reduce Sian/Yunni/Jade confusion.

Commands:

```bash
npm test -- tests/ui
npm run smoke:projects-console
node scripts/ui-proof-manifest.mjs
```

Manual or browser proof:

- open staging `/dashboard`,
- click LDN Q1 Design into Projects,
- click a project into detail,
- export CSV,
- open Float diagnostics,
- run Float Export Compare with Yunni-style fixed-width `Hours` paste,
- open Data Quality,
- open Approval,
- open chat and ask one evidence question.

Pass gate:

- Sian-style rollup to Projects to detail numbers match by scope,
- pipeline and production revenue are hidden or labelled unsupported where attribution is impossible,
- footer equals visible rows,
- CSV equals visible rows,
- old UX is recognisable,
- any UX deviation has a written reason.

Fail gate:

- a stakeholder would need to reopen the old dashboard to understand what changed,
- the UI hides source mismatch behind neat totals,
- drilldown loses scope,
- exported CSV disagrees with the page.

### Workstream G: Chat Evidence

Goal:

- make chat useful for investigation without allowing it to become a second, looser source of truth.

Actions:

1. Feed chat from the display contract and source evidence.
2. Ensure tactical tools are read-only.
3. Ensure every answer has sources checked, warnings, confidence, and `Needs Codex` where relevant.
4. Regression-test bad transcript patterns.
5. Test tool failure handling.

Commands:

```bash
npm test -- tests/chat tests/laws/chat-evidence-boundary.test.ts tests/laws/chat-investigation-agent.test.ts
```

Pass gate:

- chat refuses unsupported certainty,
- chat says `Needs Codex` for repo/browser/deploy/mutation/sync tasks,
- chat can explain why a visible dashboard warning exists,
- chat does not invent zero-hour or dashboard-error claims from pasted text.

Fail gate:

- chat says a dashboard problem exists without a failed check,
- chat totals raw parser rows,
- chat hides tool errors,
- chat suggests source mutations.

### Workstream H: Stakeholder Approval

Goal:

- get real review from Sian, Jade, and Yunni before production cutover.

Actions:

1. Generate stakeholder approval pack.
2. Prepare a plain-English summary of remaining WARN states.
3. Give Sian the rollup, Projects, Project Detail, and export checks.
4. Give Jade the Pipeline checks.
5. Give Yunni the Float diagnostics, Float trace, and Float Export Compare checks.
6. Record approvals and objections.
7. Do not reword approval as done unless the approval is explicit.

Command:

```bash
SOURCE_SNAPSHOT_FILE=test-results/source-snapshots/full-live.json npm run stakeholder:approval:pack
```

Pass gate:

- Sian approval recorded,
- Jade approval recorded,
- Yunni approval recorded,
- all exceptions are documented,
- production cutover checklist is ready.

Fail gate:

- any source owner says a named workflow is wrong,
- any source owner needs the old dashboard to understand a number,
- approval is implied from silence.

### Workstream I: Production Cutover

Goal:

- cut over only after code, source, UI, and stakeholder gates are all green.

Actions:

1. Verify branch and commit.
2. Verify CI.
3. Verify Railway target.
4. Verify production env separately from staging.
5. Verify Supabase target.
6. Run launch readiness.
7. Confirm rollback route.
8. Cut over production domain only after explicit approval.
9. Smoke-test production.
10. Monitor logs.

Commands:

```bash
git status --short --branch
npm run verify:phase9
node scripts/launch-readiness-report.mjs
node scripts/railway-readiness-report.mjs
railway status
```

Pass gate:

- all blockers cleared,
- stakeholder approval recorded,
- production environment points at intended rebuild database,
- old service is untouched until cutover,
- rollback path exists.

Fail gate:

- any source approval gap,
- any UI parity blocker,
- any missing env,
- any uncertainty about Railway project/service/env,
- any request to cut over based only on staging health.

## Required Commands Cheat Sheet

Use these when taking over.

### Repo And Gate Health

```bash
cd /Users/tommyhyde/UCS-DATA-INTEGRITY-REBUILD
git status --short --branch
git log -1 --oneline
npm run verify:phase9
```

### Railway Target

```bash
railway status
node scripts/railway-readiness-report.mjs
```

Expected staging target:

- project: `UCS Data Integrity Rebuild`,
- environment: `staging`,
- service: `ucs-data-integrity-rebuild`.

### Source Snapshot

```bash
railway run --service ucs-data-integrity-rebuild --environment staging npm run source:snapshot:create -- --out test-results/source-snapshots/full-live.json
SOURCE_SNAPSHOT_FILE=test-results/source-snapshots/full-live.json npm run source:approval:readiness
```

### Dry Run Import

```bash
node scripts/dry-run-source-import.mjs test-results/source-snapshots/full-live.json
```

### Named Scenario Evidence

```bash
node scripts/named-scenario-report.mjs
SOURCE_SNAPSHOT_FILE=test-results/source-snapshots/full-live.json npm run stakeholder:approval:pack
```

### UI Proof

```bash
npm test -- tests/ui
npm run smoke:projects-console
node scripts/ui-proof-manifest.mjs
```

### Chat Proof

```bash
npm test -- tests/chat
```

## Handoff Checklist

Before handing this to another dev or agent, include:

- this file,
- latest commit hash,
- current `git status --short --branch`,
- latest CI run URL or result,
- latest Railway deployment ID,
- latest staging URL,
- source snapshot artifact path,
- source snapshot row counts by stream,
- dry-run import report,
- named scenario report,
- stakeholder approval pack,
- current blocker list,
- current TODO classification,
- any explicit owner decisions still needed.

Never hand off with only "tests pass". The handoff must say which approval gates are still blocked.

## Known Blockers And Risks

### Blockers

- full live data import into rebuild Supabase is not complete,
- DB-writing import command is not yet the proven approval path,
- staging runtime must be moved from fixture-backed routes to imported DB-backed contract where any runtime fixture remains,
- four named warning scenarios still need source/display classification,
- stakeholder approval is not recorded,
- production cutover is blocked.

### Trust Gaps

- TODO tests remain and must be classified,
- UI parity checklist must be executed against staging with real imported data,
- source owner review has not happened,
- chat must be tested against live evidence after DB import,
- full source snapshot must be created without sample row caps.

### Architectural Risks

- if fixture data remains in runtime routes, the app can look complete while not proving live data,
- if import stores parsed facts without raw row trace, source trust is broken,
- if page components calculate totals, the one-contract law will leak again,
- if old DB comparison becomes product truth, the rebuild repeats the old app's mistakes,
- if pipeline and production revenue attribution is forced into unsupported slices, Sian will see impossible numbers,
- if Float canonical IDs are inferred rather than evidenced, Yunni's duplicate/manual problem returns.

## What Not To Do

Do not:

- call staging "accurate" because it deploys,
- call fixture screenshots "source proof",
- hide dirty source rows because they make totals messy,
- sum raw parser rows unless they are proven additive,
- convert unsupported fields to zero,
- copy old dashboard behaviour if it violates source laws,
- create production Railway state while working in staging unless production cutover is explicitly approved,
- mutate source sheets or Float from chat,
- use the old database as live product truth,
- send stakeholder approval language while WARN scenarios remain unexplained.

## Definition Of Done

The end game is done when this sequence is true:

1. Full read-only source snapshot exists for Sold, Pipeline, Production Revenue, and Float.
2. Snapshot imports into rebuild Supabase staging with row-count proof and skipped-row ledger.
3. DB-backed canon queries feed the display contract.
4. Display contract feeds every UI page, CSV, approval output, data quality output, and chat.
5. Generated tests pass for all scopes and named scenarios.
6. Staging UI proof passes against real imported data.
7. Chat evidence proof passes against real imported data.
8. Stakeholder approval pack is green or has only accepted source warnings.
9. Sian, Jade, and Yunni approval is explicit.
10. Production cutover is approved, executed, smoke-tested, and monitored.

Until all ten are true, the honest status is:

> Staging is progressing. Data and stakeholder approval are not complete.
