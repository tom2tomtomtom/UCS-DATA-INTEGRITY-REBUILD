import { describe, expect, test } from "vitest";

import { analyzeEnvironmentReadiness } from "../../src/lib/env/readiness";

describe("P8-A environment readiness", () => {
  test("passes when rebuild Supabase and legacy comparison DB are separated", () => {
    const result = analyzeEnvironmentReadiness(
      [
        "DATABASE_URL=postgresql://postgres:secret@db.nxrzhwqsswhjgeouxsyr.supabase.co:5432/postgres",
        "LEGACY_DATABASE_URL=postgresql://postgres:secret@aws-1-eu-west-2.pooler.supabase.com:5432/postgres",
        "NEXT_PUBLIC_SUPABASE_URL=https://nxrzhwqsswhjgeouxsyr.supabase.co",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY=anon",
        "SUPABASE_SERVICE_ROLE_KEY=service",
        "FLOAT_API_KEY=float",
        "GOOGLE_SERVICE_ACCOUNT_KEY=json",
        "FEE_TRACKER_SPREADSHEET_ID=fee",
        "MUTATION_GUARD=read_only"
      ].join("\n"),
      { rebuildSupabaseRef: "nxrzhwqsswhjgeouxsyr" }
    );

    expect(result.status).toBe("warn");
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DATABASE_URL_REBUILD_REF", severity: "pass" }),
        expect.objectContaining({ code: "LEGACY_DATABASE_DISTINCT", severity: "pass" }),
        expect.objectContaining({ code: "PIPELINE_SHEET_ID_MISSING", severity: "warn" }),
        expect.objectContaining({ code: "PRODUCTION_REVENUE_SHEET_ID_MISSING", severity: "warn" })
      ])
    );
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.stringify(result)).not.toContain("service");
  });

  test("fails when DATABASE_URL does not point at the rebuild Supabase ref", () => {
    const result = analyzeEnvironmentReadiness(
      [
        "DATABASE_URL=postgresql://postgres:secret@aws-1-eu-west-2.pooler.supabase.com:5432/postgres",
        "NEXT_PUBLIC_SUPABASE_URL=https://old-project.supabase.co",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY=anon",
        "SUPABASE_SERVICE_ROLE_KEY=service",
        "FLOAT_API_KEY=float",
        "GOOGLE_SERVICE_ACCOUNT_KEY=json",
        "FEE_TRACKER_SPREADSHEET_ID=fee",
        "MUTATION_GUARD=read_only"
      ].join("\n"),
      { rebuildSupabaseRef: "nxrzhwqsswhjgeouxsyr" }
    );

    expect(result.status).toBe("fail");
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DATABASE_URL_NOT_REBUILD_REF", severity: "fail" }),
        expect.objectContaining({ code: "LEGACY_DATABASE_URL_MISSING", severity: "warn" })
      ])
    );
  });

  test("fails if mutation guard is not read_only", () => {
    const result = analyzeEnvironmentReadiness(
      [
        "DATABASE_URL=postgresql://postgres:secret@db.nxrzhwqsswhjgeouxsyr.supabase.co:5432/postgres",
        "NEXT_PUBLIC_SUPABASE_URL=https://nxrzhwqsswhjgeouxsyr.supabase.co",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY=anon",
        "SUPABASE_SERVICE_ROLE_KEY=service",
        "FLOAT_API_KEY=float",
        "GOOGLE_SERVICE_ACCOUNT_KEY=json",
        "FEE_TRACKER_SPREADSHEET_ID=fee",
        "MUTATION_GUARD=write_enabled"
      ].join("\n"),
      { rebuildSupabaseRef: "nxrzhwqsswhjgeouxsyr" }
    );

    expect(result.status).toBe("fail");
    expect(result.findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "MUTATION_GUARD_NOT_READ_ONLY", severity: "fail" })])
    );
  });
});
