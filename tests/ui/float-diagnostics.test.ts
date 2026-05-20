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
    expect(html).toContain("UCS04787");
    expect(html).toContain("11413929");
    expect(html).toContain("PCS00250_RAW_CACHE_UNRESOLVED");
    expect(html).toContain("BT_RAW_CACHE_UNRESOLVED");
    expect(html).toContain("UCS05186");
    expect(html).toContain("manual-ucs05186");
    expect(html).toContain("archived");
    expect(html).toContain("FLOAT_INACTIVE_VISIBLE_HOURS");
    expect(html).toContain("Float Export Compare");
    expect(html).toContain("No pasted export yet");
    expect(html).toContain("Pasted sample");
    expect(html).toContain("Ambiguous match");
    expect(html).toContain("Dashboard-only rows missing from pasted export");
  });
});
