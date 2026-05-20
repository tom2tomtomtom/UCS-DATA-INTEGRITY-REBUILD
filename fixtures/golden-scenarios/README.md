# Golden Scenario Manifests

Golden scenarios are named regression slots for the Sian, Yunni, and Jade checks
listed in the acceptance gates.

`manifest.json` is the Phase 0 slot registry. A slot becomes test-ready only
when the relevant source rows, parsed facts, display contracts, and UI scenarios
exist and are referenced by tests.

Rules:

- Do not put raw private exports in a scenario folder.
- Do not claim a slot is covered until expected outputs exist.
- Preserve the active scope for every scenario.
- Keep source conflicts and unsupported metrics visible in expected outputs.
