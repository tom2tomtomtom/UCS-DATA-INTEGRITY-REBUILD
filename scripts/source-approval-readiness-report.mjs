#!/usr/bin/env node

import fs from "node:fs";

import { buildSourceApprovalReadinessReport } from "./lib/source-approval-readiness-report.mjs";
import { buildSourceSnapshotImportPlan } from "./lib/source-import-report.mjs";
import {
  buildFloatLayerEvidenceFromSnapshot,
  buildFloatTargetManifestEvidenceFromSnapshot,
  buildNamedScenarioReport,
  buildScenarioSourceEvidenceFromSnapshot
} from "./lib/named-scenario-report.mjs";

const envText = readEnvText();
const sourceSnapshot = readSourceSnapshot();
const sourceSnapshotStatus = resolveSourceSnapshotStatus(sourceSnapshot);
const displayFactReadiness = resolveDisplayFactReadiness(sourceSnapshot, sourceSnapshotStatus);
const namedScenarioReadiness = resolveNamedScenarioReadiness(sourceSnapshot, sourceSnapshotStatus);

const report = buildSourceApprovalReadinessReport({
  envText,
  expected: {
    rebuildSupabaseRef: "nxrzhwqsswhjgeouxsyr"
  },
  uiSpecStatus: process.env.UI_PARITY_SPEC_STATUS ?? "pending",
  sourceSnapshotStatus,
  displayFactStatus: displayFactReadiness.status,
  displayFactWarnings: displayFactReadiness.warnings,
  namedScenarioStatus: namedScenarioReadiness.status,
  namedScenarioWarnings: namedScenarioReadiness.warnings,
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

function readSourceSnapshot() {
  if (process.env.SOURCE_SNAPSHOT_FILE === undefined || process.env.SOURCE_SNAPSHOT_FILE.trim() === "") {
    return undefined;
  }

  try {
    return JSON.parse(fs.readFileSync(process.env.SOURCE_SNAPSHOT_FILE, "utf8"));
  } catch {
    return undefined;
  }
}

function resolveSourceSnapshotStatus(snapshot) {
  if (snapshot !== undefined) {
    return sourceSnapshotIsReady(snapshot) ? "ready" : "missing";
  }

  return process.env.SOURCE_SNAPSHOT_STATUS === undefined || process.env.SOURCE_SNAPSHOT_STATUS === "ready"
    ? "missing"
    : process.env.SOURCE_SNAPSHOT_STATUS;
}

function sourceSnapshotIsReady(snapshot) {
  try {
    const plan = buildSourceSnapshotImportPlan(snapshot);
    const requiredSources = ["fee_sheet", "pipeline", "production_revenue", "float"];
    const hasAllStreams = requiredSources.every((source) => (plan.report.bySource[source]?.rawRows ?? 0) > 0);
    const hasOnlyLiveSourceEvidence = plan.report.status === "pass" && plan.report.cacheEvidenceRows === 0;
    const hasLiveFloatTargetManifest = buildFloatTargetManifestEvidenceFromSnapshot(snapshot) !== undefined;

    return hasAllStreams && hasOnlyLiveSourceEvidence && hasLiveFloatTargetManifest;
  } catch {
    return false;
  }
}

function resolveNamedScenarioReadiness(snapshot, sourceSnapshotStatus) {
  if (snapshot === undefined || sourceSnapshotStatus !== "ready") {
    return { status: "not_checked", warnings: [] };
  }

  try {
    const plan = buildSourceSnapshotImportPlan(snapshot);
    const floatTargetManifest = buildFloatTargetManifestEvidenceFromSnapshot(snapshot);
    if (floatTargetManifest === undefined) {
      return { status: "not_checked", warnings: [] };
    }

    const sourceEvidence = {
      status: "ready",
      snapshotId: plan.report.snapshotId,
      sourcesChecked: ["fee_sheet", "pipeline", "production_revenue", "float"],
      rawRows: plan.report.rawRows,
      floatTargetManifest,
      floatLayerEvidence: buildFloatLayerEvidenceFromSnapshot(snapshot, floatTargetManifest),
      scenarioSourceEvidence: buildScenarioSourceEvidenceFromSnapshot(snapshot)
    };
    const report = buildNamedScenarioReport({ sourceEvidence });

    return {
      status: report.status,
      warnings: report.scenarios.filter((scenario) => scenario.status === "warn").map((scenario) => scenario.id)
    };
  } catch {
    return { status: "not_checked", warnings: [] };
  }
}

function resolveDisplayFactReadiness(snapshot, sourceSnapshotStatus) {
  if (snapshot === undefined || sourceSnapshotStatus !== "ready") {
    return { status: "not_checked", warnings: [] };
  }

  const warnings = parserReadinessWarnings(snapshot);

  return warnings.length === 0
    ? { status: "ready", warnings: [] }
    : { status: "blocked", warnings };
}

function parserReadinessWarnings(snapshot) {
  const sources = new Map((snapshot.sources ?? []).map((source) => [source.source, source]));
  const warnings = [];

  if (!hasFeeSheetDisplayRows(sources.get("fee_sheet"))) {
    warnings.push("fee_sheet rows are archived but linked fee-sheet CLIENT SUMMARY or V-tab display rows are not parser-ready");
  }

  if (!hasPipelineDisplayRows(sources.get("pipeline"))) {
    warnings.push("pipeline rows are archived but monthly pipeline cells are not normalised into parser-ready month facts");
  }

  if (!hasProductionRevenueDisplayRows(sources.get("production_revenue"))) {
    warnings.push("production revenue rows are archived but monthly revenue cells are not normalised into parser-ready month facts");
  }

  if (!hasFloatDisplayRows(sources.get("float"))) {
    warnings.push("Float rows are archived but live API task/project/person rows are not shaped into parser-ready expanded Float facts");
  }

  return warnings;
}

function hasFeeSheetDisplayRows(source) {
  return hasRow(source, (raw) =>
    ["client_summary", "v_tab", "source_summary"].includes(raw.rowKind) &&
    (raw.soldFee !== undefined || raw.soldHours !== undefined)
  );
}

function hasPipelineDisplayRows(source) {
  return hasRow(source, (raw) => raw.month !== undefined && raw.amountGbp !== undefined);
}

function hasProductionRevenueDisplayRows(source) {
  return hasRow(source, (raw) =>
    raw.month !== undefined &&
    (raw.amount !== undefined || raw.revenue !== undefined || raw.productionRevenue !== undefined)
  );
}

function hasFloatDisplayRows(source) {
  return hasRow(source, (raw) =>
    raw.objectType === "task" &&
    raw.floatProjectId !== undefined &&
    raw.startDate !== undefined &&
    raw.endDate !== undefined &&
    raw.month !== undefined &&
    raw.hours !== undefined
  );
}

function hasRow(source, predicate) {
  return Array.isArray(source?.rows) && source.rows.some((row) => isRecord(row.raw) && predicate(row.raw));
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
