# Source Truth Rescue Plan

## Objective

Return the rebuild to the simple product objective: show the four source streams as they are, including dirty data, and make mismatches visible without inventing corrections.

## Non-negotiables

- Source rows are truth, even when they are wrong.
- The dashboard is read-only.
- Unsupported source attribution renders as Unsupported, not zero.
- Source identity rows may label a project, but must not create sold fee or sold hours.
- Every visible number must come from source rows or be labelled unsupported.
- The recognised legacy UX stays recognisable. Data truth wins over polish.

## Work Plan

1. Preserve Fee Tracker project identity as non-additive facts.
   - Fee Tracker master rows should create source-summary identity only.
   - They must not create sold fee, sold hours, or dashboard totals.
   - Float rows with the same job number should inherit the real client/project identity instead of appearing as Unknown client / Float only.

2. Prove the Sian path with tests and live UI smoke.
   - LDN Q1 Design dashboard row.
   - Projects drilldown for Design.
   - UCS04787 row visibility.
   - Unsupported labels stay visible where fee sheet details have not been crawled or cannot attribute a metric.

3. Make full linked fee-sheet ingestion resumable.
   - The full crawl is too slow for a blocking command.
   - Build checkpointed/background ingestion before claiming all linked tabs are imported.

4. Stop before adding features.
   - No chat expansion.
   - No forecasting.
   - No new doctrine pages.
   - No stakeholder demo claim until source archive, Sian path, and named rows are proven on staging.
