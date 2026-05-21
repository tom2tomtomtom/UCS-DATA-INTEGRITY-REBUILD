import React from "react";

import type { UiSearchParams } from "../../../lib/ui/scope-params";
import type { ProjectsBreakdownView, ProjectsViewState } from "../../../lib/ui/projects-view-state";
import { projectsHref } from "../../../lib/ui/projects-view-state";

export const PROJECTS_SEARCH_PLACEHOLDER = "Search by job number or client name...";

const displayBackedFilters = [
  "Department",
  "Role",
  "Exact client",
  "Job number",
  "Row type",
  "Confidence",
  "Status",
  "Source issue",
  "Float project ID"
] as const;

const breakdownControls = [
  ["department", "By Department"],
  ["month", "By Month"],
  ["role", "By Role"],
  ["client", "By Client"]
] as const satisfies readonly (readonly [ProjectsBreakdownView, string])[];

export function ProjectsControls({
  params,
  viewState
}: {
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
      React.createElement("input", {
        className: "projects-search",
        name: "search",
        placeholder: PROJECTS_SEARCH_PLACEHOLDER,
        readOnly: true,
        type: "search",
        value: scalarParam(params.search) ?? "",
        "aria-label": "Search projects"
      }),
      React.createElement(
        "details",
        { className: "add-filter-control" },
        React.createElement("summary", null, "+ Add filter"),
        React.createElement(
          "ul",
          { "aria-label": "Display-contract backed filters" },
          ...displayBackedFilters.map((filter) => React.createElement("li", { key: filter }, filter))
        )
      )
    ),
    React.createElement(
      "div",
      { className: "projects-mutation-bars", "aria-label": "Read-only mutation handoff" },
      mutationBar("Float orphan archive", "Unavailable while MUTATION_GUARD is read_only."),
      mutationBar("Project bulk archive", "Unavailable while MUTATION_GUARD is read_only.")
    )
  );
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
