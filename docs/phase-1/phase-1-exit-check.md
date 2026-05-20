# Phase 1 Exit Check

Ticket: GitHub `#21`.

Doctrine review ticket: GitHub `#22`.

Status: candidate, pending verification and Doctrine Steward review.

## Boundary

Phase 1 is complete only if it maps the old UX and explicitly rejects the old data failures.

Phase 1 does not build product UI, source archive code, parsers, queries, display contract logic, chat tools, migrations, deployment, sync, or source-system mutation.

## Required Artifacts

| Artifact | Status |
|---|---|
| Route and navigation inventory | present, `docs/phase-1/route-inventory.md` |
| Scope, filter, URL state, and workflow inventory | present, `docs/phase-1/scope-filter-workflows.md` |
| Table, column, control, and CSV inventory | present, `docs/phase-1/table-export-inventory.md` |
| Screenshot coverage and recapture plan | present, `docs/phase-1/screenshot-coverage.md` |
| Assembled UX parity map | present, `docs/phase-1/ux-parity-map.md` |
| Missing screenshot follow-up tickets | present, GitHub `#23`, `#24`, `#25` |

## Acceptance Checklist

| Check | Required result | Status |
|---|---|---|
| Approved UX separated from data logic | old routes and controls are mapped, old selectors are rejected | candidate pass |
| Preserve/do-not-preserve notes exist | each major surface has both preservation and rejection notes | candidate pass |
| Scope model explicit | `office`, `from`, `to`, `department`, `role`, `client`, `search`, `jobNumber`, and `floatProjectId` are named | candidate pass |
| Fuzzy search separated from identity | exact client/job/Float scopes are not represented as search | candidate pass |
| Unsupported values protected | map says unsupported is unsupported or blank with reason, not zero | candidate pass |
| Source-only rows protected | pipeline-only, production-only, Float-only, TBC, archived/source-only visibility are documented | candidate pass |
| CSV parity protected | CSV must come from the same display rows as Projects | candidate pass |
| Chat evidence boundary protected | chat must use active scope and evidence pack, and must say `Needs Codex` when needed | candidate pass |
| Screenshot gaps explicit | blocked/missing screenshots are listed with blockers and follow-up tickets | candidate pass |
| No implementation overreach | no product UI, parser, sync, migration, deploy, or source mutation work introduced by Phase 1 | pending git verification |
| Doctrine Steward reviewed | independent review in `#22` finds no blocker | pending |

## Accepted Process Warnings

These do not block Phase 1 exit if the Doctrine Steward agrees:

- current screenshot evidence is partial,
- old app route latency prevented complete live capture,
- project detail and Float captures require long-timeout follow-up,
- deterministic fixture screenshots cannot be completed until later phases provide the fixture UI harness,
- mobile and laptop screenshots are deferred until core desktop coverage and UI parity harness exist.

These warnings are tracked by GitHub `#23`, `#24`, and `#25`.

## Blocking Failures

Phase 1 must not close if any of these are true:

- missing screenshot coverage is not ticketed,
- any doc implies old selectors or old display calculations are authoritative,
- any doc treats unsupported source capability as zero,
- any doc allows source-only rows to be hidden for cleanliness,
- any doc lets chat answer without evidence,
- any doc treats old route latency, overflow, or hydration mismatch as acceptable parity,
- any product code, migration, or source-system mutation was introduced in Phase 1.

## Verification Commands

Required before closing Phase 1:

```bash
npm test
npm run verify:phase0
npm run build
npm audit --omit=dev
git diff --check
```

Doctrine Steward must also review the Phase 1 artifacts and issue comments before the controller closes `#17` through `#22`.

## Next Phase Gate

Phase 2 may start only after:

- this exit check is reviewed,
- Doctrine Steward reports no blocker,
- Phase 1 docs are committed and pushed,
- GitHub `#17` through `#22` are updated with evidence,
- no Phase 1 implementation has crossed into product code,
- missing visual evidence remains tracked in `#23`, `#24`, and `#25`.

Phase 2 starts with source archive design and tests. It must not start with parser shortcuts or display rows.
