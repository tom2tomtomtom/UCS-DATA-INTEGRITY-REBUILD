# Execution Tickets

This file is the local mirror of the GitHub issue board. GitHub issues are the operational tickets. This document defines the intended ticket set and what each ticket must prove.

## GitHub Issue Map

| Issue | Ticket |
|---:|---|
| `#1` | Phase 0: Repo Foundation and Law Test Scaffold |
| `#2` | Phase 1: UX Parity Map |
| `#3` | Phase 2: Source Archive |
| `#4` | Phase 3: Parsers |
| `#5` | Phase 4: Canon Queries |
| `#6` | Phase 5: Display Contract |
| `#7` | Phase 6: UI Parity |
| `#8` | Phase 7: Chat Evidence Agent |
| `#9` | Phase 8: Real Data Dual Run |
| `#10` | Phase 9: Launch |
| `#11` | P0-A: Package, TypeScript, Test Runner, CI |
| `#12` | P0-B: Fixture and Golden Data Scaffold |
| `#13` | P0-C: Canon Types and Display Contract Interface |
| `#14` | P0-D: Law Test Skeleton |
| `#15` | P0-E: Build Log and Gate Runner |
| `#16` | Doctrine Steward: Overnight Build Review Gate |
| `#17` | P1-A: Route and Navigation Inventory |
| `#18` | P1-B: Scope, Filter, URL State, and Workflow Inventory |
| `#19` | P1-C: Table, Column, Control, and CSV Inventory |
| `#20` | P1-D: Screenshot Coverage and Recapture Plan |
| `#21` | P1-E: UX Parity Map Assembly and Phase 1 Gate |
| `#22` | P1-F: Doctrine Review Gate for UX Parity Map |
| `#23` | P1-G: Long-timeout Project Detail and Named Scenario Captures |
| `#24` | P1-H: Float and Diagnostic Route Captures |
| `#25` | P1-I: Deterministic Fixture Screenshot States |
| `#26` | P2-A: Source Archive Domain Types and Test Harness |
| `#27` | P2-B: Raw Row Classifier and Skipped Row Ledger |
| `#28` | P2-C: Immutable In-Memory Source Archive Store |
| `#29` | P2-D: Read-only Source Pull Interface |
| `#30` | P2-E: Development Source Row Browser Query Helpers |
| `#31` | P2-F: Phase 2 Verification Gate and Ticket Closure |
| `#32` | P2-G: Doctrine Review Gate for Source Archive |
| `#33` | P3-A: Parser Fact Contracts and Warning Model |
| `#34` | P3-B: Fee Sheet Parser Fixtures and Parser |
| `#35` | P3-C: Pipeline Parser Fixtures and Parser |
| `#36` | P3-D: Production Revenue Parser Fixtures and Parser |
| `#37` | P3-E: Float Parser Fixtures and Parser |
| `#38` | P3-F: Parser Fixture Manifest and Golden Parsed Fact Checks |
| `#39` | P3-G: Phase 3 Verification Gate |
| `#40` | P3-H: Doctrine Review Gate for Parsers |
| `#41` | P4-A: Canon Query Result Contracts and Scope Predicate |
| `#42` | P4-B: Sold Fee Sheet Source Fact Selector |
| `#43` | P4-C: Pipeline and Production Revenue Source Fact Selectors |
| `#44` | P4-D: Float Source Fact Selector and Raw Cache Warning Shell |
| `#45` | P4-E: Source Fact Set Assembly and Capability Index |
| `#46` | P4-F: Phase 4 Verification Gate |
| `#47` | P4-G: Doctrine Review Gate for Canon Queries |
| `#48` | P5-A: Display Contract Result Shape and Totalling Laws |
| `#49` | P5-B: Project Row Builder and Source-Only Rows |
| `#50` | P5-C: Rollups, Scope Preservation, and Unsupported Pipeline/Production Slices |
| `#51` | P5-D: Float Raw Cache Visible Reconciliation Checks |
| `#52` | P5-E: CSV Rows, Trace Rows, and Approval Contract Outputs |
| `#53` | P5-F: Phase 5 Verification Gate |
| `#54` | P5-G: Doctrine Review Gate for Display Contract |
| `#63` | P7-A: Evidence Pack, Stream Events, And Needs Codex Types |
| `#64` | P7-B: Playbook Router And Required Evidence Plans |
| `#65` | P7-C: Read-only Tactical Tools And Investigation Orchestrator |
| `#66` | P7-D: Claim Guard And Evidence-only Reporter |
| `#67` | P7-E: Chat API Route, Progress Events, And UI Evidence Trace |
| `#68` | P7-F: Phase 7 Verification Gate And Trap Prompt Suite |
| `#69` | P7-G: Doctrine Review Gate For Chat Evidence Agent |
| `#70` | P8-A: Environment And Supabase Readiness Gate |
| `#71` | P8-B: New Supabase Schema Law Gate |
| `#72` | P8-C: Read-only Source Snapshot Import |
| `#73` | P8-D: Old vs New vs Source Dual-run Comparator |
| `#74` | P8-E: Named Sian Yunni Jade Scenario Report |
| `#75` | P8-F: Real-data UI Screenshot And Click Proof |
| `#76` | P8-G: Phase 8 Verification And Doctrine Gate |

