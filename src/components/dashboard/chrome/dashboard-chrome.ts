import React from "react";

import type { DashboardConcreteOffice, DashboardDisplayContract, DashboardOffice, DashboardScope } from "../../../lib";
import { scopedHref } from "../../../lib";

const navItems = [
  { label: "Department Rollup", href: "/dashboard" },
  { label: "Projects", href: "/dashboard/projects" },
  { label: "Float", href: "/dashboard/float" },
  { label: "Approval Audit", href: "/dashboard/approval" },
  { label: "Data Quality", href: "/dashboard/data-quality" },
  { label: "Glossary", href: "/dashboard/glossary" },
  { label: "Sync Audit", href: "/dashboard/audit" },
  { label: "Sync Warnings", href: "/dashboard/admin/sync-warnings" },
  { label: "Capacity Reduced", href: "/dashboard/admin/timeoffs" },
  { label: "Users", href: "/dashboard/users" }
] as const;

const officeOptions = [
  { label: "All", office: "ALL", title: "Agency-wide scope" },
  { label: "LDN", office: "LDN", title: "London office scope" },
  { label: "UCX", office: "UCX", title: "UCX office scope" },
  { label: "USA", office: "USA", title: "USA office scope" }
] as const satisfies readonly {
  label: string;
  office: DashboardOffice;
  title: string;
}[];

