import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { FloatDiagnostics } from "../../src/components/dashboard/float/float-diagnostics";
import { getFixtureDashboardContract } from "../../src/lib/ui/fixture-contract";

describe("P6-D Float diagnostics", () => {
  test("renders raw/cache/visible classification and named Float scenarios from contract evidence", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31"
    });
    const html = renderToStaticMarkup(React.createElement(FloatDiagnostics, { contract }));

    expect(html).toContain("Float Diagnostics");
    expect(html).toContain("Raw");
    expect(html).toContain("Cache");
    expect(html).toContain("Visible");
    expect(html).toContain("present");
    expect(html).toContain("missing");
    expect(html).toContain("UCS04787");
    expect(html).toContain("11413929");
    expect(html).toContain("PCS00250_RAW_CACHE_UNRESOLVED");
    expect(html).toContain("BT_RAW_CACHE_UNRESOLVED");
    expect(html).toContain("UCS05186");
    expect(html).toContain("manual-ucs05186");
    expect(html).toContain("archived");
    expect(html).toContain("FLOAT_INACTIVE_VISIBLE_HOURS");
    expect(html).toContain("Detail trace");
    expect(html).toContain("/dashboard/projects/UCS04787?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;jobNumber=UCS04787#float-trace");
    expect(html).toContain("Float Export Compare");
    expect(html).toContain("Search Float rows");
    expect(html).toContain("placeholder=\"Job, client, project, or Float ID\"");
    expect(html).toContain("No pasted export yet");
    expect(html).toContain("Compare export");
    expect(html).toContain("Fixed-width Hours");
    expect(html).toContain("Ambiguous match");
    expect(html).toContain("Dashboard-only rows missing from pasted export");
  });

  test("filters Float diagnostics rows by the active search scope", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      search: "Boldbean"
    });
    const html = renderToStaticMarkup(React.createElement(FloatDiagnostics, { contract }));

    expect(html).toContain("value=\"Boldbean\"");
    expect(html).toContain("UCS05186");
    expect(html).toContain("Boldbean Brand Platform");
    expect(html).not.toContain("British Airways");
    expect(html).not.toContain("PCS00250 New Biz");
  });

  test("shows focused Float ID state on the Float detail route", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      floatProjectId: "11413929"
    });
    const html = renderToStaticMarkup(React.createElement(FloatDiagnostics, { contract }));

    expect(html).toContain("Focused Float ID: 11413929");
    expect(html).toContain("UCS04787");
    expect(html).toContain("11413929");
  });

  test("renders pasted Float export comparison results without writing data", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31"
    });
    const html = renderToStaticMarkup(
      React.createElement(FloatDiagnostics, {
        contract,
        pastedFloatExport: "Project Code,Project,Hours\nUCS05186,Boldbean,2102.4"
      })
    );

    expect(html).toContain("2 dashboard rows matched");
    expect(html).toContain("ambiguous_dashboard_match");
    expect(html).toContain("dashboard_missing_from_export");
    expect(html).toContain("Export hours");
    expect(html).toContain("Dashboard hours");
    expect(html).toContain("Delta");
    expect(html).toContain("Compare export");
  });

  test("preserves combined office scope through the export compare form", () => {
    const contract = getFixtureDashboardContract({
      office: "ALL",
      offices: ["LDN", "UCX"],
      from: "2026-01-01",
      to: "2026-03-31"
    });
    const html = renderToStaticMarkup(React.createElement(FloatDiagnostics, { contract }));

    expect(html).toContain("type=\"hidden\" name=\"office\" value=\"ALL\"");
    expect(html).toContain("type=\"hidden\" name=\"offices\" value=\"LDN,UCX\"");
    expect(html).toContain(
      "/dashboard/projects/UCS04787?office=ALL&amp;from=2026-01-01&amp;to=2026-03-31&amp;offices=LDN%2CUCX&amp;jobNumber=UCS04787#float-trace"
    );
  });
});
