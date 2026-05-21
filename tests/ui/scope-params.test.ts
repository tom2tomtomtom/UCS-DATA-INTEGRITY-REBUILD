import { describe, expect, test } from "vitest";

import { scopeFromSearchParams } from "../../src/lib/ui/scope-params";

describe("P6-H UI scope params", () => {
  test("preserves the active dashboard scope for destination pages", () => {
    expect(
      scopeFromSearchParams({
        office: "USA",
        from: "2026-04-01",
        to: "2026-04-30",
        department: "Design",
        role: "Designer",
        client: "Acme Studios",
        search: "launch",
        jobNumber: "UCS04787",
        floatProjectId: "11413929"
      })
    ).toEqual({
      office: "USA",
      from: "2026-04-01",
      to: "2026-04-30",
      department: "Design",
      role: "Designer",
      client: "Acme Studios",
      search: "launch",
      jobNumber: "UCS04787",
      floatProjectId: "11413929"
    });
  });

  test("applies route identity overrides without dropping the rest of the scope", () => {
    expect(
      scopeFromSearchParams(
        {
          office: "LDN",
          from: "2026-01-01",
          to: "2026-03-31",
          department: "Design",
          client: "British Airways"
        },
        {
          jobNumber: "UCS04787"
        }
      )
    ).toEqual({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      department: "Design",
      client: "British Airways",
      jobNumber: "UCS04787"
    });
  });

  test("normalises legacy Agency office URLs to the internal agency scope", () => {
    expect(
      scopeFromSearchParams({
        office: "Agency",
        from: "2026-01-01",
        to: "2026-12-31"
      })
    ).toEqual({
      office: "ALL",
      from: "2026-01-01",
      to: "2026-12-31"
    });
  });

  test("uses combined offices as first-class scope when offices param is present", () => {
    expect(
      scopeFromSearchParams({
        office: "USA",
        offices: "LDN,UCX",
        from: "2026-01-01",
        to: "2026-03-31"
      })
    ).toEqual({
      office: "ALL",
      offices: ["LDN", "UCX"],
      from: "2026-01-01",
      to: "2026-03-31"
    });
  });
});
