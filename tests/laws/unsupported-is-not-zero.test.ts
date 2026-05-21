import { describe, expect, test } from "vitest";

import type {
  DashboardScope,
  PipelineFact,
  ProductionRevenueFact,
  SoldFact
} from "../../src/lib/canon/types";
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
  test.todo("marks absent role allocation as unsupported instead of zero");
  test.todo("labels Float-only rows with no fee-sheet role data as unsupported");
});
