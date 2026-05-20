import { describe, expect, test } from "vitest";

import type { BuildDashboardDisplayContractInput, SoldFact, SourceFactSet } from "../../src/lib";
import { buildDashboardDisplayContract } from "../../src/lib";

const scope = {
  office: "LDN",
  from: "2026-03-01",
  to: "2026-03-31"
} as const;

const soldFact: SoldFact = {
  id: "fee_sheet:batch:row-1",
  source: "fee_sheet",
  sourceLayer: "sold",
  rawRowIds: ["row-1"],
  batchId: "batch",
  jobNumber: "UCS04154",
  client: "Acme Studios",
  projectName: "Q1 Launch",
  office: "LDN",
  month: "2026-03",
  amount: {
    kind: "money",
    value: {
      amountOriginal: 1000,
      currencyOriginal: "GBP",
      amountGbp: 1000,
      fxRateToGbp: 1,
      fxSource: "fixture",
      fxCapturedAt: "2026-05-20T00:00:00.000Z"
    }
  },
  hours: {
    kind: "hours",
    value: 10,
    unit: "decimal_hours"
  },
  isAdditive: true,
  confidence: "high",
  warnings: [],
  trace: [
    {
      source: "fee_sheet",
      sourceLayer: "sold",
      batchId: "batch",
      rawRowId: "row-1"
    }
  ]
};

function baseInput(): BuildDashboardDisplayContractInput {
  const factSet: SourceFactSet = {
    soldFacts: [soldFact],
    pipelineFacts: [],
    productionRevenueFacts: [],
    floatFacts: [],
    readOnlySqlFacts: [],
    syncLogFacts: [],
    sourceIssues: [],
    capabilities: []
  };

  return {
    ...factSet,
    scope,
    generatedAt: "2026-05-20T00:00:00.000Z"
  };
}

describe("P5-A display contract shape", () => {
  test("returns the single display contract shape without page-local calculation hooks", () => {
    const contract = buildDashboardDisplayContract(baseInput());

    expect(contract.scope).toEqual(scope);
    expect(contract.generatedAt).toBe("2026-05-20T00:00:00.000Z");
    expect(Array.isArray(contract.visibleRows)).toBe(true);
    expect(contract.heroTotals).toBeDefined();
    expect(contract.footerTotals).toBeDefined();
    expect(contract.rollups).toEqual({
      byDepartment: [],
      byRole: [],
      byMonth: [],
      byClient: []
    });
    expect(Array.isArray(contract.csvRows)).toBe(true);
    expect(Array.isArray(contract.unsupported)).toBe(true);
    expect(Array.isArray(contract.reconciliation)).toBe(true);
    expect(Array.isArray(contract.sourceTrace)).toBe(true);
    expect(Array.isArray(contract.warnings)).toBe(true);
    expect(contract.confidence).toBe("medium");
    expect("pageTotals" in contract).toBe(false);
    expect("projectPageRows" in contract).toBe(false);
    expect("legacySelectorOutput" in contract).toBe(false);
  });

  test("keeps important supported totals traceable", () => {
    const contract = buildDashboardDisplayContract(baseInput());

    expect(contract.heroTotals.soldFee).toMatchObject({
      kind: "money",
      value: {
        amountGbp: 1000,
        currencyOriginal: "GBP"
      }
    });
    expect(contract.heroTotals.soldHours).toMatchObject({
      kind: "hours",
      value: 10
    });
    expect(contract.sourceTrace).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: "soldFee",
          refs: soldFact.trace
        }),
        expect.objectContaining({
          metric: "soldHours",
          refs: soldFact.trace
        })
      ])
    );
  });
});
