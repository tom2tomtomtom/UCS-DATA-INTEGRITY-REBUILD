import { describe, expect, test } from "vitest";

import type {
  DashboardScope,
  FloatFact,
  PipelineFact,
  ProductionRevenueFact,
  SoldFact
} from "../../src/lib/canon/types";
import {
  buildClientRollups,
  buildDepartmentRollups,
  buildMonthRollups,
  buildRoleRollups,
  scopeForRollupDrilldown
} from "../../src/lib/display/rollups";

const q1LdnScope: DashboardScope = {
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
      fxSource: "fixture",
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

function soldFact(input: {
  readonly id: string;
  readonly rawRowId: string;
  readonly jobNumber: string;
  readonly client: string;
  readonly amountGbp: number;
  readonly soldHours: number;
  readonly office?: "LDN" | "USA" | "UCX" | "UNKNOWN";
  readonly month?: string;
  readonly department?: string;
  readonly role?: string;
}): SoldFact {
  return {
    id: input.id,
    source: "fee_sheet",
    sourceLayer: "sold",
    rawRowIds: [input.rawRowId],
    batchId: "batch",
    jobNumber: input.jobNumber,
    client: input.client,
    canonicalClient: input.client,
    projectName: `${input.client} project`,
    office: input.office ?? "LDN",
    month: input.month ?? "2026-02",
    ...(input.department !== undefined ? { department: input.department } : {}),
    ...(input.role !== undefined ? { role: input.role } : {}),
    amount: money(input.amountGbp),
    hours: hours(input.soldHours),
    isAdditive: true,
    confidence: "high",
    warnings: [],
    trace: [
      {
        source: "fee_sheet",
        sourceLayer: "sold",
        batchId: "batch",
        rawRowId: input.rawRowId
      }
    ]
  };
}

function pipelineFact(): PipelineFact {
  return {
    id: "pipeline:batch:row-1",
    source: "pipeline",
    sourceLayer: "pipeline",
    rawRowIds: ["pipeline-row-1"],
    batchId: "batch",
    stablePipelineIdentity: "source-row:pipeline-row-1",
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
    id: "production_revenue:batch:row-1",
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

function floatFact(input: {
  readonly id: string;
  readonly rawRowId: string;
  readonly jobNumber: string;
  readonly client: string;
  readonly floatHours: number;
  readonly office?: "LDN" | "USA" | "UCX" | "UNKNOWN";
  readonly month?: string;
  readonly department?: string;
  readonly role?: string;
  readonly sourceLayer?: FloatFact["sourceLayer"];
  readonly allocationClass?: FloatFact["allocationClass"];
}): FloatFact {
  return {
    id: input.id,
    source: "float",
    sourceLayer: input.sourceLayer ?? "float_visible",
    rawRowIds: [input.rawRowId],
    batchId: "batch",
    jobNumber: input.jobNumber,
    floatProjectId: `float-${input.jobNumber}`,
    client: input.client,
    canonicalClient: input.client,
    projectName: `${input.client} Float project`,
    office: input.office ?? "LDN",
    month: input.month ?? "2026-02",
    ...(input.department !== undefined ? { department: input.department } : {}),
    ...(input.role !== undefined ? { role: input.role } : {}),
    hours: hours(input.floatHours),
    activeState: "active",
    allocationClass: input.allocationClass ?? "allocated",
    isAdditive: true,
    confidence: "high",
    warnings: [],
    trace: [
      {
        source: "float",
        sourceLayer: input.sourceLayer ?? "float_visible",
        batchId: "batch",
        rawRowId: input.rawRowId
      }
    ]
  };
}

describe("P5-C display rollups", () => {
  test("keeps the LDN Q1 Design rollup and Projects drilldown on one contract scope", () => {
    const rollups = buildDepartmentRollups({
      scope: q1LdnScope,
      soldFacts: [
        soldFact({
          id: "sold:design-a",
          rawRowId: "design-a",
          jobNumber: "UCS04787",
          client: "Acme Studios",
          amountGbp: 100,
          soldHours: 10,
          department: "Design"
        }),
        soldFact({
          id: "sold:design-b",
          rawRowId: "design-b",
          jobNumber: "UCS04788",
          client: "Beta Studios",
          amountGbp: 250,
          soldHours: 5,
          department: "Design"
        }),
        soldFact({
          id: "sold:strategy",
          rawRowId: "strategy",
          jobNumber: "UCS04789",
          client: "Acme Studios",
          amountGbp: 999,
          soldHours: 99,
          department: "Strategy"
        }),
        soldFact({
          id: "sold:usa-design",
          rawRowId: "usa-design",
          jobNumber: "UCS04790",
          client: "Acme Studios",
          amountGbp: 888,
          soldHours: 88,
          office: "USA",
          department: "Design"
        }),
        soldFact({
          id: "sold:april-design",
          rawRowId: "april-design",
          jobNumber: "UCS04791",
          client: "Acme Studios",
          amountGbp: 777,
          soldHours: 77,
          month: "2026-04",
          department: "Design"
        })
      ]
    });

    const designRollup = rollups.find((rollup) => rollup.label === "Design");

    expect(designRollup?.scope).toEqual(scopeForRollupDrilldown(q1LdnScope, "department", "Design"));
    expect(designRollup?.totals.soldFee).toMatchObject({
      kind: "money",
      value: { amountGbp: 350 }
    });
    expect(designRollup?.totals.soldHours).toMatchObject({
      kind: "hours",
      value: 15
    });
    expect(designRollup?.sourceTrace.map((ref) => ref.rawRowId)).toEqual(["design-a", "design-b"]);
  });

  test("carries visible Float hours into department and role rollups", () => {
    const sold = soldFact({
      id: "sold:design",
      rawRowId: "design",
      jobNumber: "UCS04787",
      client: "Acme Studios",
      amountGbp: 100,
      soldHours: 10,
      department: "Design",
      role: "Senior Designer"
    });
    const visibleFloat = floatFact({
      id: "float:visible",
      rawRowId: "float-visible",
      jobNumber: "UCS04787",
      client: "Acme Studios",
      floatHours: 32,
      department: "Design",
      role: "Senior Designer"
    });
    const rawFloat = floatFact({
      id: "float:raw",
      rawRowId: "float-raw",
      jobNumber: "UCS04787",
      client: "Acme Studios",
      floatHours: 200,
      department: "Design",
      role: "Senior Designer",
      sourceLayer: "float_raw"
    });

    const departmentRollup = buildDepartmentRollups({
      scope: q1LdnScope,
      soldFacts: [sold],
      floatFacts: [visibleFloat, rawFloat]
    })[0];
    const roleRollup = buildRoleRollups({
      scope: q1LdnScope,
      soldFacts: [sold],
      floatFacts: [visibleFloat, rawFloat]
    })[0];

    expect(departmentRollup?.totals.floatHours).toMatchObject({
      kind: "hours",
      value: 32
    });
    expect(roleRollup?.totals.floatHours).toMatchObject({
      kind: "hours",
      value: 32
    });
    expect(departmentRollup?.unsupported.map((metric) => metric.metric).sort()).toEqual([
      "pipelineFee",
      "productionRevenue"
    ]);
    expect(departmentRollup?.sourceTrace.map((ref) => ref.rawRowId)).toContain("float-visible");
    expect(departmentRollup?.sourceTrace.map((ref) => ref.rawRowId)).not.toContain("float-raw");
  });

  test("splits visible Float rollups into allocated, unallocated, and unclassified hours", () => {
    const rollup = buildDepartmentRollups({
      scope: q1LdnScope,
      soldFacts: [],
      floatFacts: [
        floatFact({
          id: "float:allocated",
          rawRowId: "float-allocated",
          jobNumber: "UCS04787",
          client: "Acme Studios",
          floatHours: 32,
          department: "Design",
          allocationClass: "allocated"
        }),
        floatFact({
          id: "float:placeholder",
          rawRowId: "float-placeholder",
          jobNumber: "UCS04787",
          client: "Acme Studios",
          floatHours: 8,
          department: "Design",
          allocationClass: "placeholder"
        }),
        floatFact({
          id: "float:orphan",
          rawRowId: "float-orphan",
          jobNumber: "UCS04787",
          client: "Acme Studios",
          floatHours: 5,
          department: "Design",
          allocationClass: "orphan"
        })
      ]
    })[0];

    expect(rollup?.totals.floatHours).toMatchObject({ kind: "hours", value: 45 });
    expect(rollup?.floatBreakdown?.allocatedHours).toMatchObject({ kind: "hours", value: 32 });
    expect(rollup?.floatBreakdown?.unallocatedHours).toMatchObject({ kind: "hours", value: 8 });
    expect(rollup?.floatBreakdown?.unclassifiedHours).toMatchObject({ kind: "hours", value: 5 });
    expect(rollup?.floatBreakdown?.splitStatus).toBe("partial");
  });

  test("keeps pipeline and production revenue unsupported for department and role slices", () => {
    const sold = soldFact({
      id: "sold:design",
      rawRowId: "design",
      jobNumber: "UCS04787",
      client: "Acme Studios",
      amountGbp: 100,
      soldHours: 10,
      department: "Design",
      role: "Senior Designer"
    });

    const departmentRollup = buildDepartmentRollups({
      scope: q1LdnScope,
      soldFacts: [sold],
      pipelineFacts: [pipelineFact()],
      productionRevenueFacts: [productionRevenueFact()]
    })[0];
    const roleRollup = buildRoleRollups({
      scope: q1LdnScope,
      soldFacts: [sold],
      pipelineFacts: [pipelineFact()],
      productionRevenueFacts: [productionRevenueFact()]
    })[0];

    for (const rollup of [departmentRollup, roleRollup]) {
      expect(rollup?.totals.pipelineFee).toMatchObject({
        kind: "unsupported",
        source: "pipeline",
        metric: "pipelineFee",
        displayLabel: "Unsupported"
      });
      expect(rollup?.totals.productionRevenue).toMatchObject({
        kind: "unsupported",
        source: "production_revenue",
        metric: "productionRevenue",
        displayLabel: "Unsupported"
      });
      expect(rollup?.unsupported.map((metric) => metric.metric).sort()).toEqual([
        "pipelineFee",
        "productionRevenue"
      ]);
      expect(rollup?.totals.pipelineFee).not.toMatchObject({
        kind: "money",
        value: { amountGbp: 100_000 }
      });
      expect(rollup?.totals.productionRevenue).not.toMatchObject({
        kind: "money",
        value: { amountGbp: 50_000 }
      });
    }
  });

  test("uses exact client scope for client rollups instead of fuzzy search", () => {
    const rollups = buildClientRollups({
      scope: {
        ...q1LdnScope,
        client: "Acme Studios"
      },
      soldFacts: [
        soldFact({
          id: "sold:acme",
          rawRowId: "acme",
          jobNumber: "UCS04787",
          client: "Acme Studios",
          amountGbp: 100,
          soldHours: 10
        }),
        soldFact({
          id: "sold:acme-labs",
          rawRowId: "acme-labs",
          jobNumber: "UCS04788",
          client: "Acme Studios Labs",
          amountGbp: 900,
          soldHours: 90
        })
      ]
    });

    expect(rollups).toHaveLength(1);
    expect(rollups[0]?.scope).toMatchObject({
      client: "Acme Studios"
    });
    expect(rollups[0]?.scope.search).toBeUndefined();
    expect(rollups[0]?.totals.soldFee).toMatchObject({
      kind: "money",
      value: { amountGbp: 100 }
    });
  });

  test("builds month rollups with month-bounded scopes", () => {
    const rollups = buildMonthRollups({
      scope: q1LdnScope,
      soldFacts: [
        soldFact({
          id: "sold:february",
          rawRowId: "february",
          jobNumber: "UCS04787",
          client: "Acme Studios",
          amountGbp: 400,
          soldHours: 40,
          month: "2026-02"
        })
      ]
    });

    expect(rollups).toHaveLength(1);
    expect(rollups[0]).toMatchObject({
      label: "2026-02",
      scope: {
        office: "LDN",
        from: "2026-02-01",
        to: "2026-02-28"
      }
    });
    expect(rollups[0]?.totals.soldFee).toMatchObject({
      kind: "money",
      value: { amountGbp: 400 }
    });
  });
});
