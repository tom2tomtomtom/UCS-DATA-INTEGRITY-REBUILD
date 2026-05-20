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

## Implementation Ticket Rule

Phase tickets are not enough for agents.

Before a phase starts implementation, it must have bounded implementation tickets with:

- issue number,
- write set,
- owner type,
- exact deliverables,
- verification,
- stop conditions.

Only Phase 0 currently has bounded implementation tickets. Later phase implementation tickets must be created after the prior phase exits, when the real file boundaries are known.

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
