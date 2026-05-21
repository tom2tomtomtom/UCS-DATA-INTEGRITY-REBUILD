import React from "react";

import type { DashboardDisplayContract, DashboardTotals, MetricValue, RollupDimension, RollupRow } from "../../../lib";
import { scopedHref } from "../../../lib";
import { TimeFilterControls } from "../time-filter-controls";

const heroMetrics = [
  ["Total sold", "soldFee"],
  ["Sold hours", "soldHours"],
  ["Pipeline", "pipelineFee"],
  ["Production revenue", "productionRevenue"],
  ["Float hours", "floatHours"]
] as const satisfies readonly (readonly [string, keyof DashboardTotals])[];

const rollupSections = [
  ["Department Rollup", "byDepartment"],
  ["Role Rollup", "byRole"],
  ["Month Rollup", "byMonth"],
  ["Client Rollup", "byClient"]
] as const;

const activeRollupConfig = {
  department: { key: "byDepartment", label: "Department", title: "Department Rollup" },
  month: { key: "byMonth", label: "Month", title: "Month Rollup" },
  role: { key: "byRole", label: "Role", title: "Role Rollup" },
  client: { key: "byClient", label: "Client", title: "Client Rollup" }
} as const satisfies Record<
  RollupDimension,
  { key: keyof DashboardDisplayContract["rollups"]; label: string; title: string }
>;

export function DashboardHome({
  contract,
  view = "department"
}: {
  contract: DashboardDisplayContract;
  view?: RollupDimension;
}) {
  const activeRollup = activeRollupConfig[view];

  return React.createElement(
    "div",
    { className: "dashboard-home" },
    approvalStateCard(contract),
    freshnessCard(contract),
    sheetHealthPanel(contract),
    soldAllocatedHeader(contract, view),
    React.createElement(
      "section",
      { className: "kpi-grid", "aria-label": "Headline KPIs" },
      totalSoldCard(contract),
      confidenceCard(contract),
      dataCoverageCard(contract)
    ),
    floatWarningsCard(contract),
    lowerThanFloatDisclosure(contract),
    departmentHoursChart(contract),
    primaryRollupTable(contract, activeRollup.title, activeRollup.label, contract.rollups[activeRollup.key]),
    React.createElement(
      "section",
      { className: "metric-grid", "aria-label": "Source stream metrics" },
      heroMetrics.slice(1).map(([label, metric]) => metricCard(label, contract.heroTotals[metric], metric))
    ),
    React.createElement(
      "section",
      { className: "rollup-grid" },
      rollupSections.slice(1).map(([title, key]) => rollupTable(title, contract.rollups[key]))
    ),
    React.createElement(
      "section",
      { className: "confidence-panel" },
      React.createElement("strong", null, "Confidence"),
      React.createElement("span", null, contract.confidence),
      React.createElement("span", null, `${contract.unsupported.length} unsupported metrics`)
    )
  );
}

function approvalStateCard(contract: DashboardDisplayContract) {
  const reconciliationWarningCount = contract.reconciliation.filter((check) => check.status !== "PASS").length;

  return React.createElement(
    "section",
    { className: "approval-state-card", "aria-label": "Approval and source evidence status" },
    React.createElement("span", { className: "approval-label" }, "Approval state:"),
    React.createElement("strong", null, "No cutover approved"),
    React.createElement(
      "div",
      { className: "source-status-chips" },
      statusChip("Source evidence visible"),
      statusChip(countLabel(contract.warnings.length, "source warning")),
      statusChip(countLabel(reconciliationWarningCount, "reconciliation warning")),
      statusChip(countLabel(contract.unsupported.length, "unsupported headline metric"))
    ),
    React.createElement("p", null, "Warnings remain source evidence, not approval.")
  );
}

function freshnessCard(contract: DashboardDisplayContract) {
  return React.createElement(
    "section",
    { className: "freshness-card", "aria-label": "Data freshness" },
    React.createElement("strong", null, "Source evidence captured"),
    React.createElement(
      "span",
      null,
      `Display contract generated ${formatGeneratedAt(contract.generatedAt)} from fixture source evidence.`
    )
  );
}

