# AGENTS.md

## Read Before Any Action

This repository is a clean rebuild of the UCS Commercial Dashboard data integrity engine and dashboard UX.

The old system failed because too many code paths could independently answer the same dashboard question. This repo must make that impossible.

Before editing files, every agent must read:

1. `docs/IMMUTABLE_LAWS.md`
2. `docs/DEVELOPMENT_DOCTRINE.md`
3. `docs/SOURCE_CONTRACTS.md`
4. `docs/WHAT_NOT_TO_REPEAT.md`
5. `docs/ACCEPTANCE_GATES.md`
6. `docs/BUILD_PHASES.md`
7. `docs/IN_DASH_DATA_INTEGRITY_TESTS.md`
8. `docs/CLIENT_REQUIREMENTS_CAPTURE.md`
9. `docs/LAW_TEST_MATRIX.md`
10. `docs/UI_SCREENSHOT_REFERENCE_PLAN.md`
11. `docs/IDENTITY_MATCHING_POLICY.md`
12. `docs/TOLERANCE_UNITS_AND_TIME_POLICY.md`
13. `docs/SOURCE_STALENESS_AND_DELETION_POLICY.md`
14. `docs/FIXTURE_AND_GOLDEN_DATA_STRATEGY.md`
15. `docs/WARNING_LIFECYCLE_POLICY.md`
16. `docs/SECURITY_PERMISSIONS_AND_MUTATION_BOUNDARY.md`
17. `docs/LEGACY_DECOMMISSION_PLAN.md`
18. `docs/ENV_AND_SUPABASE_STRATEGY.md`
19. `docs/RAILWAY_DEPLOYMENT_STRATEGY.md`
20. `docs/CHAT_INVESTIGATION_AGENT_SPEC.md`
21. `docs/GO_NO_GO_READINESS.md`
22. `docs/BAD_CODE_UNRAVELLING_POLICY.md`

## Mission

Preserve the same user experience Sian, Yunni, Jade, and Tom expect, but rebuild the data layer so every visible number is source-traceable, scoped, and contract-backed.

The dashboard must show messy source truth honestly. It must not clean, hide, reconcile, infer, or smooth source contradictions unless that action is explicitly recorded as a visible warning.

## Hard Rules

### Rule 1: Laws First

Do not write product code for a behavior until the relevant immutable law exists as a test or pending test.

### Rule 2: One Display Contract

All visible numbers must come from the display contract.

Forbidden:

- page-local business totals,
- CSV-only totals,
- chat-only totals,
- approval-only totals,
- script-only product truth,
- "temporary" selectors that become official.

### Rule 3: Source Rows Are Never Disposable

All non-empty source rows must be preserved as raw evidence.

Source-only, unmatched, archived, inactive, TBC, provisional, duplicate, Float-only, pencil, placeholder, and orphan rows are not noise.

### Rule 4: Unsupported Is Not Zero

Zero is a source-supported numeric value.

Unsupported is a capability state.

Never render unsupported as zero.

### Rule 5: Scope Must Survive Clicks

Every route, link, export, project detail, chat answer, and verification result must carry the active scope.

Scope includes:

- office,
- from,
- to,
- department,
- role,
- exact client,
- search,
- job number,
- Float project ID.

### Rule 6: Chat Is Read-Only

Chat can investigate from evidence. It cannot mutate, sync, archive, deploy, or write.

Chat must say `Needs Codex` when a task requires code, browser testing, repo inspection, data mutation, sync, deployment, or stakeholder communication.

### Rule 7: No Old Code By Default

Old dashboard code may be read for understanding. It must not be copied unless:

- the source law is named,
- the old failure risk is checked,
- the new contract test exists,
- the code path does not create a second authority.

### Rule 8: Tests Are Product Infrastructure

Every law must have tests.

Every named Sian/Yunni/Jade regression must have tests.

Every UI drilldown must have deterministic UI coverage.

### Rule 9: Warn Honestly

A `WARN` is acceptable only when it names a source limitation or source conflict.

A `FAIL` means dashboard, contract, parser, cache, UI, chat, export, or verification is wrong.

### Rule 10: Railway Is The Deployment Target

Assume Railway for deployment unless Tom explicitly changes this.

Do not assume Vercel.

## Required Development Sequence

1. Laws.
2. Fixtures.
3. Raw source archive.
4. Parsers.
5. Source facts.
6. Display contract.
7. Contract tests.
8. UI parity.
9. CSV/export.
10. Chat evidence.
11. Verify/approval scripts.
12. Deterministic UI tests.
13. Real-data dual run.
14. Railway deployment.

Skipping ahead is not allowed.

## Stop Conditions

Stop and report instead of coding if:

- a requirement would hide source rows,
- a requirement would make unsupported look like zero,
- two source paths disagree and no law covers the conflict,
- a needed source capability does not exist,
- a requested UI number cannot be traced,
- a code path would create a second authority.

## Commit Discipline

Small increments only.

For each commit:

- name the law protected,
- include tests or docs appropriate to the phase,
- do not mix unrelated refactors,
- do not remove warnings to make output cleaner,
- do not commit generated credentials or real secrets.
