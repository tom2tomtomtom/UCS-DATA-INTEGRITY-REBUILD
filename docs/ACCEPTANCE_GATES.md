# Acceptance Gates

The app is not approved because it builds. It is approved when the same scoped truth appears in source evidence, display contract, UI, CSV, verification, and chat.

## Gate 0: Laws Exist As Tests

Before feature work:

- every immutable law has at least one failing or pending test,
- unsupported-not-zero has fixture coverage,
- scope preservation has fixture coverage,
- source-only row visibility has fixture coverage,
- chat claim guard has fixture coverage.

## Gate 1: Raw Source Preservation

Pass criteria:

- every source pull creates a batch,
- every non-empty row creates raw evidence,
- skipped rows are listed,
- unexplained skipped rows fail CI.

## Gate 2: Parser Accuracy

Pass criteria:

- parser facts retain raw row IDs,
- parser facts include additive/non-additive status,
- parser warnings are visible,
- CLIENT SUMMARY and V-tab disagreements are preserved,
- Float task expansion math is inspectable.

## Gate 3: Display Contract

Pass criteria:

- one pure display contract exists,
- all surfaces consume it,
- generated scopes pass,
- unsupported source fields are labelled,
- raw/cache/visible deltas are classified.

## Gate 4: UX Parity

Pass criteria:

- dashboard home works,
- Projects works,
- project detail works,
- Float diagnostics work,
- Data Quality works,
- Approval works,
- chat works,
- CSV export works,
- core click paths match the old UX where the old UX was approved.

## Gate 5: Sian/Yunni/Jade Scenarios

Required named scenarios:

- LDN Q1 Design rollup to Projects and detail,
- UCS04787 Float mismatch,
- UCS05186 duplicate/manual Float job,
- UCS04154 fee-sheet Float ID join,
- PCS00250 cache-without-raw warning,
- USA00262 sold-hours false-zero guard,
- USA00323 sold-hours false-zero guard,
- BT raw-without-cache Float mismatch,
- production revenue archived project visibility,
- TBC pipeline row identity,
- exact client drilldown.

## Gate 6: UI Tests

Required deterministic Playwright tests:

- rollup to Projects preserves scope,
- Projects footer equals visible rows,
- CSV equals visible rows,
- project detail remains scoped,
- pipeline unsupported in department/role scope,
- production revenue unsupported in department/role scope,
- search filters rows,
- archive click path works for mutable row,
- Float Export Compare handles fixed-width `Hours`,
- chat displays sources, warnings, confidence, and `Needs Codex`.

## Gate 7: Real Data Checks

Required commands once scripts exist:

```bash
npm test
npm run verify
VERIFY_FROM=2026-01-01 VERIFY_TO=2026-03-31 VERIFY_OFFICES=LDN npm run verify
VERIFY_FROM=2026-01-01 VERIFY_TO=2026-12-31 VERIFY_OFFICES=LDN npm run verify
VERIFY_FROM=2026-01-01 VERIFY_TO=2026-05-18 VERIFY_OFFICES=USA npm run verify
npm run sian:check
npm run integrity -- --office=LDN --from=2026-04-01 --to=2026-04-30
npm run build
```

`WARN` is allowed only when it names a real source limitation or source mismatch.

`FAIL` blocks release.

## Gate 8: Launch

Before telling anyone it is fixed:

- GitHub main is current,
- Railway deployment is success,
- live app commit matches local commit,
- Railway service is the rebuild service, not the old dashboard service,
- production environment points at the new Supabase production database,
- Sian/Yunni/Jade named checks pass,
- remaining warnings are documented,
- old app differences are classified.
