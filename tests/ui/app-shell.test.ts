import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import DashboardPage from "../../app/dashboard/page";
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

  test("dashboard route preserves explicit query scope in chrome and links", async () => {
    const element = await DashboardPage({
      searchParams: Promise.resolve({
        office: "LDN",
        from: "2026-01-01",
        to: "2026-12-31",
        department: "Design",
        role: "Motion Designer",
        client: "British Airways",
        search: "BA",
        jobNumber: "UCS04787"
      })
    });

    const html = renderToStaticMarkup(element);

    expect(html).toContain("2026-12-31");
    expect(html).toContain("Motion Designer");
    expect(html).toContain("British Airways");
    expect(html).toContain("UCS04787");
    expect(html).toContain(
      "href=\"/dashboard/projects?office=LDN&amp;from=2026-01-01&amp;to=2026-12-31&amp;department=Design&amp;role=Motion+Designer&amp;client=British+Airways&amp;search=BA&amp;jobNumber=UCS04787\""
    );
  });

  test("dashboard route preserves rollup view through office controls", async () => {
    const element = await DashboardPage({
      searchParams: Promise.resolve({
        office: "LDN",
        from: "2026-01-01",
        to: "2026-03-31",
        view: "client"
      })
    });

    const html = renderToStaticMarkup(element);

    expect(html).toContain(
      "href=\"/dashboard?office=USA&amp;from=2026-01-01&amp;to=2026-03-31&amp;view=client\""
    );
  });
});
