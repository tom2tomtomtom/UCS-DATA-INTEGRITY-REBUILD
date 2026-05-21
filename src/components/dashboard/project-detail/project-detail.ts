import React from "react";

import type {
  DashboardDisplayContract,
  DashboardProjectRow,
  MetricValue,
  ProjectFloatTraceRow,
  ProjectMonthlyDetailRow,
  ProjectRoleDetailRow,
  ReconciliationCheck
} from "../../../lib";
import { scopedHref } from "../../../lib";
import type { ProjectDetailFloatTraceSummary } from "../../../lib/display/project-detail-view";
import { buildProjectDetailViewModel } from "../../../lib/display/project-detail-view";
import { formatProjectMetric } from "../../../lib/display/project-metric-format";
import { TimeFilterControls } from "../time-filter-controls";

const detailMetrics = [
  ["Sold (fee sheet)", "soldFee"],
  ["Pipeline", "pipelineFee"],
  ["Production revenue", "productionRevenue"],
  ["Sold hours", "soldHours"]
] as const;

export function ProjectDetail({
  contract,
  jobNumber
}: {
  contract: DashboardDisplayContract;
  jobNumber: string;
}) {
  const viewModel = buildProjectDetailViewModel(contract, jobNumber);

  if (viewModel === undefined) {
    return React.createElement("section", { className: "detail-surface" }, `No contract row for ${jobNumber}`);
  }

  const { allocatedHours, checks, detail, floatTraceSummary: traceSummary, matchingRows, row, unallocatedHours } = viewModel;

  return React.createElement(
    "section",
    { className: "detail-surface" },
    React.createElement(
      "div",
      { className: "detail-heading" },
      React.createElement(
        "div",
        null,
        React.createElement("h2", null, `${row.canonicalClient ?? row.sourceClient ?? "Unknown"} / ${jobNumber}`),
        scopeLine(contract),
        React.createElement("span", { className: "status-pill" }, `Generated ${formatGeneratedAt(contract.generatedAt)}`)
      ),
      React.createElement("a", { href: projectsBackHref(contract) }, "Back to Projects")
    ),
    React.createElement(TimeFilterControls, { basePath: `/dashboard/projects/${jobNumber}`, scope: contract.scope }),
    detailChecklist(row, matchingRows, checks),
    matchingRows.length > 1 ? duplicateRowsPanel(matchingRows) : null,
    React.createElement(
      "div",
      { className: "metric-grid" },
      ...detailMetrics.map(([label, metric]) =>
        React.createElement(
          "article",
          { className: "metric-card", key: metric },
          React.createElement("span", null, label),
          React.createElement("strong", null, formatProjectMetric(row.totals[metric], row, metric))
        )
      ),
      detailMetricCard("Allocated hours", detail.roleRows.length === 0 ? "No source row" : formatMetricValue(allocatedHours), "Float, named people"),
      detailMetricCard("Unallocated hours", detail.floatTraceRows.length === 0 ? "No source row" : formatMetricValue(unallocatedHours), "Float, placeholder roles")
    ),
    React.createElement("h3", null, "Sold vs Allocated by Month"),
    detail.monthlyRows.length === 0
      ? React.createElement("p", null, "No monthly detail rows available for this project in the active scope.")
      : monthlyTable(detail.monthlyRows),
    React.createElement("h3", null, "Profitability by Role"),
    React.createElement("p", { className: "detail-scope" }, "Rates are derived from fee-sheet sold fee divided by sold hours. Unsupported rows stay visible instead of being corrected."),
    detail.roleRows.length === 0
      ? React.createElement("p", null, "No role data available for this project in the active scope.")
      : roleTable(detail.roleRows),
    React.createElement("h3", { id: "float-trace" }, "Float Trace"),
    React.createElement("p", { className: "detail-scope" }, "Trace rows come from display-contract Float evidence. Raw, cache, and visible rows stay labelled by source layer."),
    floatTraceSummary(traceSummary),
    detail.floatTraceRows.length === 0
      ? React.createElement("p", null, "No Float trace rows available for this project in the active scope.")
      : floatTraceTable(detail.floatTraceRows),
    React.createElement("h3", null, "Float reconciliation"),
    checks.length === 0
      ? React.createElement("p", null, "No Float reconciliation warnings for this project in the active scope.")
      : React.createElement("ul", { className: "evidence-list" }, checks.map((check) => checkItem(check))),
    React.createElement("h3", null, "Source trace"),
    React.createElement(
      "ul",
      { className: "evidence-list" },
      row.sourceTrace.map((ref, index) =>
        React.createElement(
          "li",
          { key: `${ref.source}:${ref.sourceLayer}:${ref.rawRowId ?? index}` },
          `${ref.source} ${ref.sourceLayer} ${ref.rawRowId ?? ref.sourceObjectId ?? "source"}`
        )
      )
    )
  );
}

