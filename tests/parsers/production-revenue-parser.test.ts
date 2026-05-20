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