## Implementation Ticket Rule

Phase tickets are not enough for agents.

Before a phase starts implementation, it must have bounded implementation tickets with:

- issue number,
- write set,
- owner type,
- exact deliverables,
- verification,
- stop conditions.

Phase 0 and Phase 1 currently have bounded implementation tickets. Later phase implementation tickets must be created after the prior phase exits, when the real file boundaries are known.

Phase 1 screenshot recapture tickets `#23`, `#24`, and `#25` are follow-up evidence tickets. They do not block Phase 2 if their blockers are documented, because deterministic fixture screenshots depend on later display-contract and UI harness work.

Phase 2 currently has bounded implementation tickets `#26` through `#32`. It must preserve raw source evidence only. It must not introduce parsers, display rows, product UI, live source pulls, applied migrations, deploys, sync, or source-system mutation.

Phase 3 has bounded implementation tickets `#33` through `#40`. It may parse archived raw rows into parser facts, but it must not create canon queries, display rows, product UI, live source pulls, applied migrations, deploys, sync, or source-system mutation.

Phase 4 has bounded implementation tickets `#41` through `#47`. It may expose scoped parser facts and source capability metadata, but it must not create display rows, totals, CSV rows, product UI, live source pulls, applied migrations, deploys, sync, source-system mutation, or old dashboard selector truth.

Phase 5 currently has bounded implementation tickets `#48` through `#54`. It may build the pure display contract, visible rows, rollups, CSV rows, traces, approval outputs, unsupported flags, and reconciliation checks. It must not create product UI pages, live source pulls, database calls, applied migrations, deploys, sync, source-system mutation, or old dashboard selector truth.

Phase 7 currently has bounded implementation tickets `#63` through `#69`. It may build the read-only chat evidence agent, progress events, API route, UI evidence trace, claim guard, and trap prompt tests. It must not introduce mutation tools, live source pulls, database calls, applied migrations, deploys, sync, source-system writes, old dashboard selector truth, or model-only claims.

Phase 8 currently has bounded implementation tickets `#70` through `#76`. It may connect the rebuild to real-data snapshots and old-dashboard comparison evidence only after env/Supabase readiness is proven. It must not let old database tables, old selectors, live source APIs, or imported cache rows become display truth. It must not mutate sources, apply migrations to old production, deploy, or commit secrets.

## Phase Tickets

### Phase 0: Repo Foundation And Law Test Scaffold

Goal: create the build skeleton without building product UI.

Deliverables:

- package and test setup,
- CI skeleton,
- fixture folder structure,
- pending immutable law tests,
- typed `DashboardScope`,
- empty `buildDashboardDisplayContract` interface,
- build log.

Exit criteria:

- `npm test` runs,
- CI workflow exists,
- every immutable law has a pending or active test,
- no product UI pages exist,
- no remote migration has been applied.

### Phase 1: UX Parity Map

Goal: fully map the old UX without copying old data logic.

Deliverables:

- route inventory,
- filter and URL-state inventory,
- table and CSV column inventory,
- screenshot coverage for core and named scenarios,
- preserve and do-not-preserve notes.

Exit criteria:

- approved UX is separated from confusing legacy behaviour,
- all missing screenshots have explicit blockers or recapture tickets.

Follow-up evidence tickets:

- `#23`, long-timeout captures for project detail and named scenarios,
- `#24`, long-timeout captures for Float and diagnostic routes,
- `#25`, deterministic fixture screenshot states for edge-case UX that should not depend on live data.

### Phase 2: Source Archive

Goal: preserve every non-empty source row before parsing or reconciliation.

Deliverables:

- source batch model,
- raw source row model,
- skipped-row ledger,
- read-only source pull interface,
- source row browser for development.

Exit criteria:

- unexplained dropped rows fail tests,
- raw row IDs are available for every parsed fact.

### Phase 3: Parsers

Goal: turn source rows into facts without losing evidence or disagreements.

Deliverables:

- fee-sheet parser,
- pipeline parser,
- production revenue parser,
- Float parser,
- parser fixture library,
- parser warnings.

Exit criteria:

- raw parser rows are never treated as additive totals unless explicitly marked additive,
- CLIENT SUMMARY and V-tab disagreements are preserved,
- Float task expansion math is inspectable.

### Phase 4: Canon Queries

Goal: expose scoped source facts without constructing UI rows.

Deliverables:

- `selectSoldFacts(scope)`,
- `selectPipelineFacts(scope)`,
- `selectProductionRevenueFacts(scope)`,
- `selectFloatFacts(scope)`,
- source capability metadata.

Exit criteria:

- source-only rows are visible,
- archive status is an overlay, not a hide rule,
- unsupported fields remain unsupported.

### Phase 5: Display Contract

Goal: build the only authority for rendered numbers.

Deliverables:

- `buildDashboardDisplayContract`,
- visible rows,
- hero totals,
- rollups,
- CSV rows,
- unsupported-source flags,
- reconciliation checks,
- source traces,
- warnings and confidence.

