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

  test("surfaces approval state, source evidence, and no-cutover status without changing granularity", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31"
    });
    const html = renderToStaticMarkup(React.createElement(DashboardHome, { contract }));

    expect(html).toContain("Approval state:");
    expect(html).toContain("No cutover approved");
    expect(html).toContain("Source evidence visible");
    expect(html).toContain("2 source warnings");
    expect(html).toContain("6 reconciliation warnings");
    expect(html).toContain("0 unsupported headline metrics");
    expect(html).toContain("Warnings remain source evidence, not approval.");
  });
});
