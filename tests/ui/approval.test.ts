import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { ApprovalDashboard } from "../../src/components/dashboard/approval/approval-dashboard";
import { getFixtureDashboardContract } from "../../src/lib/ui/fixture-contract";

describe("P6-E Approval", () => {
  test("renders approval rows and glossary language from display contract approval output", () => {
    const contract = getFixtureDashboardContract();
    const html = renderToStaticMarkup(React.createElement(ApprovalDashboard, { contract }));

    expect(html).toContain("Approval Audit");
    expect(html).toContain("Rows reviewed");
    expect(html).toContain("UCS04787");
    expect(html).toContain("source trace");
    expect(html).toContain("unsupported is not zero");
    expect(html).toContain("source-only rows remain visible");
    expect(html).toContain("Needs Codex");
  });
});
