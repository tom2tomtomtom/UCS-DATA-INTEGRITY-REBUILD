# Red Room Prebuild Review

Date: 2026-05-20

Status: `PROCESS_WARN`, no Phase 0 blocker found after mitigations in this document.

Purpose: assume the overnight build fails in the worst plausible way, then make the failure harder.

## Verdict

Green light remains valid for Phase 0 scaffolding only.

Do not start product UI, live source sync, chat implementation, Railway deployment, or production data migration.

## Worst Case Findings And Mitigations

### R1. Agents start from incomplete doctrine

Worst case: an implementation agent reads only the active ticket, misses the human objective or overnight controls, and builds lawful-looking code that violates the product purpose.

Mitigation:

- `OBJECTIVE.md`, overnight controls, execution tickets, and build log are now first-class startup documents in `AGENTS.md`, `CLAUDE.md`, and `README.md`.
- Every implementation prompt must still name the exact docs relevant to its write set.

Status: mitigated for Phase 0.

### R2. Stack drift reappears before package setup

Worst case: one agent assumes Vite because of global defaults, another assumes Next.js because of old app references, and Phase 0 creates incompatible structure.

Mitigation:

- Repo docs already state the chosen stack: Next.js App Router, TypeScript, React, Supabase Postgres, Vitest, Playwright, Railway.
- `docs/DEVELOPMENT_DOCTRINE.md` remains the stack authority.
- P0-A must not change stack without an ADR.

Status: mitigated, but P0-A must verify.

### R3. Remote Supabase is linked and accidentally mutated

Worst case: a helper runs `supabase db push`, a migration, or a seed against the new remote database before the schema is ready.

Mitigation:

- Phase 0 forbids remote migrations.
- Agents are forbidden from migrations unless controller explicitly approves after a gate.
- Supabase is linked only so connectivity and future migration paths are known.
- P0-A tests should not need database access.

Status: `PROCESS_WARN`. Must stay visible through Phase 0.

### R4. The old database becomes truth through convenience

Worst case: because `LEGACY_DATABASE_URL` is available, code starts comparing against or reading from old aggregate tables as if they are product truth.

Mitigation:

- Old DB is named legacy and allowed only for comparison, extraction, and dual-run evidence.
- Display contract must read new source archive and parsed facts only.
- Any use of legacy data in product code is `FAIL`.

Status: mitigated by doctrine, needs tests later.

### R5. Pipeline and Production Revenue source IDs are blank

Worst case: source archive work starts and silently skips Pipeline or Production Revenue because env values are absent.

Mitigation:

- `PIPELINE_SHEET_ID` and `PRODUCTION_REVENUE_SHEET_ID` are named as blockers for live source work.
- They are not blockers for Phase 0 scaffolding.
- Phase 2 cannot begin live source pulls until verified source IDs exist.

Status: `PROCESS_WARN`.

### R6. Secret exposure gets normalized

Worst case: the service role key and DB password pasted in chat remain production credentials forever.

Mitigation:

- No secrets are committed.
- Rotate Supabase DB password and service role key before production or stakeholder access.
- Phase 0 must include secret scanning or a no-secret check in CI.

Status: `PROCESS_WARN`.

### R7. UI parity becomes logic parity

Worst case: preserving Sian's approved UX becomes an excuse to copy old selectors, page-local totals, and CSV builders.

Mitigation:

- UI parity means visual/workflow parity only.
- Data logic must be rebuilt from laws, raw archive, parsers, source facts, and display contract.
- Phase 6 is blocked until Phase 5 display contract exists.

Status: mitigated by laws and phase order.

### R8. Incomplete screenshots get mistaken for complete UX evidence

Worst case: missing project detail, Float diagnostics, Data Quality, Approval, and chat screenshots cause gaps in UI parity later.

Mitigation:

- Screenshot manifest records missing captures and blockers.
- Phase 1 must create recapture tickets or explicit deferrals before UI rebuild.
- Slow old SSR routes are evidence of what not to preserve.

Status: `PROCESS_WARN`, not a Phase 0 blocker.

### R9. Placeholder tests become permanent ceremony

Worst case: Phase 0 creates many `test.todo` entries, later code ships while placeholders still claim coverage.

Mitigation:

- Placeholder graduation rule added.
- Once a phase implements behaviour covered by a placeholder, it must become an active passing test, active failing test, or blocker.

Status: mitigated by overnight control.

### R10. Chat becomes a second dashboard again

Worst case: chat gets built early, queries its own data path, and produces confident but unsupported answers.

Mitigation:

- Chat is Phase 7, after display contract.
- Chat can only report from `EvidencePack`.
- Chat must say `Needs Codex` when evidence is incomplete or a task needs repo/browser/mutation/deploy access.

Status: mitigated by phase order.

### R11. Unsupported values sneak in as zeros through type defaults

Worst case: TypeScript numeric defaults or table cells coerce missing source capability into `0`.

Mitigation:

- Phase 0 display types must represent unsupported as a first-class state.
- P0-C must prove unsupported metrics are representable.
- Law tests must include unsupported-not-zero fixtures.

Status: open until P0-C and P0-D complete.

### R12. Currency, date, and office scope drift hides inside fixtures

Worst case: fixture data passes because it is too clean, but real data fails on month boundaries, offices, currencies, and date ranges.

Mitigation:

- Fixture manifest must include named dirty cases, not only happy paths.
- Tolerance, units, and time policy must be part of parser and display tests.
- Real-data dual run remains a separate Phase 8 gate.

Status: open until fixture scaffold exists.

### R13. Raw archive becomes too vague to support source trace

Worst case: raw rows are stored, but not with enough row identity, tab name, batch, source layer, and parser metadata to prove visible numbers later.

Mitigation:

- Phase 2 source archive must be designed before parsers.
- Parsed facts must carry raw row IDs.
- Source trace is a display contract requirement, not a diagnostic nice-to-have.

Status: later-phase risk.

### R14. Warning language confuses source truth with process health

Worst case: a build warning is interpreted as a data warning, or a source warning is treated as a reason not to ship.

Mitigation:

- `DATA_WARN` and `PROCESS_WARN` are now separate in overnight governance.
- Product warnings remain about source limitations or source conflicts.

Status: mitigated.

### R15. Agent concurrency creates unreviewed integration drift

Worst case: multiple agents make individually reasonable changes that conflict at integration time.

Mitigation:

- Phase 0 implementation agents must have disjoint write sets.
- Controller checks actual diff against declared write set before acceptance.
- Doctrine Steward review is required before accepting agent output.

Status: mitigated if controller follows protocol.

## Red Room Stop Conditions

Stop Phase 0 if:

- `package.json` picks a stack different from the doctrine without ADR,
- any code path queries `LEGACY_DATABASE_URL` as product truth,
- a test uses remote Supabase without explicit reason,
- an agent changes files outside its write set without controller review,
- a placeholder test covers behaviour that has already shipped,
- a secret appears outside ignored env files,
- product UI is added before display contract types and law tests exist.

## Final Call

Proceed with Phase 0 scaffolding.

Do not proceed beyond Phase 0 until the Phase 0 exit criteria pass and a Doctrine Steward review records `PASS` or explicitly acceptable `PROCESS_WARN`.

