import { describe, expect, test } from "vitest";

import type { DashboardScope } from "../../src/lib/canon/types";
import { preserveScopeForLink, scopedHref, scopeForRollupDrilldown } from "../../src/lib/display/rollups";

const q1DesignScope: DashboardScope = {
  office: "LDN",
  from: "2026-01-01",
  to: "2026-03-31",
  department: "Design"
};

describe("Law 4: scope is explicit and preserved", () => {
  test("preserves office, date range, and department from rollup to Projects", () => {
    expect(scopeForRollupDrilldown(
      {
        office: "LDN",
        from: "2026-01-01",
        to: "2026-03-31"
      },
      "department",
      "Design"
    )).toEqual(q1DesignScope);
    expect(scopedHref("/dashboard/projects", q1DesignScope)).toBe(
      "/dashboard/projects?office=LDN&from=2026-01-01&to=2026-03-31&department=Design"
    );
  });

  test("preserves all active scope from Projects to project detail", () => {
    expect(scopedHref("/dashboard/projects/UCS04787", q1DesignScope, { jobNumber: "UCS04787" })).toBe(
      "/dashboard/projects/UCS04787?office=LDN&from=2026-01-01&to=2026-03-31&department=Design&jobNumber=UCS04787"
    );
  });

  test("uses exact client scope for client drilldown instead of fuzzy search", () => {
    const clientScope = scopeForRollupDrilldown(
      {
        office: "LDN",
        from: "2026-01-01",
        to: "2026-03-31",
        search: "BA"
      },
      "client",
      "British Airways"
    );

    expect(clientScope).toEqual({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      client: "British Airways"
    });
  });

  test("keeps Q1 and full-year scopes as separate evidence contexts", () => {
    const fullYear = preserveScopeForLink(q1DesignScope, {
      from: "2026-01-01",
      to: "2026-12-31"
    });

    expect(fullYear).toEqual({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-12-31",
      department: "Design"
    });
    expect(fullYear).not.toEqual(q1DesignScope);
  });

  test("preserves Float project ID through scoped drilldowns", () => {
    expect(preserveScopeForLink(q1DesignScope, {
      jobNumber: "UCS04787",
      floatProjectId: "11413929"
    })).toEqual({
      ...q1DesignScope,
      jobNumber: "UCS04787",
      floatProjectId: "11413929"
    });
  });
});
