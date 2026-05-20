import { describe, expect, test } from "vitest";

import type {
  FloatFact,
  PipelineFact,
  ProductionRevenueFact,
  SoldFact,
  SourceCapability
} from "../../src/lib/canon/types";
import type { ParserResult, ParserWarning } from "../../src/lib/parsers/types";
import { buildSourceFactSetFromParserResults } from "../../src/lib/canon-queries/source-fact-set";

const pipelineCapabilities: SourceCapability[] = [
  { key: "project", status: "partial" },
  { key: "month", status: "supported" },
  { key: "office", status: "partial" },
  { key: "client", status: "supported" },
  { key: "department", status: "unsupported", reason: "Pipeline has no department field." },
  { key: "role", status: "unsupported", reason: "Pipeline has no role field." },
  { key: "person", status: "unsupported", reason: "Pipeline has no person field." }
];

const floatCapabilities: SourceCapability[] = [
  { key: "project", status: "supported" },
  { key: "month", status: "supported" },
  { key: "office", status: "partial" },
  { key: "client", status: "partial" },
  { key: "department", status: "partial" },
  { key: "role", status: "partial" },
  { key: "person", status: "supported" }
];

const soldFact: SoldFact = {
  id: "fee_sheet:batch_fee:row_fee",
  source: "fee_sheet",
  sourceLayer: "sold",
  rawRowIds: ["row_fee"],
  batchId: "batch_fee",
  jobNumber: "UCS04154",
  client: "Acme Studios",
  office: "LDN",
  month: "2026-03",
  department: "Design",
  role: "Senior Designer",
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
    value: 12,
    unit: "decimal_hours"
  },
  isAdditive: false,
  confidence: "high",
  warnings: [],
  trace: [
    {
      source: "fee_sheet",
      sourceLayer: "sold",
      batchId: "batch_fee",
      rawRowId: "row_fee"
    }
  ]
};

const pipelineFact: PipelineFact = {
  id: "pipeline:batch_pipeline:row_pipeline",
  source: "pipeline",
  sourceLayer: "pipeline",
  rawRowIds: ["row_pipeline"],
  batchId: "batch_pipeline",
  stablePipelineIdentity: "source-row:row_pipeline",
  client: "Acme Studios",
  projectName: "Q1 Launch",
  office: "LDN",
  month: "2026-03",
  status: "archived_overlay",
  amount: {
    kind: "money",
    value: {
      amountOriginal: 500,
      currencyOriginal: "GBP",
      amountGbp: 500,
      fxRateToGbp: 1,
      fxSource: "fixture",
      fxCapturedAt: "2026-05-20T00:00:00.000Z"
    }
  },
  isAdditive: false,
  confidence: "medium",
  warnings: [],
  trace: [
    {
      source: "pipeline",
      sourceLayer: "pipeline",
      batchId: "batch_pipeline",
      rawRowId: "row_pipeline"
    }
  ]
};

const productionFact: ProductionRevenueFact = {
  id: "production_revenue:batch_prod:row_prod",
  source: "production_revenue",
  sourceLayer: "production_revenue",
  rawRowIds: ["row_prod"],
  batchId: "batch_prod",
  jobNumber: "UCS04154",
  client: "Acme Studios",
  office: "LDN",
  month: "2026-03",
  productionStatus: "CONFIRMED",
  status: "archived_project_overlay",
  isAdditive: false,
  confidence: "medium",
  warnings: [],
  trace: [
    {
      source: "production_revenue",
      sourceLayer: "production_revenue",
      batchId: "batch_prod",
      rawRowId: "row_prod"
    }
  ]
};

const floatFact: FloatFact = {
  id: "float:batch_float:row_float",
  source: "float",
  sourceLayer: "float_raw",
  rawRowIds: ["row_float"],
  batchId: "batch_float",
  jobNumber: "UCS04154",
  floatProjectId: "10480262",
  taskId: "task_1",
  personId: "person_1",
  person: "A Person",
  month: "2026-03",
  from: "2026-03-03",
  to: "2026-03-07",
  activeState: "archived",
  allocationClass: "allocated",
  hours: {
    kind: "hours",
    value: 16,
    unit: "decimal_hours"
  },
  isAdditive: false,
  confidence: "high",
  warnings: [],
  trace: [
    {
      source: "float",
      sourceLayer: "float_raw",
      batchId: "batch_float",
      rawRowId: "row_float"
    }
  ]
};

