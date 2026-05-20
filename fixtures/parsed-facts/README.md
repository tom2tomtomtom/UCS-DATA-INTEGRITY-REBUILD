# Parsed Fact Fixtures

Parsed fact fixtures describe expected parser outputs derived from source row
fixtures.

Each parsed fact fixture must include:

- source fixture reference.
- raw source row ID or explicit skipped-row reason.
- parser family and parser version when available.
- additive status for rows that could affect totals.
- warning records for conflicts, unsupported capabilities, or ambiguous source
  evidence.

`manifest.json` is the fixture register. It lists every parser source-row
fixture, every expected parsed-fact fixture, the laws protected by each fixture,
and the named Sian/Yunni/Jade regressions that are covered or explicitly
deferred with a `PROCESS_WARN` reason.

Rules:

- Raw rows are not automatic totals.
- CLIENT SUMMARY and V-tab disagreements must both remain inspectable.
- Unsupported metrics stay unsupported in facts and must not become zero.
- Facts must retain enough source trace to support display contract warnings.
