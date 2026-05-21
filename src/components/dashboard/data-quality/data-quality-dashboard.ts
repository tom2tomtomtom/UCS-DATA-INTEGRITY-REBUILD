import React from "react";

import type { DashboardDisplayContract, NamedScenarioReport, NamedScenarioResult, ReconciliationCheck, SourceWarning } from "../../../lib";
import { buildNamedScenarioReport } from "../../../lib";

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

  return React.createElement(
    "section",
    { className: "quality-surface" },
    React.createElement("h2", null, "Data Quality"),
    React.createElement(
      "div",
      { className: "quality-status-grid" },
      statusCard("FAIL", contract.reconciliation.filter((check) => check.status === "FAIL").length),
      statusCard("WARN", contract.reconciliation.filter((check) => check.status !== "PASS" && check.status !== "FAIL").length + contract.warnings.length),
      statusCard("UNRESOLVED", unresolvedScenarioCount)
    ),
    React.createElement("h3", null, "Named user checks"),
    React.createElement(
      "ul",
      { className: "evidence-list" },
      scenarioReport.scenarios.map((scenario) => namedScenarioCard(scenario))
    ),
    React.createElement("h3", null, "Open evidence"),
    React.createElement("ul", { className: "evidence-list" }, warningItems),
    React.createElement(
      "p",
      { className: "detail-scope" },
      "Needs Codex for repo changes, browser testing, source mutation, sync, deployment, or stakeholder communication."
    )
  );
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
