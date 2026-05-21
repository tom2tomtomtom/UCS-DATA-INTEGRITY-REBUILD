import { describe, expect, test } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DataQualityDashboard } from "../../src/components/dashboard/data-quality/data-quality-dashboard";
import { buildSourceFactSetFromParserResults } from "../../src/lib/canon-queries/source-fact-set";
import { buildDashboardDisplayContract } from "../../src/lib/display/contract";
import { parseArchivedFeeSheetRows } from "../../src/lib/parsers/fee-sheet";
import { parseArchivedFloatRows } from "../../src/lib/parsers/float";
import { parseProductionRevenueRows } from "../../src/lib/parsers/production-revenue";
import { buildSourceSnapshotImportPlan } from "../../src/lib/source-import/snapshot-import";
import type { SourceName } from "../../src/lib/canon/types";
import type { SourceSnapshotRow } from "../../src/lib/source-import/snapshot-import";

function planRows(source: SourceName, rows: readonly SourceSnapshotRow[]) {
  return buildSourceSnapshotImportPlan({
    snapshotId: `law-no-silent-${source}`,
    capturedAt: "2026-05-20T18:00:00.000Z",
    readOnly: true,
    sources: [
      {
        source,
        mode: "manual_snapshot",
        sourceLabel: `${source} law fixture`,
        rows
      }
    ]
  }).rawRows;
}

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
  test("classifies production status collisions without choosing a winner silently", () => {
    const parserResult = parseProductionRevenueRows(
      planRows("production_revenue", [
        {
          identity: {
            stableSourceRowKey: "production:UCS09001:confirmed",
            sourceDocumentId: "production-sheet",
            sourceTab: "May",
            sourceRowNumber: 8
          },
          raw: {
            jobNumber: "UCS09001",
            client: "Collision Client",
            projectName: "Status Collision",
            office: "LDN",
            month: "2026-05",
            amount: 1200,
            status: "CONFIRMED"
          }
        },
        {
          identity: {
            stableSourceRowKey: "production:UCS09001:negotiating",
            sourceDocumentId: "production-sheet",
            sourceTab: "May",
            sourceRowNumber: 9
          },
          raw: {
            jobNumber: "UCS09001",
            client: "Collision Client",
            projectName: "Status Collision",
            office: "LDN",
            month: "2026-05",
            amount: 1200,
            status: "NEGOTIATING"
          }
        }
      ])
    );

    expect(parserResult.facts.map((fact) => fact.productionStatus)).toEqual([
      "CONFIRMED",
      "NEGOTIATING"
    ]);
    expect(parserResult.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "STATUS_COLLISION",
          severity: "DATA_WARN",
          rawRowIds: expect.arrayContaining(parserResult.facts.flatMap((fact) => fact.rawRowIds))
        })
      ])
    );
    expect(parserResult.facts.every((fact) => fact.warnings.some((warning) => warning.code === "STATUS_COLLISION"))).toBe(true);
  });

  test("surfaces duplicate Float jobs without merging them", () => {
    const parserResult = parseArchivedFloatRows(
      planRows("float", [
        {
          identity: {
            stableSourceRowKey: "float:project-1:task-a",
            sourceObjectId: "task-a"
          },
          raw: {
            objectType: "task",
            floatProjectId: "123",
            projectCode: "UCS05186",
            projectName: "Duplicate Float",
            taskId: "task-a",
            month: "2026-03",
            hours: 10,
            activeState: "active",
            duplicateGroupKey: "UCS05186:duplicate",
            duplicateCandidateType: "float_candidate"
          }
        },
        {
          identity: {
            stableSourceRowKey: "float:project-2:task-b",
            sourceObjectId: "task-b"
          },
          raw: {
            objectType: "task",
            floatProjectId: "456",
            projectCode: "UCS05186",
            projectName: "Duplicate Float Manual",
            taskId: "task-b",
            month: "2026-03",
            hours: 8,
            activeState: "archived",
            duplicateGroupKey: "UCS05186:duplicate",
            duplicateCandidateType: "manual_duplicate"
          }
        }
      ])
    );

    expect(parserResult.facts).toHaveLength(2);
    expect(parserResult.facts.map((fact) => fact.floatProjectId)).toEqual(["123", "456"]);
    expect(parserResult.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DUPLICATE_FLOAT_CANDIDATE",
          severity: "DATA_WARN"
        }),
        expect.objectContaining({
          code: "MANUAL_DUPLICATE_CANDIDATE",
          severity: "DATA_WARN"
        })
      ])
    );
  });

  test("surfaces duplicate fee tracker jobs as conflict evidence", () => {
    const parserResult = parseArchivedFeeSheetRows(
      planRows("fee_sheet", [
        {
          identity: {
            stableSourceRowKey: "fee:UCS09002:design:1",
            sourceDocumentId: "fee-sheet",
            sourceTab: "Design",
            sourceRowNumber: 21
          },
          raw: {
            rowKind: "v_tab",
            jobNumber: "UCS09002",
            client: "Duplicate Fee",
            office: "LDN",
            month: "2026-05",
            department: "Design",
            role: "Designer",
            soldFee: 1000,
            soldHours: 10
          }
        },
        {
          identity: {
            stableSourceRowKey: "fee:UCS09002:design:2",
            sourceDocumentId: "fee-sheet",
            sourceTab: "Design",
            sourceRowNumber: 22
          },
          raw: {
            rowKind: "v_tab",
            jobNumber: "UCS09002",
            client: "Duplicate Fee",
            office: "LDN",
            month: "2026-05",
            department: "Design",
            role: "Designer",
            soldFee: 1000,
            soldHours: 10
          }
        }
      ])
    );

    expect(parserResult.facts).toHaveLength(2);
    expect(parserResult.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DUPLICATE_FEE_TRACKER_JOB",
          severity: "DATA_WARN"
        })
      ])
    );
  });

  test("surfaces cross-office duplicate jobs as scoped conflicts", () => {
    const parserResult = parseArchivedFeeSheetRows(
      planRows("fee_sheet", [
        {
          identity: {
            stableSourceRowKey: "fee:UCS09003:ldn",
            sourceDocumentId: "fee-sheet",
            sourceTab: "LDN",
            sourceRowNumber: 31
          },
          raw: {
            rowKind: "v_tab",
            jobNumber: "UCS09003",
            client: "Cross Office",
            office: "LDN",
            month: "2026-05",
            soldFee: 1000,
            soldHours: 10
          }
        },
        {
          identity: {
            stableSourceRowKey: "fee:UCS09003:usa",
            sourceDocumentId: "fee-sheet",
            sourceTab: "USA",
            sourceRowNumber: 32
          },
          raw: {
            rowKind: "v_tab",
            jobNumber: "UCS09003",
            client: "Cross Office",
            office: "USA",
            month: "2026-05",
            soldFee: 1000,
            soldHours: 10
          }
        }
      ])
    );

    expect(parserResult.facts.map((fact) => fact.office)).toEqual(["LDN", "USA"]);
    expect(parserResult.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CROSS_OFFICE_DUPLICATE_JOB",
          severity: "DATA_WARN"
        })
      ])
    );
  });
});
