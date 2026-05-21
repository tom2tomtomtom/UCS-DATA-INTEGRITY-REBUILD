#!/usr/bin/env node

import fs from "node:fs";

import { buildFloatTargetManifestEvidenceFromSnapshot, buildNamedScenarioReport } from "./lib/named-scenario-report.mjs";
import { buildSourceSnapshotImportPlan } from "./lib/source-import-report.mjs";

const sourceEvidence = readSourceEvidence();
const scenarioReport = buildNamedScenarioReport({ sourceEvidence });
const blockers = buildBlockers({
  scenarioReport,
  stakeholderApprovalStatus: process.env.STAKEHOLDER_APPROVAL_STATUS ?? "not_approved",
  productionCutoverStatus: process.env.PRODUCTION_CUTOVER_STATUS ?? "not_cut_over"
});
const warningScenarioIds = scenarioReport.scenarios
  .filter((scenario) => scenario.status === "warn")
  .map((scenario) => scenario.id);
const warningEvidence = scenarioReport.scenarios
  .filter((scenario) => scenario.status === "warn")
  .map((scenario) => ({
    id: scenario.id,
    name: scenario.name,
    owner: scenario.owner,
    evidence: scenario.warningEvidence,
    nextHumanAction: scenario.nextHumanAction
  }));

const pack = {
  generatedAt: new Date().toISOString(),
  status: blockers.length === 0 ? "ready_for_approval_record" : "blocked",
  stakeholderApprovalReady: scenarioReport.sourceEvidence.status === "ready" && scenarioReport.status === "pass",
  productionCutoverAllowed: blockers.length === 0,
  blockers,
  warnings: warningScenarioIds,
  warningEvidence,
  sourceEvidence: scenarioReport.sourceEvidence,
  namedScenarioStatus: scenarioReport.status,
  namedScenarioSummary: scenarioReport.summary,
  stakeholderApprovalStatus: process.env.STAKEHOLDER_APPROVAL_STATUS ?? "not_approved",
  productionCutoverStatus: process.env.PRODUCTION_CUTOVER_STATUS ?? "not_cut_over",
  noCutoverRule: "Production cutover remains blocked until source evidence, named scenarios, UI parity, and stakeholder approval are all recorded."
};

process.stdout.write(`${JSON.stringify(pack, null, 2)}\n`);

function buildBlockers({ scenarioReport, stakeholderApprovalStatus, productionCutoverStatus }) {
  const blockers = [];

  if (scenarioReport.sourceEvidence.status !== "ready") {
    blockers.push("source_snapshot_missing");
  }

  if (scenarioReport.status !== "pass") {
    blockers.push("named_scenarios_not_fully_passed");
  }

  if (stakeholderApprovalStatus !== "approved") {
    blockers.push("stakeholder_approval_not_recorded");
  }

  if (productionCutoverStatus !== "not_cut_over") {
    blockers.push("production_cutover_status_not_safe");
  }

  return blockers;
}

function readSourceEvidence() {
  if (process.env.SOURCE_SNAPSHOT_FILE === undefined || process.env.SOURCE_SNAPSHOT_FILE.trim() === "") {
    return undefined;
  }

  try {
    const snapshot = JSON.parse(fs.readFileSync(process.env.SOURCE_SNAPSHOT_FILE, "utf8"));
    const plan = buildSourceSnapshotImportPlan(snapshot);
    const sourcesChecked = ["fee_sheet", "pipeline", "production_revenue", "float"];
    const hasAllSources = sourcesChecked.every((source) => (plan.report.bySource[source]?.rawRows ?? 0) > 0);
    const floatTargetManifest = buildFloatTargetManifestEvidenceFromSnapshot(snapshot);

    if (!hasAllSources || plan.report.cacheEvidenceRows > 0 || plan.report.status !== "pass" || floatTargetManifest === undefined) {
      return undefined;
    }

    return {
      status: "ready",
      snapshotId: plan.report.snapshotId,
      sourcesChecked,
      rawRows: plan.report.rawRows,
      floatTargetManifest
    };
  } catch {
    return undefined;
  }
}
