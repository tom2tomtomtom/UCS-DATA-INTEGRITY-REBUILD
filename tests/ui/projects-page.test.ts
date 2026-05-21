import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { ProjectsTable } from "../../src/components/dashboard/projects/projects-table";
import { getFixtureDashboardContract } from "../../src/lib/ui/fixture-contract";

describe("P6-C Projects table", () => {
  test("renders visible rows, source-only badges, scoped links, and footer from the display contract", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31"
    });
    const html = renderToStaticMarkup(React.createElement(ProjectsTable, { contract }));

    expect(html).toContain("Projects");
    expect(html).toContain("Job #");
    expect(html).toContain("Sold (fee sheet)");
    expect(html).toContain("Allocated");
    expect(html).toContain("Unallocated");
    expect(html).toContain("Float value (£)");
    expect(html).toContain("Variance (hrs)");
    expect(html).toContain("Last sync");
    expect(html).toContain("Actions");
    expect(html).toContain("Sold (fee sheet) ▼");
    expect(html).toContain("href=\"/dashboard/projects?sort=client&amp;dir=asc\"");
    expect(html).toContain("+ Add filter");
    expect(html).toContain("Display-contract backed filters");
    expect(html).toContain("href=\"/dashboard/projects?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;department=Design\"");
    expect(html).toContain("href=\"/dashboard/projects?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;role=Senior+Designer\"");
    expect(html).toContain("href=\"/dashboard/projects?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;client=British+Airways\"");
    expect(html).toContain("href=\"/dashboard/projects?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;floatProjectId=11413929\"");
    expect(html).toContain("British Airways");
    expect(html).toContain("UCS04787");
    expect(html).toContain("pipeline_only");
    expect(html).toContain("production_revenue_only");
    expect(html).toContain("float_only");
    expect(html).toContain("Archived Production Revenue");
    expect(html).toContain("Warn");
    expect(html).toContain("PCS00250");
    expect(html).toContain("Source-only");
    expect(html).toContain("href=\"/dashboard/projects/UCS04787?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;jobNumber=UCS04787\"");
    expect(html).toContain("href=\"/dashboard/projects/UCS04787?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;jobNumber=UCS04787#float-trace\"");
    expect(html).toContain("href=\"/dashboard/float/11392976?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;floatProjectId=11392976\"");
    expect(html).toContain("Total");
    expect(html).toContain("£275,947");
    expect(html).toContain("861h");
    expect(html).toContain("-441h");
    expect(html).toContain("Display contract");
    expect(html).toContain("Read-only");
    expect(html).toContain("disabled=\"\"");
    expect(html).not.toContain("<td>£0</td>");
    expect(html).not.toContain("<td>0h</td>");
  });

  test("sort links change row order only and preserve contract totals", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31"
    });
    const html = renderToStaticMarkup(
      React.createElement(ProjectsTable, {
        contract,
        params: {
          office: "LDN",
          from: "2026-01-01",
          to: "2026-03-31",
          department: "Design",
          pview: "list",
          sort: "client",
          dir: "asc"
        }
      })
    );

    expect(html).toContain("Client ▲");
    expect(html).toContain("href=\"/dashboard/projects?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;department=Design&amp;pview=list&amp;sort=client&amp;dir=desc\"");
    expect(html).toContain("href=\"/dashboard/projects?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;pview=list&amp;sort=client&amp;dir=asc\" class=\"filter-clear-link\">Clear project filters");
    expect(html).toContain("Total");
    expect(html).toContain("£275,947");
  });
});
