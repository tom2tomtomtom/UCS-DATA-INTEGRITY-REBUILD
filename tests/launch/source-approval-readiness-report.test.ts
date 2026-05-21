import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

const fullEnv = [
  "APP_ENV=staging",
  "MUTATION_GUARD=read_only",
  "DATABASE_URL=postgresql://postgres:supersecret@db.nxrzhwqsswhjgeouxsyr.supabase.co:5432/postgres",
  "LEGACY_DATABASE_URL=postgresql://postgres:legacysecret@aws-1-eu-west-2.pooler.supabase.com:5432/postgres",
  "NEXT_PUBLIC_SUPABASE_URL=https://nxrzhwqsswhjgeouxsyr.supabase.co",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=anonsecret",
  "SUPABASE_SERVICE_ROLE_KEY=service_role_secret",
  "GOOGLE_SERVICE_ACCOUNT_KEY=google_json_secret",
  "FEE_TRACKER_SPREADSHEET_ID=fee_sheet_id",
  "PIPELINE_SHEET_ID=pipeline_sheet_id",
  "PRODUCTION_REVENUE_SHEET_ID=production_revenue_sheet_id",
  "FLOAT_API_KEY=float_secret",
  "ANTHROPIC_API_KEY=anthropic_secret"
].join("\n");

describe("Phase 10 source approval readiness report", () => {
  test("reports missing source stream env as blockers without leaking values", () => {
    const output = runReport({
      SOURCE_APPROVAL_ENV_TEXT: fullEnv
        .replace("PIPELINE_SHEET_ID=pipeline_sheet_id", "PIPELINE_SHEET_ID=")
        .replace("PRODUCTION_REVENUE_SHEET_ID=production_revenue_sheet_id", "PRODUCTION_REVENUE_SHEET_ID=")
    });
    const report = JSON.parse(output);

    expect(report.status).toBe("fail");
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "PIPELINE_STREAM_CONFIGURED_BLOCKED" }),
        expect.objectContaining({ code: "PRODUCTION_REVENUE_STREAM_CONFIGURED_BLOCKED" }),
        expect.objectContaining({ code: "SOURCE_SNAPSHOTS_READY_BLOCKED" }),
        expect.objectContaining({ code: "STAKEHOLDER_APPROVAL_COMPLETE_BLOCKED" })
      ])
    );
    expect(output).not.toContain("supersecret");
    expect(output).not.toContain("legacysecret");
    expect(output).not.toContain("service_role_secret");
    expect(output).not.toContain("float_secret");
    expect(output).not.toContain("google_json_secret");
  });

  test("passes when all source streams, snapshots, UI spec, and stakeholder approval are ready", () => {
    const output = runReport({
      SOURCE_APPROVAL_ENV_TEXT: fullEnv,
      SOURCE_SNAPSHOT_STATUS: "ready",
      UI_PARITY_SPEC_STATUS: "ready",
      STAKEHOLDER_APPROVAL_STATUS: "approved"
    });
    const report = JSON.parse(output);

    expect(report.status).toBe("pass");
    expect(report.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "sold", status: "pass" }),
        expect.objectContaining({ name: "pipeline", status: "pass" }),
        expect.objectContaining({ name: "production_revenue", status: "pass" }),
        expect.objectContaining({ name: "float", status: "pass" })
      ])
    );
  });

  test("blocks production cutover before approval", () => {
    const output = runReport({
      SOURCE_APPROVAL_ENV_TEXT: fullEnv,
      SOURCE_SNAPSHOT_STATUS: "ready",
      UI_PARITY_SPEC_STATUS: "ready",
      PRODUCTION_CUTOVER_STATUS: "cut_over"
    });
    const report = JSON.parse(output);

    expect(report.status).toBe("fail");
    expect(report.blockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "PRODUCTION_CUTOVER_BEFORE_APPROVAL" })])
    );
  });

  test("uses Railway-injected env instead of stale local env text", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "source-approval-env-"));
    const envFile = path.join(tempDir, ".env.local");
    fs.writeFileSync(
      envFile,
      fullEnv
        .replace("PIPELINE_SHEET_ID=pipeline_sheet_id", "PIPELINE_SHEET_ID=")
        .replace("PRODUCTION_REVENUE_SHEET_ID=production_revenue_sheet_id", "PRODUCTION_REVENUE_SHEET_ID=")
    );

    const output = runReport({
      ...envObjectFromText(fullEnv),
      SOURCE_APPROVAL_ENV_FILE: envFile,
      RAILWAY_PROJECT_ID: "railway_project",
      RAILWAY_ENVIRONMENT_ID: "railway_environment",
      SOURCE_SNAPSHOT_STATUS: "ready",
      UI_PARITY_SPEC_STATUS: "ready",
      STAKEHOLDER_APPROVAL_STATUS: "approved"
    });
    const report = JSON.parse(output);

    expect(report.status).toBe("pass");
    expect(report.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "pipeline", status: "pass" }),
        expect.objectContaining({ name: "production_revenue", status: "pass" })
      ])
    );
  });
});

function runReport(env: Record<string, string>): string {
  return execFileSync("node", ["scripts/source-approval-readiness-report.mjs"], {
    encoding: "utf8",
    env: {
      ...process.env,
      ...env
    }
  });
}

function envObjectFromText(text: string): Record<string, string> {
  return Object.fromEntries(
    text.split("\n").map((line) => {
      const [key, ...value] = line.split("=");
      return [key, value.join("=")];
    })
  );
}
