import type { DashboardCsvRow, DashboardDisplayContract } from "../../../lib";

export function buildCsvTextFromContract(contract: DashboardDisplayContract): string {
  const rows = contract.csvRows;
  const headers = headersFor(rows);

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(cellFor(row, header))).join(","))
  ].join("\n");
}

export function buildCsvDataUriFromContract(contract: DashboardDisplayContract): string {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(buildCsvTextFromContract(contract))}`;
}

function headersFor(rows: readonly DashboardCsvRow[]): string[] {
  const headers = new Set<string>(["rowType", "jobNumber", "canonicalClient", "canonicalProjectName"]);

  for (const row of rows) {
    for (const key of Object.keys(row.cells)) {
      headers.add(key);
    }

    if (row.unsupported.length > 0) {
      headers.add("unsupportedMetrics");
    }
  }

  return [...headers];
}

function cellFor(row: DashboardCsvRow, header: string): string | number {
  if (header === "unsupportedMetrics") {
    return row.unsupported.map((metric) => `${metric.metric}: ${metric.reason}`).join("; ");
  }

  return row.cells[header] ?? "";
}

function csvEscape(value: string | number): string {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll("\"", "\"\"")}"`;
}
