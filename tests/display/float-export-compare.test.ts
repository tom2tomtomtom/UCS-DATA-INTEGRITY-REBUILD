import { describe, expect, test } from "vitest";

import {
  compareFloatExportToDashboard,
  dashboardFloatRowsFromContract,
  parseFloatExport
} from "../../src/lib/display/float-export-compare";
import { getFixtureDashboardContract } from "../../src/lib/ui/fixture-contract";

describe("Float export compare", () => {
  test("parses fixed-width Float exports with an Hours header", () => {
    const parsed = parseFloatExport(
      [
        "Person           Role              Department        Client              Project                  Project Code    Hours",
        "Shaun Rogers     MOTION DESIGNER   LDN Design        British Airways     BA MARCH MADNESS         UCS04787        861",
        "A Person         DESIGNER          LDN Design        Boldbean            BOLDBEAN PLATFORM        UCS05186        1,051.4"
      ].join("\n")
    );

    expect(parsed).toEqual([
      { key: "UCS04787", label: "BA MARCH MADNESS", hours: 861 },
      { key: "UCS05186", label: "BOLDBEAN PLATFORM", hours: 1051.4 }
    ]);
  });

  test("flags duplicate dashboard matches as ambiguous rather than merging them silently", () => {
    const contract = getFixtureDashboardContract({ office: "LDN", from: "2026-01-01", to: "2026-03-31" });
    const dashboardRows = dashboardFloatRowsFromContract(contract);
    const parsed = parseFloatExport("Project Code,Project,Hours\nUCS05186,Boldbean,2102.4");
    const comparison = compareFloatExportToDashboard(parsed, dashboardRows).find((row) => row.key === "UCS05186");

    expect(comparison?.status).toBe("warn");
    expect(comparison?.issue).toBe("ambiguous_dashboard_match");
    expect(comparison?.dashboardMatches).toHaveLength(2);
    expect(comparison?.dashboardHours).toBe(2102.4);
  });

  test("reports dashboard Float rows that are missing from the pasted export", () => {
    const contract = getFixtureDashboardContract({ office: "LDN", from: "2026-01-01", to: "2026-03-31" });
    const dashboardRows = dashboardFloatRowsFromContract(contract);
    const parsed = parseFloatExport("Project Code,Project,Hours\nUCS04787,BA March Madness,861");
    const comparisons = compareFloatExportToDashboard(parsed, dashboardRows);

    expect(comparisons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "11413292",
          issue: "dashboard_missing_from_export",
          status: "fail",
          dashboardHours: 1051.4
        }),
        expect.objectContaining({
          key: "manual-ucs05186",
          issue: "dashboard_missing_from_export",
          status: "fail",
          dashboardHours: 1051
        })
      ])
    );
  });
});
