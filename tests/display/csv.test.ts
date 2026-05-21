import { describe, expect, test } from "vitest";

import type {
  DashboardDisplayContract,
  DashboardProjectRow,
  MetricValue,
  SourceTraceRef,
  SourceWarning,
  UnsupportedMetric
} from "../../src/lib";
import { buildCsvRowsFromDisplayContract } from "../../src/lib/display/csv";

const scope = {
  office: "LDN",
  from: "2026-03-01",
  to: "2026-03-31",
  department: "Design"
} as const;

const sourceTrace: SourceTraceRef[] = [
  {
    source: "fee_sheet",
    sourceLayer: "sold",
    batchId: "batch-1",
    rawRowId: "sold-row-1",
    sourceTab: "CLIENT SUMMARY",
    sourceRowNumber: 12,
    field: "soldFee"
  }
];

const warning: SourceWarning = {
  id: "warning:pipeline:unsupported-department",
  status: "DATA_WARN",
  lifecycleState: "open",
  source: "pipeline",
  sourceLayer: "pipeline",
  code: "PIPELINE_DEPARTMENT_UNSUPPORTED",
  message: "Pipeline does not support department scope.",
  scope,
  owner: "Jade",
  sourceRefs: sourceTrace,
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

const soldFee: MetricValue = {
  kind: "money",
  value: {
    amountOriginal: 1200,
    currencyOriginal: "GBP",
    amountGbp: 1200,
    fxRateToGbp: 1,
    fxSource: "fixture",
    fxCapturedAt: "2026-05-20T00:00:00.000Z"
  }
};

const projectRow: DashboardProjectRow = {
  id: "contract-row:UCS04154",
  scope,
  jobNumber: "UCS04154",
  sourceProjectName: "Q1 Launch Source",
  canonicalProjectName: "Q1 Launch",
  sourceClient: "Acme Studios Ltd",
  canonicalClient: "Acme Studios",
  sourceFloatProjectId: "10480262",
  canonicalFloatProjectId: "10480262",
  totals: {
    soldFee,
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
  sourceTrace
};

function contractWithRows(
  visibleRows: DashboardProjectRow[],
  existingCsvRows: DashboardDisplayContract["csvRows"] = []
) {
  return {
    scope,
    generatedAt: "2026-05-20T00:00:00.000Z",
    visibleRows,
    heroTotals: projectRow.totals,
    footerTotals: projectRow.totals,
    rollups: {
      byDepartment: [],
      byRole: [],
      byMonth: [],
      byClient: []
    },
    csvRows: existingCsvRows,
    unsupported: [unsupportedPipeline],
    reconciliation: [],
    sourceTrace: [],
    warnings: [warning],
    confidence: "medium"
  } satisfies DashboardDisplayContract;
}

describe("P5-E CSV rows", () => {
  test("builds CSV rows only from display contract visible rows", () => {
    const existingCsvRow = {
      id: "stale-csv-row",
      scope,
      cells: { jobNumber: "STALE", soldFeeGbp: 999999 },
      unsupported: [],
      warnings: [],
      sourceTrace: []
    };

    const csvRows = buildCsvRowsFromDisplayContract(contractWithRows([projectRow], [existingCsvRow]));

    expect(csvRows).toHaveLength(1);
    expect(csvRows[0]?.id).toBe(projectRow.id);
    expect(csvRows[0]?.cells).toMatchObject({
      jobNumber: "UCS04154",
      sourceProjectName: "Q1 Launch Source",
      canonicalProjectName: "Q1 Launch",
      sourceClient: "Acme Studios Ltd",
      canonicalClient: "Acme Studios",
      sourceFloatProjectId: "10480262",
      canonicalFloatProjectId: "10480262",
      rowType: "matched",
      soldFeeGbp: 1200,
      soldHours: 14.5,
      pipelineFeeGbp: "Unsupported",
      productionRevenueGbp: 300,
      floatHours: 9
    });
    expect(csvRows[0]?.cells.jobNumber).not.toBe("STALE");
  });

  test("preserves unsupported metrics, warnings, and source trace refs in CSV output", () => {
    const csvRows = buildCsvRowsFromDisplayContract(contractWithRows([projectRow]));

    expect(csvRows[0]?.unsupported).toEqual([unsupportedPipeline]);
    expect(csvRows[0]?.warnings).toEqual([warning]);
    expect(csvRows[0]?.sourceTrace).toEqual(sourceTrace);
  });

  test("labels absent row-level source metrics instead of exporting zero", () => {
    const {
      jobNumber: _jobNumber,
      sourceFloatProjectId: _sourceFloatProjectId,
      canonicalFloatProjectId: _canonicalFloatProjectId,
      ...baseProjectRow
    } = projectRow;
    const pipelineOnlyRow: DashboardProjectRow = {
      ...baseProjectRow,
      id: "contract-row:pipeline-only",
      rowType: "pipeline_only",
      sourceTrace: [
        {
          source: "pipeline",
          sourceLayer: "pipeline",
          batchId: "pipeline-batch",
          rawRowId: "pipeline-row-1",
          field: "pipelineFee"
        }
      ],
      totals: {
        soldFee: {
          kind: "money",
          value: {
            amountOriginal: 0,
            currencyOriginal: "GBP",
            amountGbp: 0,
            fxRateToGbp: 1,
            fxSource: "fixture",
            fxCapturedAt: "2026-05-20T00:00:00.000Z"
          }
        },
        soldHours: { kind: "hours", value: 0, unit: "decimal_hours" },
        pipelineFee: {
          kind: "money",
          value: {
            amountOriginal: 75000,
            currencyOriginal: "GBP",
            amountGbp: 75000,
            fxRateToGbp: 1,
            fxSource: "fixture",
            fxCapturedAt: "2026-05-20T00:00:00.000Z"
          }
        },
        productionRevenue: {
          kind: "money",
          value: {
            amountOriginal: 0,
            currencyOriginal: "GBP",
            amountGbp: 0,
            fxRateToGbp: 1,
            fxSource: "fixture",
            fxCapturedAt: "2026-05-20T00:00:00.000Z"
          }
        },
        floatHours: { kind: "hours", value: 0, unit: "decimal_hours" }
      }
    };

    const csvRows = buildCsvRowsFromDisplayContract(contractWithRows([pipelineOnlyRow]));

    expect(csvRows[0]?.cells).toMatchObject({
      rowType: "pipeline_only",
      soldFeeGbp: "Source-only",
      soldHours: "Source-only",
      pipelineFeeGbp: 75000,
      productionRevenueGbp: "Source-only",
      floatHours: "Source-only"
    });
    expect(csvRows[0]?.cells.soldFee).toBeUndefined();
    expect(csvRows[0]?.cells.productionRevenue).toBeUndefined();
  });

  test("labels a missing matched metric when only another field from that source is evidenced", () => {
    const matchedFeeOnlyRow: DashboardProjectRow = {
      ...projectRow,
      sourceTrace: [
        {
          source: "fee_sheet",
          sourceLayer: "sold",
          batchId: "batch-1",
          rawRowId: "sold-row-1",
          field: "soldFee"
        }
      ],
      totals: {
        ...projectRow.totals,
        soldHours: { kind: "hours", value: 0, unit: "decimal_hours" }
      }
    };

    const csvRows = buildCsvRowsFromDisplayContract(contractWithRows([matchedFeeOnlyRow]));

    expect(csvRows[0]?.cells).toMatchObject({
      rowType: "matched",
      soldFeeGbp: 1200,
      soldHours: "No source row"
    });
  });
});
