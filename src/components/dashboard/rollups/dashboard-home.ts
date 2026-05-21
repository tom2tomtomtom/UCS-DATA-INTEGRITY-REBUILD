import React from "react";

import type { DashboardDisplayContract, DashboardTotals, MetricValue, RollupRow } from "../../../lib";
import { scopedHref } from "../../../lib";

const heroMetrics = [
  ["Sold (fee sheet)", "soldFee"],
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

export function DashboardHome({ contract }: { contract: DashboardDisplayContract }) {
  return React.createElement(
    "div",
    { className: "dashboard-home" },
    approvalStateCard(contract),
    React.createElement(
      "section",
      { className: "metric-grid", "aria-label": "Headline metrics" },
      heroMetrics.map(([label, metric]) => metricCard(label, contract.heroTotals[metric], metric))
    ),
    React.createElement(
      "section",
      { className: "rollup-grid" },
      rollupSections.map(([title, key]) => rollupTable(title, contract.rollups[key]))
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
    React.createElement(
      "table",
      null,
      React.createElement(
        "thead",
        null,
        React.createElement(
          "tr",
          null,
          React.createElement("th", null, "Name"),
          React.createElement("th", null, "Sold"),
          React.createElement("th", null, "Sold hours"),
          React.createElement("th", null, "Pipeline"),
          React.createElement("th", null, "Prod rev"),
          React.createElement("th", null, "Status")
        )
      ),
      React.createElement(
        "tbody",
        null,
        rows.length === 0
          ? React.createElement("tr", null, React.createElement("td", { colSpan: 6 }, "No rows for this scope"))
          : rows.map((row) => rollupRow(row))
      )
    )
  );
}

function rollupRow(row: RollupRow) {
  const unsupportedCount = row.unsupported.length;

  return React.createElement(
    "tr",
    { key: row.id },
    React.createElement(
      "td",
      null,
      React.createElement("a", { href: scopedHref("/dashboard/projects", row.scope) }, row.label)
    ),
    React.createElement("td", null, formatMetric(row.totals.soldFee)),
    React.createElement("td", null, formatMetric(row.totals.soldHours)),
    React.createElement("td", null, formatMetric(row.totals.pipelineFee)),
    React.createElement("td", null, formatMetric(row.totals.productionRevenue)),
    React.createElement("td", null, unsupportedCount > 0 ? "Unsupported" : "Supported")
  );
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

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1
  }).format(value);
}

function countLabel(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}
