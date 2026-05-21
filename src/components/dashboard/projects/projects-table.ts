import React from "react";

import type { DashboardDisplayContract, DashboardProjectRow, MetricValue } from "../../../lib";
import { scopedHref } from "../../../lib";
import { formatProjectMetric, projectRowTraceabilityLabel } from "../../../lib/display/project-metric-format";
import type { ProjectsViewState } from "../../../lib/ui/projects-view-state";
import type { UiSearchParams } from "../../../lib/ui/scope-params";
import { buildCsvDataUriFromContract } from "../export/csv-export";
import { ProjectsBreakdownControls, ProjectsControls } from "./projects-controls";

type ProjectSortKey =
  | "jobNumber"
  | "client"
  | "project"
  | "office"
  | "soldFee"
  | "pipelineFee"
  | "soldHours"
  | "allocated"
  | "unallocated"
  | "floatValue"
  | "variance"
  | "confidence"
  | "lastSync";

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
      : projectsListTable(contract, params)
  );
}

function projectsListTable(contract: DashboardDisplayContract, params: UiSearchParams) {
  const sortedRows = sortedProjectRows(contract.visibleRows, params);

  return React.createElement(
    "table",
    { className: "projects-table" },
    React.createElement(
      "thead",
      null,
      React.createElement(
        "tr",
        null,
        sortHeader("Job #", "jobNumber", params),
        sortHeader("Client", "client", params),
        sortHeader("Project", "project", params),
        sortHeader("Office", "office", params),
        sortHeader("Sold (fee sheet)", "soldFee", params),
        sortHeader("Pipeline", "pipelineFee", params),
        sortHeader("Sold (hrs)", "soldHours", params),
        sortHeader("Allocated", "allocated", params),
        sortHeader("Unallocated", "unallocated", params),
        sortHeader("Float value (£)", "floatValue", params),
        sortHeader("Variance (hrs)", "variance", params),
        sortHeader("Confidence", "confidence", params),
        sortHeader("Last sync", "lastSync", params),
        React.createElement("th", null, "Actions")
      )
    ),
    React.createElement(
      "tbody",
      null,
      sortedRows.map((row) => projectRow(row)),
      footerRow(contract)
    )
  );
}