Exit criteria:

- generated scope tests pass,
- all visible numbers come from the contract,
- no page-local business calculations exist.

### Phase 6: UI Parity

Goal: rebuild the existing UX on top of the display contract.

Deliverables:

- dashboard home,
- Projects,
- project detail,
- Float diagnostics,
- Data Quality,
- Approval,
- CSV export,
- chat shell.

Exit criteria:

- deterministic UI tests cover named workflows,
- UI consumes contract output only,
- approved UX is preserved where lawful.

### Phase 7: Chat Evidence Agent

Goal: make chat a read-only investigation agent bound to evidence.

Deliverables:

- `EvidencePack`,
- claim guard,
- read-only tools,
- investigation orchestrator,
- tactical playbooks,
- progress stream,
- `Needs Codex` handoff.

Exit criteria:

- trap prompts cannot produce unsupported claims,
- source conflicts are reported as unresolved,
- tool errors become evidence warnings.

### Phase 8: Real Data Dual Run

Goal: compare old, new, and source evidence without declaring victory too early.

Deliverables:

- old vs new comparison,
- source vs contract comparison,
- in-dashboard integrity report,
- UI screenshot and click proof,
- Sian/Yunni/Jade named scenario report.

Exit criteria:

- all differences are classified,
- no hidden source rows,
- remaining warnings are source limitations or source conflicts.

### Phase 9: Launch

Goal: deploy only after all blocking gates pass.

Deliverables:

- Railway service,
- production env,
- build and health checks,
- final acceptance report,
- stakeholder-ready caveats.

Exit criteria:

- live app commit matches GitHub main,
- Railway service is the rebuild service,
- production DB is the new Supabase project,
- named checks pass.

## Phase 0 Work Tickets

### P0-A: Package, TypeScript, Test Runner, CI

Owns:

- `package.json`,
- `tsconfig.json`,
- test config,
- GitHub Actions workflow.

Must prove:

- `npm test` runs,
- `npm run typecheck` runs,
- CI has no secret dependencies.

### P0-B: Fixture And Golden Data Scaffold

Owns:

- fixture folders,
- fixture README files,
- named scenario manifest.

Must prove:

- LDN Q1 Design and UCS04787 fixture slots exist,
- no real secrets or raw client exports are committed.

### P0-C: Canon Types And Display Contract Interface

Owns:

- `src/lib/canon/`,
- `src/lib/display/`,
- shared types.

Must prove:

- `DashboardScope` exists,
- display contract interface exists,
- unsupported metrics are representable,
- source traces are representable.

### P0-D: Law Test Skeleton

Owns:

- `src/lib/**/__tests__/`,
- law test naming conventions,
- regression test placeholders.

Must prove:

- every immutable law maps to a pending or active test,
- named Sian/Yunni/Jade scenarios have pending tests.

### P0-E: Build Log And Gate Runner

Owns:

- build log,
- verification script placeholder,
- command documentation.

Must prove:

- controller can record commands and outcomes,
- missing scripts fail honestly or are marked pending.

## Phase 1 Work Tickets

### P1-A: Route And Navigation Inventory

Issue: `#17`

Owns:

- `docs/phase-1/route-inventory.md`

Must prove:

- old app route list is mapped,
- navigation and admin surfaces are mapped,
- unavailable or slow routes have blockers,
- old app file references are cited.

### P1-B: Scope, Filter, URL State, And Workflow Inventory

Issue: `#18`

Owns:

- `docs/phase-1/scope-filter-workflows.md`

Must prove:

- office/date/filter params are mapped,
- required Sian/Yunni/Jade click paths are mapped,
- approved behaviour is separated from confusing legacy behaviour,
- scope preservation risks are named.

### P1-C: Table, Column, Control, And CSV Inventory

Issue: `#19`

Owns:

- `docs/phase-1/table-export-inventory.md`

Must prove:

- rollup, Projects, project detail, Float, and diagnostic table shapes are mapped,
- export controls and expected CSV parity are named,
- do-not-preserve table issues are listed.

### P1-D: Screenshot Coverage And Recapture Plan

Issue: `#20`

Owns:

- `docs/phase-1/screenshot-coverage.md`,
- `reference/ui/current-app/manifest.md` only for coverage-note additions.

Must prove:

- current screenshot coverage is mapped,
- required missing screenshots have blockers or recapture plans,
- named scenario coverage is explicit,
- no screenshot evidence is fabricated.

### P1-E: UX Parity Map Assembly And Phase 1 Gate

Issue: `#21`

Owns:

- `docs/phase-1/ux-parity-map.md`,
- `docs/phase-1/phase-1-exit-check.md`,
- `docs/BUILD_LOG.md`.

Must prove:

- Phase 1 deliverables are assembled,
- preserve and do-not-preserve lists are clear,
- Phase 2 prerequisites are named,
- open blockers are explicit.

### P1-F: Doctrine Review Gate For UX Parity Map

Issue: `#22`

Owns:

- read-only review only.

Must prove:

- Phase 1 did not copy old data logic,
- no product UI or source-system code was added,
- screenshot blockers are explicit,
- Phase 1 can close with `PASS` or acceptable `PROCESS_WARN`.

