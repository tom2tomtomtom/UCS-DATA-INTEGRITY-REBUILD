import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { DataQualityDashboard } from "../../src/components/dashboard/data-quality/data-quality-dashboard";
import { getFixtureDashboardContract } from "../../src/lib/ui/fixture-contract";

describe("P6-E Data Quality", () => {
  test("shows integrity statuses, named checks, and source-owner warnings from contract evidence", () => {
    const contract = getFixtureDashboardContract();
    const html = renderToStaticMarkup(React.createElement(DataQualityDashboard, { contract }));

    expect(html).toContain("Data Quality");
    expect(html).toContain("FAIL");
    expect(html).toContain("WARN");
    expect(html).toContain("UNRESOLVED");
    expect(html).toContain("PCS00250");
    expect(html).toContain("BT raw/cache");
    expect(html).toContain("UCS04787");
    expect(html).toContain("UCS05186");
    expect(html).toContain("USA00262");
    expect(html).toContain("Yunni");
    expect(html).toContain("Needs Codex");
  });
});
