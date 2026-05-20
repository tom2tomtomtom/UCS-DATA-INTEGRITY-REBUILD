import { describe, expect, test } from "vitest";

import type {
  DashboardDisplayContract,
  DashboardProjectRow,
  ReconciliationCheck,
  SourceTraceRef,
  SourceWarning,
  UnsupportedMetric
} from "../../src/lib";
import { buildApprovalOutputFromDisplayContract } from "../../src/lib/display/approval-output";

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
  }
];

const warning: SourceWarning = {
  id: "warning:approval:unsupported-pipeline",
  status: "DATA_WARN",
  lifecycleState: "open",
  source: "pipeline",
  sourceLayer: "pipeline",
  code: "PIPELINE_DEPARTMENT_UNSUPPORTED",
  message: "Pipeline cannot support department approval.",
  scope,
  owner: "Jade",
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
  sourceProjectName: "Q1 Launch Source",
  canonicalProjectName: "Q1 Launch",
  sourceClient: "Acme Studios Ltd",
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

const reconciliation: ReconciliationCheck = {
  id: "check:csv:contract",
  status: "DATA_WARN",
  code: "PIPELINE_UNSUPPORTED",
  label: "Pipeline unsupported for department scope",
  scope,
  sourceRefs: traceRefs,
  actual: unsupportedPipeline,
  message: "Approval keeps unsupported, rather than approving zero."
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
  reconciliation: [reconciliation],
  sourceTrace: [
    {
      id: "display:soldFee",
      scope,
      metric: "soldFee",
      value: projectRow.totals.soldFee,
      refs: traceRefs,
      warnings: []
    }
  ],
  warnings: [warning],
  confidence: "medium"
} satisfies DashboardDisplayContract;

describe("P5-E approval contract output", () => {
  test("uses display contract row values without recalculating an approval model", () => {
    const approvalOutput = buildApprovalOutputFromDisplayContract(contract);

    expect(approvalOutput.rows).toHaveLength(1);
    expect(approvalOutput.rows[0]?.id).toBe(projectRow.id);
    expect(approvalOutput.rows[0]?.totals.soldFee).toBe(projectRow.totals.soldFee);
    expect(approvalOutput.rows[0]?.totals.soldHours).toBe(projectRow.totals.soldHours);
    expect(approvalOutput.rows[0]?.totals.pipelineFee).toBe(projectRow.totals.pipelineFee);
    expect(approvalOutput.rows[0]?.totals.productionRevenue).toBe(projectRow.totals.productionRevenue);
    expect(approvalOutput.rows[0]?.totals.floatHours).toBe(projectRow.totals.floatHours);
    expect(approvalOutput.heroTotals).toBe(contract.heroTotals);
    expect(approvalOutput.footerTotals).toBe(contract.footerTotals);
  });

  test("preserves warnings, unsupported metrics, reconciliation, and source trace refs for approval", () => {
    const approvalOutput = buildApprovalOutputFromDisplayContract(contract);

    expect(approvalOutput.unsupported).toEqual([unsupportedPipeline]);
    expect(approvalOutput.warnings).toEqual([warning]);
    expect(approvalOutput.reconciliation).toEqual([reconciliation]);
    expect(approvalOutput.sourceTrace).toEqual(contract.sourceTrace);
    expect(approvalOutput.rows[0]?.unsupported).toEqual([unsupportedPipeline]);
    expect(approvalOutput.rows[0]?.sourceTrace).toEqual(traceRefs);
  });
});
