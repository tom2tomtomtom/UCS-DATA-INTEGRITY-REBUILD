# Build Log

This is the durable checkpoint log for the rebuild.

The controller updates this whenever a ticket completes, an agent reports back, a gate fails, or the next action changes.

## 2026-05-20

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
