import type {
  DashboardCsvRow,
  DashboardDisplayContract,
  DashboardProjectRow,
  DashboardTotals
} from "./contract";
import {
  projectMetricCellName,
  projectMetricCsvValue
} from "./project-metric-format";
import type { UnsupportedMetric } from "../canon/types";

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
    cells[projectMetricCellName(row, metric)] = projectMetricCsvValue(row, metric);
  }
  if (row.warnings.length > 0) {
    cells.warningCodes = row.warnings.map((warning) => warning.code).join("; ");
  }

  return cells;
}

function addCell(cells: Record<string, string | number>, key: string, value: string | undefined): void {
  if (value !== undefined) cells[key] = value;
}

function unsupportedFromTotals(totals: DashboardTotals): UnsupportedMetric[] {
  return metricKeys
    .map((metric) => totals[metric])
    .filter((value): value is UnsupportedMetric => value.kind === "unsupported");
}
