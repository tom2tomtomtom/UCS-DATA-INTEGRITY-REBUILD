import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { DashboardHome } from "../../src/components/dashboard/rollups/dashboard-home";
import { buildRollupCsvText, buildRollupFooter } from "../../src/lib/display/rollup-export";
import type { MetricValue } from "../../src/lib";
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
    expect(html).toContain("Download rollup CSV");
    expect(html).toContain("download=\"ucs-dashboard-department-rollup.csv\"");
    expect(html).toContain("Sold (£) ▼");
    expect(html).toContain("href=\"/dashboard?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;view=department&amp;sort=soldFee&amp;dir=asc\"");
    expect(html).toContain("Confidence");
  });

  test("renders primary rollup footer and CSV from the same rollup rows", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31"
    });
    const html = renderToStaticMarkup(React.createElement(DashboardHome, { contract }));
    const footer = buildRollupFooter(contract.rollups.byDepartment);
    const csv = buildRollupCsvText(contract.rollups.byDepartment);

    expect(html).toContain("<tfoot>");
    expect(html).toContain("<td>Total</td>");
    expect(html).toContain("£275,947");
    expect(html).toContain("540h");
    expect(html).toContain("2,963.4h");
    expect(csv).toContain("label,pipelineGbp,soldGbp,soldHours,allocatedHours,unallocatedHours,totalHours");
    expect(csv).toContain("Total");
    expect(csv).toContain(String(metricNumber(footer.soldFee)));
    expect(csv).toContain(String(metricNumber(footer.totalHours)));
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
    expect(html).toContain("Unallocated (hrs)");
    expect(html).toContain("Total (hrs)");
    expect(html).toContain("Allocated (£)");
    expect(html).toContain("Variance %");
    expect(html).toContain("861h");
    expect(html).toContain("1,051.4h + unclassified");
  });

  test("renders the legacy Sheet Health diagnostic groups without hiding rows", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31"
    });
    const html = renderToStaticMarkup(React.createElement(DashboardHome, { contract }));

    expect(html).toContain("read/source warnings - sheet unreachable, layout drift, or source evidence gaps");
    expect(html).toContain("monthly/source reconciliation warnings - source totals disagree across layers");
    expect(html).toContain("role-section reconciliation warnings - role-detail rows or attribution limits need review");
    expect(html).toContain("These rows still surface.");
    expect(html).toContain("Review evidence");
    expect(html).toContain("Open evidence");
    expect(html).toContain("href=\"/dashboard/projects/UCS04787?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;jobNumber=UCS04787&amp;floatProjectId=11413929\"");
  });

  test("uses the URL-selected rollup view for the primary table", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31"
    });
    const html = renderToStaticMarkup(React.createElement(DashboardHome, { contract, view: "client" }));

    expect(html).toContain("aria-label=\"Client Rollup table\"");
    expect(html).toContain(">Client<");
    expect(html).toContain("aria-current=\"page\">By Client");
    expect(html).toContain("href=\"/dashboard/projects?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;client=British+Airways\"");
    expect(html).toContain("href=\"/dashboard?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;view=department\"");
    expect(html).toContain("href=\"/dashboard?office=LDN&amp;from=2026-04-01&amp;to=2026-06-30&amp;view=client\">Q2");
  });

  test("sorts the primary rollup table through URL state without changing secondary tables", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31"
    });
    const html = renderToStaticMarkup(React.createElement(DashboardHome, { contract, sortKey: "label", sortDir: "asc" }));

    expect(html).toContain("Department ▲");
    expect(html).toContain("href=\"/dashboard?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;view=department&amp;sort=label&amp;dir=desc\"");
    expect(html.indexOf("Design")).toBeLessThan(html.indexOf("Strategy"));
  });
});

function metricNumber(value: MetricValue): number {
  if (value.kind === "money") return value.value.amountGbp;
  if (value.kind === "hours" || value.kind === "count") return value.value;
  return 0;
}
