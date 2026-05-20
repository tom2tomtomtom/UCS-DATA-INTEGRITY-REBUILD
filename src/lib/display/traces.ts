import type { DashboardDisplayContract, DashboardProjectRow, DashboardTotals } from "./contract";
import type { DashboardScope, MetricValue, SourceTraceRef, SourceWarning, UnsupportedMetric } from "../canon/types";

type DashboardMetricKey = keyof DashboardTotals;

export type CompactSourceTraceRow = {
  id: string;
  rowId: string;
  scope: DashboardScope;
  rowType: DashboardProjectRow["rowType"];
  metric: DashboardMetricKey;
  value: MetricValue;
  sourceRefs: SourceTraceRef[];
  unsupported: UnsupportedMetric[];
  warnings: SourceWarning[];
  jobNumber?: string;
  canonicalProjectName?: string;
  canonicalClient?: string;
  canonicalFloatProjectId?: string;
};

const metricKeys = [
  "soldFee",
  "soldHours",
  "pipelineFee",
  "productionRevenue",
  "floatHours"
] as const satisfies readonly DashboardMetricKey[];

export function buildCompactTraceRowsFromDisplayContract(
  contract: DashboardDisplayContract
): CompactSourceTraceRow[] {
  return contract.visibleRows.flatMap((row) => buildCompactTraceRowsFromDisplayRow(row));
}

export function buildCompactTraceRowsFromDisplayRow(row: DashboardProjectRow): CompactSourceTraceRow[] {
  return metricKeys.map((metric) => {
    const value = row.totals[metric];

    return {
      id: `${row.id}:${metric}`,
      rowId: row.id,
      scope: row.scope,
      rowType: row.rowType,
      metric,
      value,
      sourceRefs: row.sourceTrace,
      unsupported: value.kind === "unsupported" ? [value] : [],
      warnings: row.warnings,
      ...(row.jobNumber !== undefined ? { jobNumber: row.jobNumber } : {}),
      ...(row.canonicalProjectName !== undefined ? { canonicalProjectName: row.canonicalProjectName } : {}),
      ...(row.canonicalClient !== undefined ? { canonicalClient: row.canonicalClient } : {}),
      ...(row.canonicalFloatProjectId !== undefined ? { canonicalFloatProjectId: row.canonicalFloatProjectId } : {})
    };
  });
}
