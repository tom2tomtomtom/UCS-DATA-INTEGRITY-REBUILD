# Build Phases

The rebuild must happen in this order. Do not jump to UI before the laws and contract exist.

## Phase 0: Repo Foundation

Deliverables:

- `AGENTS.md`,
- `CLAUDE.md`,
- immutable laws,
- development doctrine,
- source contracts,
- identity and matching policy,
- tolerance, units, and time policy,
- staleness and deletion policy,
- warning lifecycle policy,
- security and mutation boundary,
- fixture strategy,
- legacy decommission plan,
- bad code unravelling policy,
- environment and Supabase strategy,
- Railway deployment strategy,
- chat investigation agent spec,
- acceptance gates,
- CI skeleton,
- test runner,
- fixture folder.

Exit criteria:

- docs explain the system before code exists,
- CI can run an empty/pending test suite,
- every named law has a pending test file.

## Phase 1: UX Parity Map

Deliverables:

- route list from old app,
- page inventory,
- table/export columns,
- filter model,
- named user workflows,
- screenshots for all dashboard routes and named scenarios,
- screenshot manifest with old commit, auth mode, data mode, scope, and known issues.

Exit criteria:

- old UX is understood without copying old data logic,
- approved UX and confusing legacy behavior are separated.
- screenshot reference set exists under `reference/ui/current-app/` or blockers are documented.

## Phase 2: Source Archive

Deliverables:

- source batch model,
- raw source row model,
- source pull interface,
- source row browser for development,
- dropped-row ledger.

Exit criteria:

- every non-empty source row is stored,
- unexplained dropped rows fail tests.

## Phase 3: Parsers

Deliverables:

- fee-sheet parser,
- pipeline parser,
- production revenue parser,
- Float parser,
- parser fixtures,
- parser warnings.

Exit criteria:

- parsed facts carry source row IDs,
- additive status is explicit,
- parser warnings are visible,
- known failure fixtures pass.

## Phase 4: Canon Queries

Deliverables:

- `selectSoldFacts(scope)`,
- `selectPipelineFacts(scope)`,
- `selectProductionRevenueFacts(scope)`,
- `selectFloatFacts(scope)`,
- source capability metadata.

Exit criteria:

- source facts do not build UI rows,
- source facts do not hide source-only rows,
- archive/source-only visibility tests pass.

## Phase 5: Display Contract

Deliverables:

- `buildDashboardDisplayContract`,
- visible rows,
- hero totals,
- rollups,
- CSV rows,
- unsupported metrics,
- reconciliation checks,
- source trace,
- warnings,
- confidence.

Exit criteria:

- generated scope tests pass,
- no page-local business calculations exist.

## Phase 6: UI Parity

Deliverables:

- dashboard home,
- Projects,
- project detail,
- Float diagnostics,
- Data Quality,
- in-dashboard data integrity tests,
- Approval,
- chat shell,
- CSV export.

Exit criteria:

- every page consumes the display contract,
- deterministic UI tests cover named workflows.

## Phase 7: Chat Evidence

Deliverables:

- `EvidencePack`,
- claim guard,
- read-only tools,
- investigation orchestrator,
- tactical investigation playbooks,
- progress stream events,
- `Needs Codex` handoff,
- compact source trace.

Exit criteria:

- trap prompts cannot produce unsupported claims,
- tool errors become evidence warnings.

## Phase 8: Real Data Dual Run

Deliverables:

- old vs new comparison,
- source vs contract comparison,
- in-dashboard integrity report,
- UI screenshot/click proof,
- Sian/Yunni/Jade named scenario report.

Exit criteria:

- all differences classified,
- no unsupported metric presented as fact,
- no hidden source rows.

## Phase 9: Launch

Deliverables:

- Railway deployment,
- live app commit proof,
- final acceptance report,
- stakeholder-ready caveats.

Exit criteria:

- all blocking gates pass,
- remaining warnings are real source limitations or conflicts.
