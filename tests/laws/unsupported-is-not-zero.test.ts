import { describe, expect, test } from "vitest";

import type {
  DashboardScope,
  FloatFact,
  MetricValue,
  PipelineFact,
  ProductionRevenueFact,
  SourceName,
  SoldFact
} from "../../src/lib/canon/types";
import { buildDashboardDisplayContract } from "../../src/lib/display/contract";
import { buildDepartmentRollups, buildRoleRollups } from "../../src/lib/display/rollups";

const scope: DashboardScope = {
  office: "LDN",
  from: "2026-01-01",
  to: "2026-03-31"
};

function money(amountGbp: number) {
  return {
    kind: "money" as const,
    value: {
      amountOriginal: amountGbp,
      currencyOriginal: "GBP" as const,
      amountGbp,
      fxRateToGbp: 1,
      fxSource: "law_fixture",
      fxCapturedAt: "2026-05-20T00:00:00.000Z"
    }
  };
}

function hours(value: number) {
  return {
    kind: "hours" as const,
    value,
    unit: "decimal_hours" as const
  };
}

function soldFact(): SoldFact {
  return {
    id: "sold:design",
    source: "fee_sheet",
    sourceLayer: "sold",
    rawRowIds: ["sold-row"],
    batchId: "batch",
    jobNumber: "UCS04787",
    client: "Acme Studios",
    canonicalClient: "Acme Studios",
    projectName: "Q1 Launch",
    office: "LDN",
    month: "2026-02",
    department: "Design",
    role: "Senior Designer",
    amount: money(100),
    hours: hours(10),
    isAdditive: true,
    confidence: "high",
    warnings: [],
    trace: [
      {
        source: "fee_sheet",
        sourceLayer: "sold",
        batchId: "batch",
        rawRowId: "sold-row"
      }
    ]
  };
}

function pipelineFact(): PipelineFact {
  return {
    id: "pipeline:row-1",
    source: "pipeline",
    sourceLayer: "pipeline",
    rawRowIds: ["pipeline-row-1"],
    batchId: "batch",
    stablePipelineIdentity: "pipeline:row-1",
    jobNumber: "UCS04787",
    client: "Acme Studios",
    office: "LDN",
    month: "2026-02",
    amount: money(100_000),
    isAdditive: true,
    confidence: "medium",
    warnings: [],
    trace: [
      {
        source: "pipeline",
        sourceLayer: "pipeline",
        batchId: "batch",
        rawRowId: "pipeline-row-1"
      }
    ]
  };
}

function productionRevenueFact(): ProductionRevenueFact {
  return {
    id: "production:row-1",
    source: "production_revenue",
    sourceLayer: "production_revenue",
    rawRowIds: ["production-row-1"],
    batchId: "batch",
    productionStatus: "CONFIRMED",
    jobNumber: "UCS04787",
    client: "Acme Studios",
    office: "LDN",
    month: "2026-02",
    amount: money(50_000),
    isAdditive: true,
    confidence: "medium",
    warnings: [],
    trace: [
      {
        source: "production_revenue",
        sourceLayer: "production_revenue",
        batchId: "batch",
        rawRowId: "production-row-1"
      }
    ]
  };
}

