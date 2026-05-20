import React from "react";

import type { DashboardDisplayContract } from "../../../lib";
import { scopedHref } from "../../../lib";

const navItems = [
  { label: "Department Rollup", href: "/dashboard" },
  { label: "Projects", href: "/dashboard/projects" },
  { label: "Float", href: "/dashboard/float" },
  { label: "Approval Audit", href: "/dashboard/approval" },
  { label: "Data Quality", href: "/dashboard/data-quality" },
  { label: "Glossary", href: "/dashboard/glossary" }
] as const;

export function DashboardChrome({
  contract,
  activePath,
  children
}: {
  contract: DashboardDisplayContract;
  activePath: string;
  children?: React.ReactNode;
}) {
  const scope = contract.scope;
  const warningCount = contract.warnings.length + contract.reconciliation.filter((check) => check.status !== "PASS").length;

  return React.createElement(
    "div",
    { className: "dashboard-shell" },
    React.createElement(
      "header",
      { className: "dashboard-topbar" },
      React.createElement(
        "div",
        null,
        React.createElement("p", { className: "dashboard-kicker" }, "Source-traceable reconciliation"),
        React.createElement("h1", null, "UCS Commercial Dashboard")
      ),
      React.createElement("button", { className: "chat-entry", type: "button", "aria-label": "Ask AI" }, "Ask AI")
    ),
    React.createElement(
      "nav",
      { className: "dashboard-tabs", "aria-label": "Dashboard sections" },
      navItems.map((item) =>
        React.createElement(
          "a",
          {
            "aria-current": activePath === item.href ? "page" : undefined,
            className: activePath === item.href ? "active" : undefined,
            href: scopedHref(item.href, scope),
            key: item.href
          },
          item.label
        )
      )
    ),
    React.createElement(
      "section",
      { className: "scope-strip", "aria-label": "Active dashboard scope" },
      scopeChip(scope.office),
      scopeChip(scope.from),
      scopeChip(scope.to),
      optionalScopeChip(scope.department),
      optionalScopeChip(scope.role),
      optionalScopeChip(scope.client),
      optionalScopeChip(scope.jobNumber)
    ),
    React.createElement(
      "section",
      { className: warningCount > 0 ? "warning-banner" : "warning-banner clean", "aria-live": "polite" },
      React.createElement("strong", null, warningCount > 0 ? `${warningCount} warnings need review` : "No active warnings in this scope"),
      React.createElement("span", null, "Every visible number below comes from the display contract.")
    ),
    React.createElement("main", { className: "dashboard-main" }, children)
  );
}

function scopeChip(value: string) {
  return React.createElement("span", { key: value }, value);
}

function optionalScopeChip(value: string | undefined) {
  return value === undefined ? null : scopeChip(value);
}
