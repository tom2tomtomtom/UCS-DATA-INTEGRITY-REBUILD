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
