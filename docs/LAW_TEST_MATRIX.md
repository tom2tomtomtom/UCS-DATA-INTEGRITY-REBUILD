# Law Test Matrix

Every law must become executable. This matrix is the build checklist for tests.

## Matrix

| Law | Required Test File | Required Fixtures | Blocking Gate |
|---|---|---|---|
| Source Row Preservation | `tests/laws/source-row-preservation.test.ts` | TBC, no-job, archived, inactive, orphan, zero-fee/nonzero-hour, duplicate | Unit and verify |
| No Silent Reconciliation | `tests/laws/no-silent-reconciliation.test.ts` | CLIENT SUMMARY vs V-tab conflict, duplicate Float, production status collision | Unit and Data Quality |
| Single Display Contract | `tests/laws/single-display-contract.test.ts` | synthetic full dashboard scope | Unit, contract, UI |
| Scope Preservation | `tests/laws/scope-preservation.test.ts` | LDN Q1 Design, exact client, role drilldown, project detail | Contract and Playwright |
| Unsupported Is Not Zero | `tests/laws/unsupported-is-not-zero.test.ts` | pipeline department slice, production role slice, missing role data | Contract and UI |
| Raw Rows Are Not Totals | `tests/laws/raw-rows-are-not-totals.test.ts` | USA fee sheet, totals row, detail rows, duplicated role section | Parser and chat |
| Float Layer Separation | `tests/laws/float-layer-separation.test.ts` | UCS04787, PCS00250, BT raw/cache, inactive visible | Parser, contract, Data Quality |
| Archive Is Warning Not Hide Rule | `tests/laws/archive-visibility.test.ts` | archived prod-rev, archived Float, manual duplicate | Contract and UI |
| Chat Evidence Boundary | `tests/laws/chat-evidence-boundary.test.ts` | bad pasted transcript, tool error, incomplete evidence | API and UI |
| Approval Requires Full Agreement | `tests/laws/approval-full-agreement.test.ts` | source, contract, UI, CSV, chat fixture | Verify and CI |
| Identity Matching Policy | `tests/laws/identity-matching.test.ts` | Float ID, source client, canonical client, TBC row, no-job row | Parser and contract |
| Staleness And Deletion Policy | `tests/laws/staleness-deletion.test.ts` | failed batch, partial batch, missing Float task, repaired sheet | Parser and verify |
| Tolerance And Units Policy | `tests/laws/tolerance-units-time.test.ts` | USD fee sheet, FX snapshot, Q1 boundary, rounded hours | Parser and contract |
| Warning Lifecycle Policy | `tests/laws/warning-lifecycle.test.ts` | acknowledged, source fixed pending refresh, resolved by source | Data Quality |
| Mutation Boundary | `tests/laws/mutation-boundary.test.ts` | chat, integrity, archive overlay, export compare | API and UI |
| Chat Investigation Agent | `tests/laws/chat-investigation-agent.test.ts` | trap prompts, tool errors, unsupported checks, Needs Codex | API and UI |

## Named Regression Matrix

| Scenario | Why It Exists | Required Proof |
|---|---|---|
| LDN Q1 Design | Sian saw rollup and Projects disagree | rollup, Projects, footer, CSV, detail agree for supported metrics |
| UCS04787 | Yunni's Float UI/export did not match dashboard | raw Float, cache, visible, export compared or unresolved |
| UCS05186 | duplicate/manual Float confusion | duplicate candidates visible and not silently merged |
| UCS04154 | wrong Float join key | fee-sheet Float ID is canonical join |
| PCS00250 | cache has hours without raw task rows | surfaced as WARN, not PASS |
| USA00262 | false zero sold hours | nonzero source hours cannot be reported as zero |
| USA00323 | raw parser total trap | raw rows cannot be summed without additive proof |
| BT raw/cache | raw Float did not reach allocation cache | FAIL classification |
| TBC pipeline | TBC rows collapsed in old paths | source-row identity preserved |
| Archived prod-rev | hero included money, Projects hid it | visible in Projects and CSV with warning |
| Exact client drilldown | fuzzy search caused mismatched views | `client` param is exact, `search` is fuzzy only |

## CI Rule

No pull request can merge while a law test is missing for a feature touching:

- source ingestion,
- parsing,
- display contract,
- Projects,
- project detail,
- CSV,
- chat,
- Data Quality,
- Float diagnostics,
- approval,
- verify scripts.

## Developer Rule

Every implementation PR description must include:

```txt
Protected law:
User scenario:
Tests added:
Unsupported states:
Source rows affected:
```