function sheetHealthPanel(contract: DashboardDisplayContract) {
  const reconciliationWarnings = contract.reconciliation.filter((check) => check.status !== "PASS");

  return React.createElement(
    "section",
    { className: "sheet-health-panel", "aria-label": "Sheet health" },
    React.createElement(
      "h2",
      null,
      `Sheet health - ${contract.warnings.length + reconciliationWarnings.length} source checks need attention`
    ),
    React.createElement(
      "details",
      null,
      React.createElement("summary", null, `${contract.warnings.length} source warnings`),
      healthList(contract.warnings.map((warning) => `${warning.code}: ${warning.message}`))
    ),
    React.createElement(
      "details",
      null,
      React.createElement("summary", null, `${reconciliationWarnings.length} Float reconciliation warnings`),
      healthList(reconciliationWarnings.map((check) => `${check.code}: ${check.message ?? check.label}`))
    )
  );
}

function soldAllocatedHeader(contract: DashboardDisplayContract, view: RollupDimension) {
  return React.createElement(
    "section",
    { className: "sold-allocated-header" },
    React.createElement(
      "div",
      null,
      React.createElement("h2", null, "Sold vs Allocated"),
      React.createElement("p", null, `${formatDate(contract.scope.from)} to ${formatDate(contract.scope.to)}`),
      React.createElement(
        "p",
        null,
        "Four independent sources of truth: Fee sheets, Pipeline, Production revenue, and Float. Where they disagree, the discrepancy is the signal."
      )
    ),
    React.createElement(
      "nav",
      { className: "view-toggle-row", "aria-label": "Rollup view" },
      viewToggle("By Department", "department", contract, view),
      viewToggle("By Month", "month", contract, view),
      viewToggle("By Role", "role", contract, view),
      viewToggle("By Client", "client", contract, view)
    ),
    React.createElement(TimeFilterControls, { basePath: "/dashboard", extraParams: { view }, scope: contract.scope })
  );
}

function totalSoldCard(contract: DashboardDisplayContract) {
  return React.createElement(
    "article",
    { className: "metric-card kpi-card" },
    React.createElement("span", null, "Total sold"),
    React.createElement("strong", null, formatMetric(contract.heroTotals.soldFee)),
    React.createElement("small", null, "Fee sheets plus supported production revenue evidence")
  );
}

function confidenceCard(contract: DashboardDisplayContract) {
  const counts = confidenceCounts(contract);
  const total = Math.max(counts.high + counts.medium + counts.low, 1);

  return React.createElement(
    "article",
    { className: "metric-card kpi-card" },
    React.createElement("span", null, "Confidence"),
    React.createElement(
      "div",
      { className: "confidence-bar", "aria-label": `High ${counts.high}, medium ${counts.medium}, low ${counts.low}` },
      React.createElement("i", { className: "confidence-high", style: { width: `${(counts.high / total) * 100}%` } }),
      React.createElement("i", { className: "confidence-medium", style: { width: `${(counts.medium / total) * 100}%` } }),
      React.createElement("i", { className: "confidence-low", style: { width: `${(counts.low / total) * 100}%` } })
    ),
    React.createElement("small", null, `${counts.high} High · ${counts.medium} Medium · ${counts.low} Low`)
  );
}

function dataCoverageCard(contract: DashboardDisplayContract) {
  const soldRows = contract.visibleRows.filter((row) => metricNumber(row.totals.soldFee) > 0);
  const matchedRows = soldRows.filter((row) => metricNumber(row.totals.floatHours) > 0);
  const percentage = soldRows.length === 0 ? 0 : Math.round((matchedRows.length / soldRows.length) * 100);

  return React.createElement(
    "article",
    { className: "metric-card kpi-card" },
    React.createElement("span", null, "Data coverage"),
    React.createElement("strong", null, `${percentage}%`),
    React.createElement("small", null, "of sold projects with visible Float hours")
  );
}

function floatWarningsCard(contract: DashboardDisplayContract) {
  const warnings = contract.reconciliation.filter((check) => check.status !== "PASS");

  return React.createElement(
    "section",
    { className: "float-warning-card" },
    React.createElement("span", null, "Float sync warnings"),
    React.createElement("strong", null, `${warnings.length} checks`),
    React.createElement("a", { href: scopedHref("/dashboard/data-quality", contract.scope) }, "View details")
  );
}

function lowerThanFloatDisclosure(contract: DashboardDisplayContract) {
  const warnings = contract.reconciliation.filter((check) => check.status !== "PASS");

  return React.createElement(
    "details",
    { className: "float-explainer" },
    React.createElement("summary", null, "Why is this lower than Float?"),
    React.createElement(
      "ul",
      null,
      warnings.length === 0
        ? React.createElement("li", null, "No current raw/cache/visible Float mismatch is present in this contract.")
        : warnings.slice(0, 4).map((check) =>
            React.createElement("li", { key: check.id }, check.message ?? check.label)
          )
    )
  );
}

