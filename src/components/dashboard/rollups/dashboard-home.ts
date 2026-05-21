import React from "react";

import type {
  DashboardDisplayContract,
  DashboardTotals,
  MetricValue,
  ReconciliationCheck,
  RollupDimension,
  RollupRow,
  SourceWarning
} from "../../../lib";
import { scopedHref } from "../../../lib";
import { buildRollupCsvDataUri, buildRollupFooter, type RollupFooter } from "../../../lib/display/rollup-export";
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

export type RollupSortKey =
  | "label"
  | "pipelineFee"
  | "soldFee"
  | "soldHours"
  | "allocatedHours"
  | "unallocatedHours"
  | "totalHours"
  | "allocatedValue"
  | "variancePercent"
  | "status";

export function DashboardHome({
  contract,
  view = "department",
  sortKey = "soldFee",
  sortDir = "desc"
}: {
  contract: DashboardDisplayContract;
  view?: RollupDimension;
  sortKey?: RollupSortKey;
  sortDir?: "asc" | "desc";
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
    primaryRollupTable(contract, activeRollup.title, activeRollup.label, contract.rollups[activeRollup.key], view, sortKey, sortDir),
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
  const roleSectionWarnings = roleSectionHealthWarnings(contract);

  return React.createElement(
    "section",
    { className: "sheet-health-panel", "aria-label": "Sheet health" },
    React.createElement(
      "h2",
      null,
      `Sheet health - ${contract.warnings.length + reconciliationWarnings.length} source checks need attention`
    ),
    React.createElement(
      "p",
      null,
      "Source-sheet health is diagnostic only. Flagged rows still surface, and unsupported checks stay visible as traceability evidence."
    ),
    React.createElement(
      "details",
      null,
      React.createElement(
        "summary",
        null,
        `${contract.warnings.length} read/source warnings - sheet unreachable, layout drift, or source evidence gaps`
      ),
      healthWarningList(contract, contract.warnings)
    ),
    React.createElement(
      "details",
      null,
      React.createElement(
        "summary",
        null,
        `${reconciliationWarnings.length} monthly/source reconciliation warnings - source totals disagree across layers`
      ),
      healthCheckList(contract, reconciliationWarnings)
    ),
    React.createElement(
      "details",
      null,
      React.createElement(
        "summary",
        null,
        `${roleSectionWarnings.length} role-section reconciliation warnings - role-detail rows or attribution limits need review`
      ),
      healthList(roleSectionWarnings)
    ),
    React.createElement(
      "p",
      { className: "detail-scope" },
      "These rows still surface. Treat this as a traceability warning: either the source layout needs fixing, or the parser/check is looking at the wrong source range."
    )
  );
}

function roleSectionHealthWarnings(contract: DashboardDisplayContract): string[] {
  const roleWarnings = contract.rollups.byRole.flatMap((row) =>
    row.unsupported.map((unsupported) => `${row.label}: ${unsupported.metric} ${unsupported.displayLabel}`)
  );

  return [...new Set(roleWarnings)];
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
  rows: readonly RollupRow[],
  view: RollupDimension,
  sortKey: RollupSortKey,
  sortDir: "asc" | "desc"
) {
  const sortedRows = sortRollupRows(rows, sortKey, sortDir);

  return React.createElement(
    "section",
    { className: "rollup-table primary-rollup-table", "aria-label": `${title} table` },
    React.createElement(
      "div",
      { className: "table-title" },
      React.createElement("h2", null, title),
      React.createElement(
        "a",
        {
          className: "download-link",
          download: `ucs-dashboard-${view}-rollup.csv`,
          href: buildRollupCsvDataUri(sortedRows)
        },
        "Download rollup CSV"
      )
    ),
    rollupTableElement(sortedRows, firstColumnLabel, { contract, view, sortKey, sortDir, footer: buildRollupFooter(sortedRows) })
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

function rollupTableElement(
  rows: readonly RollupRow[],
  firstColumnLabel: string,
  sortState?: {
    readonly contract: DashboardDisplayContract;
    readonly view: RollupDimension;
    readonly sortKey: RollupSortKey;
    readonly sortDir: "asc" | "desc";
    readonly footer?: RollupFooter;
  }
) {
  return React.createElement(
    "table",
    null,
    React.createElement(
      "thead",
      null,
      React.createElement(
        "tr",
        null,
        rollupHeader(firstColumnLabel, "label", sortState),
        rollupHeader("Pipeline (£)", "pipelineFee", sortState),
        rollupHeader("Sold (£)", "soldFee", sortState),
        rollupHeader("Sold (hrs)", "soldHours", sortState),
        rollupHeader("Allocated (hrs)", "allocatedHours", sortState),
        rollupHeader("Unallocated (hrs)", "unallocatedHours", sortState),
        rollupHeader("Total (hrs)", "totalHours", sortState),
        rollupHeader("Allocated (£)", "allocatedValue", sortState),
        rollupHeader("Variance %", "variancePercent", sortState),
        rollupHeader("Status", "status", sortState)
      )
    ),
    React.createElement(
      "tbody",
      null,
      rows.length === 0
        ? React.createElement("tr", null, React.createElement("td", { colSpan: 10 }, "No rows for this scope"))
        : rows.map((row) => rollupRow(row))
    ),
    sortState?.footer === undefined ? null : rollupFooterElement(sortState.footer)
  );
}

function rollupHeader(
  label: string,
  key: RollupSortKey,
  sortState:
    | {
        readonly contract: DashboardDisplayContract;
        readonly view: RollupDimension;
        readonly sortKey: RollupSortKey;
        readonly sortDir: "asc" | "desc";
      }
    | undefined
) {
  if (sortState === undefined) {
    return React.createElement("th", null, label);
  }

  const active = sortState.sortKey === key;
  const nextDir = active && sortState.sortDir === "asc" ? "desc" : "asc";
  const marker = active ? (sortState.sortDir === "asc" ? " ▲" : " ▼") : "";

  return React.createElement(
    "th",
    null,
    React.createElement("a", { href: rollupSortHref(sortState.contract, sortState.view, key, nextDir) }, `${label}${marker}`)
  );
}

function rollupSortHref(
  contract: DashboardDisplayContract,
  view: RollupDimension,
  sortKey: RollupSortKey,
  sortDir: "asc" | "desc"
): string {
  const baseHref = scopedHref("/dashboard", contract.scope);
  const separator = baseHref.includes("?") ? "&" : "?";

  return `${baseHref}${separator}view=${view}&sort=${sortKey}&dir=${sortDir}`;
}

function sortRollupRows(rows: readonly RollupRow[], sortKey: RollupSortKey, sortDir: "asc" | "desc"): RollupRow[] {
  return [...rows].sort((left, right) => {
    const result = compareRollupRows(left, right, sortKey);
    return sortDir === "asc" ? result : -result;
  });
}

function compareRollupRows(left: RollupRow, right: RollupRow, sortKey: RollupSortKey): number {
  if (sortKey === "label") return left.label.localeCompare(right.label);
  if (sortKey === "status") return statusSortValue(left).localeCompare(statusSortValue(right));

  return rollupSortNumber(left, sortKey) - rollupSortNumber(right, sortKey);
}

function rollupSortNumber(row: RollupRow, sortKey: RollupSortKey): number {
  if (sortKey === "pipelineFee") return metricNumber(row.totals.pipelineFee);
  if (sortKey === "soldFee") return metricNumber(row.totals.soldFee);
  if (sortKey === "soldHours") return metricNumber(row.totals.soldHours);
  if (sortKey === "allocatedHours") return metricNumber(allocatedHoursMetric(row));
  if (sortKey === "unallocatedHours") return metricNumber(unallocatedHoursMetric(row));
  if (sortKey === "totalHours") return metricNumber(row.totals.floatHours);
  if (sortKey === "allocatedValue") return allocatedValueNumber(row);
  return variancePercentNumber(row);
}

function allocatedValueNumber(row: RollupRow): number {
  const soldHours = metricNumber(row.totals.soldHours);
  const soldFee = metricNumber(row.totals.soldFee);
  const allocatedHours = metricNumber(allocatedHoursMetric(row));

  return soldHours <= 0 || allocatedHours <= 0 ? 0 : (soldFee / soldHours) * allocatedHours;
}

function variancePercentNumber(row: RollupRow): number {
  const soldHours = metricNumber(row.totals.soldHours);
  const allocatedHours = metricNumber(row.totals.floatHours);

  if (soldHours === 0) return allocatedHours > 0 ? Number.POSITIVE_INFINITY : 0;
  return (allocatedHours - soldHours) / soldHours;
}

function statusSortValue(row: RollupRow): string {
  return statusFor(metricNumber(row.totals.soldHours), metricNumber(row.totals.floatHours), row.unsupported.length);
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

function rollupFooterElement(footer: RollupFooter) {
  return React.createElement(
    "tfoot",
    null,
    React.createElement(
      "tr",
      { className: "projects-footer" },
      React.createElement("td", null, "Total"),
      React.createElement("td", null, formatMetric(footer.pipelineFee)),
      React.createElement("td", null, formatMetric(footer.soldFee)),
      React.createElement("td", null, formatMetric(footer.soldHours)),
      React.createElement("td", null, formatMetric(footer.allocatedHours)),
      React.createElement("td", null, formatMetric(footer.unallocatedHours)),
      React.createElement("td", null, formatMetric(footer.totalHours)),
      React.createElement("td", null, formatMetric(footer.allocatedValue)),
      React.createElement("td", null, formatFooterVariance(footer.variancePercent)),
      React.createElement("td", null, React.createElement("span", { className: `status-badge ${footer.status.toLowerCase()}` }, footer.status))
    )
  );
}

function formatFooterVariance(value: MetricValue): string {
  if (value.kind === "count" && !Number.isFinite(value.value)) return "Uncosted";
  if (value.kind === "count") return `${formatNumber(value.value)}%`;
  return formatMetric(value);
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

function healthWarningList(contract: DashboardDisplayContract, warnings: readonly SourceWarning[]) {
  return healthList(warnings.map((warning) => healthWarningItem(contract, warning)));
}

function healthCheckList(contract: DashboardDisplayContract, checks: readonly ReconciliationCheck[]) {
  return healthList(checks.map((check) => healthCheckItem(contract, check)));
}

function healthWarningItem(contract: DashboardDisplayContract, warning: SourceWarning) {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement("strong", null, warning.code),
    `: ${warning.message} `,
    React.createElement("a", { href: scopedHref("/dashboard/data-quality", contract.scope) }, "Review evidence")
  );
}

function healthCheckItem(contract: DashboardDisplayContract, check: ReconciliationCheck) {
  const href =
    check.scope.jobNumber === undefined
      ? scopedHref("/dashboard/data-quality", contract.scope)
      : scopedHref(`/dashboard/projects/${check.scope.jobNumber}`, check.scope);

  return React.createElement(
    React.Fragment,
    null,
    React.createElement("strong", null, check.code),
    `: ${check.message ?? check.label} `,
    React.createElement("a", { href }, "Open evidence")
  );
}

function healthList(items: readonly React.ReactNode[]) {
  return React.createElement(
    "ul",
    null,
    items.length === 0
      ? React.createElement("li", null, "No warnings for this source layer.")
      : items.map((item, index) => React.createElement("li", { key: index }, item))
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
