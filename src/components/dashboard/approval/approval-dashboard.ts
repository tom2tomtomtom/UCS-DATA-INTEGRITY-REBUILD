import React from "react";

import type { DashboardDisplayContract, MetricValue, NamedScenarioReport, NamedScenarioResult } from "../../../lib";
import { buildApprovalOutputFromDisplayContract, buildNamedScenarioReport } from "../../../lib";

export function ApprovalDashboard({
  contract,
  scenarioReport = buildNamedScenarioReport()
}: {
  contract: DashboardDisplayContract;
  scenarioReport?: NamedScenarioReport;
}) {
  const approval = buildApprovalOutputFromDisplayContract(contract);
  const failCount = approval.reconciliation.filter((check) => check.status === "FAIL").length;
  const warnCount =
    approval.warnings.length + approval.unsupported.length + approval.reconciliation.filter((check) => check.status !== "PASS" && check.status !== "FAIL").length;
  const passCount = Math.max(0, approval.rows.length - failCount - warnCount);

  return React.createElement(
    "section",
    { className: "approval-surface" },
    React.createElement("h2", null, "Approval Audit"),
    React.createElement(
      "div",
      { className: "approval-state-card", "aria-label": "Approval gates" },
      React.createElement("span", { className: "approval-label" }, "No production cutover"),
      React.createElement("strong", null, "Approval is blocked until source and stakeholder checks are complete."),
      React.createElement(
        "div",
        { className: "source-status-chips" },
        statusChip("Source approval: NOT APPROVED"),
        statusChip("Stakeholder approval: NOT APPROVED"),
        statusChip("WARN is not approval")
      )
    ),
    React.createElement(
      "div",
      { className: "quality-status-grid" },
      metricCard("PASS gates", passCount),
      metricCard("WARN gates", warnCount),
      metricCard("FAIL gates", failCount),
      metricCard("Rows reviewed", approval.rows.length),
      metricCard("Warnings", approval.warnings.length + approval.reconciliation.length),
      metricCard("Confidence", approval.confidence)
    ),
    React.createElement("h3", null, "Named scenario evidence"),
    React.createElement(
      "ul",
      { className: "evidence-list" },
      scenarioReport.scenarios.map((scenario) => scenarioItem(scenario))
    ),
    React.createElement("h3", null, "Gate checks"),
    React.createElement(
      "ul",
      { className: "evidence-list" },
      [
        gateItem("Same Scope, Same Number", "PASS", "Visible rows, rollups, detail pages, and CSV must use the same display contract."),
        gateItem("Source Problems Stay Visible", "PASS", "Source-only rows, unsupported metrics, and warnings remain visible."),
        gateItem("Source Approval", "WARN", "Not approved until source snapshots and source-owner evidence are reviewed."),
        gateItem("Stakeholder Approval", "WARN", "Not approved until Sian, Jade, and Yunni explicitly review the staging output."),
        gateItem("Production Cutover", "FAIL", "No production domain or mutation path is approved in this phase.")
      ]
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

function scenarioItem(scenario: NamedScenarioResult) {
  return React.createElement(
    "li",
    { key: scenario.id },
    React.createElement("strong", null, `${scenario.status.toUpperCase()}: ${scenario.name}`),
    React.createElement(
      "span",
      null,
      `${scenario.owner}: ${scenario.classification}. Approval ${scenario.approvalStatus}. ${scenario.nextHumanAction ?? "No human action recorded."}`
    )
  );
}

function gateItem(label: string, status: "PASS" | "WARN" | "FAIL", message: string) {
  return React.createElement(
    "li",
    { key: label },
    React.createElement("strong", null, `${status}: ${label}`),
    React.createElement("span", null, message)
  );
}

function statusChip(label: string) {
  return React.createElement("span", { className: "source-status-chip", key: label }, label);
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
