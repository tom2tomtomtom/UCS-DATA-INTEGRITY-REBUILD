# UI Scenario Fixtures

UI scenario fixtures describe deterministic workflow inputs for later UI tests.
They do not prove correctness by screenshot alone.

Each scenario must specify:

- starting route and query params.
- active dashboard scope.
- expected click path.
- display contract fixture reference.
- expected visible warning labels.
- expected preservation of office, date range, department, role, client, search,
  job number, or Float project ID.

Rules:

- UI scenarios consume display contract fixtures.
- Exact client drilldown must not use fuzzy search as its identity model.
- Scope-preserving click paths must stay deterministic.
- Screenshots may support parity, but they are not the source of truth.
