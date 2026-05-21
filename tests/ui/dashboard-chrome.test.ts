import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { DashboardChrome } from "../../src/components/dashboard/chrome/dashboard-chrome";
import { getFixtureDashboardContract } from "../../src/lib/ui/fixture-contract";

describe("Phase 9.5 dashboard chrome parity", () => {
  test("surfaces office controls and preserves existing URL scope on office links", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      department: "Design",
      role: "Motion Designer",
      client: "British Airways",
      search: "BA",
      jobNumber: "UCS04787"
    });
    const html = renderChrome(contract);

    expect(html).toContain("aria-label=\"Office scope controls\"");
    expect(html).toContain("OFFICE");
    expect(html).toContain(">All</a>");
    expect(html).toContain(">LDN</a>");
    expect(html).toContain(">UCX</a>");
    expect(html).toContain(">USA</a>");
    expect(html).toContain("class=\"office-pill active\"");
    expect(html).toContain(
      "href=\"/dashboard/projects?office=UCX&amp;from=2026-01-01&amp;to=2026-03-31&amp;department=Design&amp;role=Motion+Designer&amp;client=British+Airways&amp;search=BA&amp;jobNumber=UCS04787\""
    );
  });

  test("clear filters resets office and optional filters without dropping the current date scope", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      department: "Design",
      client: "British Airways",
      jobNumber: "UCS04787"
    });
    const html = renderChrome(contract);

    expect(html).toContain(
      "href=\"/dashboard/projects?office=ALL&amp;from=2026-01-01&amp;to=2026-03-31\">Clear all filters"
    );
  });

  test("clear filters is disabled when the chrome is already at agency scope with no optional filters", () => {
    const contract = getFixtureDashboardContract({
      office: "ALL",
      from: "2026-01-01",
      to: "2026-03-31"
    });
    const html = renderChrome(contract);

    expect(html).toContain("Office: Agency");
    expect(html).toContain("class=\"office-pill active\"");
    expect(html).toContain("aria-disabled=\"true\">Clear all filters");
  });

  test("preserves page presentation params on office and clear-filter links", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      department: "Design"
    });
    const html = renderChrome(contract, { pview: "calendar", view: "role" });

    expect(html).toContain(
      "href=\"/dashboard/projects?office=USA&amp;from=2026-01-01&amp;to=2026-03-31&amp;department=Design&amp;pview=calendar&amp;view=role\""
    );
    expect(html).toContain(
      "href=\"/dashboard/projects?office=ALL&amp;from=2026-01-01&amp;to=2026-03-31&amp;pview=calendar&amp;view=role\">Clear all filters"
    );
  });

  test("labels sync as read-only/no-cutover and exposes a scoped Ask AI affordance", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      department: "Design"
    });
    const html = renderChrome(contract);

    expect(html).toContain("tomh@redbaez.com");
    expect(html).toMatch(/synced \d+ projects/);
    expect(html).toContain("No production cutover. Read-only source snapshot.");
    expect(html).toContain("Sync Now unavailable");
    expect(html).toContain("aria-label=\"Sync Now unavailable while the rebuild is read-only\"");
    expect(html).toContain("aria-label=\"Ask AI read-only evidence assistant\"");
    expect(html).toContain(
      "href=\"/dashboard/chat-demo?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;department=Design\""
    );
  });

  test("shows legacy-style data-quality badge and source alert banners", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31"
    });
    const html = renderChrome(contract);

    expect(html).toContain("class=\"nav-badge\"");
    expect(html).toContain("issues found in current contract");
    expect(html).toContain("View details");
    expect(html).toContain("Exchange rate warning:");
    expect(html).toContain("visible source gap");
  });

  test("preserves the full approved legacy nav route set", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31"
    });
    const html = renderChrome(contract);

    for (const marker of [
      "Department Rollup",
      "Projects",
      "Float",
      "Approval Audit",
      "Data Quality",
      "Glossary",
      "Sync Audit",
      "Sync Warnings",
      "Capacity Reduced",
      "Users"
    ]) {
      expect(html).toContain(marker);
    }

    for (const href of [
      "/dashboard/audit?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31",
      "/dashboard/admin/sync-warnings?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31",
      "/dashboard/admin/timeoffs?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31",
      "/dashboard/users?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31"
    ]) {
      expect(html).toContain(`href="${href}"`);
    }
  });

  test("keeps the global dashboard header persistent while scrolling", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const topbarRule = css.match(/\.dashboard-topbar\s*\{[^}]+\}/)?.[0] ?? "";

    expect(topbarRule).toContain("position: sticky");
    expect(topbarRule).toContain("top: 0");
    expect(topbarRule).toContain("z-index");
  });
});

function renderChrome(
  contract: ReturnType<typeof getFixtureDashboardContract>,
  extraScopeParams: Record<string, string | undefined> = {}
): string {
  return renderToStaticMarkup(
    React.createElement(
      DashboardChrome,
      {
        contract,
        activePath: "/dashboard/projects",
        extraScopeParams
      },
      React.createElement("section", null, "Contract-backed page")
    )
  );
}
