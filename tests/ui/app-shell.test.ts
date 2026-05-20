import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { DashboardChrome } from "../../src/components/dashboard/chrome/dashboard-chrome";
import { getFixtureDashboardContract } from "../../src/lib/ui/fixture-contract";

describe("P6-A dashboard app shell", () => {
  test("renders dashboard chrome from an explicit display contract fixture", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      department: "Design"
    });

    const html = renderToStaticMarkup(
      React.createElement(
        DashboardChrome,
        {
          contract,
          activePath: "/dashboard"
        },
        React.createElement("section", null, "Contract-backed page")
      )
    );

    expect(html).toContain("UCS Commercial Dashboard");
    expect(html).toContain("LDN");
    expect(html).toContain("2026-01-01");
    expect(html).toContain("2026-03-31");
    expect(html).toContain("Design");
    expect(html).toContain("Department Rollup");
    expect(html).toContain("Projects");
    expect(html).toContain("Float");
    expect(html).toContain("Ask AI");
    expect(html).toContain("Contract-backed page");
    expect(contract.visibleRows.length).toBeGreaterThan(0);
    expect(contract.visibleRows[0]?.sourceTrace.length).toBeGreaterThan(0);
  });
});
