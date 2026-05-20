import React from "react";

import type { DashboardDisplayContract, ReconciliationCheck, SourceWarning } from "../../../lib";

const namedChecks = [
  ["LDN Q1 Design", "PASS", "Rollup to Projects scope is covered by contract tests."],
  ["UCS04787", "FAIL", "Float visible hours have no cache backing in the fixture scope."],
  ["UCS05186", "WARN", "Manual duplicate Float candidate remains visible."],
  ["UCS04154", "PASS", "Fee-sheet Float ID is preserved as join evidence."],
  ["PCS00250", "WARN", "Cache has hours but raw Float canon has no task rows."],
  ["USA00262", "UNRESOLVED", "Real USA source fixture is deferred to Phase 8 dual run."],
  ["USA00323", "UNRESOLVED", "Real USA source fixture is deferred to Phase 8 dual run."],
  ["BT raw/cache", "FAIL", "Raw Float task rows have no allocation cache evidence."],
  ["TBC pipeline", "PASS", "TBC pipeline row identity is source-row based."],
  ["Archived production revenue", "PASS", "Production-only row stays visible."],
  ["Exact client drilldown", "PASS", "client and search are separate scope params."]
] as const;

export function DataQualityDashboard({ contract }: { contract: DashboardDisplayContract }) {
  const warningItems = [
    ...contract.warnings.map((warning) => warningCard(warning)),
    ...contract.reconciliation.map((check) => checkCard(check))
  ];

  return React.createElement(
    "section",
    { className: "quality-surface" },
    React.createElement("h2", null, "Data Quality"),
    React.createElement(
      "div",
      { className: "quality-status-grid" },
      statusCard("FAIL", contract.reconciliation.filter((check) => check.status === "FAIL").length),
      statusCard("WARN", contract.reconciliation.filter((check) => check.status !== "PASS" && check.status !== "FAIL").length + contract.warnings.length),
      statusCard("UNRESOLVED", namedChecks.filter(([, status]) => status === "UNRESOLVED").length)
    ),
    React.createElement("h3", null, "Named user checks"),
    React.createElement(
      "ul",
      { className: "evidence-list" },
      namedChecks.map(([name, status, message]) =>
        React.createElement(
          "li",
          { key: name },
          React.createElement("strong", null, `${status}: ${name}`),
          React.createElement("span", null, message)
        )
      )
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
