# Fixture And Golden Data Strategy

## Purpose

The rebuild needs repeatable tests that preserve real lessons without committing sensitive client data unnecessarily.

## Fixture Types

### Synthetic Law Fixtures

Small hand-built examples that prove a law.

Examples:

- TBC pipeline row,
- zero-fee/nonzero-hour fee row,
- CLIENT SUMMARY/V-tab conflict,
- archived production revenue,
- Float cache-without-raw,
- unsupported pipeline department slice.

### Redacted Real-Shape Fixtures

Fixtures copied from real source shape, with sensitive values redacted or reduced.

Use for:

- template drift,
- USA fee-sheet structure,
- Float multi-person tasks,
- source row identity,
- raw parser traps.

### Golden Scenario Fixtures

Named scenarios that must never regress.

Required:

- LDN Q1 Design, first proof slice,
- UCS04787, first proof slice,
- UCS05186,
- UCS04154,
- PCS00250,
- USA00262,
- USA00323,
- BT raw/cache mismatch,
- TBC pipeline identity,
- archived production revenue.

## Fixture Rules

- Every fixture has a README explaining why it exists.
- Every fixture names the law it protects.
- Every fixture has expected parser facts.
- Every fixture has expected display contract output.
- Real-derived fixtures are redacted unless explicit approval exists.
- Do not use live source data as the only test.
- Do not use fixtures as the only test.

## Golden Output Rules

Golden outputs should include:

- parsed facts,
- unsupported metrics,
- reconciliation checks,
- display contract,
- CSV rows,
- chat evidence pack where relevant.

Golden outputs should not include:

- screenshots as correctness proof,
- secrets,
- full private source sheets,
- mutable timestamps unless normalised.

## Required Folder Shape

```txt
fixtures/
  laws/
  sources/
    fee-sheets/
    pipeline/
    production-revenue/
    float/
  scenarios/
    ldn-q1-design/
    ucs04787/
    ucs05186/
    ucs04154/
    pcs00250/
    usa00262/
    usa00323/
```

## Required Tests

- every fixture is referenced by at least one test,
- every named regression has a fixture,
- fixture expected outputs are regenerated only by explicit command,
- fixture update PRs explain what changed and why.
