import React from "react";

import type { DashboardDisplayContract, DashboardProjectRow, ReconciliationCheck } from "../../../lib";
import { scopedHref } from "../../../lib";

export function FloatDiagnostics({ contract }: { contract: DashboardDisplayContract }) {
  const floatRows = contract.visibleRows.filter((row) => row.sourceFloatProjectId !== undefined || row.canonicalFloatProjectId !== undefined);
  const checks = contract.reconciliation.filter((check) => check.code.includes("FLOAT") || check.code.includes("PCS00250") || check.code.includes("BT_RAW_CACHE"));

  return React.createElement(
    "section",
    { className: "float-surface" },
    React.createElement(
      "div",
      { className: "table-title" },
      React.createElement("h2", null, "Float Diagnostics"),
      React.createElement("span", { className: "status-pill" }, `${checks.length} checks`)
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
          React.createElement("th", null, "State"),
          React.createElement("th", null, "Trace")
        )
      ),
      React.createElement("tbody", null, floatRows.map((row) => floatRow(row, contract)))
    ),
    React.createElement("h3", null, "Raw / cache / visible checks"),
    React.createElement("ul", { className: "evidence-list" }, checks.map((check) => checkItem(check))),
    React.createElement("h3", null, "Float Export Compare"),
    React.createElement(
      "ul",
      { className: "evidence-list" },
      React.createElement(
        "li",
        null,
        React.createElement("strong", null, "No pasted export yet"),
        React.createElement("span", null, "Empty compare state keeps dashboard rows visible and waits for a user export.")
      ),
      React.createElement(
        "li",
        null,
        React.createElement("strong", null, "Pasted sample"),
        React.createElement("span", null, "Fixed-width Hours columns are recognised in the deterministic fixture.")
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
    ),
    React.createElement(
      "p",
      { className: "detail-scope" },
      "Duplicate/manual and inactive/archive candidates are shown when the display contract carries them. Export compare states are fixture-only and do not write data."
    )
  );
}

function floatRow(row: DashboardProjectRow, contract: DashboardDisplayContract) {
  const floatProjectId = row.canonicalFloatProjectId ?? row.sourceFloatProjectId ?? "No Float ID";
  const state = row.warnings.length > 0 || row.rowType === "float_only" ? "archived/manual/source-only candidate" : "active";
  const href = scopedHref(`/dashboard/float/${floatProjectId}`, contract.scope, { floatProjectId });

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
    React.createElement("td", null, state),
    React.createElement("td", null, row.sourceTrace.map((ref) => ref.rawRowId ?? ref.sourceObjectId ?? ref.sourceLayer).join(" "))
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
