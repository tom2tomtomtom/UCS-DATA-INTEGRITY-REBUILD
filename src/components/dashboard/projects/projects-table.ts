import React from "react";

import type { DashboardDisplayContract, DashboardProjectRow, DashboardTotals } from "../../../lib";
import { scopedHref } from "../../../lib";
import { formatProjectMetric, projectRowTraceabilityLabel } from "../../../lib/display/project-metric-format";
import type { ProjectsViewState } from "../../../lib/ui/projects-view-state";
import type { UiSearchParams } from "../../../lib/ui/scope-params";
import { buildCsvDataUriFromContract } from "../export/csv-export";
import { ProjectsBreakdownControls, ProjectsControls } from "./projects-controls";

const tableMetrics = [
  ["Sold", "soldFee"],
  ["Pipeline", "pipelineFee"],
  ["Sold hours", "soldHours"],
  ["Float hours", "floatHours"],
  ["Production rev", "productionRevenue"]
] as const satisfies readonly (readonly [string, keyof DashboardTotals])[];

export function ProjectsTable({
  contract,
  params = {},
  viewState = { presentationView: "list", breakdownView: "department" }
}: {
  readonly contract: DashboardDisplayContract;
  readonly params?: UiSearchParams;
  readonly viewState?: ProjectsViewState;
}) {
  return React.createElement(
    "section",
    { className: "projects-surface" },
    React.createElement(
      "div",
      { className: "table-title" },
      React.createElement("h2", null, "Projects"),
      React.createElement(
        "a",
        {
          className: "download-link",
          download: "ucs-dashboard-projects.csv",
          href: buildCsvDataUriFromContract(contract)
        },
        "Download CSV"
      )
    ),
    React.createElement(ProjectsControls, { params, viewState }),
    React.createElement(
      "div",
      { className: "active-filter-row", "aria-label": "Active filters" },
      scopeChip("Office", contract.scope.office),
      scopeChip("From", contract.scope.from),
      scopeChip("To", contract.scope.to),
      optionalScopeChip("Department", contract.scope.department),
      optionalScopeChip("Role", contract.scope.role),
      optionalScopeChip("Client", contract.scope.client),
      optionalScopeChip("Search", contract.scope.search)
    ),
    viewState.presentationView === "calendar"
      ? calendarEmptyState(params, viewState)
      : projectsListTable(contract)
  );
}

function projectsListTable(contract: DashboardDisplayContract) {
  return React.createElement(
    "table",
    { className: "projects-table" },
    React.createElement(
      "thead",
      null,
      React.createElement(
        "tr",
        null,
        React.createElement("th", null, "Job Number"),
        React.createElement("th", null, "Client"),
        React.createElement("th", null, "Project"),
        React.createElement("th", null, "Row Type"),
        ...tableMetrics.map(([label]) => React.createElement("th", { key: label }, label)),
        React.createElement("th", null, "Confidence")
      )
    ),
    React.createElement(
      "tbody",
      null,
      contract.visibleRows.map((row) => projectRow(row)),
      footerRow(contract)
    )
  );
}

function calendarEmptyState(params: UiSearchParams, viewState: ProjectsViewState) {
  return React.createElement(
    "div",
    { className: "projects-calendar-empty" },
    React.createElement("p", null, "No calendar data for this period."),
    React.createElement(ProjectsBreakdownControls, { params, viewState })
  );
}

function projectRow(row: DashboardProjectRow) {
  const href =
    row.jobNumber === undefined
      ? scopedHref("/dashboard/projects", row.scope)
      : scopedHref(`/dashboard/projects/${row.jobNumber}`, row.scope, { jobNumber: row.jobNumber });

  return React.createElement(
    "tr",
    { key: row.id },
    React.createElement("td", null, React.createElement("a", { href }, row.jobNumber ?? "No job number")),
    React.createElement("td", null, row.canonicalClient ?? row.sourceClient ?? "Unknown client"),
    React.createElement("td", null, row.canonicalProjectName ?? row.sourceProjectName ?? row.id),
    React.createElement("td", null, React.createElement("span", { className: "row-type-badge" }, row.rowType)),
    ...tableMetrics.map(([, metric]) => React.createElement("td", { key: metric }, formatProjectMetric(row.totals[metric], row, metric))),
    React.createElement("td", null, projectRowTraceabilityLabel(row))
  );
}

function footerRow(contract: DashboardDisplayContract) {
  return React.createElement(
    "tr",
    { className: "projects-footer" },
    React.createElement("td", null, "Total"),
    React.createElement("td", null, ""),
    React.createElement("td", null, ""),
    React.createElement("td", null, contract.visibleRows.length),
    ...tableMetrics.map(([, metric]) => React.createElement("td", { key: metric }, formatFooterMetric(contract.footerTotals[metric]))),
    React.createElement("td", null, contract.confidence)
  );
}

function scopeChip(label: string, value: string) {
  return React.createElement("span", { className: "status-pill", key: label }, `${label}: ${value}`);
}

function optionalScopeChip(label: string, value: string | undefined) {
  return value === undefined || value.trim() === "" ? null : scopeChip(label, value);
}

function formatFooterMetric(value: DashboardTotals[keyof DashboardTotals]): string {
  if (value.kind === "unsupported") {
    return value.displayLabel;
  }

  if (value.kind === "money") {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0
    }).format(value.value.amountGbp);
  }

  if (value.kind === "hours") {
    return `${formatNumber(value.value)}h`;
  }

  return formatNumber(value.value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1
  }).format(value);
}