function departmentHoursChart(contract: DashboardDisplayContract) {
  const rows = contract.rollups.byDepartment;
  const maxHours = Math.max(
    1,
    ...rows.flatMap((row) => [metricNumber(row.totals.soldHours), metricNumber(row.totals.floatHours)])
  );

  return React.createElement(
    "section",
    { className: "hours-chart-panel", "aria-label": "Sold vs Allocated Hours by Department" },
    React.createElement("h2", null, "Sold vs Allocated Hours by Department"),
    React.createElement("div", { className: "hours-chart" }, rows.map((row) => chartRow(row, maxHours))),
    React.createElement(
      "div",
      { className: "chart-legend" },
      React.createElement("span", null, "Allocated"),
      React.createElement("span", null, "Sold")
    )
  );
}

function chartRow(row: RollupRow, maxHours: number) {
  const soldHours = metricNumber(row.totals.soldHours);
  const floatHours = metricNumber(row.totals.floatHours);

  return React.createElement(
    "div",
    { className: "hours-chart-row", key: row.id },
    React.createElement("strong", null, row.label),
    React.createElement(
      "div",
      { className: "hours-bars" },
      React.createElement("i", {
        className: "allocated-bar",
        title: `Allocated ${formatHoursValue(floatHours)}`,
        style: { width: `${Math.max(4, (floatHours / maxHours) * 100)}%` }
      }),
      React.createElement("i", {
        className: "sold-bar",
        title: `Sold ${formatHoursValue(soldHours)}`,
        style: { width: `${Math.max(4, (soldHours / maxHours) * 100)}%` }
      })
    ),
    React.createElement("span", null, `${formatHoursValue(floatHours)} / ${formatHoursValue(soldHours)}`)
  );
}

function primaryRollupTable(
  contract: DashboardDisplayContract,
  title: string,
  firstColumnLabel: string,
  rows: readonly RollupRow[]
) {
  return React.createElement(
    "section",
    { className: "rollup-table primary-rollup-table", "aria-label": `${title} table` },
    React.createElement("div", { className: "table-title" }, React.createElement("h2", null, title)),
    rollupTableElement(rows, firstColumnLabel)
  );
}

function statusChip(label: string) {
  return React.createElement("span", { className: "source-status-chip", key: label }, label);
}

function metricCard(label: string, value: MetricValue, key: string) {
  return React.createElement(
    "article",
    { className: "metric-card", key },
    React.createElement("span", null, label),
    React.createElement("strong", null, formatMetric(value))
  );
}

function rollupTable(title: string, rows: readonly RollupRow[]) {
  return React.createElement(
    "article",
    { className: "rollup-table", key: title },
    React.createElement("div", { className: "table-title" }, React.createElement("h2", null, title)),
    rollupTableElement(rows, "Name")
  );
}

function rollupTableElement(rows: readonly RollupRow[], firstColumnLabel: string) {
  return React.createElement(
    "table",
    null,
    React.createElement(
      "thead",
      null,
      React.createElement(
        "tr",
        null,
        React.createElement("th", null, firstColumnLabel),
        React.createElement("th", null, "Pipeline (£)"),
        React.createElement("th", null, "Sold (£)"),
        React.createElement("th", null, "Sold (hrs)"),
        React.createElement("th", null, "Allocated (hrs)"),
        React.createElement("th", null, "Unallocated (hrs)"),
        React.createElement("th", null, "Total (hrs)"),
        React.createElement("th", null, "Allocated (£)"),
        React.createElement("th", null, "Variance %"),
        React.createElement("th", null, "Status")
      )
    ),
    React.createElement(
      "tbody",
      null,
      rows.length === 0
        ? React.createElement("tr", null, React.createElement("td", { colSpan: 10 }, "No rows for this scope"))
        : rows.map((row) => rollupRow(row))
    )
  );
}

