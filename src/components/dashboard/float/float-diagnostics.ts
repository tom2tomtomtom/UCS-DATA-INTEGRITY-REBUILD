import React from "react";

import type { DashboardDisplayContract, DashboardProjectRow, ReconciliationCheck } from "../../../lib";
import { scopedHref } from "../../../lib";
import {
  compareFloatExportToDashboard,
  dashboardFloatRowsFromContract,
  parseFloatExport,
  type FloatExportComparisonRow
} from "../../../lib/display/float-export-compare";

export function FloatDiagnostics({
  contract,
  pastedFloatExport = ""
}: {
  contract: DashboardDisplayContract;
  pastedFloatExport?: string | undefined;
}) {
  const floatRows = contract.visibleRows.filter((row) => row.sourceFloatProjectId !== undefined || row.canonicalFloatProjectId !== undefined);
  const checks = contract.reconciliation.filter((check) => check.code.includes("FLOAT") || check.code.includes("PCS00250") || check.code.includes("BT_RAW_CACHE"));

  return React.createElement(
    "section",
    { className: "float-surface" },
    React.createElement(
      "div",
      { className: "table-title" },
      React.createElement("h2", null, "Float Diagnostics"),
      React.createElement("span", { className: "status-pill" }, `${checks.length} checks`),
      contract.scope.floatProjectId === undefined
        ? null
        : React.createElement("span", { className: "status-pill" }, `Focused Float ID: ${contract.scope.floatProjectId}`)
    ),
    React.createElement(
      "table",
      { className: "projects-table" },
      React.createElement(
        "thead",
        null,
        React.createElement(
          "tr",
          null,
          React.createElement("th", null, "Project"),
          React.createElement("th", null, "Float ID"),
          React.createElement("th", null, "Row type"),
          React.createElement("th", null, "Raw"),
          React.createElement("th", null, "Cache"),
          React.createElement("th", null, "Visible"),
          React.createElement("th", null, "State"),
          React.createElement("th", null, "Trace")
        )
      ),
      React.createElement("tbody", null, floatRows.map((row) => floatRow(row, contract)))
    ),
    React.createElement("h3", null, "Raw / cache / visible checks"),
    React.createElement("ul", { className: "evidence-list" }, checks.map((check) => checkItem(check))),
    floatExportCompareSection(contract, pastedFloatExport),
    React.createElement(
      "p",
      { className: "detail-scope" },
      "Duplicate/manual and inactive/archive candidates are shown when the display contract carries them. Export compare reads pasted text only and does not write data."
    )
  );
}

function floatRow(row: DashboardProjectRow, contract: DashboardDisplayContract) {
  const floatProjectId = row.canonicalFloatProjectId ?? row.sourceFloatProjectId ?? "No Float ID";
  const state = row.warnings.length > 0 || row.rowType === "float_only" ? "archived/manual/source-only candidate" : "active";
  const href = scopedHref(`/dashboard/float/${floatProjectId}`, contract.scope, { floatProjectId });
  const detailHref = row.jobNumber === undefined
    ? undefined
    : `${scopedHref(`/dashboard/projects/${row.jobNumber}`, contract.scope, { jobNumber: row.jobNumber })}#float-trace`;

  return React.createElement(
    "tr",
    { key: row.id },
    React.createElement(
      "td",
      null,
      React.createElement("a", { href }, `${row.jobNumber ?? "Float only"} ${row.canonicalProjectName ?? row.sourceProjectName ?? ""}`)
    ),
    React.createElement("td", null, floatProjectId),
    React.createElement("td", null, React.createElement("span", { className: "row-type-badge" }, row.rowType)),
    React.createElement("td", null, layerState(row, "float_raw")),
    React.createElement("td", null, layerState(row, "float_cache")),
    React.createElement("td", null, layerState(row, "float_visible")),
    React.createElement("td", null, state),
    React.createElement(
      "td",
      null,
      detailHref === undefined ? null : React.createElement("a", { href: detailHref }, "Detail trace"),
      " ",
      row.sourceTrace.map((ref) => ref.rawRowId ?? ref.sourceObjectId ?? ref.sourceLayer).join(" ")
    )
  );
}

function layerState(row: DashboardProjectRow, sourceLayer: "float_raw" | "float_cache" | "float_visible") {
  const present = row.sourceTrace.some((ref) => ref.sourceLayer === sourceLayer);

  return React.createElement(
    "span",
    { className: present ? "status-badge ok" : "status-badge warn" },
    present ? "present" : "missing"
  );
}

function checkItem(check: ReconciliationCheck) {
  return React.createElement(
    "li",
    { key: check.id },
    React.createElement("strong", null, check.code),
    React.createElement("span", null, check.message ?? check.status)
  );
}

