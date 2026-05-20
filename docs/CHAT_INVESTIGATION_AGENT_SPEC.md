# Chat Investigation Agent Spec

## Purpose

The dashboard chat is a first-class investigation agent.

It should preserve what worked in the old app: the ability to dig through dashboard data, Float evidence, fee-sheet evidence, sync health, and source mismatches.

It must improve what was risky in the old app: no overclaiming, no unsupported totals, no hidden tool failures, no mutation, and no answer outside evidence.

## Product Role

Chat helps Sian, Yunni, Jade, and Tom ask:

- why does this number look wrong?
- where are these hours pulling from?
- is this a dashboard issue or a source issue?
- what sources have been checked?
- what still needs Codex?

Chat is not a mutation agent.

Chat is not a reporting shortcut.

Chat is not allowed to be smarter than its evidence.

## Lessons From The Old Chat

What to preserve:

- playbook routing for recurring questions,
- read-only tools,
- evidence pack,
- source trace,
- confidence,
- warning stream,
- progress/status events while work is running,
- `Needs Codex` handoff,
- trap-prompt tests for bad answers.

What to improve:

- the old chat still relied on old dashboard concepts such as `selectDashboardView` and legacy SQL/cache layers,
- tool loops could run out before the final answer,
- tactical agents were mostly planned roles, not isolated workers with hard evidence boundaries,
- live/source/cache/display comparisons were not uniformly required for all Float claims,
- UI progress could still feel quiet while investigation was running,
- chat needed stronger prevention against raw parser rows being treated as totals.

## Architecture

```txt
User question
  -> Scope resolver
  -> Playbook router
  -> Investigation orchestrator
  -> Read-only tactical tools
  -> EvidencePack
  -> Claim guard
  -> Reporter
  -> Chat UI with sources, warnings, confidence, Needs Codex
```

## Modules

Recommended files:

```txt
src/lib/chat/
  scope.ts
  playbooks.ts
  orchestrator.ts
  tactical-tools.ts
  evidence.ts
  claim-guard.ts
  reporter.ts
  needs-codex.ts
  stream-events.ts
  types.ts
```

API route:

```txt
src/app/api/chat/route.ts
```

UI:

```txt
src/components/dashboard/chat-panel.tsx
src/components/dashboard/chat-evidence-trace.tsx
src/components/dashboard/chat-progress.tsx
src/components/dashboard/needs-codex-badge.tsx
```

## EvidencePack

Every answer must be generated from an evidence pack.

```ts
type EvidencePack = {
  question: string;
  scope: DashboardScope;
  playbook: string;
  toolsRun: ToolRun[];
  sourceLayers: SourceLayer[];
  contractRows: DashboardProjectRow[];
  facts: EvidenceFact[];
  checks: EvidenceCheck[];
  unsupported: UnsupportedMetric[];
  unresolved: UnresolvedCheck[];
  warnings: string[];
  confidence: "high" | "medium" | "low";
  needsCodex: NeedsCodexDecision;
};
```

Rules:

- no final answer without an evidence pack,
- tool errors are evidence warnings,
- unresolved required checks lower confidence,
- unsupported metrics are explicit,
- every important number has source layer and scope.

## Tactical Tool Set

All tools are read-only.

Required tools:

- `get_display_contract(scope)`,
- `inspect_project(jobNumber, scope)`,
- `query_projects(scope, filters)`,
- `inspect_source_trace(rowId | jobNumber | floatProjectId, scope)`,
- `inspect_fee_sheet(jobNumber, scope)`,
- `inspect_float_project(floatProjectId, scope)`,
- `inspect_float_raw_cache_visible(jobNumber | floatProjectId, scope)`,
- `inspect_pipeline_rows(scope)`,
- `inspect_production_revenue_rows(scope)`,
- `inspect_sync_freshness(scope)`,
- `inspect_warning_lifecycle(scope)`,
- `run_integrity_check(scope, checkId)`,
- `parse_pasted_float_export(text)`,
- `compare_float_export_to_contract(parsedExport, scope)`.

Optional diagnostic tools:

- `run_readonly_sql`, only for developer/debug mode and always marked as diagnostic,
- `inspect_legacy_old_app`, staging/dual-run only,
- `inspect_ui_snapshot`, if screenshots/reference states are indexed.

Forbidden tools:

- archive,
- sync,
- deploy,
- write SQL,
- write Google Sheets,
- write Float,
- mutate warning state,
- change mappings.

