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

    expect(html).toContain("Total sold");
    expect(html).toContain("£275,947");
    expect(html).toContain("Sold hours");
    expect(html).toContain("540h");
    expect(html).toContain("Design");
    expect(html).toContain("Strategy");
    expect(html).toContain("Month Rollup");
    expect(html).toContain("Client Rollup");
    expect(html).toContain("href=\"/dashboard/projects?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;department=Design\"");
    expect(html).toContain("Allocated (hrs)");
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

  test("renders the legacy-recognisable rollup surface without inventing new sources", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31"
    });
    const html = renderToStaticMarkup(React.createElement(DashboardHome, { contract }));

    expect(html).toContain("Source evidence captured");
    expect(html).toContain("Sheet health - 8 source checks need attention");
    expect(html).toContain("Sold vs Allocated");
    expect(html).toContain("By Department");
    expect(html).toContain("Quick");
    expect(html).toContain("Full year");
    expect(html).toContain("Q1");
    expect(html).toContain("Month");
    expect(html).toContain("Custom");
    expect(html).toContain("Data coverage");
    expect(html).toContain("Float sync warnings");
    expect(html).toContain("Why is this lower than Float?");
    expect(html).toContain("Sold vs Allocated Hours by Department");
    expect(html).toContain("Variance %");
    expect(html).toContain("861h");
  });
});
