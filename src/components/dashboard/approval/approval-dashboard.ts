import React from "react";

import type { DashboardDisplayContract, MetricValue } from "../../../lib";
import { buildApprovalOutputFromDisplayContract } from "../../../lib";

export function ApprovalDashboard({ contract }: { contract: DashboardDisplayContract }) {
  const approval = buildApprovalOutputFromDisplayContract(contract);

  return React.createElement(
    "section",
    { className: "approval-surface" },
    React.createElement("h2", null, "Approval Audit"),
    React.createElement(
      "div",
      { className: "quality-status-grid" },
      metricCard("Rows reviewed", approval.rows.length),
      metricCard("Warnings", approval.warnings.length + approval.reconciliation.length),
      metricCard("Confidence", approval.confidence)
    ),
    React.createElement("h3", null, "Approval rows"),
    React.createElement(
      "ul",
      { className: "evidence-list" },
      approval.rows.map((row) =>
        React.createElement(
          "li",
          { key: row.id },
          React.createElement("strong", null, `${row.jobNumber ?? row.rowType}: ${row.canonicalProjectName ?? row.sourceProjectName ?? row.id}`),
          React.createElement("span", null, `Sold ${formatMetric(row.totals.soldFee)} with ${row.sourceTrace.length} source trace refs`)
        )
      )
    ),
    React.createElement("h3", null, "Approval laws"),
    React.createElement(
      "ul",
      { className: "evidence-list" },
      ["unsupported is not zero", "source-only rows remain visible", "source trace is required", "Needs Codex when code, browser, sync, deploy, or stakeholder action is needed"].map((law) =>
        React.createElement("li", { key: law }, React.createElement("strong", null, law), React.createElement("span", null, "Visible in this approval surface."))
      )
    )
  );
}

function metricCard(label: string, value: string | number) {
  return React.createElement(
    "article",
    { className: "metric-card", key: label },
    React.createElement("span", null, label),
    React.createElement("strong", null, String(value))
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
    return `${value.value}h`;
  }

  return String(value.value);
}
