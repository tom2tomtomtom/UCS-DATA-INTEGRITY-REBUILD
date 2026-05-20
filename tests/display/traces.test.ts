import { describe, expect, test } from "vitest";

import type {
  DashboardDisplayContract,
  DashboardProjectRow,
  SourceTraceRef,
  SourceWarning,
  UnsupportedMetric
} from "../../src/lib";
import { buildCompactTraceRowsFromDisplayContract } from "../../src/lib/display/traces";

const scope = {
  office: "LDN",
  from: "2026-03-01",
  to: "2026-03-31",
  department: "Design"
} as const;

const traceRefs: SourceTraceRef[] = [
  {
    source: "fee_sheet",
    sourceLayer: "sold",
    batchId: "batch-1",
    rawRowId: "sold-row-1",
    sourceTab: "CLIENT SUMMARY",
    sourceRowNumber: 12
  },
  {
    source: "float",
    sourceLayer: "float_visible",
    batchId: "float-batch-1",
    sourceObjectId: "task-1",
    field: "floatHours"
  }
];

const warning: SourceWarning = {
  id: "warning:float:partial-role",
  status: "DATA_WARN",
  lifecycleState: "open",
  source: "float",
  sourceLayer: "float_visible",
  code: "FLOAT_ROLE_PARTIAL",
  message: "Float role attribution is partially supported.",
  scope,
  owner: "Yunni",
  sourceRefs: traceRefs,
  firstSeenAt: "2026-05-20T00:00:00.000Z",
  lastSeenAt: "2026-05-20T00:00:00.000Z"
};

const unsupportedPipeline: UnsupportedMetric = {
  kind: "unsupported",
  metric: "pipelineFee",
  scope,
  source: "pipeline",
  reason: "Pipeline does not support department scope.",
  displayLabel: "Unsupported",
  severity: "warn"
};

const projectRow: DashboardProjectRow = {
  id: "contract-row:UCS04154",
  scope,
  jobNumber: "UCS04154",
  sourceProjectName: "Q1 Launch",
  canonicalProjectName: "Q1 Launch",
  sourceClient: "Acme Studios",
  canonicalClient: "Acme Studios",
  sourceFloatProjectId: "10480262",
  canonicalFloatProjectId: "10480262",
  totals: {
    soldFee: {
      kind: "money",
      value: {
        amountOriginal: 1200,
        currencyOriginal: "GBP",
        amountGbp: 1200,
        fxRateToGbp: 1,
        fxSource: "fixture",
        fxCapturedAt: "2026-05-20T00:00:00.000Z"
      }
    },
    soldHours: { kind: "hours", value: 14.5, unit: "decimal_hours" },
    pipelineFee: unsupportedPipeline,
    productionRevenue: {
      kind: "money",
      value: {
        amountOriginal: 300,
        currencyOriginal: "GBP",
        amountGbp: 300,
        fxRateToGbp: 1,
        fxSource: "fixture",
        fxCapturedAt: "2026-05-20T00:00:00.000Z"
      }
    },
    floatHours: { kind: "hours", value: 9, unit: "decimal_hours" }
  },
  rowType: "matched",
  warnings: [warning],
  sourceTrace: traceRefs
};

const contract = {
  scope,
  generatedAt: "2026-05-20T00:00:00.000Z",
  visibleRows: [projectRow],
  heroTotals: projectRow.totals,
  footerTotals: projectRow.totals,
  rollups: {
    byDepartment: [],
    byRole: [],
    byMonth: [],
    byClient: []
  },
  csvRows: [],
  unsupported: [unsupportedPipeline],
  reconciliation: [],
  sourceTrace: [],
  warnings: [warning],
  confidence: "medium"
} satisfies DashboardDisplayContract;

describe("P5-E compact source trace rows", () => {
  test("emits one compact trace row for every important contract row number", () => {
    const traceRows = buildCompactTraceRowsFromDisplayContract(contract);

    expect(traceRows.map((row) => row.metric)).toEqual([
      "soldFee",
      "soldHours",
      "pipelineFee",
      "productionRevenue",
      "floatHours"
    ]);
    expect(traceRows.every((row) => row.rowId === projectRow.id)).toBe(true);
    expect(traceRows.find((row) => row.metric === "soldFee")?.value).toBe(projectRow.totals.soldFee);
  });

  test("carries source refs for supported numbers and preserves warnings and unsupported metrics", () => {
    const traceRows = buildCompactTraceRowsFromDisplayContract(contract);

    expect(traceRows.find((row) => row.metric === "soldFee")?.sourceRefs).toEqual(traceRefs);
    expect(traceRows.find((row) => row.metric === "floatHours")?.sourceRefs).toEqual(traceRefs);
    expect(traceRows.find((row) => row.metric === "pipelineFee")).toMatchObject({
      value: unsupportedPipeline,
      unsupported: [unsupportedPipeline],
      warnings: [warning],
      sourceRefs: traceRefs
    });
  });
});
