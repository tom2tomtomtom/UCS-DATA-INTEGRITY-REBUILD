import React from "react";

import type { DashboardDisplayContract } from "../../../lib";
import { scopeFromSearchParams, type UiSearchParams } from "../../../lib/ui/scope-params";
import type { ProjectsBreakdownView, ProjectsViewState } from "../../../lib/ui/projects-view-state";
import { projectsHref } from "../../../lib/ui/projects-view-state";
import { TimeFilterControls } from "../time-filter-controls";

export const PROJECTS_SEARCH_PLACEHOLDER = "Search by job number or client name...";

const breakdownControls = [
  ["department", "By Department"],
  ["month", "By Month"],
  ["role", "By Role"],
  ["client", "By Client"]
] as const satisfies readonly (readonly [ProjectsBreakdownView, string])[];

export function ProjectsControls({
  contract,
  params,
  viewState
}: {
  readonly contract: DashboardDisplayContract;
  readonly params: UiSearchParams;
  readonly viewState: ProjectsViewState;
}) {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { className: "projects-control-row", "aria-label": "Projects presentation controls" },
      React.createElement(
        "div",
        { className: "segmented-control", role: "tablist", "aria-label": "Projects presentation" },
        presentationLink("List", "list", params, viewState.presentationView === "list"),
        presentationLink("Calendar", "calendar", params, viewState.presentationView === "calendar")
      ),
      searchForm(params),
      React.createElement(
        "details",
        { className: "add-filter-control" },
        React.createElement("summary", null, "+ Add filter"),
        filterMenu(contract, params)
      )
    ),
    React.createElement(TimeFilterControls, {
      basePath: "/dashboard/projects",
      extraParams: projectsTimeFilterParams(params),
      scope: scopeFromParams(params)
    }),
    React.createElement(
      "div",
      { className: "projects-mutation-bars", "aria-label": "Read-only mutation handoff" },
      mutationBar("Float orphan archive", "Unavailable while MUTATION_GUARD is read_only."),
      mutationBar("Project bulk archive", "Unavailable while MUTATION_GUARD is read_only.")
    )
  );
}

function filterMenu(contract: DashboardDisplayContract, params: UiSearchParams) {
  const departmentOptions = uniqueValues(contract.rollups.byDepartment.map((row) => row.label));
  const roleOptions = uniqueValues(contract.rollups.byRole.map((row) => row.label));
  const clientOptions = uniqueValues(contract.visibleRows.map((row) => row.canonicalClient ?? row.sourceClient));
  const jobOptions = uniqueValues(contract.visibleRows.map((row) => row.jobNumber));
  const floatOptions = uniqueValues(contract.visibleRows.map((row) => row.canonicalFloatProjectId ?? row.sourceFloatProjectId));
  const hasActiveFilter = ["department", "role", "client", "jobNumber", "floatProjectId", "search"].some((key) => scalarParam(params[key]) !== undefined);

  return React.createElement(
    "div",
    { className: "projects-filter-menu", "aria-label": "Display-contract backed filters" },
    hasActiveFilter
      ? React.createElement("a", { href: projectsFilterHref(contract, params, clearProjectFilters()), className: "filter-clear-link" }, "Clear project filters")
      : null,
    filterGroup("Department", departmentOptions, (value) => projectsFilterHref(contract, params, { department: value })),
    filterGroup("Role", roleOptions, (value) => projectsFilterHref(contract, params, { role: value })),
    filterGroup("Exact client", clientOptions, (value) => projectsFilterHref(contract, params, { client: value })),
    filterGroup("Job number", jobOptions, (value) => projectsFilterHref(contract, params, { jobNumber: value })),
    filterGroup("Float project ID", floatOptions, (value) => projectsFilterHref(contract, params, { floatProjectId: value })),
    evidenceGroup(contract, params)
  );
}

function filterGroup(label: string, values: readonly string[], hrefForValue: (value: string) => string) {
  return React.createElement(
    "section",
    { className: "projects-filter-group" },
    React.createElement("strong", null, label),
    values.length === 0
      ? React.createElement("span", { className: "detail-scope" }, "No values in current scope")
      : React.createElement(
          "div",
          { className: "filter-link-list" },
          ...values.slice(0, 12).map((value) => React.createElement("a", { href: hrefForValue(value), key: value }, value))
        )
  );
}

function projectsFilterHref(
  contract: DashboardDisplayContract,
  params: UiSearchParams,
  overrides: Record<string, string | undefined>
): string {
  const nextParams = new URLSearchParams();
  const defaults = {
    office: contract.scope.office,
    offices: contract.scope.offices?.join(","),
    from: contract.scope.from,
    to: contract.scope.to,
    department: contract.scope.department,
    role: contract.scope.role,
    client: contract.scope.client,
    search: contract.scope.search,
    jobNumber: contract.scope.jobNumber,
    floatProjectId: contract.scope.floatProjectId
  };
  const keys = ["office", "offices", "from", "to", "department", "role", "client", "search", "jobNumber", "floatProjectId", "pview", "view", "sort", "dir"] as const;

  for (const key of keys) {
    const value = scalarParam(params[key]) ?? defaults[key as keyof typeof defaults];
    if (value !== undefined && value.trim() !== "") {
      nextParams.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value.trim() === "") {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }
  }

  const query = nextParams.toString();
  return query === "" ? "/dashboard/projects" : `/dashboard/projects?${query}`;
}

