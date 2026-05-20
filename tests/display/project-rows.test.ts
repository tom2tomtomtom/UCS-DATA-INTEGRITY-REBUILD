import { describe, expect, test } from "vitest";

import type {
  DashboardScope,
  FloatFact,
  MetricValue,
  PipelineFact,
  ProductionRevenueFact,
  SoldFact,
  SourceName,
  SourceTraceRef,
  SourceWarning
} from "../../src/lib";
import { buildProjectRows } from "../../src/lib/display/project-rows";

const scope: DashboardScope = {
  office: "LDN",
  from: "2026-03-01",
  to: "2026-03-31"
};

function money(amountGbp: number): MetricValue {
  return {
    kind: "money",
    value: {
      amountOriginal: amountGbp,
      currencyOriginal: "GBP",
      amountGbp,
      fxRateToGbp: 1,
      fxSource: "fixture",
      fxCapturedAt: "2026-05-20T00:00:00.000Z"
    }
  };
}

function hours(value: number): MetricValue {
  return {
    kind: "hours",
    value,
    unit: "decimal_hours"
  };
}

function sourceLayerFor(source: SourceName): SourceTraceRef["sourceLayer"] {
  if (source === "fee_sheet") return "sold";
  if (source === "float") return "float_visible";
  if (source === "pipeline") return "pipeline";
  return "production_revenue";
}

function trace(source: SourceName, rawRowId: string): SourceTraceRef[] {
  return [
    {
      source,
      sourceLayer: sourceLayerFor(source),
      batchId: `${source}:batch`,
      rawRowId
    }
  ];
}

function warning(input: {
  readonly id: string;
  readonly source: SourceName;
  readonly rawRowId: string;
  readonly code: string;
}): SourceWarning {
  const sourceRefs = trace(input.source, input.rawRowId);

  return {
    id: input.id,
    status: "DATA_WARN",
    lifecycleState: "open",
    source: input.source,
    sourceLayer: sourceLayerFor(input.source),
    code: input.code,
    message: input.code,
    scope,
    owner: "Unknown",
    sourceRefs,
    firstSeenAt: "2026-05-20T00:00:00.000Z",
    lastSeenAt: "2026-05-20T00:00:00.000Z"
  };
}

function soldFact(input: {
  readonly id: string;
  readonly rawRowId: string;
  readonly jobNumber: string;
  readonly floatProjectId?: string;
  readonly amountGbp: number;
  readonly hoursValue: number;
  readonly office?: SoldFact["office"];
  readonly month?: string;
  readonly department?: string;
}): SoldFact {
  const fact: SoldFact = {
    id: input.id,
    source: "fee_sheet",
    sourceLayer: "sold",
    rawRowIds: [input.rawRowId],
    batchId: "fee_sheet:batch",
    jobNumber: input.jobNumber,
    client: "Acme Studios",
    sourceClient: "Acme Studios Ltd",
    canonicalClient: "Acme Studios",
    projectName: "Q1 Launch",
    sourceProjectName: "Acme Q1 Launch",
    office: input.office ?? "LDN",
    month: input.month ?? "2026-03",
    ...(input.department !== undefined ? { department: input.department } : {}),
    amount: money(input.amountGbp),
    hours: hours(input.hoursValue),
    isAdditive: true,
    confidence: "high",
    warnings: [],
    trace: trace("fee_sheet", input.rawRowId)
  };

  if (input.floatProjectId !== undefined) {
    fact.floatProjectId = input.floatProjectId;
    fact.feeSheetFloatId = input.floatProjectId;
  }

  return fact;
}

function pipelineFact(input: {
  readonly id: string;
  readonly rawRowId: string;
  readonly stablePipelineIdentity: string;
  readonly jobNumber?: string;
  readonly projectName: string;
  readonly amountGbp: number;
  readonly warnings?: SourceWarning[];
}): PipelineFact {
  const fact: PipelineFact = {
    id: input.id,
    source: "pipeline",
    sourceLayer: "pipeline",
    rawRowIds: [input.rawRowId],
    batchId: "pipeline:batch",
    stablePipelineIdentity: input.stablePipelineIdentity,
    client: "Acme Studios",
    sourceClient: "Acme Studios Ltd",
    canonicalClient: "Acme Studios",
    projectName: input.projectName,
    sourceProjectName: input.projectName,
    office: "LDN",
    month: "2026-03",
    amount: money(input.amountGbp),
    isAdditive: true,
    confidence: "medium",
    warnings: input.warnings ?? [],
    trace: trace("pipeline", input.rawRowId)
  };

  if (input.jobNumber !== undefined) {
    fact.jobNumber = input.jobNumber;
  }

  return fact;
}