export function DashboardChrome({
  contract,
  activePath,
  extraScopeParams = {},
  children
}: {
  contract: DashboardDisplayContract;
  activePath: string;
  extraScopeParams?: Readonly<Record<string, string | undefined>>;
  children?: React.ReactNode;
}) {
  const scope = contract.scope;
  const warningCount = contract.warnings.length + contract.reconciliation.filter((check) => check.status !== "PASS").length;
  const activeFilterCount = countActiveFilters(scope);
  const dataQualityCount = warningCount + contract.unsupported.length;

  return React.createElement(
    "div",
    { className: "dashboard-shell" },
    React.createElement(
      "header",
      { className: "dashboard-topbar" },
      React.createElement(
        "div",
        { className: "dashboard-topbar-row dashboard-topbar-row-primary" },
        React.createElement(
          "div",
          { className: "dashboard-brand" },
          React.createElement("span", { className: "brand-eye", "aria-label": "Uncommon eye logo", role: "img" }),
          React.createElement(
            "div",
            null,
            React.createElement("p", { className: "dashboard-kicker" }, "Source-traceable reconciliation"),
            React.createElement("h1", null, "UCS Commercial Dashboard")
          )
        ),
        React.createElement(
          "section",
          { className: "office-controls", "aria-label": "Office scope controls" },
          React.createElement("span", { className: "office-label" }, "OFFICE"),
          React.createElement(
            "div",
            { className: "office-pill-row" },
            officeOptions.map((option) => officePill(activePath, scope, option, extraScopeParams))
          ),
          activeFilterCount > 0
            ? React.createElement(
                "a",
                { className: "clear-filters", href: clearFiltersHref(activePath, scope, extraScopeParams) },
                "Clear all filters"
              )
            : React.createElement(
                "span",
                { className: "clear-filters disabled", "aria-disabled": "true" },
                "Clear all filters"
              )
        )
      ),
      React.createElement(
        "div",
        { className: "dashboard-topbar-row dashboard-topbar-row-actions" },
        React.createElement(
          "div",
          { className: "dashboard-actions" },
          React.createElement(
            "div",
            { className: "sync-readiness", "aria-label": "Readiness and sync status" },
            React.createElement("span", { className: "user-email" }, "tomh@redbaez.com"),
            React.createElement("span", null, `synced ${contract.visibleRows.length} projects`),
            React.createElement("span", null, "No production cutover. Read-only source snapshot.")
          ),
          React.createElement(
            "button",
            {
              className: "sync-button",
              disabled: true,
              title: "Sync handoff is blocked while the rebuild mutation guard is read-only.",
              type: "button",
              "aria-label": "Sync Now unavailable while the rebuild is read-only"
            },
            React.createElement("span", { className: "refresh-icon", "aria-hidden": "true" }),
            "Sync Now unavailable"
          ),
          React.createElement(
            "a",
            {
              className: "chat-entry",
              href: scopedHref("/dashboard/chat-demo", scope),
              "aria-label": "Ask AI read-only evidence assistant"
            },
            React.createElement("span", { className: "chat-icon", "aria-hidden": "true" }, "AI"),
            React.createElement("span", null, "Ask AI")
          )
        )
      )
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
          item.label,
          item.label === "Data Quality"
            ? React.createElement("span", { className: "nav-badge" }, String(dataQualityCount))
            : null
        )
      )
    ),
    React.createElement(
      "section",
      { className: warningCount > 0 ? "sync-alert-banner" : "sync-alert-banner clean", "aria-live": "polite" },
      React.createElement("strong", null, warningCount > 0 ? `${warningCount} issues found in current contract` : "No sync issues in this scope"),
      React.createElement(
        "span",
        null,
        warningCount > 0
          ? "Source warnings and reconciliation checks stay visible until the source owner fixes or acknowledges them."
          : "Source evidence is contract-backed for the current fixture scope."
      ),
      React.createElement("a", { href: scopedHref("/dashboard/audit", scope) }, "View details")
    ),
    React.createElement(
      "section",
      { className: "exchange-warning-banner" },
      React.createElement("strong", null, "Exchange rate warning:"),
      React.createElement("span", null, " FX values are carried from source/parser evidence. Treat unsupported or missing FX evidence as a visible source gap, not a dashboard correction.")
    ),
    React.createElement(
      "section",
      { className: "scope-strip", "aria-label": "Active dashboard scope" },
      scopeChip("Office", displayOffice(scope)),
      scopeChip("From", scope.from),
      scopeChip("To", scope.to),
      optionalScopeChip("Department", scope.department),
      optionalScopeChip("Role", scope.role),
      optionalScopeChip("Client", scope.client),
      optionalScopeChip("Job", scope.jobNumber)
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

function officePill(
  activePath: string,
  scope: DashboardScope,
  option: (typeof officeOptions)[number],
  extraScopeParams: Readonly<Record<string, string | undefined>>
) {
  const isActive = officePillIsActive(scope, option.office);

  return React.createElement(
    "a",
    {
      "aria-pressed": isActive,
      className: isActive ? "office-pill active" : "office-pill",
      href: hrefWithExtraParams(officePillHref(activePath, scope, option.office), extraScopeParams),
      key: option.office,
      role: "button",
      title: option.title
    },
    option.label
  );
}

function officePillIsActive(scope: DashboardScope, office: DashboardOffice): boolean {
  if (office === "ALL") {
    return scope.office === "ALL" && (scope.offices ?? []).length === 0;
  }

  if (scope.offices !== undefined && scope.offices.length > 0) {
    return scope.offices.includes(office);
  }

  return scope.office === office;
}

function officePillHref(activePath: string, scope: DashboardScope, office: DashboardOffice): string {
  if (office === "ALL") {
    return scopedHref(activePath, scope, { office: "ALL", offices: [] });
  }

  const currentOffices = currentConcreteOffices(scope);
  if (scope.offices !== undefined && scope.offices.length > 0) {
    const nextOffices = currentOffices.includes(office)
      ? currentOffices.filter((item) => item !== office)
      : orderedOffices([...currentOffices, office]);

    if (nextOffices.length === 0) {
      return scopedHref(activePath, scope, { office: "ALL", offices: [] });
    }

    if (nextOffices.length === 1) {
      return scopedHref(activePath, scope, { office: nextOffices[0]!, offices: [] });
    }

    return scopedHref(activePath, scope, { office: "ALL", offices: nextOffices });
  }

  if (scope.office !== "ALL" && scope.office !== office) {
    return scopedHref(activePath, scope, {
      office: "ALL",
      offices: orderedOffices([scope.office, office])
    });
  }

  return scopedHref(activePath, scope, {
    office: scope.office === office ? "ALL" : office,
    offices: []
  });
}

function currentConcreteOffices(scope: DashboardScope): DashboardConcreteOffice[] {
  if (scope.offices !== undefined && scope.offices.length > 0) {
    return orderedOffices(scope.offices);
  }

  return scope.office === "ALL" ? [] : [scope.office];
}

function orderedOffices(offices: readonly DashboardConcreteOffice[]): DashboardConcreteOffice[] {
  const order: readonly DashboardConcreteOffice[] = ["LDN", "UCX", "USA"];
  const unique = new Set(offices);
  return order.filter((office) => unique.has(office));
}

function clearFiltersHref(
  activePath: string,
  scope: DashboardScope,
  extraScopeParams: Readonly<Record<string, string | undefined>>
): string {
  return hrefWithExtraParams(
    scopedHref(activePath, {
      office: "ALL",
      from: scope.from,
      to: scope.to
    }),
    extraScopeParams
  );
}

function hrefWithExtraParams(href: string, extraParams: Readonly<Record<string, string | undefined>>): string {
  const [path = "", query = ""] = href.split("?");
  const params = new URLSearchParams(query);

  for (const [key, value] of Object.entries(extraParams)) {
    if (value === undefined || value.trim() === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  const nextQuery = params.toString();
  return nextQuery === "" ? path : `${path}?${nextQuery}`;
}

function countActiveFilters(scope: DashboardScope): number {
  const optionalFilters = [
    scope.department,
    scope.role,
    scope.client,
    scope.search,
    scope.jobNumber,
    scope.floatProjectId
  ].filter((value) => value !== undefined && value.trim() !== "").length;

  return optionalFilters + (scope.office === "ALL" && (scope.offices ?? []).length === 0 ? 0 : 1);
}

function displayOffice(scope: DashboardScope): string {
  if (scope.offices !== undefined && scope.offices.length > 0) {
    return scope.offices.join(" + ");
  }

  return scope.office === "ALL" ? "Agency" : scope.office;
}

function visibleRowLabel(count: number): string {
  return `${count} visible contract row${count === 1 ? "" : "s"}`;
}

function scopeChip(label: string, value: string) {
  return React.createElement("span", { key: `${label}:${value}` }, `${label}: ${value}`);
}

function optionalScopeChip(label: string, value: string | undefined) {
  return value === undefined ? null : scopeChip(label, value);
}
