import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { buildCsvTextFromContract } from "../../src/components/dashboard/export/csv-export";
import { ProjectsTable } from "../../src/components/dashboard/projects/projects-table";
import { getFixtureDashboardContract } from "../../src/lib/ui/fixture-contract";
import { projectsViewStateFromSearchParams, type ProjectsViewState } from "../../src/lib/ui/projects-view-state";
import type { UiSearchParams } from "../../src/lib/ui/scope-params";

describe("P9.5-E Projects presentation controls parity", () => {
  test("pview=list renders List active, Calendar available, exact search placeholder, guarded filters, and read-only archive handoff", () => {
    const params = scopedParams({ pview: "list" });
    const html = renderProjects(params);

    expect(html).toContain("aria-selected=\"true\" class=\"active\" href=\"/dashboard/projects?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;pview=list\" role=\"tab\">List");
    expect(html).toContain("href=\"/dashboard/projects?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;pview=calendar\" role=\"tab\">Calendar");
    expect(html).toContain("placeholder=\"Search by job number or client name...\"");
    expect(html).toContain("+ Add filter");
    for (const label of [
      "Department",
      "Role",
      "Exact client",
      "Job number",
      "Row type",
      "Confidence",
      "Status",
      "Source issue",
      "Float project ID"
    ]) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain("Unsupported legacy field");
    expect(html).toContain("Float orphan archive");
    expect(html).toContain("Project bulk archive");
    expect(html).toContain("Unavailable while MUTATION_GUARD is read_only.");
    expect(html).toContain("disabled=\"\"");
    expect(html).toContain("UCS04787");
    expect(html).toContain("Total");
  });

  test("pview=calendar renders approved empty state and Breakdown controls", () => {
    const params = scopedParams({ pview: "calendar", view: "role" });
    const html = renderProjects(params);

    expect(html).toContain("aria-selected=\"true\" class=\"active\" href=\"/dashboard/projects?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;pview=calendar&amp;view=role\" role=\"tab\">Calendar");
    expect(html).toContain("No calendar data for this period.");
    expect(html).toContain("Breakdown");
    expect(html).toContain("By Department");
    expect(html).toContain("By Month");
    expect(html).toContain("By Role");
    expect(html).toContain("By Client");
  });

  test("pview changes presentation only while totals and CSV stay unchanged", () => {
    const contract = getFixtureDashboardContract(baseScope);
    const listHtml = renderProjectsWithState(contract, scopedParams({ pview: "list" }), {
      presentationView: "list",
      breakdownView: "department"
    });
    const calendarHtml = renderProjectsWithState(contract, scopedParams({ pview: "calendar" }), {
      presentationView: "calendar",
      breakdownView: "department"
    });

    expect(contract.visibleRows.map((row) => row.id)).toEqual(getFixtureDashboardContract(baseScope).visibleRows.map((row) => row.id));
    expect(contract.footerTotals).toEqual(getFixtureDashboardContract(baseScope).footerTotals);
    expect(buildCsvTextFromContract(contract)).toEqual(buildCsvTextFromContract(getFixtureDashboardContract(baseScope)));
    expect(csvHrefFrom(listHtml)).toEqual(csvHrefFrom(calendarHtml));
    expect(listHtml).toContain("£275,947");
    expect(calendarHtml).toContain("Download CSV");
  });
});

const baseScope = {
  office: "LDN",
  from: "2026-01-01",
  to: "2026-03-31"
} as const;

function scopedParams(extra: UiSearchParams = {}): UiSearchParams {
  return {
    ...baseScope,
    ...extra
  };
}

function renderProjects(params: UiSearchParams): string {
  return renderProjectsWithState(
    getFixtureDashboardContract(baseScope),
    params,
    projectsViewStateFromSearchParams(params)
  );
}

function renderProjectsWithState(
  contract: ReturnType<typeof getFixtureDashboardContract>,
  params: UiSearchParams,
  viewState: ProjectsViewState
): string {
  return renderToStaticMarkup(React.createElement(ProjectsTable, { contract, params, viewState }));
}

function csvHrefFrom(html: string): string {
  const match = html.match(/download="ucs-dashboard-projects\.csv" href="([^"]+)"/);
  if (match?.[1] === undefined) {
    throw new Error("Projects CSV link was not rendered.");
  }

  return match[1];
}
