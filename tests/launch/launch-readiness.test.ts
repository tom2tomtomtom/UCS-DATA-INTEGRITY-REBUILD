import { execFileSync } from "node:child_process";
import { describe, expect, test } from "vitest";

import { buildLaunchReadinessReport } from "../../src/lib/launch/readiness";

const requiredEnvExample = [
  "APP_ENV",
  "MUTATION_GUARD",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "GOOGLE_SERVICE_ACCOUNT_KEY",
  "FEE_TRACKER_SPREADSHEET_ID",
  "FLOAT_API_KEY",
  "ANTHROPIC_API_KEY",
  "CRON_SECRET"
].map((name) => (name === "MUTATION_GUARD" ? `${name}=read_only` : `${name}=`)).join("\n");

describe("P9-A launch readiness no-deploy gate", () => {
  test("blocks launch until health and readiness routes exist", () => {
    const report = buildLaunchReadinessReport({
      packageScripts: {
        build: "npm run verify:phase8",
        "verify:phase9": "npm run build && node scripts/verify-phase9.mjs"
      },
      envExample: requiredEnvExample,
      routeFiles: [],
      railwayMutatingCommandsRun: []
    });

    expect(report.status).toBe("fail");
    expect(report.blockers.map((blocker) => blocker.code)).toEqual([
      "HEALTH_ROUTE_MISSING",
      "READINESS_ROUTE_MISSING"
    ]);
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "BUILD_GATES_PHASE8", status: "pass" }),
        expect.objectContaining({ code: "VERIFY_PHASE9_SCRIPT", status: "pass" }),
        expect.objectContaining({ code: "NO_RAILWAY_MUTATION", status: "pass" })
      ])
    );
  });

  test("fails if launch scripts include deploy sync migration or source mutation commands", () => {
    const report = buildLaunchReadinessReport({
      packageScripts: {
        build: "npm run verify:phase8",
        "verify:phase9": "npm run build && node scripts/verify-phase9.mjs",
        deploy: "railway up",
        sync: "supabase db push"
      },
      envExample: requiredEnvExample,
      routeFiles: ["app/api/health/route.ts", "app/api/readiness/route.ts"],
      railwayMutatingCommandsRun: ["railway up"]
    });

    expect(report.status).toBe("fail");
    expect(report.blockers.map((blocker) => blocker.code)).toEqual(
      expect.arrayContaining(["FORBIDDEN_SCRIPT_DEPLOY", "FORBIDDEN_SCRIPT_SYNC", "RAILWAY_MUTATION_ALREADY_RUN"])
    );
  });

  test("passes readiness gate when scripts env and routes are present without deployment", () => {
    const report = buildLaunchReadinessReport({
      packageScripts: {
        build: "npm run verify:phase8",
        "verify:phase9": "npm run build && node scripts/verify-phase9.mjs"
      },
      envExample: requiredEnvExample,
      routeFiles: ["app/api/health/route.ts", "app/api/readiness/route.ts"],
      railwayMutatingCommandsRun: []
    });

    expect(report.status).toBe("pass");
    expect(report.blockers).toEqual([]);
  });

  test("script emits safe JSON with explicit readiness status and no secret values", () => {
    const output = execFileSync("node", ["scripts/launch-readiness-report.mjs"], { encoding: "utf8" });
    const report = JSON.parse(output) as ReturnType<typeof buildLaunchReadinessReport>;

    expect(["pass", "warn", "fail"]).toContain(report.status);
    const checkCodes = report.checks.map((check) => check.code);

    expect(checkCodes).toEqual(expect.arrayContaining(["BUILD_GATES_PHASE8", "VERIFY_PHASE9_SCRIPT", "NO_RAILWAY_MUTATION"]));
    expect(checkCodes.some((code) => code === "HEALTH_ROUTE" || code === "HEALTH_ROUTE_MISSING")).toBe(true);
    expect(checkCodes.some((code) => code === "READINESS_ROUTE" || code === "READINESS_ROUTE_MISSING")).toBe(true);
    expect(output).not.toContain("postgres://");
    expect(output).not.toContain("service_role");
    expect(output).not.toContain("GOOGLE_SERVICE_ACCOUNT_KEY:");
    expect(output).not.toContain("FLOAT_API_KEY:");
  }, 15000);
});