const floatWarning: ParserWarning = {
  code: "ARCHIVED_FLOAT_WITH_HOURS",
  message: "Archived Float task has hours and is preserved as source evidence.",
  source: "float",
  sourceLayer: "float_raw",
  batchId: "batch_float",
  rawRowIds: ["row_float"],
  sourceRefs: [
    {
      source: "float",
      sourceLayer: "float_raw",
      batchId: "batch_float",
      rawRowId: "row_float"
    }
  ],
  severity: "DATA_WARN"
};

const unsafeWarning: ParserWarning = {
  code: "MISSING_TRACE",
  message: "This warning cannot become query evidence without source refs.",
  source: "pipeline",
  sourceLayer: "pipeline",
  batchId: "batch_pipeline",
  rawRowIds: ["row_pipeline"],
  sourceRefs: [],
  severity: "PROCESS_WARN"
};

function parserResult<TFact extends SoldFact | PipelineFact | ProductionRevenueFact | FloatFact>(
  input: Pick<ParserResult<TFact>, "parserName" | "source" | "facts" | "warnings" | "capabilities">
): ParserResult<TFact> {
  return {
    ...input,
    sourceRowsRead: input.facts.length,
    sourceRowsSkipped: 0
  };
}

describe("P4-E source fact set assembly", () => {
  test("assembles parser results into source buckets without calculating totals", () => {
    const factSet = buildSourceFactSetFromParserResults([
      parserResult({
        parserName: "fee-sheet",
        source: "fee_sheet",
        facts: [soldFact],
        warnings: [],
        capabilities: []
      }),
      parserResult({
        parserName: "pipeline",
        source: "pipeline",
        facts: [pipelineFact],
        warnings: [],
        capabilities: [{ source: "pipeline", capabilities: pipelineCapabilities }]
      }),
      parserResult({
        parserName: "production-revenue",
        source: "production_revenue",
        facts: [productionFact],
        warnings: [],
        capabilities: []
      }),
      parserResult({
        parserName: "float",
        source: "float",
        facts: [floatFact],
        warnings: [],
        capabilities: [{ source: "float", capabilities: floatCapabilities }]
      })
    ]);

    expect(factSet.soldFacts).toEqual([soldFact]);
    expect(factSet.pipelineFacts).toEqual([pipelineFact]);
    expect(factSet.productionRevenueFacts).toEqual([productionFact]);
    expect(factSet.floatFacts).toEqual([floatFact]);
    expect(factSet.readOnlySqlFacts).toEqual([]);
    expect(factSet.syncLogFacts).toEqual([]);
    expect(factSet.capabilities).toEqual([
      { source: "pipeline", capabilities: pipelineCapabilities },
      { source: "float", capabilities: floatCapabilities }
    ]);
    expect(factSet.floatFacts[0]?.activeState).toBe("archived");
    expect(factSet.productionRevenueFacts[0]?.status).toBe("archived_project_overlay");
    expect("totals" in factSet).toBe(false);
    expect("displayRows" in factSet).toBe(false);
    expect("visibleRows" in factSet).toBe(false);
    expect("csvRows" in factSet).toBe(false);
  });

  test("promotes parser warnings with source refs into source issues and skips unsafe warnings", () => {
    const factSet = buildSourceFactSetFromParserResults(
      [
        parserResult({
          parserName: "float",
          source: "float",
          facts: [floatFact],
          warnings: [floatWarning],
          capabilities: [{ source: "float", capabilities: floatCapabilities }]
        }),
        parserResult({
          parserName: "pipeline",
          source: "pipeline",
          facts: [pipelineFact],
          warnings: [unsafeWarning],
          capabilities: [{ source: "pipeline", capabilities: pipelineCapabilities }]
        })
      ],
      { warningObservedAt: "2026-05-20T00:00:00.000Z" }
    );

    expect(factSet.sourceIssues).toHaveLength(1);
    expect(factSet.sourceIssues[0]).toMatchObject({
      status: "DATA_WARN",
      lifecycleState: "open",
      source: "float",
      sourceLayer: "float_raw",
      code: "ARCHIVED_FLOAT_WITH_HOURS",
      scope: {
        office: "ALL",
        from: "2026-03-03",
        to: "2026-03-07",
        jobNumber: "UCS04154",
        floatProjectId: "10480262"
      },
      owner: "Unknown",
      firstSeenAt: "2026-05-20T00:00:00.000Z",
      lastSeenAt: "2026-05-20T00:00:00.000Z",
      sourceRefs: floatWarning.sourceRefs
    });
    expect(factSet.sourceIssues.some((warning) => warning.code === "MISSING_TRACE")).toBe(false);
  });
});
