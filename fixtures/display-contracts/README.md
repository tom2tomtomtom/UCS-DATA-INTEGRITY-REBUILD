# Display Contract Fixtures

Display contract fixtures hold expected outputs from the single display contract.
They must not encode page-local, CSV-local, chat-local, or script-local business
logic.

Each fixture must identify:

- active dashboard scope.
- source fact fixture references.
- visible rows.
- hero, rollup, footer, CSV, and drilldown expectations when relevant.
- unsupported metrics as explicit unsupported records.
- source traces and warnings.

Rules:

- The display contract is the only authority for visible numbers.
- Unsupported is not zero.
- Archive state is a warning or overlay, not a hide rule.
- Scope must include office, date range, and every active slice needed by the
  scenario.
