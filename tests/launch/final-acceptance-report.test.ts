import fs from "node:fs";

import { describe, expect, test } from "vitest";

const reportPath = "docs/FINAL_ACCEPTANCE_REPORT.md";

describe("P9-F final acceptance report", () => {
  test("exists and separates shipped code from deployment and stakeholder approval", () => {
    const report = fs.readFileSync(reportPath, "utf8");

    expect(report).toContain("Launch status: NOT READY");
    expect(report).toContain("Railway staging: BLOCKED");
    expect(report).toContain("Code and CI: PASS");
    expect(report).toContain("Source approval: NOT APPROVED");
    expect(report).toContain("Stakeholder approval: NOT APPROVED");
    expect(report).toContain("deployed");
    expect(report).toContain("healthy");
    expect(report).toContain("source-approved");
    expect(report).toContain("stakeholder-approved");
  });

  test("records current evidence without leaking secrets", () => {
    const report = fs.readFileSync(reportPath, "utf8");

    expect(report).toContain("026cbee");
    expect(report).toContain("26187535895");
    expect(report).toContain("RAILWAY_PROJECT_NOT_LINKED");
    expect(report).toContain("reference/ui/fixture-app/manifest.json");
    expect(report).not.toContain("DATABASE_URL=");
    expect(report).not.toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(report).not.toContain("postgres://");
    expect(report).not.toContain("postgresql://");
  });
});