function projectsBackHref(contract: DashboardDisplayContract): string {
  const scope = contract.scope;

  return scopedHref("/dashboard/projects", {
    office: scope.office,
    ...(scope.offices !== undefined && scope.offices.length > 0 ? { offices: scope.offices } : {}),
    from: scope.from,
    to: scope.to,
    ...(scope.department !== undefined ? { department: scope.department } : {}),
    ...(scope.role !== undefined ? { role: scope.role } : {}),
    ...(scope.client !== undefined ? { client: scope.client } : {}),
    ...(scope.search !== undefined ? { search: scope.search } : {})
  });
}

function duplicateRowsPanel(rows: readonly DashboardProjectRow[]) {
  return React.createElement(
    "section",
    { className: "duplicate-detail-panel", "aria-label": "Duplicate project rows" },
    React.createElement("strong", null, `${rows.length} visible rows for this job number`),
    React.createElement(
      "ul",
      null,
      rows.map((row) =>
        React.createElement(
          "li",
          { key: row.id },
          `${row.canonicalProjectName ?? row.sourceProjectName ?? row.id} - ${formatMetricValue(row.totals.floatHours)}`
        )
      )
    )
  );
}

function detailChecklist(
  row: DashboardProjectRow,
  matchingRows: readonly DashboardProjectRow[],
  checks: readonly ReconciliationCheck[]
) {
  return React.createElement(
    "section",
    { className: "detail-checklist", "aria-label": "Project evidence checklist" },
    checklistItem("Visible contract rows", String(matchingRows.length)),
    checklistItem("Source trace refs", String(row.sourceTrace.length)),
    checklistItem("Float trace rows", String(row.detail?.floatTraceRows.length ?? 0)),
    checklistItem("Warnings", String(row.warnings.length + checks.length))
  );
}

function checklistItem(label: string, value: string) {
  return React.createElement(
    "article",
    { className: "metric-card", key: label },
    React.createElement("span", null, label),
    React.createElement("strong", null, value)
  );
}

function floatTraceSummary(summary: ProjectDetailFloatTraceSummary) {
  return React.createElement(
    "div",
    { className: "float-trace-summary", "aria-label": "Float trace reconciliation" },
    checklistItem("Dashboard visible Float", formatMetricValue(summary.dashboardVisibleHours)),
    checklistItem("Trace visible rows", formatMetricValue(summary.visibleTraceHours)),
    checklistItem("Raw diagnostic rows", formatMetricValue(summary.rawTraceHours))
  );
}

function formatGeneratedAt(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric"
  }).format(new Date(value));
}

function detailMetricCard(label: string, value: string, source: string) {
  return React.createElement(
    "article",
    { className: "metric-card", key: label },
    React.createElement("span", null, label),
    React.createElement("strong", null, value),
    React.createElement("small", null, source)
  );
}