## Phase 2 Work Tickets

Phase 2 builds the immutable source archive foundation. It must not parse source facts, create display rows, build product UI, run live source pulls, apply migrations, deploy, sync, or mutate source systems.

### P2-A: Source Archive Domain Types And Test Harness

Issue: `#26`

Owns:

- `src/lib/source-archive/types.ts`,
- `src/lib/source-archive/index.ts`,
- `tests/source-archive/source-archive-types.test.ts`,
- `src/lib/index.ts` only for exports.

Must prove:

- source archive batches, raw rows, skipped ledger entries, and source pull metadata are typed,
- raw row identity is immutable and separate from parsed facts,
- no parser facts or display rows are introduced.

### P2-B: Raw Row Classifier And Skipped Row Ledger

Issue: `#27`

Owns:

- `src/lib/source-archive/row-classifier.ts`,
- `tests/source-archive/row-classifier.test.ts`,
- `fixtures/source-rows/laws/*` only if tiny synthetic row fixtures are needed.

Must prove:

- only literally empty rows are allowed skips,
- zero-fee/nonzero-hour, TBC, archived, inactive, provisional, unmatched, and duplicate rows are archivable,
- skipped rows carry explicit reason and source evidence.

### P2-C: Immutable In-Memory Source Archive Store

Issue: `#28`

Owns:

- `src/lib/source-archive/archive-store.ts`,
- `tests/source-archive/archive-store.test.ts`.

Must prove:

- batches and raw rows are append-only,
- duplicates are preserved as separate rows,
- rows can be looked up by source identity,
- skipped rows are queryable,
- archived payloads cannot be mutated after storage.

### P2-D: Read-only Source Pull Interface

Issue: `#29`

Owns:

- `src/lib/source-archive/source-pull.ts`,
- `tests/source-archive/source-pull.test.ts`.

Must prove:

- adapters expose read/list/fetch only,
- pull results preserve source metadata,
- no live source calls happen in Phase 2,
- no write/delete/archive/sync methods exist.

### P2-E: Development Source Row Browser Query Helpers

Issue: `#30`

Owns:

- `src/lib/source-archive/source-row-browser.ts`,
- `tests/source-archive/source-row-browser.test.ts`.

Must prove:

- archived and skipped rows are inspectable,
- filters work by source, batch, document, tab, row number, object ID, hash, and source identity text,
- duplicates are not suppressed,
- no dashboard rows or totals are created.

### P2-F: Phase 2 Verification Gate And Ticket Closure

Issue: `#31`

Owns:

- `scripts/verify-phase2.mjs`,
- `package.json`,
- `docs/BUILD_LOG.md`,
- `docs/EXECUTION_TICKETS.md`.

Must prove:

- `npm run verify:phase2` exists,
- Phase 2 boundary checks run,
- `npm test`, `npm run typecheck`, `npm run verify:phase2`, `npm run build`, and `npm audit --omit=dev` pass.

### P2-G: Doctrine Review Gate For Source Archive

Issue: `#32`

Owns:

- read-only review only.

Must prove:

- source archive exists before parsers,
- every non-empty source row is archivable,
- skipped rows are explicitly classified and queryable,
- raw row IDs are immutable and available for future parsed facts,
- no parser facts or dashboard display rows are created in Phase 2,
- no old dashboard selectors are used as truth,
- no source-system mutation, sync, deploy, migration application, or live source pull happened,
- tests cover zero-fee/nonzero-hour, TBC, archived, inactive, provisional, unmatched, duplicate, and literally empty rows.

## Phase 3 Work Tickets

Phase 3 turns archived raw source rows into parser facts. It must not create canon queries, display rows, product UI, live source pulls, applied migrations, deploys, sync, or source-system mutation.

### P3-A: Parser Fact Contracts And Warning Model

Issue: `#33`

Owns:

- `src/lib/parsers/types.ts`,
- `src/lib/parsers/index.ts`,
- `tests/parsers/parser-contracts.test.ts`,
- `src/lib/index.ts` only for exports.

Must prove:

- every parsed fact requires raw row IDs and batch ID,
- additive status is explicit and cannot default to true,
- parser warnings preserve source refs,
- parser contracts cannot contain display rows, totals, UI fields, or old selector output.

### P3-B: Fee Sheet Parser Fixtures And Parser

Issue: `#34`

Owns:

- `src/lib/parsers/fee-sheet.ts`,
- `tests/parsers/fee-sheet-parser.test.ts`,
- `fixtures/source-rows/fee-sheets/*`,
- `fixtures/parsed-facts/fee-sheets/*`.

Must prove:

- first-tab Float ID is preserved,
- CLIENT SUMMARY and V-tab rows survive separately,
- zero-fee/nonzero-hour rows parse,
- totals rows are not additive by default,
- row-level office wins where available,
- parser never creates display totals.

### P3-C: Pipeline Parser Fixtures And Parser

Issue: `#35`

Owns:

- `src/lib/parsers/pipeline.ts`,
- `tests/parsers/pipeline-parser.test.ts`,
- `fixtures/source-rows/pipeline/*`,
- `fixtures/parsed-facts/pipeline/*`.