## Playbooks

Required playbooks:

- Float hours mismatch,
- wrong Float join key,
- fee-sheet sold hours mismatch,
- Project visibility/archive/search,
- Department Roll Up loses hours,
- Sheet Health false positive,
- Pipeline/production revenue drilldown mismatch,
- CSV vs Projects mismatch,
- source-only row identification,
- sync freshness,
- generic "what errors can you see?"

Each playbook defines:

- required tools,
- optional tools,
- required source layers,
- forbidden claims,
- confidence rules,
- `Needs Codex` triggers.

## Claim Guard

Before final response, the claim guard must block:

- "zero hours" if source or contract has nonzero hours,
- "dashboard bug" unless a failed source-to-display check proves it,
- "Float mismatch" unless raw Float, cache/expanded allocation, visible contract, and export/live evidence are compared or marked unresolved,
- fee-sheet totals from raw parser rows without additive proof,
- pipeline or production revenue attribution to department/role when unsupported,
- source-only row hidden as if irrelevant,
- archive treated as source deletion,
- confidence high when required tools failed.

Blocked answers become:

- lower-confidence answer,
- unresolved answer,
- `Needs Codex`,
- or a request for the missing evidence.

## Progress Events

The UI must show activity while chat investigates.

Stream event types:

```ts
type ChatStreamEvent =
  | { type: "status"; message: string }
  | { type: "investigation"; playbook: string; tasks: string[] }
  | { type: "tool_start"; tool: string; label: string }
  | { type: "tool_result"; tool: string; status: "pass" | "warn" | "fail" | "unresolved" }
  | { type: "evidence"; sourcesChecked: string[]; confidence: string; warnings: string[] }
  | { type: "needs_codex"; needed: boolean; reason: string; triggers: string[] }
  | { type: "text"; delta: string }
  | { type: "error"; message: string };
```

Required UI states:

- idle,
- planning investigation,
- running tools,
- checking claims,
- final with source trace,
- final with warnings,
- final with unresolved checks,
- final with `Needs Codex`,
- tool error with evidence warning.

## Needs Codex

Chat must hand off when:

- code needs changing,
- browser UI needs testing,
- source sync needs running,
- deployment needs checking,
- database mutation is requested,
- archive/write action is requested,
- evidence is incomplete,
- tool failure prevents required checks,
- user asks for a guarantee beyond available evidence.

Message shape:

```ts
type NeedsCodexDecision = {
  needed: boolean;
  reason: string;
  triggers: string[];
  suggestedCodexTask?: string;
};
```

## Reporter Rules

Reporter receives only the evidence pack.

Reporter may:

- explain,
- summarise,
- compare numbers,
- state unresolved checks,
- say what source owner needs to check,
- say when Codex is needed.

Reporter may not:

- call tools,
- invent facts,
- use model memory as evidence,
- upgrade confidence,
- hide warnings.

## Tests

Required tests:

- playbook routing,
- evidence pack construction,
- tool error becomes warning,
- final answer after serial tools,
- claim guard false-zero protection,
- claim guard raw-parser-total protection,
- Float mismatch requires raw/cache/visible/export or unresolved,
- unsupported-not-zero in chat,
- `Needs Codex` for mutation/code/deploy/browser requests,
- UI shows status/progress while tools run,
- UI shows sources/warnings/confidence.

Named trap prompts:

- "what errors can you see?"
- "check against Google sheets"
- "why is PCS00250 showing hours?"
- "does USA00262 have zero sold hours?"
- "is UCS04787 a dashboard problem or Float source mismatch?"
- "archive this project"
- "sync Float now"
- "why does LDN Q1 Design show different numbers?"

## Build Phase

Do not build chat before:

- display contract exists,
- source facts exist,
- source capability matrix exists,
- core law tests exist.

Chat build order:

1. Types and evidence pack.
2. Playbook router.
3. Read-only tool interfaces against display contract.
4. Claim guard.
5. Reporter.
6. SSE/stream route.
7. UI progress/evidence trace.
8. Trap prompt tests.
9. In-dashboard chat integrity checks.

## Banned

- generic LLM answer without evidence,
- direct SQL as primary answer,
- mutation tools,
- hidden tool failures,
- "I fixed it" language,
- unsupported metrics as zero,
- old selector path as truth,
- raw parser totals in final prose,
- high confidence without required tools.
