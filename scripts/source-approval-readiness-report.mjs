#!/usr/bin/env node

import fs from "node:fs";

import { buildSourceApprovalReadinessReport } from "./lib/source-approval-readiness-report.mjs";
import { buildSourceSnapshotImportPlan } from "./lib/source-import-report.mjs";

const envText = readEnvText();

const report = buildSourceApprovalReadinessReport({
  envText,
  expected: {
    rebuildSupabaseRef: "nxrzhwqsswhjgeouxsyr"
  },
  uiSpecStatus: process.env.UI_PARITY_SPEC_STATUS ?? "pending",
  sourceSnapshotStatus: resolveSourceSnapshotStatus(),
  stakeholderApprovalStatus: process.env.STAKEHOLDER_APPROVAL_STATUS ?? "not_approved",
  productionCutoverStatus: process.env.PRODUCTION_CUTOVER_STATUS ?? "not_cut_over"
});

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

function readEnvText() {
  if (process.env.SOURCE_APPROVAL_ENV_TEXT !== undefined) {
    return process.env.SOURCE_APPROVAL_ENV_TEXT;
  }

  const keys = [
    "APP_ENV",
    "MUTATION_GUARD",
    "DATABASE_URL",
    "LEGACY_DATABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GOOGLE_SERVICE_ACCOUNT_KEY",
    "FEE_TRACKER_SPREADSHEET_ID",
    "PIPELINE_SHEET_ID",
    "PRODUCTION_REVENUE_SHEET_ID",
    "FLOAT_API_KEY",
    "ANTHROPIC_API_KEY"
  ];

  if (process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_ENVIRONMENT_ID) {
    return keys.map((key) => `${key}=${process.env[key] ?? ""}`).join("\n");
  }

  const envFile = process.env.SOURCE_APPROVAL_ENV_FILE ?? ".env.local";
  if (fs.existsSync(envFile)) {
    return fs.readFileSync(envFile, "utf8");
  }

  return keys.map((key) => `${key}=${process.env[key] ?? ""}`).join("\n");
}

function resolveSourceSnapshotStatus() {
  if (process.env.SOURCE_SNAPSHOT_FILE !== undefined && process.env.SOURCE_SNAPSHOT_FILE.trim() !== "") {
    try {
      const snapshot = JSON.parse(fs.readFileSync(process.env.SOURCE_SNAPSHOT_FILE, "utf8"));
      const plan = buildSourceSnapshotImportPlan(snapshot);
      const requiredSources = ["fee_sheet", "pipeline", "production_revenue", "float"];
      const hasAllStreams = requiredSources.every((source) => (plan.report.bySource[source]?.rawRows ?? 0) > 0);
      const hasOnlyLiveSourceEvidence = plan.report.status === "pass" && plan.report.cacheEvidenceRows === 0;

      return hasAllStreams && hasOnlyLiveSourceEvidence ? "ready" : "missing";
    } catch {
      return "missing";
    }
  }

  return process.env.SOURCE_SNAPSHOT_STATUS === undefined || process.env.SOURCE_SNAPSHOT_STATUS === "ready"
    ? "missing"
    : process.env.SOURCE_SNAPSHOT_STATUS;
}
