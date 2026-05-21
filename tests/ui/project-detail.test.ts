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
    expect(html).toContain("Generated 20 May 2026");
    expect(html).toContain("Project evidence checklist");
    expect(html).toContain("Visible contract rows");
    expect(html).toContain("Source trace refs");
    expect(html).toContain("£183,947");
    expect(html).toContain("420h");
    expect(html).toContain("861h");
    expect(html).toContain("Unsupported");
    expect(html).not.toContain("<strong>£0</strong>");
    expect(html).toContain("FLOAT_VISIBLE_CACHE_MISSING_CACHE");
    expect(html).toContain("Allocated hours");
    expect(html).toContain("Unallocated hours");
    expect(html).toContain("Sold vs Allocated by Month");
    expect(html).toContain("Feb 2026");
    expect(html).toContain("Profitability by Role");
    expect(html).toContain("Senior Designer");
    expect(html).toContain("Float Trace");
    expect(html).toContain("Float trace reconciliation");
    expect(html).toContain("Dashboard visible Float");
    expect(html).toContain("Trace visible rows");
    expect(html).toContain("Raw diagnostic rows");
    expect(html).toContain("1,597.5h");
    expect(html).toContain("Float project");
    expect(html).toContain("Task");
    expect(html).toContain("Person");
    expect(html).toContain("Dept / role");
    expect(html).toContain("Dates");
    expect(html).toContain("Flags");
    expect(html).toContain("fixture-task-ucs04787-design");
    expect(html).toContain("Shaun Rogers");
    expect(html).toContain("Design / Senior Designer");
    expect(html).toContain("2026-02-01 to 2026-02-28");
    expect(html).toContain("float_visible");
    expect(html).toContain("allocated");
    expect(html).toContain("fixture-float-visible-ucs04787");
    expect(html).toContain("Back to Projects");
    expect(html).toContain("<a href=\"/dashboard/projects?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;department=Design\">Back to Projects</a>");
    expect(html).not.toContain("department=Design&amp;jobNumber=UCS04787\">Back to Projects");
    expect(html).toContain("Quick");
    expect(html).toContain("Full year");
    expect(html).toContain("href=\"/dashboard/projects/UCS04787?office=LDN&amp;from=2026-04-01&amp;to=2026-06-30&amp;department=Design&amp;jobNumber=UCS04787\">Q2");
  });

  test("does not collapse duplicate visible rows that share one job number", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      jobNumber: "UCS05186"
    });
    const html = renderToStaticMarkup(React.createElement(ProjectDetail, { contract, jobNumber: "UCS05186" }));

    expect(html).toContain("2 visible rows for this job number");
    expect(html).toContain("Boldbean Brand Platform - 1,051.4h");
    expect(html).toContain("Boldbean Manual Duplicate - 1,051h");
    expect(html).toContain("Allocated hours");
    expect(html).toContain("2,102.4h");
    expect(html).toContain("Float Trace");
    expect(html).toContain("fixture-float-visible-ucs05186-canonical");
    expect(html).toContain("fixture-float-visible-ucs05186-manual");
  });
});
