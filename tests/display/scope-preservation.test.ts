import { describe, expect, test } from "vitest";

import type { DashboardScope } from "../../src/lib/canon/types";
import {
  preserveScopeForLink,
  scopedHref,
  scopeForRollupDrilldown,
  scopeToSearchParams
} from "../../src/lib/display/rollups";

describe("P5-C scope preservation helpers", () => {
  test("preserves office, dates, department, role, client, and job number in link params", () => {
    const scope: DashboardScope = {
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      department: "Design",
      role: "Senior Designer",
      client: "Acme Studios",
      jobNumber: "UCS04787"
    };

    const params = scopeToSearchParams(scope);

    expect(params.get("office")).toBe("LDN");
    expect(params.get("from")).toBe("2026-01-01");
    expect(params.get("to")).toBe("2026-03-31");
    expect(params.get("department")).toBe("Design");
    expect(params.get("role")).toBe("Senior Designer");
    expect(params.get("client")).toBe("Acme Studios");
    expect(params.get("jobNumber")).toBe("UCS04787");
  });

  test("adds project detail state without dropping the active slice", () => {
    const baseScope: DashboardScope = {
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      department: "Design",
      role: "Senior Designer",
      client: "Acme Studios"
    };

    expect(preserveScopeForLink(baseScope, { jobNumber: "UCS04787" })).toEqual({
      ...baseScope,
      jobNumber: "UCS04787"
    });
    expect(scopedHref("/dashboard/projects/UCS04787", baseScope, { jobNumber: "UCS04787" })).toBe(
      "/dashboard/projects/UCS04787?office=LDN&from=2026-01-01&to=2026-03-31&department=Design&role=Senior+Designer&client=Acme+Studios&jobNumber=UCS04787"
    );
  });

  test("uses exact client state for client drilldown and does not convert it into search", () => {
    const baseScope: DashboardScope = {
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      search: "Acme"
    };

    const clientScope = scopeForRollupDrilldown(baseScope, "client", "Acme Studios");

    expect(clientScope).toEqual({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      client: "Acme Studios"
    });
  });
});
