# UCS Fixture Scaffold

This folder holds deterministic fixture material for the data integrity rebuild.
Fixtures are evidence for tests. They are not source systems, live exports, or
approval proof by themselves.

## Fixture Families

- `source-rows/`: redacted raw source row shapes with source row identity.
- `parsed-facts/`: expected parser facts derived from source rows.
- `display-contracts/`: expected display contract outputs and unsupported states.
- `ui-scenarios/`: deterministic UI scenario inputs and scoped navigation cases.
- `golden-scenarios/`: named regression manifests that must never drift silently.

## Rules

- No secrets, credentials, tokens, API keys, connection strings, cookies, or auth
  headers.
- No raw client exports unless redacted and explicitly approved.
- Preserve source row identity whenever a fixture represents a source row.
- Keep source fields unsupported when the source cannot prove them. Do not encode
  unsupported as `0`, blank, or omitted.
- Use `0` only when the source explicitly supports and states a zero value.
- Every fixture must name the immutable law or acceptance gate it protects.
- Real-derived fixtures must record their redaction approach.
- Fixture updates must explain what changed and why.

## Placeholder Policy

Empty fixture slots are intentional in Phase 0. A slot may contain a manifest
before it contains data, but the manifest must not claim parser or contract
coverage until expected outputs exist.
