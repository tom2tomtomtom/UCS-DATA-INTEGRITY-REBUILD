import type { UiSearchParams } from "./scope-params";

export type ProjectsPresentationView = "list" | "calendar";
export type ProjectsBreakdownView = "department" | "month" | "role" | "client";

export type ProjectsViewState = {
  readonly presentationView: ProjectsPresentationView;
  readonly breakdownView: ProjectsBreakdownView;
};

const presentationViews = ["list", "calendar"] as const satisfies readonly ProjectsPresentationView[];
const breakdownViews = ["department", "month", "role", "client"] as const satisfies readonly ProjectsBreakdownView[];

export function projectsViewStateFromSearchParams(params: UiSearchParams): ProjectsViewState {
  return {
    presentationView: presentationViewFromValue(valueFor(params.pview)),
    breakdownView: breakdownViewFromValue(valueFor(params.view))
  };
}

export function projectsHref(
  params: UiSearchParams,
  overrides: Partial<Record<"pview" | "view", string>>
): string {
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const scalar = Array.isArray(value) ? value[0] : value;

    if (scalar !== undefined && scalar.trim() !== "") {
      nextParams.set(key, scalar);
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

function presentationViewFromValue(value: string | undefined): ProjectsPresentationView {
  return isPresentationView(value) ? value : "list";
}

function breakdownViewFromValue(value: string | undefined): ProjectsBreakdownView {
  return isBreakdownView(value) ? value : "department";
}

function valueFor(value: string | string[] | undefined): string | undefined {
  const scalar = Array.isArray(value) ? value[0] : value;
  return scalar === undefined || scalar.trim() === "" ? undefined : scalar;
}

function isPresentationView(value: string | undefined): value is ProjectsPresentationView {
  return presentationViews.includes(value as ProjectsPresentationView);
}

function isBreakdownView(value: string | undefined): value is ProjectsBreakdownView {
  return breakdownViews.includes(value as ProjectsBreakdownView);
}
