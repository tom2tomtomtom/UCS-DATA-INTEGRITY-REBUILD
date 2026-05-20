import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { ProjectDetail } from "../../src/components/dashboard/project-detail/project-detail";
import { getFixtureDashboardContract } from "../../src/lib/ui/fixture-contract";

describe("P6-D project detail", () => {
  test("keeps scope and renders KPI, trace, and Float reconciliation evidence from the contract", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      department: "Design",
      jobNumber: "UCS04787"
    });
    const html = renderToStaticMarkup(React.createElement(ProjectDetail, { contract, jobNumber: "UCS04787" }));

    expect(html).toContain("British Airways / UCS04787");
    expect(html).toContain("Design");
    expect(html).toContain("£183,947");
    expect(html).toContain("420h");
    expect(html).toContain("861h");
    expect(html).toContain("FLOAT_VISIBLE_CACHE_MISSING_CACHE");
    expect(html).toContain("Role allocation");
    expect(html).toContain("No role allocation data available for this project in the active scope.");
    expect(html).toContain("fixture-float-visible-ucs04787");
    expect(html).toContain("Back to Projects");
    expect(html).toContain("href=\"/dashboard/projects?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;department=Design&amp;jobNumber=UCS04787\"");
  });
});
