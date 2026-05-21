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
    expect(html).toContain("No production cutover");
    expect(html).toContain("Source approval: NOT APPROVED");
    expect(html).toContain("Stakeholder approval: NOT APPROVED");
    expect(html).toContain("WARN is not approval");
    expect(html).toContain("Named scenario gate:");
    expect(html).toContain("4 named scenarios still block approval.");
    expect(html).toContain("Pass 7");
    expect(html).toContain("Warn 4");
    expect(html).toContain("Fail 0");
    expect(html).toContain("Blocking scenarios: ucs04787, ucs05186, pcs00250, bt-raw-without-cache.");
    expect(html).toContain("PASS gates");
    expect(html).toContain("WARN gates");
    expect(html).toContain("FAIL gates");
    expect(html).toContain("Named scenario evidence");
    expect(html).toContain("Sian");
    expect(html).toContain("Yunni");
    expect(html).toContain("Jade");
    expect(html).toContain("PASS: Same Scope, Same Number");
    expect(html).toContain("WARN: Source Approval");
    expect(html).toContain("WARN: Stakeholder Approval");
    expect(html).toContain("FAIL: Production Cutover");
    expect(html).toContain("Rows reviewed");
    expect(html).toContain("UCS04787");
    expect(html).toContain("source trace");
    expect(html).toContain("unsupported is not zero");
    expect(html).toContain("source-only rows remain visible");
    expect(html).toContain("Needs Codex");
  });
});
