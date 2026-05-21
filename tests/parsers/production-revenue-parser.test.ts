import { describe, expect, test } from "vitest";

import expectedFixture from "../../fixtures/parsed-facts/production-revenue/p3-d-production-revenue-facts.json";
import sourceRowsFixture from "../../fixtures/source-rows/production-revenue/p3-d-production-revenue-rows.json";
import { parseProductionRevenueRows } from "../../src/lib/parsers/production-revenue";
import type { ProductionRevenueFact } from "../../src/lib/canon/types";
import type { ArchivedRawSourceRow } from "../../src/lib/source-archive/types";

const sourceRows = sourceRowsFixture as readonly ArchivedRawSourceRow[];
const expectedFacts = expectedFixture.expectedFacts;

function factSummary(fact: ProductionRevenueFact): Record<string, unknown> {
  return {
    id: fact.id,
    rawRowIds: fact.rawRowIds,
    batchId: fact.batchId,
    jobNumber: fact.jobNumber,
    client: fact.client,
    projectName: fact.projectName,
    month: fact.month,
    office: fact.office,
    productionStatus: fact.productionStatus,
    amountGbp: fact.amount?.kind === "money" ? fact.amount.value.amountGbp : undefined,
    isAdditive: fact.isAdditive,
    warningCodes: fact.warnings.map((warning) => warning.code)
  };
}