function rollupRow(row: RollupRow) {
  const soldHours = metricNumber(row.totals.soldHours);
  const totalHours = metricNumber(row.totals.floatHours);
  const allocatedHours = metricNumber(allocatedHoursMetric(row));

  return React.createElement(
    "tr",
    { key: row.id },
    React.createElement(
      "td",
      null,
      React.createElement("a", { href: scopedHref("/dashboard/projects", row.scope) }, row.label)
    ),
    React.createElement("td", null, formatMetric(row.totals.pipelineFee)),
    React.createElement("td", null, formatMetric(row.totals.soldFee)),
    React.createElement("td", null, formatMetric(row.totals.soldHours)),
    React.createElement("td", null, formatMetric(allocatedHoursMetric(row))),
    React.createElement("td", null, formatUnallocatedHours(row)),
    React.createElement("td", null, formatMetric(row.totals.floatHours)),
    React.createElement("td", null, allocatedValueLabel(row, allocatedHours)),
    React.createElement("td", null, variancePercent(soldHours, totalHours)),
    React.createElement("td", null, statusBadge(soldHours, totalHours, row.unsupported.length))
  );
}

function allocatedHoursMetric(row: RollupRow): MetricValue {
  return row.floatBreakdown?.allocatedHours ?? unsupportedMetric("allocatedHours", row);
}

function unallocatedHoursMetric(row: RollupRow): MetricValue {
  return row.floatBreakdown?.unallocatedHours ?? unsupportedMetric("unallocatedHours", row);
}

function formatUnallocatedHours(row: RollupRow): string {
  const label = formatMetric(unallocatedHoursMetric(row));

  if (row.floatBreakdown?.splitStatus !== "partial") {
    return label;
  }

  return `${label} + unclassified`;
}

function allocatedValueLabel(row: RollupRow, allocatedHours: number): string {
  const soldHours = metricNumber(row.totals.soldHours);
  const soldFee = metricNumber(row.totals.soldFee);

  if (soldHours <= 0 || allocatedHours <= 0) {
    return "Unsupported";
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format((soldFee / soldHours) * allocatedHours);
}

function unsupportedMetric(metric: string, row: RollupRow): MetricValue {
  return {
    kind: "unsupported",
    metric,
    scope: row.scope,
    source: "float",
    reason: "Float allocation split is not present on this display row.",
    displayLabel: "Unsupported",
    severity: "info"
  };
}

function healthList(items: readonly string[]) {
  return React.createElement(
    "ul",
    null,
    items.length === 0
      ? React.createElement("li", null, "No warnings for this source layer.")
      : items.map((item) => React.createElement("li", { key: item }, item))
  );
}

function viewToggle(
  label: string,
  view: RollupDimension,
  contract: DashboardDisplayContract,
  activeView: RollupDimension
) {
  const active = view === activeView;
  const baseHref = scopedHref("/dashboard", contract.scope);
  const separator = baseHref.includes("?") ? "&" : "?";

  return React.createElement(
    "a",
    {
      className: active ? "active" : undefined,
      href: `${baseHref}${separator}view=${view}`,
      "aria-current": active ? "page" : undefined
    },
    label
  );
}

function statusBadge(soldHours: number, allocatedHours: number, unsupportedCount: number) {
  const label = statusFor(soldHours, allocatedHours, unsupportedCount);

  return React.createElement("span", { className: `status-badge ${label.toLowerCase()}` }, label);
}

function statusFor(soldHours: number, allocatedHours: number, unsupportedCount: number): string {
  if (unsupportedCount > 0 && allocatedHours === 0) return "Warn";
  if (soldHours === 0 && allocatedHours > 0) return "Uncosted";
  if (allocatedHours > soldHours * 1.15) return "Over";
  if (allocatedHours < soldHours * 0.7) return "Gap";
  return "OK";
}

function variancePercent(soldHours: number, allocatedHours: number): string {
  if (soldHours === 0) return allocatedHours > 0 ? "Uncosted" : "0.0%";

  return `${(((allocatedHours - soldHours) / soldHours) * 100).toFixed(1)}%`;
}

function formatMetric(value: MetricValue): string {
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

function metricNumber(value: MetricValue): number {
  if (value.kind === "money") return value.value.amountGbp;
  if (value.kind === "hours" || value.kind === "count") return value.value;
  return 0;
}

function confidenceCounts(contract: DashboardDisplayContract) {
  let high = 0;
  let medium = 0;
  let low = 0;

  for (const row of contract.visibleRows) {
    if (row.warnings.some((warning) => warning.status === "FAIL")) {
      low += 1;
    } else if (row.warnings.length > 0 || row.rowType !== "matched") {
      medium += 1;
    } else {
      high += 1;
    }
  }

  return { high, medium, low };
}

function formatHoursValue(value: number): string {
  return `${formatNumber(value)}h`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1
  }).format(value);
}

function countLabel(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00.000Z`));
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
