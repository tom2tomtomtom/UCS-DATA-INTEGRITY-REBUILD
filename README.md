# UCS Data Integrity Rebuild

Clean rebuild of the UCS Commercial Dashboard data engine and dashboard experience.

The goal is not to make messy source data look clean. The goal is to preserve the existing dashboard UX while making every number source-traceable, scoped, and impossible to misrepresent.

Default stack: Next.js App Router, TypeScript, React, Supabase Postgres, Vitest, Playwright, Railway.

Start here:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/IMMUTABLE_LAWS.md`
4. `docs/DEVELOPMENT_DOCTRINE.md`
5. `docs/SOURCE_CONTRACTS.md`
6. `docs/WHAT_NOT_TO_REPEAT.md`
7. `docs/ACCEPTANCE_GATES.md`
8. `docs/BUILD_PHASES.md`
9. `docs/IN_DASH_DATA_INTEGRITY_TESTS.md`
10. `docs/CLIENT_REQUIREMENTS_CAPTURE.md`
11. `docs/LAW_TEST_MATRIX.md`
12. `docs/UI_SCREENSHOT_REFERENCE_PLAN.md`

No app code should be written until the immutable laws are implemented as tests.