describe("P3-D production revenue parser", () => {
  test("preserves archived, unknown-status, collision, no-job, and unsupported-attribution evidence", () => {
    const result = parseProductionRevenueRows(sourceRows);

    expect(result.parserName).toBe(expectedFixture.parserName);
    expect(result.source).toBe(expectedFixture.source);
    expect(result.sourceRowsRead).toBe(sourceRows.length);
    expect(result.sourceRowsSkipped).toBe(0);
    expect(result.facts.map(factSummary)).toEqual(expectedFacts);

    const warningCodes = new Set(result.warnings.map((warning) => warning.code));
    for (const code of expectedFixture.expectedWarningCodes) {
      expect(warningCodes.has(code)).toBe(true);
    }

    const statusCollision = result.warnings.find((warning) => warning.code === "STATUS_COLLISION");
    expect(statusCollision?.rawRowIds).toEqual(["raw_pr_003", "raw_pr_004"]);
    expect(result.facts.filter((fact) => fact.jobNumber === "UCS90003")).toHaveLength(2);
    expect(result.facts.filter((fact) => fact.jobNumber === "UCS90003").map((fact) => fact.productionStatus)).toEqual([
      "CONFIRMED",
      "NEGOTIATING"
    ]);
  });

  test("shapes archived sheet-cell rows into monthly production revenue facts", () => {
    const archiveRows = [
      productionRevenueSheetRow("raw_pr_sheet_header", 1, [
        "REV STATUS",
        "CLIENT",
        "OWNER",
        "REV CODE",
        "PROJECT NO",
        "PROJECT",
        "OFFICE",
        "Jan-26",
        "Feb-26",
        "Mar-26"
      ]),
      productionRevenueSheetRow("raw_pr_sheet_002", 2, [
        "Confirmed",
        "Archive Client",
        "Alex",
        "LDN-CG",
        "UCS91001",
        "Launch Production",
        "LDN",
        "12000",
        "",
        "-3000"
      ]),
      productionRevenueSheetRow("raw_pr_sheet_003", 3, [
        "Expected",
        "No Job Client",
        "Bea",
        "USA-RV",
        "",
        "No Job Production",
        "",
        "",
        "4500",
        ""
      ])
    ];

    const result = parseProductionRevenueRows(archiveRows);

    expect(result.sourceRowsRead).toBe(3);
    expect(result.sourceRowsSkipped).toBe(0);
    expect(result.facts.map(factSummary)).toEqual([
      {
        id: "production_revenue:batch_production_revenue_sheet:raw_pr_sheet_002:2026-01",
        rawRowIds: ["raw_pr_sheet_002"],
        batchId: "batch_production_revenue_sheet",
        jobNumber: "UCS91001",
        client: "Archive Client",
        projectName: "Launch Production",
        month: "2026-01",
        office: "LDN",
        productionStatus: "CONFIRMED",
        amountGbp: 12000,
        isAdditive: false,
        warningCodes: []
      },
      {
        id: "production_revenue:batch_production_revenue_sheet:raw_pr_sheet_002:2026-03",
        rawRowIds: ["raw_pr_sheet_002"],
        batchId: "batch_production_revenue_sheet",
        jobNumber: "UCS91001",
        client: "Archive Client",
        projectName: "Launch Production",
        month: "2026-03",
        office: "LDN",
        productionStatus: "CONFIRMED",
        amountGbp: -3000,
        isAdditive: false,
        warningCodes: []
      },
      {
        id: "production_revenue:batch_production_revenue_sheet:raw_pr_sheet_003:2026-02",
        rawRowIds: ["raw_pr_sheet_003"],
        batchId: "batch_production_revenue_sheet",
        jobNumber: undefined,
        client: "No Job Client",
        projectName: "No Job Production",
        month: "2026-02",
        office: "USA",
        productionStatus: "EXPECTED",
        amountGbp: 4500,
        isAdditive: false,
        warningCodes: ["NO_JOB_NUMBER", "OFFICE_INFERRED"]
      }
    ]);

    expect(result.facts[0]?.trace).toEqual([
      expect.objectContaining({
        rawRowId: "raw_pr_sheet_002",
        sourceTab: "Production Revenue",
        sourceRowNumber: 2,
        field: "H2"
      })
    ]);
    expect(result.facts[1]?.trace).toEqual([
      expect.objectContaining({
        rawRowId: "raw_pr_sheet_002",
        field: "J2"
      })
    ]);
  });

  test("keeps unsupported department and role warnings when shaping sheet-cell rows", () => {
    const archiveRows = [
      productionRevenueSheetRow("raw_pr_sheet_header", 1, [
        "REV STATUS",
        "CLIENT",
        "OWNER",
        "REV CODE",
        "PROJECT NO",
        "PROJECT",
        "OFFICE",
        "DEPARTMENT",
        "ROLE",
        "Dec-26"
      ]),
      productionRevenueSheetRow("raw_pr_sheet_004", 4, [
        "Confirmed",
        "Unsupported Client",
        "Casey",
        "UCX-REV",
        "UCX91004",
        "Unsupported Attribution",
        "UCX",
        "Design",
        "Producer",
        "900"
      ])
    ];

    const result = parseProductionRevenueRows(archiveRows);

    expect(result.facts).toHaveLength(1);
    expect(result.facts[0]).toMatchObject({
      jobNumber: "UCX91004",
      month: "2026-12",
      office: "UCX"
    });
    expect(result.facts[0]?.department).toBeUndefined();
    expect(result.facts[0]?.role).toBeUndefined();
    expect(result.facts[0]?.warnings.map((warning) => warning.code)).toEqual([
      "UNSUPPORTED_DEPARTMENT_ATTRIBUTION",
      "UNSUPPORTED_ROLE_ATTRIBUTION"
    ]);
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      "UNSUPPORTED_DEPARTMENT_ATTRIBUTION",
      "UNSUPPORTED_ROLE_ATTRIBUTION"
    ]);
  });

  test("keeps production revenue parser output out of display rows and dashboard totals", () => {
    const result = parseProductionRevenueRows(sourceRows);

    for (const fact of result.facts) {
      expect(fact.rawRowIds).toHaveLength(1);
      expect(fact.batchId).toBe("batch_production_revenue_p3d");
      expect(fact.trace).toHaveLength(1);
      expect(fact.department).toBeUndefined();
      expect(fact.role).toBeUndefined();
    }

    const capabilities = result.capabilities.flatMap((capability) => capability.capabilities);
    for (const key of expectedFixture.unsupportedCapabilities) {
      expect(capabilities).toContainEqual(
        expect.objectContaining({
          key,
          status: "unsupported"
        })
      );
    }

    expect("displayRows" in result).toBe(false);
    expect("visibleRows" in result).toBe(false);
    expect("totals" in result).toBe(false);
    expect("selectDashboardView" in result).toBe(false);
  });
});

function productionRevenueSheetRow(
  id: string,
  rowNumber: number,
  cells: readonly string[]
): ArchivedRawSourceRow {
  return {
    kind: "raw_source_row",
    archiveStatus: "archived",
    id,
    batchId: "batch_production_revenue_sheet",
    source: "production_revenue",
    identity: {
      stableSourceRowKey: `production-revenue:Production Revenue:${rowNumber}`,
      sourceDocumentId: "production_revenue_workbook",
      sourceTab: "Production Revenue",
      sourceRowNumber: rowNumber
    },
    raw: {
      source: "production_revenue",
      rowNumber,
      cells
    },
    contentHash: `hash:${id}`,
    observedAt: "2026-05-21T00:00:00.000Z",
    sourceRefs: [
      {
        source: "production_revenue",
        sourceLayer: "production_revenue",
        batchId: "batch_production_revenue_sheet",
        rawRowId: id,
        sourceDocumentId: "production_revenue_workbook",
        sourceTab: "Production Revenue",
        sourceRowNumber: rowNumber
      }
    ]
  };
}
