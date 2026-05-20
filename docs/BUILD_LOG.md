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