function sortHeader(label: string, sortKey: ProjectSortKey, params: UiSearchParams) {
  const activeSort = projectSortFromParams(params);
  const active = activeSort.key === sortKey;
  const nextDir = active && activeSort.dir === "asc" ? "desc" : "asc";
  const marker = active ? (activeSort.dir === "asc" ? " ▲" : " ▼") : "";

  return React.createElement(
    "th",
    null,
    React.createElement("a", { href: hrefWithParams(params, { sort: sortKey, dir: nextDir }) }, `${label}${marker}`)
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
  const detailHref = projectDetailHref(row);
  const floatHref = projectFloatHref(row);
  const primaryHref = row.rowType === "float_only" && floatHref !== undefined ? floatHref : detailHref ?? scopedHref("/dashboard/projects", row.scope);

  return React.createElement(
    "tr",
    { key: row.id },
    React.createElement(
      "td",
      null,
      React.createElement("a", { href: primaryHref }, row.jobNumber ?? "No job number"),
      React.createElement("br"),
      React.createElement("span", { className: "row-type-badge" }, row.rowType)
    ),
    React.createElement("td", null, row.canonicalClient ?? row.sourceClient ?? "Unknown client"),
    React.createElement("td", null, row.canonicalProjectName ?? row.sourceProjectName ?? row.id),
    React.createElement("td", null, row.scope.office),
    React.createElement("td", null, formatProjectMetric(row.totals.soldFee, row, "soldFee")),
    React.createElement("td", null, formatProjectMetric(row.totals.pipelineFee, row, "pipelineFee")),
    React.createElement("td", null, formatProjectMetric(row.totals.soldHours, row, "soldHours")),
    React.createElement("td", null, floatEvidenceLink(row, formatProjectMetric(row.totals.floatHours, row, "floatHours"))),
    React.createElement("td", null, floatEvidenceLink(row, unallocatedLabel(row))),
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

function projectDetailHref(row: DashboardProjectRow): string | undefined {
  if (row.jobNumber === undefined) return undefined;
  return scopedHref(`/dashboard/projects/${row.jobNumber}`, row.scope, { jobNumber: row.jobNumber });
}

function projectFloatHref(row: DashboardProjectRow): string | undefined {
  const floatProjectId = row.canonicalFloatProjectId ?? row.sourceFloatProjectId;
  if (floatProjectId === undefined || floatProjectId.trim() === "") return undefined;
  return scopedHref(`/dashboard/float/${floatProjectId}`, row.scope, { floatProjectId });
}

function floatEvidenceLink(row: DashboardProjectRow, label: string) {
  const href = floatEvidenceHref(row);
  if (href === undefined || !rowHasFloatEvidence(row)) return label;

  return React.createElement("a", { href }, label);
}

function floatEvidenceHref(row: DashboardProjectRow): string | undefined {
  const floatHref = projectFloatHref(row);
  if (row.rowType === "float_only") return floatHref;

  const detailHref = projectDetailHref(row);
  return detailHref === undefined ? floatHref : `${detailHref}#float-trace`;
}

function rowHasFloatEvidence(row: DashboardProjectRow): boolean {
  return row.sourceTrace.some((ref) => ref.source === "float" || ref.sourceLayer.startsWith("float_"));
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

function sortedProjectRows(rows: readonly DashboardProjectRow[], params: UiSearchParams): DashboardProjectRow[] {
  const sort = projectSortFromParams(params);

  return [...rows].sort((left, right) => {
    const result = compareProjectRows(left, right, sort.key);
    return sort.dir === "asc" ? result : -result;
  });
}

function projectSortFromParams(params: UiSearchParams): { key: ProjectSortKey; dir: "asc" | "desc" } {
  const rawKey = scalarParam(params.sort);
  const rawDir = scalarParam(params.dir);

  return {
    key: isProjectSortKey(rawKey) ? rawKey : "soldFee",
    dir: rawDir === "asc" ? "asc" : "desc"
  };
}

function compareProjectRows(left: DashboardProjectRow, right: DashboardProjectRow, sortKey: ProjectSortKey): number {
  if (sortKey === "jobNumber") return compareStrings(left.jobNumber, right.jobNumber);
  if (sortKey === "client") return compareStrings(left.canonicalClient ?? left.sourceClient, right.canonicalClient ?? right.sourceClient);
  if (sortKey === "project") {
    return compareStrings(
      left.canonicalProjectName ?? left.sourceProjectName,
      right.canonicalProjectName ?? right.sourceProjectName
    );
  }
  if (sortKey === "office") return compareStrings(left.scope.office, right.scope.office);
  if (sortKey === "soldFee") return metricNumber(left.totals.soldFee) - metricNumber(right.totals.soldFee);
  if (sortKey === "pipelineFee") return metricNumber(left.totals.pipelineFee) - metricNumber(right.totals.pipelineFee);
  if (sortKey === "soldHours") return metricNumber(left.totals.soldHours) - metricNumber(right.totals.soldHours);
  if (sortKey === "allocated") return metricNumber(left.totals.floatHours) - metricNumber(right.totals.floatHours);
  if (sortKey === "unallocated") return compareStrings(unallocatedLabel(left), unallocatedLabel(right));
  if (sortKey === "floatValue") return compareStrings(floatValueLabel(left), floatValueLabel(right));
  if (sortKey === "variance") return varianceHoursNumber(left) - varianceHoursNumber(right);
  if (sortKey === "confidence") return compareStrings(projectRowTraceabilityLabel(left), projectRowTraceabilityLabel(right));
  return compareStrings(lastSyncLabel(left), lastSyncLabel(right));
}

function varianceHoursNumber(row: DashboardProjectRow): number {
  return metricNumber(row.totals.soldHours) - metricNumber(row.totals.floatHours);
}

function compareStrings(left: string | undefined, right: string | undefined): number {
  return (left ?? "").localeCompare(right ?? "");
}

function hrefWithParams(params: UiSearchParams, overrides: Record<string, string>): string {
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const scalar = scalarParam(value);
    if (scalar !== undefined && scalar.trim() !== "") {
      nextParams.set(key, scalar);
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    nextParams.set(key, value);
  }

  const query = nextParams.toString();
  return query === "" ? "/dashboard/projects" : `/dashboard/projects?${query}`;
}

function scalarParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isProjectSortKey(value: string | undefined): value is ProjectSortKey {
  return (
    value === "jobNumber" ||
    value === "client" ||
    value === "project" ||
    value === "office" ||
    value === "soldFee" ||
    value === "pipelineFee" ||
    value === "soldHours" ||
    value === "allocated" ||
    value === "unallocated" ||
    value === "floatValue" ||
    value === "variance" ||
    value === "confidence" ||
    value === "lastSync"
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