Must prove:

- TBC rows keep per-row identity,
- non-empty no-job rows become facts with warning,
- source project and client text are preserved,
- department, role, and person are unsupported,
- pipeline never becomes sold fee.

### P3-D: Production Revenue Parser Fixtures And Parser

Issue: `#36`

Owns:

- `src/lib/parsers/production-revenue.ts`,
- `tests/parsers/production-revenue-parser.test.ts`,
- `fixtures/source-rows/production-revenue/*`,
- `fixtures/parsed-facts/production-revenue/*`.

Must prove:

- archived production revenue survives,
- blank status becomes `UNKNOWN`,
- status collisions warn without choosing a winner,
- no-job revenue survives with attribution warning,
- department and role attribution remains unsupported.

### P3-E: Float Parser Fixtures And Parser

Issue: `#37`

Owns:

- `src/lib/parsers/float.ts`,
- `tests/parsers/float-parser.test.ts`,
- `fixtures/source-rows/float/*`,
- `fixtures/parsed-facts/float/*`.

Must prove:

- Float project, task, person, dates, and hours facts survive,
- active/archive state and tentative flags survive,
- allocated, unallocated, orphan, placeholder, and pencil classifications are represented,
- duplicate/manual candidates survive,
- multi-person split ambiguity is labelled,
- parser does not correct Float joins or create dashboard hours.

### P3-F: Parser Fixture Manifest And Golden Parsed Fact Checks

Issue: `#38`

Owns:

- `fixtures/parsed-facts/manifest.json`,
- `fixtures/parsed-facts/README.md`,
- `tests/parsers/parser-fixture-manifest.test.ts`.

Must prove:

- every parser fixture has source rows, expected parsed facts, laws protected, and redaction status,
- named regressions are covered or have an explicit `PROCESS_WARN`,
- fixtures do not commit secrets or full private source sheets,
- screenshots are not correctness proof.

### P3-G: Phase 3 Verification Gate

Issue: `#39`

Owns:

- `scripts/verify-phase3.mjs`,
- `package.json`,
- `docs/BUILD_LOG.md`,
- `docs/EXECUTION_TICKETS.md`.

Must prove:

- `npm run verify:phase3` exists,
- parser code does not build display rows,
- parser code does not run live source pulls,
- parser facts require raw row IDs,
- `npm test`, `npm run typecheck`, `npm run verify:phase3`, `npm run build`, and `npm audit --omit=dev` pass.

### P3-H: Doctrine Review Gate For Parsers

Issue: `#40`

Owns:

- read-only review only.

Must prove:

- parsers consume archived raw rows,
- every parsed fact carries raw row IDs and batch ID,
- additive status is explicit,
- CLIENT SUMMARY and V-tab disagreements survive,
- zero-fee/nonzero-hour rows survive,
- TBC pipeline rows preserve per-row identity,
- archived production revenue survives,
- Float active/archive/manual/duplicate/placeholder/pencil evidence survives,
- parsers do not create display rows or dashboard totals,
- no source-system mutation, sync, deploy, migration application, live source pull, or old selector truth happened.

## Phase 4 Work Tickets

Phase 4 exposes scoped source facts and capability metadata. It must not construct UI rows, display totals, CSV rows, product pages, live source pulls, applied migrations, deploys, sync, source-system mutation, or old selector truth.

### P4-A: Canon Query Result Contracts And Scope Predicate

Issue: `#41`

Owns:

- `src/lib/canon-queries/types.ts`,
- `src/lib/canon-queries/scope.ts`,
- `src/lib/canon-queries/index.ts`,
- `tests/canon-queries/query-contracts.test.ts`,
- `tests/canon-queries/scope-predicate.test.ts`,
- `src/lib/index.ts` only for exports.

Must prove:

- canon query results contain source facts, source capabilities, unsupported metadata, warnings, and scope,
- exact client filtering is distinct from search,
- office and date filtering is explicit,
- unsupported source capability returns unsupported metadata, not zero,
- no selector contract can return display rows, visible rows, CSV rows, dashboard rows, or totals.

### P4-B: Sold Fee Sheet Source Fact Selector

Issue: `#42`

Owns:

- `src/lib/canon-queries/sold.ts`,
- `tests/canon-queries/sold-facts.test.ts`,
- `fixtures/parsed-facts/fee-sheets/*` only if a new redacted fixture is required.

Must prove:

- `selectSoldFacts` returns scoped sold source facts,
- zero-fee nonzero-hour rows survive,
- CLIENT SUMMARY and V-tab facts both remain inspectable,
- row-level office wins in scoped filtering,
- exact client filtering does not use fuzzy search,
- non-additive summary rows remain evidence and are not summed.

### P4-C: Pipeline And Production Revenue Source Fact Selectors

Issue: `#43`

Owns:

- `src/lib/canon-queries/pipeline.ts`,
- `src/lib/canon-queries/production-revenue.ts`,
- `tests/canon-queries/pipeline-facts.test.ts`,
- `tests/canon-queries/production-revenue-facts.test.ts`,
- `fixtures/parsed-facts/pipeline/*` and `fixtures/parsed-facts/production-revenue/*` only if a new redacted fixture is required.