function productionFact(input: {
  readonly id: string;
  readonly rawRowId: string;
  readonly jobNumber?: string;
  readonly projectName: string;
  readonly amountGbp: number;
  readonly status?: string;
  readonly productionStatus?: ProductionRevenueFact["productionStatus"];
  readonly warnings?: SourceWarning[];
}): ProductionRevenueFact {
  const fact: ProductionRevenueFact = {
    id: input.id,
    source: "production_revenue",
    sourceLayer: "production_revenue",
    rawRowIds: [input.rawRowId],
    batchId: "production_revenue:batch",
    client: "Acme Studios",
    sourceClient: "Acme Studios Ltd",
    canonicalClient: "Acme Studios",
    projectName: input.projectName,
    sourceProjectName: input.projectName,
    office: "LDN",
    month: "2026-03",
    amount: money(input.amountGbp),
    productionStatus: input.productionStatus ?? "CONFIRMED",
    isAdditive: true,
    confidence: "medium",
    warnings: input.warnings ?? [],
    trace: trace("production_revenue", input.rawRowId)
  };

  if (input.jobNumber !== undefined) {
    fact.jobNumber = input.jobNumber;
  }
  if (input.status !== undefined) {
    fact.status = input.status;
  }

  return fact;
}

function floatFact(input: {
  readonly id: string;
  readonly rawRowId: string;
  readonly floatProjectId: string;
  readonly jobNumber?: string;
  readonly projectName: string;
  readonly hoursValue: number;
  readonly activeState?: FloatFact["activeState"];
  readonly warnings?: SourceWarning[];
}): FloatFact {
  const fact: FloatFact = {
    id: input.id,
    source: "float",
    sourceLayer: "float_visible",
    rawRowIds: [input.rawRowId],
    batchId: "float:batch",
    floatProjectId: input.floatProjectId,
    client: "Acme Studios",
    sourceClient: "Acme Studios Ltd",
    canonicalClient: "Acme Studios",
    projectName: input.projectName,
    sourceProjectName: input.projectName,
    office: "LDN",
    month: "2026-03",
    hours: hours(input.hoursValue),
    activeState: input.activeState ?? "active",
    allocationClass: "allocated",
    isAdditive: true,
    confidence: "high",
    warnings: input.warnings ?? [],
    trace: trace("float", input.rawRowId)
  };

  if (input.jobNumber !== undefined) {
    fact.jobNumber = input.jobNumber;
  }

  return fact;
}

