import type { DashboardDisplayContract, DashboardProjectRow } from "./contract";
import type { MetricValue } from "../canon/types";

export type DashboardFloatCompareRow = {
  readonly key: string;
  readonly jobNumber?: string;
  readonly floatProjectId?: string;
  readonly projectName: string;
  readonly dashboardHours: number;
};

export type ParsedFloatExportRow = {
  readonly key: string;
  readonly label: string;
  readonly hours: number;
};

export type FloatExportComparisonRow = ParsedFloatExportRow & {
  readonly dashboard: DashboardFloatCompareRow | undefined;
  readonly dashboardMatches: readonly DashboardFloatCompareRow[];
  readonly dashboardHours: number;
  readonly deltaHours: number;
  readonly status: "pass" | "warn" | "fail";
  readonly issue?: "ambiguous_dashboard_match" | "dashboard_missing_from_export" | "export_missing_dashboard_match";
};

export function dashboardFloatRowsFromContract(contract: DashboardDisplayContract): DashboardFloatCompareRow[] {
  return contract.visibleRows.flatMap((row) => {
    if (!rowHasFloatEvidence(row)) return [];

    const dashboardHours = metricNumber(row.totals.floatHours);
    const floatProjectId = row.canonicalFloatProjectId ?? row.sourceFloatProjectId;
    const key = floatProjectId ?? row.jobNumber ?? row.canonicalProjectName ?? row.sourceProjectName ?? row.id;

    return [
      {
        key,
        ...(row.jobNumber !== undefined ? { jobNumber: row.jobNumber } : {}),
        ...(floatProjectId !== undefined ? { floatProjectId } : {}),
        projectName: row.canonicalProjectName ?? row.sourceProjectName ?? row.id,
        dashboardHours
      }
    ];
  });
}

export function parseFloatExport(text: string): ParsedFloatExportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const splitLine = splitterForHeader(lines[0] ?? "");
  const headers = splitLine(lines[0] ?? "").map((header) => header.toLowerCase());
  const floatIdIndex = headerIndex(headers, [/float.*project.*id/, /^project id$/, /project_id/]);
  const jobIndex = headerIndex(headers, [/job.*number/, /project.*code/, /project.*number/, /^job$/, /job no/]);
  const projectIndex = headerIndex(headers, [/^project$/, /project.*name/, /task.*project/]);
  const hoursIndex = headerIndex(headers, [/scheduled.*hours/, /^hours$/, /total.*hours/]);

  if (hoursIndex < 0) return [];

  const byKey = new Map<string, ParsedFloatExportRow>();

  for (const line of lines.slice(1)) {
    const cells = alignSparseCells(splitLine(line), headers.length, { hoursIndex, jobIndex, projectIndex });
    const key = (cell(cells, floatIdIndex) ?? cell(cells, jobIndex) ?? cell(cells, projectIndex) ?? "").trim();
    if (key === "") continue;

    const hours = numberFromCell(cell(cells, hoursIndex) ?? "");
    if (!Number.isFinite(hours)) continue;

    const label = cell(cells, projectIndex) ?? cell(cells, jobIndex) ?? cell(cells, floatIdIndex) ?? key;
    const existing = byKey.get(key);
    byKey.set(key, existing === undefined ? { key, label, hours } : { ...existing, hours: existing.hours + hours });
  }

  return [...byKey.values()];
}