Must prove:

- `selectPipelineFacts` and `selectProductionRevenueFacts` return scoped source facts,
- TBC Pipeline rows keep per-row identity,
- Pipeline department or role scope returns unsupported metadata instead of zero,
- archived production revenue survives,
- blank status `UNKNOWN` and status collisions survive,
- Production Revenue department or role scope returns unsupported metadata instead of zero.

### P4-D: Float Source Fact Selector And Raw Cache Warning Shell

Issue: `#44`

Owns:

- `src/lib/canon-queries/float.ts`,
- `tests/canon-queries/float-facts.test.ts`,
- `fixtures/parsed-facts/float/*` only if a new redacted fixture is required.

Must prove:

- `selectFloatFacts` returns scoped Float source facts,
- inactive and archived Float hours survive,
- duplicate and manual candidates survive without choosing a canonical row,
- placeholder, pencil, orphan, allocated, and unallocated classes survive,
- multi-person split ambiguity remains visible,
- cache-vs-raw named regressions are marked unresolved unless cache facts exist,
- no visible dashboard hours or corrected Float joins are created.

### P4-E: Source Fact Set Assembly And Capability Index

Issue: `#45`

Owns:

- `src/lib/canon-queries/source-fact-set.ts`,
- `src/lib/canon-queries/capabilities.ts`,
- `tests/canon-queries/source-fact-set.test.ts`,
- `tests/canon-queries/capabilities.test.ts`,
- `src/lib/canon/types.ts` only if a minimal query metadata type is needed.

Must prove:

- parser results can be assembled into a `SourceFactSet`,
- parser warnings survive into query evidence,
- source capabilities stay attached to the source,
- unsupported fields remain unsupported metadata,
- archive and active state are preserved as overlays, not hide rules,
- no monetary or hour totals are calculated.

### P4-F: Phase 4 Verification Gate

Issue: `#46`

Owns:

- `scripts/verify-phase4.mjs`,
- `package.json`,
- `docs/BUILD_LOG.md`,
- `docs/EXECUTION_TICKETS.md`.

Must prove:

- `npm run verify:phase4` exists,
- build runs Phase 4 verification,
- canon query code does not build display rows, product UI, CSV rows, dashboard totals, or visible rows,
- canon query code does not run live source pulls, database calls, mutations, or old selectors,
- `npm test`, `npm run typecheck`, `npm run verify:phase4`, `npm run build`, `npm audit --omit=dev`, `git diff --check`, and em dash/en dash scan pass.

### P4-G: Doctrine Review Gate For Canon Queries

Issue: `#47`

Owns:

- read-only review only.

Must prove:

- canon queries consume parser facts or source fact sets only,
- source-only rows remain visible as facts,
- archive state is overlay, not hide rule,
- unsupported fields stay unsupported,
- exact client filtering is distinct from search,
- raw/cache/visible Float issues are not falsely marked solved,
- all process warnings are either resolved or carried forward explicitly,
- no source-system mutation, sync, deploy, migration application, live source pull, database call, product UI, display row, dashboard total, CSV row, or old selector truth happened.

## Phase 5 Work Tickets

Phase 5 builds the one pure display contract. It may construct visible rows, rollups, CSV rows, trace summaries, approval outputs, unsupported flags, and reconciliation checks from canon query outputs. It must not build product UI pages, pull live sources, call databases, apply migrations, deploy, sync, mutate source systems, or import old dashboard selector truth.

### P5-A: Display Contract Result Shape And Totalling Laws

Issue: `#48`

Owns:

- `src/lib/display/contract.ts`,
- `tests/display/display-contract-shape.test.ts`,
- `tests/display/display-totalling-laws.test.ts`,
- `src/lib/index.ts` only for exports.

Must prove:

- `buildDashboardDisplayContract` is pure and takes scope plus facts as input,
- additive facts can contribute to supported totals,
- non-additive source summary facts remain evidence and do not double count,
- unsupported metrics remain unsupported, not zero,
- contract output includes project rows, rollup rows, totals, CSV rows, unsupported flags, source traces, reconciliation checks, warnings, and confidence fields,
- no page-local calculation hooks exist.

### P5-B: Project Row Builder And Source-Only Rows

Issue: `#49`

Owns:

- `src/lib/display/project-rows.ts`,
- `tests/display/project-rows.test.ts`,
- `fixtures/golden-scenarios/*` only if a new synthetic fixture is required.

Must prove:

- source-only rows are visible, not dropped,
- archive state is overlay, not hide rule,
- duplicate Float and manual candidates do not collapse into one row,
- Pipeline never becomes sold fee,
- production-only rows stay production source rows,
- every visible row carries source labels, trace refs, warnings, and confidence.

### P5-C: Rollups, Scope Preservation, And Unsupported Pipeline/Production Slices

Issue: `#50`

Owns:

- `src/lib/display/rollups.ts`,
- `tests/display/rollups.test.ts`,
- `tests/display/scope-preservation.test.ts`.

Must prove:

