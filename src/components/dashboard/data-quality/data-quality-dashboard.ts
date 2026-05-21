import React from "react";

import type {
  DashboardDisplayContract,
  DashboardProjectRow,
  MetricValue,
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
  const orphanRevenueRows = contract.visibleRows.filter((row) => row.rowType === "pipeline_only" || row.rowType === "production_revenue_only");
  const archivedRows = contract.visibleRows.filter((row) => row.warnings.some((warning) => warning.code.includes("ARCHIVED")));
  const parserDiagnostics = [
    ...contract.warnings.filter((warning) => warning.source !== "float"),
    ...contract.reconciliation.filter((check) => !check.code.includes("FLOAT") && !check.code.includes("PCS00250") && !check.code.includes("BT_RAW_CACHE"))
  ];
  const chaseRows = buildChaseRows(contract, floatChecks, orphanRevenueRows, parserDiagnostics);

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
      qualityTab("Chase list", "#chase-list"),
      qualityTab("Orphan revenue", "#orphan-revenue"),
      qualityTab("Parser diagnostics", "#parser-diagnostics"),
      qualityTab("Archived", "#archived-source"),
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
    React.createElement("h3", { id: "chase-list" }, "Chase list"),
    chaseRowsTable(chaseRows),
    React.createElement("h3", { id: "orphan-revenue" }, "Orphan revenue"),
    React.createElement("ul", { className: "evidence-list" }, orphanRevenueRows.map((row) => affectedRowCard(row))),
    React.createElement("h3", { id: "parser-diagnostics" }, "Parser diagnostics"),
    React.createElement("ul", { className: "evidence-list" }, parserDiagnostics.map((item) => diagnosticCard(item))),
    React.createElement("h3", { id: "archived-source" }, "Archived source rows"),
    React.createElement("ul", { className: "evidence-list" }, archivedRows.map((row) => affectedRowCard(row))),
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

type ChaseRow = {
  readonly id: string;
  readonly severity: string;
  readonly owner: string;
  readonly issue: string;
  readonly suggestedFix: string;
  readonly atRisk: string;
  readonly sourceRefs: number;
  readonly href: string;
};

function buildChaseRows(
  contract: DashboardDisplayContract,
  floatChecks: readonly ReconciliationCheck[],
  orphanRevenueRows: readonly DashboardProjectRow[],
  parserDiagnostics: readonly (SourceWarning | ReconciliationCheck)[]
): ChaseRow[] {
  const floatOnlyRows = contract.visibleRows.filter((row) => row.rowType === "float_only");

  return [
    ...floatChecks.map((check) => chaseRowForCheck(contract, check, "Yunni")),
    ...parserDiagnostics.map((item) => ("owner" in item ? chaseRowForWarning(contract, item) : chaseRowForCheck(contract, item, ownerForCheck(item)))),
    ...orphanRevenueRows.map((row) => chaseRowForProjectRow(row)),
    ...floatOnlyRows.map((row) => chaseRowForProjectRow(row))
  ].slice(0, 30);
}

function chaseRowsTable(rows: readonly ChaseRow[]) {
  return React.createElement(
    "table",
    { className: "projects-table", "aria-label": "Data quality chase rows" },
    React.createElement(
      "thead",
      null,
      React.createElement(
        "tr",
        null,
        ["Severity", "Owner", "Issue", "Suggested fix", "At risk", "Source refs", "Link"].map((header) =>
          React.createElement("th", { key: header }, header)
        )
      )
    ),
    React.createElement(
      "tbody",
      null,
      rows.length === 0
        ? React.createElement("tr", null, React.createElement("td", { colSpan: 7 }, "No chase rows in the active scope."))
        : rows.map((row) =>
            React.createElement(
              "tr",
              { key: row.id },
              React.createElement("td", null, row.severity),
              React.createElement("td", null, row.owner),
              React.createElement("td", null, row.issue),
              React.createElement("td", null, row.suggestedFix),
              React.createElement("td", null, row.atRisk),
              React.createElement("td", null, String(row.sourceRefs)),
              React.createElement("td", null, React.createElement("a", { href: row.href }, "Open evidence"))
            )
          )
    )
  );
}

function diagnosticCard(item: SourceWarning | ReconciliationCheck) {
  return "owner" in item ? warningCard(item) : checkCard(item);
}

function chaseRowForWarning(contract: DashboardDisplayContract, warning: SourceWarning): ChaseRow {
  return {
    id: `warning:${warning.id}`,
    severity: warning.status,
    owner: warning.owner,
    issue: warning.code,
    suggestedFix: suggestedFixForOwner(warning.owner),
    atRisk: "Source evidence",
    sourceRefs: warning.sourceRefs.length,
    href: scopedHref("/dashboard/data-quality", warning.scope)
  };
}

function chaseRowForCheck(contract: DashboardDisplayContract, check: ReconciliationCheck, owner: string): ChaseRow {
  return {
    id: `check:${check.id}`,
    severity: check.status,
    owner,
    issue: check.code,
    suggestedFix: suggestedFixForOwner(owner),
    atRisk: riskFromCheck(check),
    sourceRefs: check.sourceRefs.length,
    href: evidenceHrefForScope(contract, check.scope)
  };
}

function chaseRowForProjectRow(row: DashboardProjectRow): ChaseRow {
  const owner = ownerForProjectRow(row);

  return {
    id: `row:${row.id}`,
    severity: row.warnings.some((warning) => warning.status === "FAIL") ? "FAIL" : "WARN",
    owner,
    issue: row.rowType.toUpperCase(),
    suggestedFix: suggestedFixForOwner(owner),
    atRisk: riskFromProjectRow(row),
    sourceRefs: row.sourceTrace.length,
    href: projectRowHref(row)
  };
}

function ownerForCheck(check: ReconciliationCheck): string {
  if (check.sourceRefs.some((sourceRef) => sourceRef.source === "float") || check.code.includes("FLOAT")) return "Yunni";
  if (check.sourceRefs.some((sourceRef) => sourceRef.source === "pipeline") || check.code.includes("PIPELINE")) return "Jade";
  if (check.sourceRefs.some((sourceRef) => sourceRef.source === "production_revenue") || check.code.includes("PRODUCTION")) return "Production";
  return "Sian";
}

function ownerForProjectRow(row: DashboardProjectRow): string {
  if (row.rowType === "float_only") return "Yunni";
  if (row.rowType === "pipeline_only") return "Jade";
  if (row.rowType === "production_revenue_only") return "Production";
  return "Sian";
}

function suggestedFixForOwner(owner: string): string {
  if (owner === "Yunni") return "Check Float project ID, duplicate/manual/archive status, and export settings.";
  if (owner === "Jade") return "Check Pipeline row identity, project name, and job code in the Pipeline sheet.";
  if (owner === "Production") return "Check production revenue source row and archived project status.";
  if (owner === "Codex") return "Use Codex for code, browser, sync, deployment, or source-access investigation.";
  return "Check fee-sheet source rows, role/hour sections, and parser warnings.";
}

function riskFromCheck(check: ReconciliationCheck): string {
  const values = [metricRiskLabel(check.expected), metricRiskLabel(check.actual)].filter(Boolean);
  return values.length === 0 ? "Source mismatch" : values.join(" / ");
}

function riskFromProjectRow(row: DashboardProjectRow): string {
  const values = [
    metricRiskLabel(row.totals.soldFee),
    metricRiskLabel(row.totals.soldHours),
    metricRiskLabel(row.totals.floatHours),
    metricRiskLabel(row.totals.pipelineFee),
    metricRiskLabel(row.totals.productionRevenue)
  ].filter(Boolean);

  return values.length === 0 ? row.rowType : values.join(" / ");
}

function metricRiskLabel(value: MetricValue | undefined): string | undefined {
  if (value === undefined || value.kind === "unsupported") return undefined;
  if (value.kind === "money" && value.value.amountGbp !== 0) return formatMoney(value.value.amountGbp);
  if (value.kind === "hours" && value.value !== 0) return `${formatNumber(value.value)}h`;
  if (value.kind === "count" && value.value !== 0) return formatNumber(value.value);
  return undefined;
}

function evidenceHrefForScope(contract: DashboardDisplayContract, scope: DashboardDisplayContract["scope"]): string {
  if (scope.jobNumber !== undefined) return scopedHref(`/dashboard/projects/${scope.jobNumber}`, scope);
  if (scope.floatProjectId !== undefined) return scopedHref(`/dashboard/float/${scope.floatProjectId}`, scope);
  return scopedHref("/dashboard/data-quality", contract.scope);
}

function projectRowHref(row: DashboardProjectRow): string {
  const floatProjectId = row.canonicalFloatProjectId ?? row.sourceFloatProjectId;

  if (row.rowType === "float_only" && floatProjectId !== undefined) {
    return scopedHref(`/dashboard/float/${floatProjectId}`, row.scope, { floatProjectId });
  }

  return row.jobNumber === undefined
    ? scopedHref("/dashboard/projects", row.scope)
    : scopedHref(`/dashboard/projects/${row.jobNumber}`, row.scope, { jobNumber: row.jobNumber });
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
  const floatProjectId = row.canonicalFloatProjectId ?? row.sourceFloatProjectId;
  const href =
    row.rowType === "float_only" && floatProjectId !== undefined
      ? scopedHref(`/dashboard/float/${floatProjectId}`, row.scope, { floatProjectId })
      : row.jobNumber === undefined
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

function formatMoney(value: number): string {
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
