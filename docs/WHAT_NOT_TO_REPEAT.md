# What Not To Repeat

This is the failure ledger. Every item here came from pain in the old dashboard.

## Do Not Repeat: Multiple Authorities

- Do not have old selectors and new selectors both in product use.
- Do not have page-level row builders.
- Do not have one Projects table path and a different CSV path.
- Do not have a hero total path that cannot drill into the same rows.
- Do not have chat use a separate query model.
- Do not have approval use a path the UI does not use.
- Do not have diagnostic scripts become unofficial truth.
- Do not keep stale DB mirrors with different keys from live readers.

## Do Not Repeat: Silent Data Loss

- Do not drop unmatched pipeline rows.
- Do not drop no-job pipeline rows.
- Do not collapse all TBC rows.
- Do not drop production revenue because the project is archived.
- Do not drop blank-status production revenue.
- Do not hide Float-only rows.
- Do not hide placeholder or pencil Float work.
- Do not hide inactive Float jobs with hours.
- Do not hide fee-sheet rows with zero fee and nonzero hours.
- Do not let stale sheet errors survive without a current parse result.

## Do Not Repeat: False Precision

- Do not show unsupported as zero.
- Do not show unsupported as blank.
- Do not show role-level truth when role data is absent.
- Do not show department-level pipeline attribution unless source supports it.
- Do not show production revenue by role unless source supports it.
- Do not show Float raw task spans as dashboard-semantic monthly hours unless the expansion logic is labelled.
- Do not show cache-only rows as green.

## Do Not Repeat: Scope Drift

- Do not use search as client drilldown.
- Do not lose office filters when linking from rollup to Projects.
- Do not lose date ranges when linking to project detail.
- Do not show full-project detail after scoped drilldown.
- Do not compare a user's full-year Float export to a Q1 dashboard view.
- Do not compare full-project Float trace to a department-scoped dashboard row.
- Do not mix project header office with row-level office silently.

## Do Not Repeat: Fee-Sheet Parser Errors

- Do not assume fixed spreadsheet offsets without drift checks.
- Do not assume all offices use identical templates.
- Do not assume CLIENT SUMMARY and V-tabs agree.
- Do not discard CLIENT SUMMARY because V-tabs exist.
- Do not sum raw parser rows as totals.
- Do not treat totals rows as delivery rows.
- Do not treat delivery rows as totals rows.
- Do not say sold hours are zero when hours exist but role rows are missing or unsupported.
- Do not check Sheet Health against the wrong cells.

## Do Not Repeat: Float Errors

- Do not join by Float project code text when the fee sheet gives an explicit Float ID.
- Do not silently swap to a manually-created duplicate Float project.
- Do not hide manual duplicates after archive if they explain a mismatch.
- Do not ignore deleted Float tasks.
- Do not conflate raw Float, canonical task rows, allocation cache, and visible dashboard rows.
- Do not green-light raw/cache/visible mismatch.
- Do not ignore multi-person task splits.
- Do not ignore placeholder people because office inference fails.

## Do Not Repeat: UI Regressions

- Do not ship a search box that only reorders rows.
- Do not ship archive buttons without a click-path test.
- Do not make a table footer disagree with visible rows.
- Do not make a CSV disagree with visible rows.
- Do not hide source-only row types in exports.
- Do not show a total that has no drilldown.
- Do not let filter switching lose hour data.
- Do not make warnings disappear when changing tabs.

## Do Not Repeat: Chat Overclaiming

- Do not let chat say "dashboard error" without a failed source-to-display check.
- Do not let chat say "zero hours" when source or dashboard facts contain nonzero hours.
- Do not let chat describe unmapped role data as formula errors without checking the relevant source cells.
- Do not let chat compare Float without raw, cache, and visible layers.
- Do not hide tool failures from the evidence pack.
- Do not let chat answer from model plausibility.

## Do Not Repeat: Verification Theatre

- Do not treat `npm run build` as data approval.
- Do not treat deploy success as live data correctness.
- Do not rely on one broad total.
- Do not rely on one office.
- Do not rely only on fixtures.
- Do not rely only on live data.
- Do not widen hour tolerances to hide a one-day allocation error.
- Do not call it fixed without UI click-path proof for Sian/Yunni scenarios.

## Do Not Repeat: Documentation Drift

- Do not document scripts that do not exist.
- Do not leave source registry notes that disagree with sync code.
- Do not bury accepted trade-offs in old plans.
- Do not let docs say "verify checks source to dashboard" unless it really does.
- Do not let open warnings look like shipped fixes.

## The Meta-Failure

The old app failed because the canon was right, but the code did not make it impossible to break the canon.

The rebuild succeeds only if the laws are executable.
