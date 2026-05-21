import React from "react";

import type { DashboardDisplayContract, DashboardProjectRow, MetricValue } from "../../../lib";
import { scopedHref } from "../../../lib";
import { formatProjectMetric, projectRowTraceabilityLabel } from "../../../lib/display/project-metric-format";
import type { ProjectsViewState } from "../../../lib/ui/projects-view-state";
import type { UiSearchParams } from "../../../lib/ui/scope-params";
import { buildCsvDataUriFromContract } from "../export/csv-export";
import { ProjectsBreakdownControls, ProjectsControls } from "./projects-controls";

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
        React.createElement("th", null, "Job #"),
        React.createElement("th", null, "Client"),
        React.createElement("th", null, "Project"),
        React.createElement("th", null, "Office"),
        React.createElement("th", null, "Sold (fee sheet)"),
        React.createElement("th", null, "Pipeline"),
        React.createElement("th", null, "Sold (hrs)"),
        React.createElement("th", null, "Allocated"),
        React.createElement("th", null, "Unallocated"),
        React.createElement("th", null, "Float value (£)"),
        React.createElement("th", null, "Variance (hrs)"),
        React.createElement("th", null, "Confidence"),
        React.createElement("th", null, "Last sync"),
        React.createElement("th", null, "Actions")
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
    React.createElement(
      "td",
      null,
      React.createElement("a", { href }, row.jobNumber ?? "No job number"),
      React.createElement("br"),
      React.createElement("span", { className: "row-type-badge" }, row.rowType)
    ),
    React.createElement("td", null, row.canonicalClient ?? row.sourceClient ?? "Unknown client"),
    React.createElement("td", null, row.canonicalProjectName ?? row.sourceProjectName ?? row.id),
    React.createElement("td", null, row.scope.office),
    React.createElement("td", null, formatProjectMetric(row.totals.soldFee, row, "soldFee")),
    React.createElement("td", null, formatProjectMetric(row.totals.pipelineFee, row, "pipelineFee")),
    React.createElement("td", null, formatProjectMetric(row.totals.soldHours, row, "soldHours")),
    React.createElement("td", null, formatProjectMetric(row.totals.floatHours, row, "floatHours")),
    React.createElement("td", null, unallocatedLabel(row)),
    React.createElement("td", null, floatValueLabel(row)),
    React.createElement("td", null, varianceHoursLabel(row)),
    React.createElement(
      "td",
      null,
      React.createElement("span", { className: "row-type-badge" }, projectRowTraceabilityLabel(row))
    ),
    React.createElement("td", null, lastSyncLabel(row)),
    React.createElement(
      "td",
      null,
      React.createElement("button", { className: "table-action-button", disabled: true, type: "button" }, "Archive")
    )
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
    React.createElement("td", null, formatFooterMetric(contract.footerTotals.soldFee)),
    React.createElement("td", null, formatFooterMetric(contract.footerTotals.pipelineFee)),
    React.createElement("td", null, formatFooterMetric(contract.footerTotals.soldHours)),
    React.createElement("td", null, formatFooterMetric(contract.footerTotals.floatHours)),
    React.createElement("td", null, "Unsupported"),
    React.createElement("td", null, "Derived per row"),
    React.createElement("td", null, varianceHoursFooterLabel(contract)),
    React.createElement("td", null, contract.confidence),
    React.createElement("td", null, "Display contract"),
    React.createElement("td", null, "Read-only")
  );
}

function scopeChip(label: string, value: string) {
  return React.createElement("span", { className: "status-pill", key: label }, `${label}: ${value}`);
}

function optionalScopeChip(label: string, value: string | undefined) {
  return value === undefined || value.trim() === "" ? null : scopeChip(label, value);
}

function unallocatedLabel(row: DashboardProjectRow): string {
  if (metricNumber(row.totals.floatHours) === 0) {
    return formatProjectMetric(row.totals.floatHours, row, "floatHours");
  }

  return "Unsupported";
}

function floatValueLabel(row: DashboardProjectRow): string {
  const soldHours = metricNumber(row.totals.soldHours);
  const soldFee = metricNumber(row.totals.soldFee);
  const allocatedHours = metricNumber(row.totals.floatHours);

  if (soldHours <= 0 || allocatedHours <= 0) {
    return "Unsupported";
  }

  return formatGbp((soldFee / soldHours) * allocatedHours);
}

function varianceHoursLabel(row: DashboardProjectRow): string {
  const soldHours = metricNumber(row.totals.soldHours);
  const allocatedHours = metricNumber(row.totals.floatHours);

  if (soldHours === 0 && allocatedHours === 0 && row.rowType !== "matched") return "Source-only";
  if (soldHours === 0 && allocatedHours === 0) return "No source row";
  return `${formatNumber(soldHours - allocatedHours)}h`;
}

function varianceHoursFooterLabel(contract: DashboardDisplayContract): string {
  return `${formatNumber(metricNumber(contract.footerTotals.soldHours) - metricNumber(contract.footerTotals.floatHours))}h`;
}

function lastSyncLabel(row: DashboardProjectRow): string {
  if (row.sourceTrace.length === 0) return "No source trace";
  return "Display contract";
}

function metricNumber(value: MetricValue): number {
  if (value.kind === "money") return value.value.amountGbp;
  if (value.kind === "hours" || value.kind === "count") return value.value;
  return 0;
}

function formatFooterMetric(value: MetricValue): string {
  if (value.kind === "unsupported") {
    return value.displayLabel;
  }

  if (value.kind === "money") {
    return formatGbp(value.value.amountGbp);
  }

  if (value.kind === "hours") {
    return `${formatNumber(value.value)}h`;
  }

  return formatNumber(value.value);
}

function formatGbp(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1
  }).format(value);
}
