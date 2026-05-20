import React from "react";

import type { DashboardDisplayContract, DashboardProjectRow, MetricValue, ReconciliationCheck } from "../../../lib";
import { scopedHref } from "../../../lib";

const detailMetrics = [
  ["Sold (fee sheet)", "soldFee"],
  ["Sold hours", "soldHours"],
  ["Pipeline", "pipelineFee"],
  ["Production revenue", "productionRevenue"],
  ["Float hours", "floatHours"]
] as const;

export function ProjectDetail({
  contract,
  jobNumber
}: {
  contract: DashboardDisplayContract;
  jobNumber: string;
}) {
  const row = contract.visibleRows.find((candidate) => candidate.jobNumber === jobNumber);
  const checks = contract.reconciliation.filter((check) => check.scope.jobNumber === jobNumber);

  if (row === undefined) {
    return React.createElement("section", { className: "detail-surface" }, `No contract row for ${jobNumber}`);
  }

  return React.createElement(
    "section",
    { className: "detail-surface" },
    React.createElement(
      "div",
      { className: "detail-heading" },
      React.createElement("div", null, React.createElement("h2", null, `${row.canonicalClient ?? row.sourceClient ?? "Unknown"} / ${jobNumber}`), scopeLine(contract)),
      React.createElement("a", { href: scopedHref("/dashboard/projects", contract.scope, { jobNumber }) }, "Back to Projects")
    ),
    React.createElement(
      "div",
      { className: "metric-grid" },
      detailMetrics.map(([label, metric]) =>
        React.createElement(
          "article",
          { className: "metric-card", key: metric },
          React.createElement("span", null, label),
          React.createElement("strong", null, formatMetric(row.totals[metric]))
        )
      )
    ),
    React.createElement("h3", null, "Float reconciliation"),
    checks.length === 0
      ? React.createElement("p", null, "No Float reconciliation warnings for this project in the active scope.")
      : React.createElement("ul", { className: "evidence-list" }, checks.map((check) => checkItem(check))),
    React.createElement("h3", null, "Role allocation"),
    React.createElement("p", null, "No role allocation data available for this project in the active scope."),
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
    return `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(value.value)}h`;
  }

  return String(value.value);
}
