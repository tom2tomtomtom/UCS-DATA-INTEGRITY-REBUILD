import type {
  DashboardDisplayContract,
  DashboardProjectRow,
  DashboardTotals
} from "./contract";
import type {
  DashboardScope,
  ReconciliationCheck,
  SourceTraceRef,
  SourceTraceSummary,
  SourceWarning,
  UnsupportedMetric
} from "../canon/types";

type DashboardMetricKey = keyof DashboardTotals;

export type ApprovalOutputRow = {
  id: string;
  scope: DashboardScope;
  rowType: DashboardProjectRow["rowType"];
  totals: DashboardTotals;
  unsupported: UnsupportedMetric[];
  warnings: SourceWarning[];
  sourceTrace: SourceTraceRef[];
  jobNumber?: string;
  sourceProjectName?: string;
  canonicalProjectName?: string;
  sourceClient?: string;
  canonicalClient?: string;
  sourceFloatProjectId?: string;
  canonicalFloatProjectId?: string;
};

export type ApprovalContractOutput = {
  scope: DashboardScope;
  generatedAt: string;
  rows: ApprovalOutputRow[];
  heroTotals: DashboardTotals;
  footerTotals: DashboardTotals;
  unsupported: UnsupportedMetric[];
  reconciliation: ReconciliationCheck[];
  sourceTrace: SourceTraceSummary[];
  warnings: SourceWarning[];
  confidence: DashboardDisplayContract["confidence"];
};

const metricKeys = [
  "soldFee",
  "soldHours",
  "pipelineFee",
  "productionRevenue",
  "floatHours"
] as const satisfies readonly DashboardMetricKey[];

export function buildApprovalOutputFromDisplayContract(
  contract: DashboardDisplayContract
): ApprovalContractOutput {
  return {
    scope: contract.scope,
    generatedAt: contract.generatedAt,
    rows: contract.visibleRows.map((row) => buildApprovalOutputRow(row)),
    heroTotals: contract.heroTotals,
    footerTotals: contract.footerTotals,
    unsupported: contract.unsupported,
    reconciliation: contract.reconciliation,
    sourceTrace: contract.sourceTrace,
    warnings: contract.warnings,
    confidence: contract.confidence
  };
}

export function buildApprovalOutputRow(row: DashboardProjectRow): ApprovalOutputRow {
  return {
    id: row.id,
    scope: row.scope,
    rowType: row.rowType,
    totals: row.totals,
    unsupported: unsupportedFromTotals(row.totals),
    warnings: row.warnings,
    sourceTrace: row.sourceTrace,
    ...(row.jobNumber !== undefined ? { jobNumber: row.jobNumber } : {}),
    ...(row.sourceProjectName !== undefined ? { sourceProjectName: row.sourceProjectName } : {}),
    ...(row.canonicalProjectName !== undefined ? { canonicalProjectName: row.canonicalProjectName } : {}),
    ...(row.sourceClient !== undefined ? { sourceClient: row.sourceClient } : {}),
    ...(row.canonicalClient !== undefined ? { canonicalClient: row.canonicalClient } : {}),
    ...(row.sourceFloatProjectId !== undefined ? { sourceFloatProjectId: row.sourceFloatProjectId } : {}),
    ...(row.canonicalFloatProjectId !== undefined ? { canonicalFloatProjectId: row.canonicalFloatProjectId } : {})
  };
}

function unsupportedFromTotals(totals: DashboardTotals): UnsupportedMetric[] {
  return metricKeys
    .map((metric) => totals[metric])
    .filter((value): value is UnsupportedMetric => value.kind === "unsupported");
}