function monthlyTable(rows: readonly ProjectMonthlyDetailRow[]) {
  return React.createElement(
    "table",
    { className: "projects-table" },
    React.createElement(
      "thead",
      null,
      React.createElement(
        "tr",
        null,
        ["Month", "Sold (£)", "Sold (hrs)", "Allocated (hrs)", "Allocated (£)", "Variance"].map((header) =>
          React.createElement("th", { key: header }, header)
        )
      )
    ),
    React.createElement(
      "tbody",
      null,
      rows.map((row) =>
        React.createElement(
          "tr",
          { key: row.month },
          React.createElement("td", null, formatMonth(row.month)),
          React.createElement("td", null, formatMetricValue(row.soldFee)),
          React.createElement("td", null, formatMetricValue(row.soldHours)),
          React.createElement("td", null, formatMetricValue(row.allocatedHours)),
          React.createElement("td", null, formatMetricValue(row.allocatedValue)),
          React.createElement("td", null, formatMetricValue(row.varianceHours))
        )
      )
    )
  );
}

function roleTable(rows: readonly ProjectRoleDetailRow[]) {
  return React.createElement(
    "table",
    { className: "projects-table" },
    React.createElement(
      "thead",
      null,
      React.createElement(
        "tr",
        null,
        ["Role", "Sold hrs", "Sold £", "Rate £/hr", "Alloc hrs", "Alloc £", "Variance £", "Variance %"].map((header) =>
          React.createElement("th", { key: header }, header)
        )
      )
    ),
    React.createElement(
      "tbody",
      null,
      rows.map((row) =>
        React.createElement(
          "tr",
          { key: row.role },
          React.createElement("td", null, row.role),
          React.createElement("td", null, formatMetricValue(row.soldHours)),
          React.createElement("td", null, formatMetricValue(row.soldFee)),
          React.createElement("td", null, formatMetricValue(row.ratePerHour)),
          React.createElement("td", null, formatMetricValue(row.allocatedHours)),
          React.createElement("td", null, formatMetricValue(row.allocatedValue)),
          React.createElement("td", null, formatMetricValue(row.varianceValue)),
          React.createElement("td", null, formatPercent(row.variancePercent))
        )
      )
    )
  );
}

function floatTraceTable(rows: readonly ProjectFloatTraceRow[]) {
  return React.createElement(
    "table",
    { className: "projects-table" },
    React.createElement(
      "thead",
      null,
      React.createElement(
        "tr",
        null,
        ["Float project", "Task", "Person", "Dept / role", "Dates", "Hours", "Flags"].map((header) =>
          React.createElement("th", { key: header }, header)
        )
      )
    ),
    React.createElement(
      "tbody",
      null,
      rows.map((row, index) =>
        React.createElement(
          "tr",
          { key: `${row.task}:${index}` },
          React.createElement("td", null, row.floatProject),
          React.createElement("td", null, row.task),
          React.createElement("td", null, row.person),
          React.createElement("td", null, row.departmentRole),
          React.createElement("td", null, row.dates),
          React.createElement("td", null, formatMetricValue(row.hours)),
          React.createElement("td", null, row.flags.join(" "))
        )
      )
    )
  );
}

function formatMetricValue(metric: MetricValue): string {
  if (metric.kind === "unsupported") return metric.displayLabel;
  if (metric.kind === "money") {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(metric.value.amountGbp);
  }
  if (metric.kind === "hours") {
    return `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(metric.value)}h`;
  }
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(metric.value);
}

function formatPercent(metric: MetricValue): string {
  if (metric.kind !== "count") return formatMetricValue(metric);
  return `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(metric.value)}%`;
}

function formatMonth(month: string): string {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;
  const date = new Date(`${month}-01T00:00:00.000Z`);
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function scopeLine(contract: DashboardDisplayContract) {
  const scope = contract.scope;
  return React.createElement(
    "p",
    { className: "detail-scope" },
    [scope.office, scope.from, scope.to, scope.department, scope.role, scope.client].filter(Boolean).join(" / ")
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
