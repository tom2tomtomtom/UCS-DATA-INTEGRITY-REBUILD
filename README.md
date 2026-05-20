# UCS Data Integrity Rebuild

Clean rebuild of the UCS Commercial Dashboard data engine and dashboard experience.

The goal is not to make messy source data look clean. The goal is to preserve the existing dashboard UX while making every number source-traceable, scoped, and impossible to misrepresent.

Default stack: Next.js App Router, TypeScript, React, Supabase Postgres, Vitest, Playwright, Railway.

Start here:

1. `OBJECTIVE.md`
2. `AGENTS.md`
3. `CLAUDE.md`
4. `docs/OVERNIGHT_BUILD_CONTROL.md`
5. `docs/EXECUTION_TICKETS.md`
6. `docs/BUILD_LOG.md`
7. `docs/IMMUTABLE_LAWS.md`
8. `docs/DEVELOPMENT_DOCTRINE.md`
9. `docs/SOURCE_CONTRACTS.md`
10. `docs/WHAT_NOT_TO_REPEAT.md`
11. `docs/ACCEPTANCE_GATES.md`
12. `docs/BUILD_PHASES.md`
13. `docs/IN_DASH_DATA_INTEGRITY_TESTS.md`
14. `docs/CLIENT_REQUIREMENTS_CAPTURE.md`
15. `docs/LAW_TEST_MATRIX.md`
16. `docs/UI_SCREENSHOT_REFERENCE_PLAN.md`
17. `docs/IDENTITY_MATCHING_POLICY.md`
18. `docs/TOLERANCE_UNITS_AND_TIME_POLICY.md`
19. `docs/SOURCE_STALENESS_AND_DELETION_POLICY.md`
20. `docs/FIXTURE_AND_GOLDEN_DATA_STRATEGY.md`
21. `docs/WARNING_LIFECYCLE_POLICY.md`
22. `docs/SECURITY_PERMISSIONS_AND_MUTATION_BOUNDARY.md`
23. `docs/LEGACY_DECOMMISSION_PLAN.md`
24. `docs/ENV_AND_SUPABASE_STRATEGY.md`
25. `docs/RAILWAY_DEPLOYMENT_STRATEGY.md`
26. `docs/CHAT_INVESTIGATION_AGENT_SPEC.md`
27. `docs/GO_NO_GO_READINESS.md`
28. `docs/BAD_CODE_UNRAVELLING_POLICY.md`
29. `docs/adr/0002-rebuild-start-decisions.md`

No app code should be written until the immutable laws are implemented as tests.
