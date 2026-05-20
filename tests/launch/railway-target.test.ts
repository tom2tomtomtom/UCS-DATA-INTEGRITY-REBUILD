import { execFileSync } from "node:child_process";

import { describe, expect, test } from "vitest";

import { buildRailwayTargetReport } from "../../src/lib/launch/railway-target";

const expected = {
  projectName: "UCS Data Integrity Rebuild",
  serviceName: "ucs-data-integrity-rebuild",
  rebuildSupabaseRef: "nxrzhwqsswhjgeouxsyr",
  forbiddenTargetNeedles: ["ucs-commercial-dashboard", "old ucs dashboard"]
} as const;

const safeEnvPlan = {
  databaseUrl: "postgresql://postgres:secret@db.nxrzhwqsswhjgeouxsyr.supabase.co:5432/postgres",
  legacyDatabaseUrl: "postgresql://postgres:secret@db.legacy-ref.supabase.co:5432/postgres",
  nextPublicSupabaseUrl: "https://nxrzhwqsswhjgeouxsyr.supabase.co",
  intendedDomainAction: "railway_generated" as const,
  productionDomainCutoverApproved: false
};

describe("P9-C Railway target and env verification", () => {
  test("fails until railway status has been inspected and linked to a target", () => {
    const report = buildRailwayTargetReport({
      expected,
      railway: {
        statusInspected: true,
        linked: false,
        statusMessage: "No linked project found. Run railway link to connect to a project"
      },
      envPlan: safeEnvPlan,
      railwayMutatingCommandsRun: []
    });

    expect(report.status).toBe("fail");
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "RAILWAY_PROJECT_NOT_LINKED", status: "fail" })
      ])
    );
    expect(report.summary.targetLinked).toBe(false);
  });

  test("fails if the linked Railway target looks like the old dashboard service", () => {
    const report = buildRailwayTargetReport({
      expected,
      railway: {
        statusInspected: true,
        linked: true,
        projectName: "UCS Commercial Dashboard",
        serviceName: "ucs-commercial-dashboard",
        environmentName: "production"
      },
      envPlan: safeEnvPlan,
      railwayMutatingCommandsRun: []
    });

    expect(report.status).toBe("fail");
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "RAILWAY_TARGET_FORBIDDEN", status: "fail" }),
        expect.objectContaining({ code: "RAILWAY_PROJECT_UNCONFIRMED", status: "fail" }),
        expect.objectContaining({ code: "RAILWAY_SERVICE_UNCONFIRMED", status: "fail" })
      ])
    );
  });

  test("passes when the rebuild service is linked and env plan keeps the old DB out of DATABASE_URL", () => {
    const report = buildRailwayTargetReport({
      expected,
      railway: {
        statusInspected: true,
        linked: true,
        projectName: "UCS Data Integrity Rebuild",
        serviceName: "ucs-data-integrity-rebuild",
        environmentName: "staging"
      },
      envPlan: safeEnvPlan,
      railwayMutatingCommandsRun: []
    });

    expect(report.status).toBe("pass");
    expect(report.blockers).toEqual([]);
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "RAILWAY_TARGET_REBUILD", status: "pass" }),
        expect.objectContaining({ code: "DATABASE_URL_REBUILD_SUPABASE", status: "pass" }),
        expect.objectContaining({ code: "LEGACY_DATABASE_URL_COMPARISON_ONLY", status: "pass" }),
        expect.objectContaining({ code: "PRODUCTION_DOMAIN_NOT_CUT_OVER", status: "pass" }),
        expect.objectContaining({ code: "NO_RAILWAY_MUTATION", status: "pass" })
      ])
    );
  });

  test("fails if env plan points DATABASE_URL away from the rebuild Supabase or reuses legacy", () => {
    const report = buildRailwayTargetReport({
      expected,
      railway: {
        statusInspected: true,
        linked: true,
        projectName: "UCS Data Integrity Rebuild",
        serviceName: "ucs-data-integrity-rebuild",
        environmentName: "staging"
      },
      envPlan: {
        ...safeEnvPlan,
        databaseUrl: "postgresql://postgres:secret@db.legacy-ref.supabase.co:5432/postgres",
        legacyDatabaseUrl: "postgresql://postgres:secret@db.legacy-ref.supabase.co:5432/postgres"
      },
      railwayMutatingCommandsRun: []
    });

    expect(report.status).toBe("fail");
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DATABASE_URL_NOT_REBUILD_SUPABASE", status: "fail" }),
        expect.objectContaining({ code: "DATABASE_URL_MATCHES_LEGACY", status: "fail" })
      ])
    );
  });

  test("fails production domain cutover and Railway mutation before explicit deploy approval", () => {
    const report = buildRailwayTargetReport({
      expected,
      railway: {
        statusInspected: true,
        linked: true,
        projectName: "UCS Data Integrity Rebuild",
        serviceName: "ucs-data-integrity-rebuild",
        environmentName: "production"
      },
      envPlan: {
        ...safeEnvPlan,
        intendedDomainAction: "production_cutover"
      },
      railwayMutatingCommandsRun: ["railway up"]
    });

    expect(report.status).toBe("fail");
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "PRODUCTION_DOMAIN_CUTOVER_UNAPPROVED", status: "fail" }),
        expect.objectContaining({ code: "RAILWAY_MUTATION_ALREADY_RUN", status: "fail" })
      ])
    );
  });

  test("script emits a safe Railway readiness report without secret values", () => {
    const output = execFileSync("node", ["scripts/railway-readiness-report.mjs"], { encoding: "utf8" });
    const report = JSON.parse(output) as ReturnType<typeof buildRailwayTargetReport>;

    expect(["pass", "warn", "fail"]).toContain(report.status);
    expect(report.checks.map((check) => check.code)).toEqual(
      expect.arrayContaining(["RAILWAY_STATUS_INSPECTED", "NO_RAILWAY_MUTATION"])
    );
    expect(output).not.toContain("postgresql://");
    expect(output).not.toContain("postgres://");
    expect(output).not.toContain("service_role");
    expect(output).not.toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(output).not.toContain("FLOAT_API_KEY=");
  });
});