- LDN Q1 Design parent rollup and Projects drilldown share one contract scope,
- department and role rollups do not imply Pipeline or Production Revenue attribution,
- Pipeline stays unsupported in department and role slices,
- Production Revenue stays unsupported in department and role slices,
- exact client drilldown does not use search,
- links can preserve office/from/to/department/role/client/jobNumber state.

### P5-D: Float Raw Cache Visible Reconciliation Checks

Issue: `#51`

Owns:

- `src/lib/display/float-reconciliation.ts`,
- `tests/display/float-reconciliation.test.ts`,
- `fixtures/golden-scenarios/*` only if a new synthetic fixture is required.

Must prove:

- raw > 0 and cache = 0 is `FAIL`,
- visible > 0 and cache = 0 is `FAIL`,
- cache > 0 and raw = 0 is `WARN`,
- non-trivial raw/cache delta is at least `WARN`,
- inactive Float contributing visible dashboard hours is `FAIL`,
- cache-only data explains why raw cannot currently prove it,
- PCS00250 and BT raw/cache named checks are represented.

### P5-E: CSV Rows, Trace Rows, And Approval Contract Outputs

Issue: `#52`

Owns:

- `src/lib/display/csv.ts`,
- `src/lib/display/traces.ts`,
- `src/lib/display/approval-output.ts`,
- `tests/display/csv.test.ts`,
- `tests/display/traces.test.ts`,
- `tests/display/approval-output.test.ts`.

Must prove:

- CSV rows are generated only from display contract rows,
- approval output equals contract row values,
- every important number carries source trace refs,
- warnings and unsupported metrics survive into exports,
- no separate export, approval, or verifier calculation model exists.

### P5-F: Phase 5 Verification Gate

Issue: `#53`

Owns:

- `scripts/verify-phase5.mjs`,
- `package.json`,
- `docs/BUILD_LOG.md`,
- `docs/EXECUTION_TICKETS.md`.

Must prove:

- `npm run verify:phase5` exists,
- build runs Phase 5 verification,
- display contract code does not use live sources, database calls, old selectors, product UI pages, or source-system mutation,
- all visible/export/approval values come from display contract helpers,
- active tests cover display shape, source-only rows, rollups, unsupported slices, Float reconciliation, CSV, traces, and approval output,
- `npm test`, `npm run typecheck`, `npm run verify:phase5`, `npm run build`, `npm audit --omit=dev`, `git diff --check`, and em dash/en dash scan pass.

### P5-G: Doctrine Review Gate For Display Contract

Issue: `#54`

Owns:

- read-only review only.

Must prove:

- one display contract owns visible numbers,
- rollups, Projects rows, CSV, approval, traces, and verifier outputs use the same contract outputs,
- source-only rows are visible,
- unsupported is not zero,
- raw parser rows are not summed without additive proof,
- exact scope is preserved,
- Float raw/cache/visible checks classify WARN/FAIL correctly,
- all process warnings are either resolved or explicitly carried forward,
- no source-system mutation, sync, deploy, migration application, live source pull, database call, product UI page, old selector truth, or alternate calculation path happened.

## Phase 6 Work Tickets

Phase 6 rebuilds the approved dashboard UX on top of the display contract. It may create product UI pages, deterministic fixture providers, UI components, CSV download surfaces, chat shell states, and deterministic UI tests. It must not pull live sources, call databases, import old dashboard selectors, apply migrations, deploy, sync, mutate source systems, or calculate business totals outside the display contract.

### P6-A: Next App Shell, Dashboard Chrome, And Contract Fixture Boundary

Issue: `#55`

Owns:

- `app/layout.tsx`,
- `app/page.tsx`,
- `app/dashboard/layout.tsx`,
- `app/dashboard/page.tsx` only for shell plumbing if needed,
- `app/globals.css`,
- `src/components/dashboard/chrome/*`,
- `src/lib/ui/fixture-contract.ts` or equivalent deterministic fixture provider,
- `tests/ui/app-shell.test.tsx` or equivalent render/unit test.

Must prove:

- Next App Router shell exists and builds on Railway-compatible scripts,
- global dashboard chrome preserves top bar, tab nav, scope controls, warning area, and chat entry slot,
- UI fixture provider returns display contract output, not raw facts or old selector output,
- visible shell can show office/from/to scope explicitly,
- no page-local totals, no live source pulls, no DB calls, no old selectors, no product mutation.

### P6-B: Dashboard Home Rollups From Display Contract

Issue: `#57`

Owns:

- `app/dashboard/page.tsx`,
- `src/components/dashboard/rollups/*`,
- `src/components/dashboard/scope-controls/*` only if not owned by P6-A,
- `tests/ui/dashboard-home.test.tsx`.

Must prove:

- hero metrics render from `contract.heroTotals` only,
- department, role, month, and client rollups render from `contract.rollups` only,
- LDN Q1 Design rollup link preserves `office=LDN`, `from=2026-01-01`, `to=2026-03-31`, and `department=Design`,
- Pipeline and Production Revenue department/role unsupported states render as unsupported, not zero,
- source warnings and confidence are visible,
- no page-local business totals, no old selectors, no live source pulls, no DB calls.

