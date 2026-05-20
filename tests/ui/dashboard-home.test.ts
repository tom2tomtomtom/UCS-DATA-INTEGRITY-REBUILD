import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { DashboardHome } from "../../src/components/dashboard/rollups/dashboard-home";
import { getFixtureDashboardContract } from "../../src/lib/ui/fixture-contract";

describe("P6-B dashboard home rollups", () => {
  test("renders hero metrics and rollup rows from the display contract", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31"
    });
    const html = renderToStaticMarkup(React.createElement(DashboardHome, { contract }));

    expect(html).toContain("Sold (fee sheet)");
    expect(html).toContain("£275,947");
    expect(html).toContain("Sold hours");
    expect(html).toContain("540h");
    expect(html).toContain("Design");
    expect(html).toContain("Strategy");
    expect(html).toContain("Month Rollup");
    expect(html).toContain("Client Rollup");
    expect(html).toContain("href=\"/dashboard/projects?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;department=Design\"");
    expect(html).toContain("Unsupported");
    expect(html).toContain("Confidence");
  });
});