export function compareFloatExportToDashboard(
  parsedRows: readonly ParsedFloatExportRow[],
  dashboardRows: readonly DashboardFloatCompareRow[]
): FloatExportComparisonRow[] {
  const dashboardByKey = dashboardMatchIndex(dashboardRows);
  const matchedDashboardIndexes = new Set<number>();
  const exportKeys = new Set(parsedRows.map((row) => row.key));

  const exportComparisons = parsedRows.map((exportRow): FloatExportComparisonRow => {
    const indexedMatches = dashboardByKey.get(exportRow.key) ?? [];
    indexedMatches.forEach((match) => matchedDashboardIndexes.add(match.index));

    const dashboardMatches = indexedMatches.map((match) => match.row);
    const dashboardHours = sumNumbers(dashboardMatches.map((row) => row.dashboardHours));
    const deltaHours = dashboardHours - exportRow.hours;
    const ambiguous = dashboardMatches.length > 1;

    return {
      ...exportRow,
      dashboard: dashboardMatches[0],
      dashboardMatches,
      dashboardHours,
      deltaHours,
      status: exportStatus(deltaHours, dashboardMatches.length, ambiguous),
      ...(ambiguous ? { issue: "ambiguous_dashboard_match" } : {}),
      ...(dashboardMatches.length === 0 ? { issue: "export_missing_dashboard_match" } : {})
    };
  });

  const missingDashboardRows = dashboardRows
    .map((row, index) => ({ row, index }))
    .filter(({ row, index }) => !matchedDashboardIndexes.has(index) && keysForDashboardRow(row).every((key) => !exportKeys.has(key)))
    .map(({ row }): FloatExportComparisonRow => ({
      key: row.key,
      label: "Missing from Float export",
      hours: 0,
      dashboard: row,
      dashboardMatches: [row],
      dashboardHours: row.dashboardHours,
      deltaHours: row.dashboardHours,
      status: row.dashboardHours === 0 ? "warn" : "fail",
      issue: "dashboard_missing_from_export"
    }));

  return [...exportComparisons, ...missingDashboardRows].sort((left, right) => Math.abs(right.deltaHours) - Math.abs(left.deltaHours));
}

function rowHasFloatEvidence(row: DashboardProjectRow): boolean {
  return row.sourceTrace.some((ref) => ref.source === "float" || ref.sourceLayer.startsWith("float_"));
}

function metricNumber(value: MetricValue): number {
  if (value.kind === "money") return value.value.amountGbp;
  if (value.kind === "hours" || value.kind === "count") return value.value;
  return 0;
}

function splitterForHeader(headerLine: string): (line: string) => string[] {
  if (headerLine.includes(",")) return splitCsvLine;
  if (headerLine.includes("\t")) return (line) => line.split(/\t+/).map((cellValue) => cellValue.trim());
  if (/\s{2,}/.test(headerLine)) return (line) => line.trim().split(/\s{2,}/).map((cellValue) => cellValue.trim());
  return (line) => [line.trim()];
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === "\"" && line[index + 1] === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function headerIndex(headers: readonly string[], patterns: readonly RegExp[]): number {
  return headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)));
}

function alignSparseCells(
  cells: readonly string[],
  headerCount: number,
  indexes: { readonly hoursIndex: number; readonly jobIndex: number; readonly projectIndex: number }
): readonly string[] {
  if (cells.length >= headerCount || indexes.hoursIndex !== headerCount - 1 || cells.length < 2) return cells;

  const aligned = [...cells];
  aligned[indexes.hoursIndex] = cells[cells.length - 1] ?? "";

  if (indexes.jobIndex >= 0) {
    aligned[indexes.jobIndex] = cells[cells.length - 2] ?? "";
  }

  if (indexes.projectIndex >= 0 && indexes.projectIndex !== indexes.jobIndex) {
    aligned[indexes.projectIndex] = cells[cells.length - 3] ?? aligned[indexes.projectIndex] ?? "";
  }

  return aligned;
}

function cell(cells: readonly string[], index: number): string | undefined {
  return index < 0 ? undefined : cells[index];
}

function numberFromCell(value: string): number {
  return Number(value.replace(/,/g, ""));
}

function dashboardMatchIndex(rows: readonly DashboardFloatCompareRow[]): Map<string, Array<{ row: DashboardFloatCompareRow; index: number }>> {
  const index = new Map<string, Array<{ row: DashboardFloatCompareRow; index: number }>>();

  rows.forEach((row, rowIndex) => {
    for (const key of keysForDashboardRow(row)) {
      const matches = index.get(key) ?? [];
      matches.push({ row, index: rowIndex });
      index.set(key, matches);
    }
  });

  return index;
}

function keysForDashboardRow(row: DashboardFloatCompareRow): readonly string[] {
  return [...new Set([row.floatProjectId, row.jobNumber, row.projectName, row.key].filter((value): value is string => value !== undefined && value.trim() !== ""))];
}

function exportStatus(deltaHours: number, matchCount: number, ambiguous: boolean): FloatExportComparisonRow["status"] {
  if (matchCount === 0) return "warn";
  if (ambiguous) return "warn";
  return Math.abs(deltaHours) <= 0.05 ? "pass" : "fail";
}

function sumNumbers(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
