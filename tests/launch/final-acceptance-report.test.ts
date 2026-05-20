import fs from "node:fs";

import { describe, expect, test } from "vitest";

const reportPath = "docs/FINAL_ACCEPTANCE_REPORT.md";

describe("P9-F final acceptance report", () => {
  test("exists and separates shipped code from deployment and stakeholder approval", () => {
    const report = fs.readFileSync(reportPath, "utf8");

    expect(report).toContain("Launch status: STAGING DEPLOYED, SOURCE APPROVAL PENDING");
    expect(report).toContain("Railway staging: PASS");
    expect(report).toContain("Live health: PASS");
    expect(report).toContain("Live readiness: PASS");
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

    expect(report).toContain("ee9738eb8cd471e5616c42e0c4dd9f4a2f57529c");
    expect(report).toContain("26193100449");
    expect(report).toContain("c823163d-4f4b-4571-8347-e63ed88032e4");
    expect(report).toContain("https://ucs-data-integrity-rebuild-staging.up.railway.app");
    expect(report).toContain("reference/ui/fixture-app/manifest.json");
    expect(report).not.toContain("DATABASE_URL=");
    expect(report).not.toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(report).not.toContain("postgres://");
    expect(report).not.toContain("postgresql://");
  });
});