function floatExportCompareSection(contract: DashboardDisplayContract, pastedFloatExport: string) {
  const parsedRows = parseFloatExport(pastedFloatExport);
  const dashboardRows = dashboardFloatRowsFromContract(contract);
  const comparisons = pastedFloatExport.trim() === "" ? [] : compareFloatExportToDashboard(parsedRows, dashboardRows);

  return React.createElement(
    "section",
    { className: "float-export-compare", "aria-label": "Float Export Compare" },
    React.createElement("h3", null, "Float Export Compare"),
    React.createElement(
      "form",
      { action: "/dashboard/float", className: "float-export-form", method: "get" },
      ...scopeHiddenInputs(contract),
      React.createElement("textarea", {
        "aria-label": "Pasted Float export",
        defaultValue: pastedFloatExport,
        name: "floatExport",
        placeholder: "Paste Float export rows here. Headers can include Hours, Scheduled Hours, or Total Hours.",
        rows: 6
      }),
      React.createElement("button", { type: "submit" }, "Compare export")
    ),
    pastedFloatExport.trim() === ""
      ? React.createElement(
          "ul",
          { className: "evidence-list" },
          React.createElement(
            "li",
            null,
            React.createElement("strong", null, "No pasted export yet"),
            React.createElement("span", null, "Empty compare state keeps dashboard rows visible and waits for a user export.")
          )
        )
      : parsedRows.length === 0
        ? React.createElement("p", { className: "warning-text" }, "Could not find a usable hours column. Expected a header like Hours, Scheduled Hours, or Total Hours.")
        : floatExportCompareTable(comparisons),
    React.createElement(
      "ul",
      { className: "evidence-list" },
      React.createElement(
        "li",
        null,
        React.createElement("strong", null, "Fixed-width Hours"),
        React.createElement("span", null, "CSV, tab-separated, and fixed-width Hours columns are parsed by the same read-only helper.")
      ),
      React.createElement(
        "li",
        null,
        React.createElement("strong", null, "Ambiguous match"),
        React.createElement("span", null, "Duplicate Float match keys stay flagged rather than merged.")
      ),
      React.createElement(
        "li",
        null,
        React.createElement("strong", null, "Dashboard-only rows missing from pasted export"),
        React.createElement("span", null, "Rows visible in the dashboard but absent from the pasted export remain warning evidence.")
      )
    )
  );
}

function floatExportCompareTable(rows: readonly FloatExportComparisonRow[]) {
  return React.createElement(
    "table",
    { className: "projects-table" },
    React.createElement(
      "thead",
      null,
      React.createElement(
        "tr",
        null,
        ["Export row", "Dashboard match", "Export hours", "Dashboard hours", "Delta", "Status"].map((header) =>
          React.createElement("th", { key: header }, header)
        )
      )
    ),
    React.createElement(
      "tbody",
      null,
      rows.slice(0, 50).map((row) =>
        React.createElement(
          "tr",
          { key: `${row.key}:${row.issue ?? "matched"}` },
          React.createElement("td", null, row.label, React.createElement("br"), React.createElement("span", { className: "detail-scope" }, row.key)),
          React.createElement("td", null, dashboardMatchLabel(row)),
          React.createElement("td", null, formatHours(row.hours)),
          React.createElement("td", null, formatHours(row.dashboardHours)),
          React.createElement("td", null, formatHours(row.deltaHours)),
          React.createElement("td", null, React.createElement("span", { className: `status-badge ${row.status}` }, row.issue ?? row.status))
        )
      )
    )
  );
}

function dashboardMatchLabel(row: FloatExportComparisonRow): string {
  if (row.dashboard === undefined) return "No dashboard match";
  if (row.dashboardMatches.length > 1) return `${row.dashboardMatches.length} dashboard rows matched`;
  return row.dashboard.jobNumber ?? row.dashboard.floatProjectId ?? row.dashboard.projectName;
}

function scopeHiddenInputs(contract: DashboardDisplayContract) {
  const scope = contract.scope;
  const values = {
    office: scope.office,
    offices: scope.offices?.join(","),
    from: scope.from,
    to: scope.to,
    department: scope.department,
    role: scope.role,
    client: scope.client,
    search: scope.search,
    jobNumber: scope.jobNumber,
    floatProjectId: scope.floatProjectId
  };

  return Object.entries(values).flatMap(([name, value]) =>
    value === undefined || value.trim() === "" ? [] : React.createElement("input", { key: name, name, type: "hidden", value })
  );
}

function formatHours(value: number): string {
  return `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(value)}h`;
}
