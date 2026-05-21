import { describe, expect, test } from "vitest";

import type { BuildDashboardDisplayContractInput, SoldFact, SourceFactSet, UnsupportedMetric } from "../../src/lib";
import { buildDashboardDisplayContract } from "../../src/lib";

const scope = {
  office: "LDN",
  from: "2026-03-01",
  to: "2026-03-31",
  department: "Design"
} as const;

function soldFact(input: {
  readonly id: string;
  readonly rawRowId: string;
  readonly amountGbp: number;
  readonly hours: number;
  readonly isAdditive: boolean;
  readonly department?: string;
}): SoldFact {
  return {
    id: input.id,
    source: "fee_sheet",
    sourceLayer: input.isAdditive ? "sold" : "fee_sheet_parser_summary",
    rawRowIds: [input.rawRowId],
    batchId: "batch",
    jobNumber: "UCS04154",
    client: "Acme Studios",
    projectName: "Q1 Launch",
    office: "LDN",
    month: "2026-03",
    ...(input.department !== undefined ? { department: input.department } : {}),
    amount: {
      kind: "money",
      value: {
        amountOriginal: input.amountGbp,
        currencyOriginal: "GBP",
        amountGbp: input.amountGbp,
        fxRateToGbp: 1,
        fxSource: "fixture",
        fxCapturedAt: "2026-05-20T00:00:00.000Z"
      }
    },
    hours: {
      kind: "hours",
      value: input.hours,
      unit: "decimal_hours"
    },
    isAdditive: input.isAdditive,
    confidence: "high",
    warnings: [],
    trace: [
      {
        source: "fee_sheet",
        sourceLayer: input.isAdditive ? "sold" : "fee_sheet_parser_summary",
        batchId: "batch",
        rawRowId: input.rawRowId
      }
    ]
  };
}

function inputFor(soldFacts: SoldFact[], unsupported: UnsupportedMetric[] = []): BuildDashboardDisplayContractInput {
  const factSet: SourceFactSet = {
    soldFacts,
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
    generatedAt: "2026-05-20T00:00:00.000Z",
    unsupportedMetrics: unsupported
  };
}

describe("P5-A display totalling laws", () => {
  test("sums additive sold facts and keeps non-additive source summaries out of totals", () => {
    const additiveA = soldFact({
      id: "fee_sheet:batch:additive-a",
      rawRowId: "additive-a",
      amountGbp: 100,
      hours: 10,
      isAdditive: true,
      department: "Design"
    });
    const additiveB = soldFact({
      id: "fee_sheet:batch:additive-b",
      rawRowId: "additive-b",
      amountGbp: 200,
      hours: 20,
      isAdditive: true,
      department: "Design"
    });
    const summary = soldFact({
      id: "fee_sheet:batch:summary",
      rawRowId: "summary",
      amountGbp: 9999,
      hours: 999,
      isAdditive: false,
      department: "Design"
    });

    const contract = buildDashboardDisplayContract(inputFor([additiveA, additiveB, summary]));

    expect(contract.heroTotals.soldFee).toMatchObject({
      kind: "money",
      value: { amountGbp: 300 }
    });
    expect(contract.heroTotals.soldHours).toMatchObject({
      kind: "hours",
      value: 30
    });
    expect(contract.sourceTrace.find((trace) => trace.metric === "soldFee")?.refs).toEqual([
      ...additiveA.trace,
      ...additiveB.trace
    ]);
    expect(
      contract.sourceTrace.find((trace) => trace.metric === "soldFee")?.refs.map((ref) => ref.rawRowId)
    ).not.toContain("summary");
  });

  test("keeps unsupported metrics unsupported instead of turning them into zero", () => {
    const unsupportedPipeline: UnsupportedMetric = {
      kind: "unsupported",
      metric: "pipelineFee",
      scope,
      source: "pipeline",
      reason: "Pipeline does not support department scope.",
      displayLabel: "Unsupported",
      severity: "warn"
    };

    const contract = buildDashboardDisplayContract(inputFor([], [unsupportedPipeline]));

    expect(contract.heroTotals.pipelineFee).toEqual(unsupportedPipeline);
    expect(contract.unsupported).toContainEqual(unsupportedPipeline);
    expect(contract.heroTotals.pipelineFee).not.toMatchObject({
      kind: "money",
      value: { amountGbp: 0 }
    });
  });

  test("propagates unsupported scoped metrics into visible rows and CSV rows", () => {
    const unsupportedPipeline: UnsupportedMetric = {
      kind: "unsupported",
      metric: "pipelineFee",
      scope,
      source: "pipeline",
      reason: "Pipeline does not support department scope.",
      displayLabel: "Unsupported",
      severity: "warn"
    };
    const contract = buildDashboardDisplayContract(
      inputFor(
        [
          soldFact({
            id: "fee_sheet:batch:design-row",
            rawRowId: "design-row",
            amountGbp: 100,
            hours: 10,
            isAdditive: true,
            department: "Design"
          })
        ],
        [unsupportedPipeline]
      )
    );

    expect(contract.visibleRows[0]?.totals.pipelineFee).toEqual(unsupportedPipeline);
    expect(contract.csvRows[0]?.cells.pipelineFeeGbp).toBe("Unsupported");
    expect(contract.csvRows[0]?.cells.pipelineFee).toBeUndefined();
    expect(contract.csvRows[0]?.unsupported).toContainEqual(unsupportedPipeline);
  });
});