function clearProjectFilters(): Record<string, undefined> {
  return {
    department: undefined,
    role: undefined,
    client: undefined,
    search: undefined,
    jobNumber: undefined,
    floatProjectId: undefined
  };
}

function evidenceGroup(contract: DashboardDisplayContract, params: UiSearchParams) {
  const labels = ["Row type", "Confidence", "Status", "Source issue"] as const;

  return React.createElement(
    "section",
    { className: "projects-filter-group" },
    React.createElement("strong", null, "Evidence groups"),
    React.createElement(
      "div",
      { className: "filter-link-list" },
      ...labels.map((label) => React.createElement("a", { href: dataQualityHref(contract, params), key: label }, label))
    )
  );
}

function dataQualityHref(contract: DashboardDisplayContract, params: UiSearchParams): string {
  const nextParams = new URLSearchParams();
  const scope = contract.scope;

  for (const [key, value] of Object.entries({
    office: scalarParam(params.office) ?? scope.office,
    offices: scalarParam(params.offices) ?? scope.offices?.join(","),
    from: scalarParam(params.from) ?? scope.from,
    to: scalarParam(params.to) ?? scope.to,
    department: scalarParam(params.department) ?? scope.department,
    role: scalarParam(params.role) ?? scope.role,
    client: scalarParam(params.client) ?? scope.client,
    search: scalarParam(params.search) ?? scope.search,
    jobNumber: scalarParam(params.jobNumber) ?? scope.jobNumber,
    floatProjectId: scalarParam(params.floatProjectId) ?? scope.floatProjectId
  })) {
    if (value !== undefined && value.trim() !== "") {
      nextParams.set(key, value);
    }
  }

  const query = nextParams.toString();
  return query === "" ? "/dashboard/data-quality" : `/dashboard/data-quality?${query}`;
}

function uniqueValues(values: readonly (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => value !== undefined && value.trim() !== ""))].sort((left, right) =>
    left.localeCompare(right)
  );
}

function searchForm(params: UiSearchParams) {
  return React.createElement(
    "form",
    { action: "/dashboard/projects", className: "projects-search-form", method: "get" },
    ...hiddenSearchInputs(params),
    React.createElement("input", {
      className: "projects-search",
      defaultValue: scalarParam(params.search) ?? "",
      name: "search",
      placeholder: PROJECTS_SEARCH_PLACEHOLDER,
      type: "search",
      "aria-label": "Search projects"
    }),
    React.createElement("button", { type: "submit" }, "Search")
  );
}

function hiddenSearchInputs(params: UiSearchParams) {
  const keys = ["office", "offices", "from", "to", "department", "role", "client", "jobNumber", "floatProjectId", "pview", "view"] as const;

  return keys.flatMap((key) => {
    const value = scalarParam(params[key]);
    if (value === undefined || value.trim() === "") return [];
    return React.createElement("input", { key, name: key, type: "hidden", value });
  });
}

function projectsTimeFilterParams(params: UiSearchParams): Record<string, string | undefined> {
  return {
    pview: scalarParam(params.pview),
    view: scalarParam(params.view)
  };
}

export function ProjectsBreakdownControls({
  params,
  viewState
}: {
  readonly params: UiSearchParams;
  readonly viewState: ProjectsViewState;
}) {
  return React.createElement(
    "section",
    { className: "projects-breakdown", "aria-label": "Breakdown" },
    React.createElement("h3", null, "Breakdown"),
    React.createElement(
      "div",
      { className: "segmented-control", role: "tablist", "aria-label": "Calendar breakdown" },
      ...breakdownControls.map(([value, label]) =>
        React.createElement(
          "a",
          {
            "aria-selected": viewState.breakdownView === value ? "true" : "false",
            className: viewState.breakdownView === value ? "active" : undefined,
            href: projectsHref(params, { pview: "calendar", view: value }),
            key: value,
            role: "tab"
          },
          label
        )
      )
    )
  );
}

function scopeFromParams(params: UiSearchParams) {
  return scopeFromSearchParams(params);
}

function presentationLink(
  label: string,
  view: "list" | "calendar",
  params: UiSearchParams,
  isActive: boolean
) {
  return React.createElement(
    "a",
    {
      "aria-selected": isActive ? "true" : "false",
      className: isActive ? "active" : undefined,
      href: projectsHref(params, { pview: view }),
      role: "tab"
    },
    label
  );
}

function mutationBar(title: string, detail: string) {
  return React.createElement(
    "div",
    { className: "projects-mutation-bar", "aria-disabled": "true" },
    React.createElement("strong", null, title),
    React.createElement("span", null, detail),
    React.createElement("button", { disabled: true, type: "button" }, "Archive unavailable")
  );
}

function scalarParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