describe("Law 5: unsupported is not zero", () => {
  test("marks empty sold display scopes as unsupported rather than £0 and 0h", () => {
    const contract = buildDashboardDisplayContract({
      scope,
      generatedAt: "2026-05-21T00:00:00.000Z",
      soldFacts: [],
      pipelineFacts: [],
      productionRevenueFacts: [],
      floatFacts: [],
      readOnlySqlFacts: [],
      syncLogFacts: [],
      sourceIssues: [],
      capabilities: []
    });

    expect(contract.heroTotals.soldFee).toMatchObject(unsupportedMetric("soldFee", "fee_sheet"));
    expect(contract.heroTotals.soldHours).toMatchObject(unsupportedMetric("soldHours", "fee_sheet"));
    expect(contract.heroTotals.soldFee).not.toMatchObject({
      kind: "money",
      value: { amountGbp: 0 }
    });
    expect(contract.heroTotals.soldHours).not.toMatchObject({
      kind: "hours",
      value: 0
    });
  });

  test("marks unsupported department and role slices as unsupported rather than zero", () => {
    const departmentRollup = buildDepartmentRollups({
      scope,
      soldFacts: [soldFact()],
      pipelineFacts: [pipelineFact()],
      productionRevenueFacts: [productionRevenueFact()]
    })[0];
    const roleRollup = buildRoleRollups({
      scope,
      soldFacts: [soldFact()],
      pipelineFacts: [pipelineFact()],
      productionRevenueFacts: [productionRevenueFact()]
    })[0];

    expect(departmentRollup?.totals.pipelineFee).toMatchObject({
      kind: "unsupported",
      source: "pipeline",
      metric: "pipelineFee",
      displayLabel: "Unsupported"
    });
    expect(roleRollup?.totals.productionRevenue).toMatchObject({
      kind: "unsupported",
      source: "production_revenue",
      metric: "productionRevenue",
      displayLabel: "Unsupported"
    });
    expect(departmentRollup?.totals.pipelineFee).not.toMatchObject({
      kind: "money",
      value: { amountGbp: 0 }
    });
    expect(roleRollup?.totals.productionRevenue).not.toMatchObject({
      kind: "money",
      value: { amountGbp: 0 }
    });
  });

  test("keeps unsupported scoped source rows visible without attributing their money to the slice", () => {
    const contract = buildDashboardDisplayContract({
      scope: {
        ...scope,
        department: "Design"
      },
      generatedAt: "2026-05-21T00:00:00.000Z",
      soldFacts: [soldFact()],
      pipelineFacts: [pipelineFact()],
      productionRevenueFacts: [productionRevenueFact()],
      floatFacts: [],
      readOnlySqlFacts: [],
      syncLogFacts: [],
      sourceIssues: [],
      capabilities: [
        {
          source: "pipeline",
          capabilities: [
            { key: "department", status: "unsupported", reason: "Pipeline source rows do not carry department attribution." },
            { key: "role", status: "unsupported", reason: "Pipeline source rows do not carry role attribution." }
          ]
        },
        {
          source: "production_revenue",
          capabilities: [
            { key: "department", status: "unsupported", reason: "Production revenue source rows do not support department attribution." },
            { key: "role", status: "unsupported", reason: "Production revenue source rows do not support role attribution." }
          ]
        },
        {
          source: "fee_sheet",
          capabilities: [
            { key: "department", status: "supported" },
            { key: "role", status: "partial" }
          ]
        }
      ]
    });
    const row = contract.visibleRows.find((candidate) => candidate.jobNumber === "UCS04787");

    expect(contract.heroTotals.pipelineFee).toMatchObject(unsupportedMetric("pipelineFee", "pipeline"));
    expect(contract.heroTotals.productionRevenue).toMatchObject(unsupportedMetric("productionRevenue", "production_revenue"));
    expect(row?.totals.pipelineFee).toMatchObject(unsupportedMetric("pipelineFee", "pipeline"));
    expect(row?.totals.productionRevenue).toMatchObject(unsupportedMetric("productionRevenue", "production_revenue"));
    expect(row?.sourceTrace.map((ref) => ref.source)).toEqual(expect.arrayContaining(["fee_sheet", "pipeline", "production_revenue"]));
    expect(row?.totals.pipelineFee).not.toMatchObject({
      kind: "money",
      value: { amountGbp: 0 }
    });
  });
  test("marks absent role allocation as unsupported instead of zero", () => {
    const contract = buildDashboardDisplayContract({
      scope: {
        ...scope,
        role: "Senior Designer"
      },
      generatedAt: "2026-05-21T00:00:00.000Z",
      soldFacts: [soldFactWithoutRole()],
      pipelineFacts: [],
      productionRevenueFacts: [],
      floatFacts: [],
      readOnlySqlFacts: [],
      syncLogFacts: [],
      sourceIssues: [],
      capabilities: []
    });

    expect(contract.heroTotals.soldHours).toMatchObject(unsupportedMetric("soldHours", "fee_sheet"));
    expect(contract.heroTotals.soldHours).not.toMatchObject({
      kind: "hours",
      value: 0
    });
  });

  test("labels Float-only rows with no fee-sheet role data as unsupported", () => {
    const contract = buildDashboardDisplayContract({
      scope: {
        ...scope,
        role: "Senior Designer"
      },
      generatedAt: "2026-05-21T00:00:00.000Z",
      soldFacts: [],
      pipelineFacts: [],
      productionRevenueFacts: [],
      floatFacts: [floatFactWithoutRole()],
      readOnlySqlFacts: [],
      syncLogFacts: [],
      sourceIssues: [],
      capabilities: [
        {
          source: "float",
          capabilities: [
            { key: "role", status: "unsupported", reason: "Float source row has no role attribution." }
          ]
        }
      ]
    });
    const row = contract.visibleRows[0];

    expect(row?.rowType).toBe("float_only");
    expect(row?.totals.soldHours).toMatchObject(unsupportedMetric("soldHours", "fee_sheet"));
    expect(row?.totals.soldHours).not.toMatchObject({
      kind: "hours",
      value: 0
    });
  });
});

function unsupportedMetric(metric: string, source: SourceName): Partial<MetricValue> {
  return {
    kind: "unsupported",
    source,
    metric,
    displayLabel: "Unsupported"
  };
}

function soldFactWithoutRole(): SoldFact {
  const { role: _role, ...fact } = soldFact();

  return fact;
}

function floatFactWithoutRole(): FloatFact {
  return {
    id: "float:without-role",
    source: "float",
    sourceLayer: "float_visible",
    rawRowIds: ["float-without-role-row"],
    batchId: "batch",
    jobNumber: "UCS99999",
    floatProjectId: "99999",
    client: "Acme Studios",
    canonicalClient: "Acme Studios",
    projectName: "Float Without Role",
    office: "LDN",
    month: "2026-02",
    hours: hours(5),
    isAdditive: true,
    confidence: "medium",
    warnings: [],
    trace: [
      {
        source: "float",
        sourceLayer: "float_visible",
        batchId: "batch",
        rawRowId: "float-without-role-row"
      }
    ]
  };
}
