import React from "react";

import type {
  DashboardDisplayContract,
  DashboardProjectRow,
  NamedScenarioReport,
  NamedScenarioResult,
  ReconciliationCheck,
  SourceWarning
} from "../../../lib";
import { buildNamedScenarioReport, scopedHref } from "../../../lib";

export function DataQualityDashboard({
  contract,
  scenarioReport = buildNamedScenarioReport()
}: {
  contract: DashboardDisplayContract;
  scenarioReport?: NamedScenarioReport;
}) {
  const warningItems = [
    ...contract.warnings.map((warning) => warningCard(warning)),
    ...contract.reconciliation.map((check) => checkCard(check))
  ];
  const unresolvedScenarioCount = scenarioReport.scenarios.filter(isUnresolvedScenario).length;
  const affectedRows = contract.visibleRows.filter(
    (row) => row.warnings.length > 0 || row.rowType !== "matched"
  );
  const floatChecks = contract.reconciliation.filter(
    (check) => check.sourceRefs.some((sourceRef) => sourceRef.source === "float") || check.code.includes("FLOAT")
  );

  return React.createElement(
    "section",
    { className: "quality-surface" },
    React.createElement("h2", null, "Data Quality"),
    React.createElement(
      "nav",
      { className: "quality-tabs", "aria-label": "Data quality sections" },
      qualityTab("All issues", "#all-issues", true),
      qualityTab("Named checks", "#named-checks"),
      qualityTab("Float", "#float-issues"),
      qualityTab("Affected rows", "#affected-rows"),
      qualityTab("Needs Codex", "#needs-codex")
    ),
    React.createElement(
      "div",
      { className: "quality-status-grid" },
      statusCard("FAIL", contract.reconciliation.filter((check) => check.status === "FAIL").length),
      statusCard("WARN", contract.reconciliation.filter((check) => check.status !== "PASS" && check.status !== "FAIL").length + contract.warnings.length),
      statusCard("UNRESOLVED", unresolvedScenarioCount)
    ),
    React.createElement("h3", { id: "named-checks" }, "Named user checks"),
    React.createElement(
      "ul",
      { className: "evidence-list" },
      scenarioReport.scenarios.map((scenario) => namedScenarioCard(scenario))
    ),
    React.createElement("h3", { id: "float-issues" }, "Float issues"),
    React.createElement("ul", { className: "evidence-list" }, floatChecks.map((check) => checkCard(check))),
    React.createElement("h3", { id: "affected-rows" }, "Affected dashboard rows"),
    React.createElement("ul", { className: "evidence-list" }, affectedRows.map((row) => affectedRowCard(row))),
    React.createElement("h3", { id: "all-issues" }, "Open evidence"),
    React.createElement("ul", { className: "evidence-list" }, warningItems),
    React.createElement(
      "section",
      { className: "needs-codex-panel", id: "needs-codex" },
      React.createElement("h3", null, "Needs Codex"),
      React.createElement(
        "p",
        null,
        "Use Codex for repo changes, browser testing, source mutation, sync, deployment, or stakeholder communication."
      )
    )
  );
}

function qualityTab(label: string, href: string, active = false) {
  return React.createElement("a", { href, className: active ? "active" : undefined }, label);
}

function namedScenarioCard(scenario: NamedScenarioResult) {
  const firstWarn = scenario.checks.find((check) => check.status === "warn");
  const firstCheck = firstWarn ?? scenario.checks[0];
  const message = [
    `${scenario.owner}: ${scenario.classification}`,
    `Approval ${scenario.approvalStatus}`,
    `Scope ${scopeLabel(scenario)}`,
    resultLabel("Display", scenario.displayContractResult.status),
    resultLabel("UI", scenario.uiSurfaceResult.status),
    resultLabel("CSV", scenario.csvResult.status),
    resultLabel("Chat", scenario.chatEvidenceResult.status),
    sourceRefLabel(scenario),
    firstCheck?.evidence,
    scenario.nextHumanAction
  ].filter(Boolean).join(" ");

  return React.createElement(
    "li",
    { key: scenario.id },
    React.createElement("strong", null, `${scenario.status.toUpperCase()}: ${scenario.name}`),
    React.createElement("span", null, message)
  );
}

function scopeLabel(scenario: NamedScenarioResult): string {
  const scope = scenario.scope;
  const slice = [
    scope.department === undefined ? undefined : `department=${scope.department}`,
    scope.client === undefined ? undefined : `client=${scope.client}`,
    scope.jobNumber === undefined ? undefined : `job=${scope.jobNumber}`
  ].filter(Boolean).join(",");
  return `${scope.office} ${scope.from} to ${scope.to}${slice === "" ? "" : ` ${slice}`}`;
}

function resultLabel(label: string, status: string): string {
  return `${label} ${status}`;
}

function sourceRefLabel(scenario: NamedScenarioResult): string | undefined {
  if (scenario.sourceSnapshotRefs.length === 0) return undefined;

  return `Source refs ${scenario.sourceSnapshotRefs.length}`;
}

function isUnresolvedScenario(scenario: NamedScenarioResult): boolean {
  return scenario.status === "warn" && (scenario.warningEvidence?.classification === "unresolved" || scenario.warningEvidence === undefined);
}

function statusCard(label: string, count: number) {
  return React.createElement(
    "article",
    { className: "metric-card", key: label },
    React.createElement("span", null, label),
    React.createElement("strong", null, String(count))
  );
}

function warningCard(warning: SourceWarning) {
  return React.createElement(
    "li",
    { key: warning.id },
    React.createElement("strong", null, `${warning.status}: ${warning.code}`),
    React.createElement("span", null, `${warning.owner}: ${warning.message}`)
  );
}

function checkCard(check: ReconciliationCheck) {
  return React.createElement(
    "li",
    { key: check.id },
    React.createElement("strong", null, `${check.status}: ${check.code}`),
    React.createElement("span", null, check.message ?? "Contract reconciliation check")
  );
}

function affectedRowCard(row: DashboardProjectRow) {
  const href =
    row.jobNumber === undefined
      ? scopedHref("/dashboard/projects", row.scope)
      : scopedHref(`/dashboard/projects/${row.jobNumber}`, row.scope, { jobNumber: row.jobNumber });

  return React.createElement(
    "li",
    { key: row.id },
    React.createElement(
      "strong",
      null,
      `${row.rowType.toUpperCase()}: ${row.jobNumber ?? "No job number"}`
    ),
    React.createElement(
      "span",
      null,
      `${row.canonicalClient ?? row.sourceClient ?? "Unknown client"} - ${row.canonicalProjectName ?? row.sourceProjectName ?? row.id}`
    ),
    React.createElement("a", { href }, "Open row")
  );
}
