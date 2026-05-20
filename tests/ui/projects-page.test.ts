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
    expect(html).toContain("British Airways");
    expect(html).toContain("UCS04787");
    expect(html).toContain("pipeline_only");
    expect(html).toContain("production_revenue_only");
    expect(html).toContain("float_only");
    expect(html).toContain("PCS00250");
    expect(html).toContain("href=\"/dashboard/projects/UCS04787?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;jobNumber=UCS04787\"");
    expect(html).toContain("Total");
    expect(html).toContain("£275,947");
    expect(html).toContain("861h");
  });
});
