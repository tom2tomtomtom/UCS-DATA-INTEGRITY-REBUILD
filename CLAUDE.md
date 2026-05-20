# CLAUDE.md

## Read This First

This repo exists because the previous dashboard became a whackamole system: too many old selectors, sync tables, page-level calculations, CSV builders, chat tools, and scripts could each answer the same business question differently.

The rebuild must keep the same useful UCS dashboard UX, but the data engine must be rebuilt around hard immutable laws.

Before writing code, read:

1. `OBJECTIVE.md`
2. `docs/OVERNIGHT_BUILD_CONTROL.md`
3. `docs/EXECUTION_TICKETS.md`
4. `docs/BUILD_LOG.md`
5. `docs/IMMUTABLE_LAWS.md`
6. `docs/DEVELOPMENT_DOCTRINE.md`
7. `docs/WHAT_NOT_TO_REPEAT.md`
8. `docs/ACCEPTANCE_GATES.md`

## Product Identity

The dashboard is a source-traceable reconciliation surface.

It does not clean the business data.

It does not silently choose between conflicting sources.

It does not hide source-only, archived, TBC, inactive, duplicate, or unmatched rows.

It shows what the source systems say, where they disagree, and what the dashboard can and cannot prove.

## Non-Negotiable

No feature is done unless:

- every displayed number has source trace,
- every displayed number has an explicit scope,
- unsupported values are labelled as unsupported, not zero,
- CSV/export/chat/approval/UI use the same display contract,
- source-only rows remain visible,
- old or duplicate authority paths are impossible to call from product surfaces,
- tests prove the law being protected.

## Stack Defaults

Use the stack chosen in `docs/DEVELOPMENT_DOCTRINE.md`.

Deployment target is Railway unless Tom explicitly changes this.

Do not assume Vercel.

## Work Rules

- Write tests before or alongside code for every law.
- Do not make page-local totals.
- Do not create a second selector because it is faster.
- Do not copy old code unless it has passed the "what not to repeat" checklist.
- Do not add a cache unless the raw-to-cache reproduction test exists.
- Do not mark a warning green because it is inconvenient.
- Do not widen tolerances to make failing data pass.
- Do not send stakeholder confidence unless the relevant real-data gate has just been rerun.

## Required Development Loop

For every implementation task:

1. Name the law being protected.
2. Add or update the failing test.
3. Implement the smallest code path.
4. Prove UI, CSV, chat, and verifier use the same contract when relevant.
5. Run the focused tests.
6. Update docs if a contract changed.

If the task touches source data, display totals, Float, Pipeline, Production Revenue, fee sheets, chat evidence, CSV, approval, or project drilldowns, it must also touch a contract test.
