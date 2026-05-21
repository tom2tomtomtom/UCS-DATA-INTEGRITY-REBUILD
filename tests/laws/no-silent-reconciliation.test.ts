import { describe, expect, test } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DataQualityDashboard } from "../../src/components/dashboard/data-quality/data-quality-dashboard";
import { buildSourceFactSetFromParserResults } from "../../src/lib/canon-queries/source-fact-set";
import { buildDashboardDisplayContract } from "../../src/lib/display/contract";
import { parseArchivedFeeSheetRows } from "../../src/lib/parsers/fee-sheet";
import { buildSourceSnapshotImportPlan } from "../../src/lib/source-import/snapshot-import";

describe("Law 2: the dashboard spots mistakes, it does not correct them", () => {
  test("preserves, classifies, scopes, and visibly warns on CLIENT SUMMARY versus V-tab disagreement", () => {
    const plan = buildSourceSnapshotImportPlan({
      snapshotId: "law-no-silent-reconciliation",
      capturedAt: "2026-05-20T18:00:00.000Z",
      readOnly: true,
      sources: [
        {
          source: "fee_sheet",
          mode: "manual_snapshot",
          sourceLabel: "Fee sheet mismatch fixture",
          rows: [
            {
              identity: {
                stableSourceRowKey: "fee-sheet:UCS04787:client-summary:12",
                sourceDocumentId: "fee-sheet",
                sourceTab: "CLIENT SUMMARY",
                sourceRowNumber: 12
              },
              raw: {
                rowKind: "client_summary",
                jobNumber: "UCS04787",
                client: "British Airways",
                office: "LDN",
                month: "2026-01",
                soldFee: 32_472,
                soldHours: 10
              }
            },
            {
              identity: {
                stableSourceRowKey: "fee-sheet:UCS04787:design-v-tab:44",
                sourceDocumentId: "fee-sheet",
                sourceTab: "Design",
                sourceRowNumber: 44
              },
              raw: {
                rowKind: "source_summary",
                jobNumber: "UCS04787",
                client: "British Airways",
                office: "LDN",
                month: "2026-01",
                soldFee: 30_000,
                soldHours: 8
              }
            }
          ]
        }
      ]
    });

    expect(plan.skippedRows).toHaveLength(0);
    expect(plan.rawRows).toHaveLength(2);
    expect(plan.rawRows.map((row) => row.identity.sourceTab)).toEqual([
      "CLIENT SUMMARY",
      "Design"
    ]);
    expect(plan.rawRows.map((row) => row.identity.stableSourceRowKey)).toEqual([
      "fee-sheet:UCS04787:client-summary:12",
      "fee-sheet:UCS04787:design-v-tab:44"
    ]);
    expect(plan.rawRows.map((row) => (row.raw as { soldFee: number }).soldFee)).toEqual([
      32_472,
      30_000
    ]);
    expect(new Set(plan.rawRows.map((row) => row.id)).size).toBe(2);

    const parserResult = parseArchivedFeeSheetRows(plan.rawRows);
    const conflictWarning = parserResult.warnings.find((warning) =>
      warning.code === "CLIENT_SUMMARY_VTAB_DISAGREE"
    );

    expect(parserResult.facts).toHaveLength(2);
    expect(conflictWarning).toMatchObject({
      code: "CLIENT_SUMMARY_VTAB_DISAGREE",
      severity: "DATA_WARN",
      source: "fee_sheet",
      sourceLayer: "sold",
      message: "CLIENT SUMMARY and V-tab source summary values differ; both rows are preserved."
    });
    expect(conflictWarning?.sourceRefs.map((sourceRef) => sourceRef.sourceTab)).toEqual([
      "CLIENT SUMMARY",
      "Design"
    ]);

    const factSet = buildSourceFactSetFromParserResults([parserResult], {
      warningObservedAt: "2026-05-20T18:00:00.000Z"
    });
    const sourceIssue = factSet.sourceIssues.find((issue) =>
      issue.code === "CLIENT_SUMMARY_VTAB_DISAGREE"
    );

    expect(sourceIssue).toMatchObject({
      status: "DATA_WARN",
      lifecycleState: "open",
      source: "fee_sheet",
      sourceLayer: "sold",
      owner: "Unknown",
      scope: {
        office: "LDN",
        from: "2026-01-01",
        to: "2026-01-31",
        client: "British Airways",
        jobNumber: "UCS04787"
      }
    });

    const contract = buildDashboardDisplayContract({
      ...factSet,
      scope: {
        office: "LDN",
        from: "2026-01-01",
        to: "2026-01-31",
        jobNumber: "UCS04787"
      },
      generatedAt: "2026-05-20T18:00:00.000Z"
    });
    const html = renderToStaticMarkup(React.createElement(DataQualityDashboard, { contract }));

    expect(contract.warnings.map((warning) => warning.code)).toContain("CLIENT_SUMMARY_VTAB_DISAGREE");
    expect(html).toContain("DATA_WARN: CLIENT_SUMMARY_VTAB_DISAGREE");
    expect(html).toContain("CLIENT SUMMARY and V-tab source summary values differ; both rows are preserved.");
  });
  test.todo("classifies production status collisions without choosing a winner silently");
  test.todo("surfaces duplicate Float jobs without merging them");
  test.todo("surfaces duplicate fee tracker jobs as conflict evidence");
  test.todo("surfaces cross-office duplicate jobs as scoped conflicts");
});