describe("P5-B project row builder", () => {
  test("keeps source-only, archived, and duplicate source identities visible as separate rows", () => {
    const archivedFloatWarning = warning({
      id: "warn:archived-float",
      source: "float",
      rawRowId: "float-manual-row",
      code: "ARCHIVED_FLOAT_VISIBLE"
    });
    const productionArchiveWarning = warning({
      id: "warn:archived-production",
      source: "production_revenue",
      rawRowId: "production-row",
      code: "ARCHIVED_PRODUCTION_VISIBLE"
    });
    const tbcPipelineWarning = warning({
      id: "warn:tbc-pipeline",
      source: "pipeline",
      rawRowId: "pipeline-tbc-row",
      code: "SOURCE_ONLY_PIPELINE_VISIBLE"
    });

    const rows = buildProjectRows({
      scope,
      soldFacts: [
        soldFact({
          id: "sold:explicit",
          rawRowId: "sold-row",
          jobNumber: "UCS10000",
          floatProjectId: "float-explicit",
          amountGbp: 1000,
          hoursValue: 10
        })
      ],
      pipelineFacts: [
        pipelineFact({
          id: "pipeline:matched",
          rawRowId: "pipeline-matched-row",
          stablePipelineIdentity: "pipeline:UCS10000",
          jobNumber: "UCS10000",
          projectName: "Acme Q1 Launch",
          amountGbp: 5000
        }),
        pipelineFact({
          id: "pipeline:tbc",
          rawRowId: "pipeline-tbc-row",
          stablePipelineIdentity: "pipeline:tbc:row-9",
          projectName: "TBC Retail Pitch",
          amountGbp: 750,
          warnings: [tbcPipelineWarning]
        })
      ],
      productionRevenueFacts: [
        productionFact({
          id: "production:archived",
          rawRowId: "production-row",
          jobNumber: "UCS20000",
          projectName: "Archived Production Job",
          amountGbp: 2000,
          status: "archived",
          warnings: [productionArchiveWarning]
        })
      ],
      floatFacts: [
        floatFact({
          id: "float:explicit",
          rawRowId: "float-explicit-row",
          floatProjectId: "float-explicit",
          jobNumber: "UCS10000",
          projectName: "Acme Q1 Launch",
          hoursValue: 3
        }),
        floatFact({
          id: "float:manual-duplicate",
          rawRowId: "float-manual-row",
          floatProjectId: "float-manual",
          jobNumber: "UCS10000",
          projectName: "Acme Q1 Launch Manual Copy",
          hoursValue: 4,
          activeState: "archived",
          warnings: [archivedFloatWarning]
        })
      ],
      sourceIssues: []
    });

    expect(rows).toHaveLength(4);

    const matched = rows.find((row) => row.id === "project:float:float-explicit");
    expect(matched).toMatchObject({
      rowType: "matched",
      jobNumber: "UCS10000",
      sourceFloatProjectId: "float-explicit",
      canonicalFloatProjectId: "float-explicit",
      totals: {
        soldFee: {
          kind: "money",
          value: { amountGbp: 1000 }
        },
        pipelineFee: {
          kind: "money",
          value: { amountGbp: 5000 }
        },
        floatHours: {
          kind: "hours",
          value: 3
        }
      }
    });

    expect(matched?.totals.soldFee).not.toMatchObject({
      kind: "money",
      value: { amountGbp: 6000 }
    });

    expect(rows.find((row) => row.id === "project:float:float-manual")).toMatchObject({
      rowType: "float_only",
      jobNumber: "UCS10000",
      sourceFloatProjectId: "float-manual",
      warnings: expect.arrayContaining([archivedFloatWarning]),
      totals: {
        soldFee: {
          kind: "money",
          value: { amountGbp: 0 }
        },
        floatHours: {
          kind: "hours",
          value: 4
        }
      }
    });

    expect(rows.find((row) => row.id === "project:pipeline:pipeline:tbc:row-9")).toMatchObject({
      rowType: "pipeline_only",
      sourceProjectName: "TBC Retail Pitch",
      warnings: expect.arrayContaining([tbcPipelineWarning]),
      totals: {
        soldFee: {
          kind: "money",
          value: { amountGbp: 0 }
        },
        pipelineFee: {
          kind: "money",
          value: { amountGbp: 750 }
        }
      }
    });

    expect(rows.find((row) => row.id === "project:production:production:archived")).toMatchObject({
      rowType: "production_revenue_only",
      jobNumber: "UCS20000",
      sourceProjectName: "Archived Production Job",
      warnings: expect.arrayContaining([productionArchiveWarning]),
      totals: {
        soldFee: {
          kind: "money",
          value: { amountGbp: 0 }
        },
        productionRevenue: {
          kind: "money",
          value: { amountGbp: 2000 }
        }
      }
    });
  });

  test("attaches source labels, trace refs, warnings, and confidence to every visible row", () => {
    const rows = buildProjectRows({
      scope,
      soldFacts: [
        soldFact({
          id: "sold:explicit",
          rawRowId: "sold-row",
          jobNumber: "UCS10000",
          floatProjectId: "float-explicit",
          amountGbp: 1000,
          hoursValue: 10
        })
      ],
      pipelineFacts: [],
      productionRevenueFacts: [],
      floatFacts: [
        floatFact({
          id: "float:explicit",
          rawRowId: "float-row",
          floatProjectId: "float-explicit",
          jobNumber: "UCS10000",
          projectName: "Acme Q1 Launch",
          hoursValue: 3
        })
      ],
      sourceIssues: []
    });

    for (const row of rows) {
      expect(row.sourceLabels.length).toBeGreaterThan(0);
      expect(row.sourceTrace.length).toBeGreaterThan(0);
      expect(Array.isArray(row.warnings)).toBe(true);
      expect(["high", "medium", "low"]).toContain(row.confidence);
    }

    expect(rows[0]?.sourceLabels).toEqual(
      expect.arrayContaining([
        { source: "fee_sheet", sourceLayer: "sold" },
        { source: "float", sourceLayer: "float_visible" }
      ])
    );
  });

  test("filters project rows to the active display scope before exposing visible source rows", () => {
    const rows = buildProjectRows({
      scope: {
        ...scope,
        department: "Design"
      },
      soldFacts: [
        soldFact({
          id: "sold:in-scope",
          rawRowId: "sold-in-scope",
          jobNumber: "UCS10001",
          amountGbp: 100,
          hoursValue: 10,
          department: "Design"
        }),
        soldFact({
          id: "sold:wrong-office",
          rawRowId: "sold-wrong-office",
          jobNumber: "UCS10002",
          amountGbp: 200,
          hoursValue: 20,
          office: "USA",
          department: "Design"
        }),
        soldFact({
          id: "sold:wrong-month",
          rawRowId: "sold-wrong-month",
          jobNumber: "UCS10003",
          amountGbp: 300,
          hoursValue: 30,
          month: "2026-04",
          department: "Design"
        }),
        soldFact({
          id: "sold:wrong-department",
          rawRowId: "sold-wrong-department",
          jobNumber: "UCS10004",
          amountGbp: 400,
          hoursValue: 40,
          department: "Strategy"
        })
      ],
      pipelineFacts: [],
      productionRevenueFacts: [],
      floatFacts: [],
      sourceIssues: []
    });

    expect(rows.map((row) => row.jobNumber)).toEqual(["UCS10001"]);
    expect(rows[0]?.totals.soldFee).toMatchObject({
      kind: "money",
      value: { amountGbp: 100 }
    });
    expect(rows[0]?.sourceTrace.map((ref) => ref.rawRowId)).toEqual(["sold-in-scope"]);
  });
});