### P6-C: Projects Table, Scope Filters, Footer, And CSV Export

Issue: `#58`

Owns:

- `app/dashboard/projects/page.tsx`,
- `src/components/dashboard/projects/*`,
- `src/components/dashboard/export/*`,
- `tests/ui/projects-page.test.tsx`,
- `tests/ui/csv-export.test.tsx`.

Must prove:

- Projects rows render from `contract.visibleRows` only,
- footer totals reconcile to supported visible row metrics or contract footer totals, never page-local source sums,
- source-only, Float-only, pipeline-only, production-only, archived, and duplicate/manual rows remain visible with row-type badges,
- exact client uses `client` param, fuzzy search uses `search` param,
- CSV rows are `contract.csvRows` only,
- unsupported values export as unsupported or blank with reason, not zero,
- all links preserve active scope.

### P6-D: Project Detail And Float Diagnostics Surfaces

Issue: `#56`

Owns:

- `app/dashboard/projects/[jobNumber]/page.tsx`,
- `app/dashboard/float/page.tsx`,
- `app/dashboard/float/[floatProjectId]/page.tsx`,
- `src/components/dashboard/project-detail/*`,
- `src/components/dashboard/float/*`,
- `tests/ui/project-detail.test.tsx`,
- `tests/ui/float-diagnostics.test.tsx`.

Must prove:

- project detail keeps office/from/to/department/role/client/jobNumber scope,
- KPI cards, monthly rows, role/profitability rows, and trace panels use contract row/trace/reconciliation values,
- unsupported Pipeline or Production Revenue in slices is labelled or hidden with reason, never zero,
- Float diagnostics show fee-sheet Float ID, raw/cache/visible classification, duplicate/manual candidates, inactive/archive warnings, PCS00250, BT raw/cache, and UCS04787 states where fixture evidence exists,
- no archive, sync, Float mutation, live source pull, DB call, or old selector path exists.

### P6-E: Data Quality, In-Dashboard Integrity, Approval, And Glossary

Issue: `#59`

Owns:

- `app/dashboard/data-quality/page.tsx`,
- `app/dashboard/approval/page.tsx`,
- `app/dashboard/glossary/page.tsx`,
- `app/dashboard/audit/page.tsx` only as read-only placeholder if needed,
- `src/components/dashboard/data-quality/*`,
- `src/components/dashboard/approval/*`,
- `tests/ui/data-quality.test.tsx`,
- `tests/ui/approval.test.tsx`.

Must prove:

- integrity checks compare source archive/parser/contract/UI concepts without mutating source systems,
- `FAIL`, `WARN`, `PASS`, and `UNRESOLVED` states are visible and sorted with failures first,
- approval output uses display contract approval helper only,
- warning lifecycle labels are visible and honest,
- glossary explains unsupported vs zero, source-only rows, confidence, scope, and `Needs Codex`,
- no separate approval/integrity total model exists.

### P6-F: Read-Only Chat Shell And Needs Codex Handoff

Issue: `#61`

Owns:

- `src/components/dashboard/chat/*`,
- `app/dashboard/chat-demo/page.tsx` only if needed for deterministic UI tests,
- `tests/ui/chat-shell.test.tsx`.

Must prove:

- chat panel has closed, idle, working, evidence, warning, confidence, and `Needs Codex` states,
- active `DashboardScope` is visible to the chat shell,
- shell can display evidence event shape without inventing findings,
- `Needs Codex` appears for repo, browser testing, mutation, sync, deployment, and stakeholder communication,
- no source mutation, sync, deploy, live source pull, API investigation loop, or unsupported claim generation exists in Phase 6.

### P6-G: Deterministic UI Verification Gate And Playwright Setup

Issue: `#60`

Owns:

- `scripts/verify-phase6.mjs`,
- `package.json`,
- Playwright config and tests if added,
- `tests/e2e/*`,
- `docs/BUILD_LOG.md`,
- `docs/EXECUTION_TICKETS.md`.

Must prove:

- `npm run verify:phase6` exists,
- build runs Phase 6 verification once UI surfaces exist,
- deterministic UI tests cover named workflows or documented placeholders where the page is intentionally deferred,
- UI code does not call live sources, old selectors, DB paths, mutation APIs, sync, deploy, or raw parser totals,
- all business numbers on pages are sourced from display contract props/helpers,
- required checks include Sian Q1 Design, Projects footer/CSV, project detail scoping, Float diagnostics, Data Quality, Approval, chat shell, unsupported-not-zero, and source-only visibility.

### P6-H: Doctrine Review Gate For UI Parity

Issue: `#62`

Owns:

- read-only review only.

Must prove:

- every UI surface consumes display contract output or explicit fixture contract output,
- no UI page calculates business totals locally,
- scope survives links, detail, CSV, and chat shell,
- unsupported values render as unsupported, not zero,
- source-only rows remain visible,
- chat shell is read-only and labels `Needs Codex`,
- deterministic UI verification covers required named workflows or carries explicit process warnings,
- no source-system mutation, sync, deploy, migration application, live source pull, database call, old selector truth, or alternate calculation path happened.
