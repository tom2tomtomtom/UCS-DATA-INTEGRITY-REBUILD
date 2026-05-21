import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { buildCsvTextFromContract } from "../../src/components/dashboard/export/csv-export";
import { ProjectDetail } from "../../src/components/dashboard/project-detail/project-detail";
import { ProjectsTable } from "../../src/components/dashboard/projects/projects-table";
import { DashboardHome } from "../../src/components/dashboard/rollups/dashboard-home";
import { getFixtureDashboardContract } from "../../src/lib/ui/fixture-contract";

describe("Sian source-truth path", () => {
  test("LDN Q1 Design stays scoped and labels unsupported source attribution from rollup to detail and CSV", () => {
    const rollupContract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31"
    });
    const projectsContract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      department: "Design"
    });
    const homeHtml = renderToStaticMarkup(React.createElement(DashboardHome, { contract: rollupContract }));
    const projectsHtml = renderToStaticMarkup(React.createElement(ProjectsTable, { contract: projectsContract }));
    const detailHtml = renderToStaticMarkup(React.createElement(ProjectDetail, { contract: projectsContract, jobNumber: "UCS04787" }));
    const csv = buildCsvTextFromContract(projectsContract);

    expect(homeHtml).toContain("href=\"/dashboard/projects?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;department=Design\"");

    expect(projectsHtml).toContain("British Airways");
    expect(projectsHtml).toContain("UCS04787");
    expect(projectsHtml).toContain("Unsupported");
    expect(projectsHtml).toContain("href=\"/dashboard/projects/UCS04787?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;department=Design&amp;jobNumber=UCS04787\"");
    expect(projectsHtml).not.toContain("£0 pipeline attributed to Design");
    expect(projectsHtml).not.toContain("-0h");

    expect(detailHtml).toContain("British Airways / UCS04787");
    expect(detailHtml).toContain("LDN / 2026-01-01 / 2026-03-31 / Design");
    expect(detailHtml).toContain("Float Trace");
    expect(detailHtml).toContain("Source trace");
    expect(detailHtml).toContain("fixture-float-visible-ucs04787");
    expect(detailHtml).toContain("fee_sheet sold fixture-fee-ucs04787-design");
    expect(detailHtml).not.toContain("<strong>£0</strong>");

    expect(csv).toContain("UCS04787");
    expect(csv).toContain("Unsupported");
    expect(csv).toContain("unsupportedMetrics");
    expect(csv).not.toContain("pipelineFeeGbp,0");
  });
});
