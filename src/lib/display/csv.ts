import type {
  DashboardCsvRow,
  DashboardDisplayContract,
  DashboardProjectRow,
  DashboardTotals
} from "./contract";
import type { MetricValue, UnsupportedMetric } from "../canon/types";

type DashboardMetricKey = keyof DashboardTotals;

const metricKeys = [
  "soldFee",
  "soldHours",
  "pipelineFee",
  "productionRevenue",
  "floatHours"
] as const satisfies readonly DashboardMetricKey[];

export function buildCsvRowsFromDisplayContract(contract: DashboardDisplayContract): DashboardCsvRow[] {
  return contract.visibleRows.map((row) => buildCsvRowFromDisplayRow(row));
}

export function buildCsvRowFromDisplayRow(row: DashboardProjectRow): DashboardCsvRow {
  return {
    id: row.id,
    scope: row.scope,
    cells: buildCsvCells(row),
    unsupported: unsupportedFromTotals(row.totals),
    warnings: row.warnings,
    sourceTrace: row.sourceTrace
  };
}

function buildCsvCells(row: DashboardProjectRow): Record<string, string | number> {
  const cells: Record<string, string | number> = {
    rowType: row.rowType
  };

  addCell(cells, "jobNumber", row.jobNumber);
  addCell(cells, "sourceProjectName", row.sourceProjectName);
  addCell(cells, "canonicalProjectName", row.canonicalProjectName);
  addCell(cells, "sourceClient", row.sourceClient);
  addCell(cells, "canonicalClient", row.canonicalClient);
  addCell(cells, "sourceFloatProjectId", row.sourceFloatProjectId);
  addCell(cells, "canonicalFloatProjectId", row.canonicalFloatProjectId);

  for (const metric of metricKeys) {
    cells[csvMetricCellName(metric, row.totals[metric])] = csvMetricValue(row.totals[metric]);
  }

  return cells;
}

function addCell(cells: Record<string, string | number>, key: string, value: string | undefined): void {
  if (value !== undefined) cells[key] = value;
}

function csvMetricCellName(metric: DashboardMetricKey, value: MetricValue): string {
  if (value.kind === "unsupported") return metric;
  if (value.kind === "money") return `${metric}Gbp`;
  return metric;
}

function csvMetricValue(value: MetricValue): string | number {
  if (value.kind === "unsupported") return value.displayLabel;
  if (value.kind === "money") return value.value.amountGbp;
  return value.value;
}

function unsupportedFromTotals(totals: DashboardTotals): UnsupportedMetric[] {
  return metricKeys
    .map((metric) => totals[metric])
    .filter((value): value is UnsupportedMetric => value.kind === "unsupported");
}
