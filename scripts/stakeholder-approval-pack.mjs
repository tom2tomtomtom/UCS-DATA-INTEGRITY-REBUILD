#!/usr/bin/env node

import fs from "node:fs";

import {
  buildFloatLayerEvidenceFromSnapshot,
  buildFloatTargetManifestEvidenceFromSnapshot,
  buildNamedScenarioReport,
  buildScenarioSourceEvidenceFromSnapshot
} from "./lib/named-scenario-report.mjs";
import { buildSourceSnapshotImportPlan, buildSourceSnapshotLifecyclePlan } from "./lib/source-import-report.mjs";

const { sourceEvidence, lifecycleEvidence } = readSourceEvidence();
const scenarioReport = buildNamedScenarioReport({ sourceEvidence });
const blockers = buildBlockers({
  scenarioReport,
  lifecycleEvidence,
  uiParitySpecStatus: process.env.UI_PARITY_SPEC_STATUS ?? "pending",
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
const scenarioEvidence = scenarioReport.scenarios.map((scenario) => ({
  id: scenario.id,
  name: scenario.name,
  owner: scenario.owner,
  status: scenario.status,
  classification: scenario.classification,
  scope: scenario.scope,
  sourceSnapshotRefs: scenario.sourceSnapshotRefs,
  displayContractResult: scenario.displayContractResult,
  uiSurfaceResult: scenario.uiSurfaceResult,
  csvResult: scenario.csvResult,
  chatEvidenceResult: scenario.chatEvidenceResult,
  warnings: scenario.warnings,
  unresolvedConflicts: scenario.unresolvedConflicts,
  approvalStatus: scenario.approvalStatus,
  nextHumanAction: scenario.nextHumanAction
}));

const pack = {
  generatedAt: new Date().toISOString(),
  status: blockers.length === 0 ? "ready_for_approval_record" : "blocked",
  stakeholderApprovalReady:
    scenarioReport.sourceEvidence.status === "ready" &&
    scenarioReport.status === "pass" &&
    scenarioEvidence.every((scenario) => scenario.approvalStatus === "ready_for_stakeholder_review") &&
    (process.env.UI_PARITY_SPEC_STATUS ?? "pending") === "ready",
  productionCutoverAllowed: blockers.length === 0,
  blockers,
  warnings: warningScenarioIds,
  warningEvidence,
  scenarioEvidence,
  lifecycleEvidence,
  sourceEvidence: scenarioReport.sourceEvidence,
  namedScenarioStatus: scenarioReport.status,
  namedScenarioSummary: scenarioReport.summary,
  uiParitySpecStatus: process.env.UI_PARITY_SPEC_STATUS ?? "pending",
  stakeholderApprovalStatus: process.env.STAKEHOLDER_APPROVAL_STATUS ?? "not_approved",
  productionCutoverStatus: process.env.PRODUCTION_CUTOVER_STATUS ?? "not_cut_over",
  noCutoverRule: "Production cutover remains blocked until source evidence, named scenarios, UI parity, and stakeholder approval are all recorded."
};

process.stdout.write(`${JSON.stringify(pack, null, 2)}\n`);

function buildBlockers({ scenarioReport, lifecycleEvidence, uiParitySpecStatus, stakeholderApprovalStatus, productionCutoverStatus }) {
  const blockers = [];

  if (scenarioReport.sourceEvidence.status !== "ready") {
    blockers.push("source_snapshot_missing");
  }

  if (scenarioReport.status !== "pass") {
    blockers.push("named_scenarios_not_fully_passed");
  }

  if (scenarioReport.scenarios.some((scenario) => scenario.approvalStatus !== "ready_for_stakeholder_review")) {
    blockers.push("scenario_evidence_incomplete");
  }

  if (uiParitySpecStatus !== "ready") {
    blockers.push("ui_parity_spec_not_ready");
  }

  if ((lifecycleEvidence?.unresolvedDisappearedRows ?? 0) > 0) {
    blockers.push("source_lifecycle_unresolved");
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
    return {};
  }

  try {
    const snapshot = JSON.parse(fs.readFileSync(process.env.SOURCE_SNAPSHOT_FILE, "utf8"));
    const plan = buildSourceSnapshotImportPlan(snapshot);
    const sourcesChecked = ["fee_sheet", "pipeline", "production_revenue", "float"];
    const hasAllSources = sourcesChecked.every((source) => (plan.report.bySource[source]?.rawRows ?? 0) > 0);
    const floatTargetManifest = buildFloatTargetManifestEvidenceFromSnapshot(snapshot);

    if (!hasAllSources || plan.report.cacheEvidenceRows > 0 || plan.report.status !== "pass" || floatTargetManifest === undefined) {
      return {};
    }

    const lifecycleEvidence = readLifecycleEvidence(snapshot);

    return {
      sourceEvidence: {
        status: "ready",
        snapshotId: plan.report.snapshotId,
        sourcesChecked,
        rawRows: plan.report.rawRows,
        floatTargetManifest,
        floatLayerEvidence: buildFloatLayerEvidenceFromSnapshot(snapshot, floatTargetManifest),
        scenarioSourceEvidence: buildScenarioSourceEvidenceFromSnapshot(snapshot)
      },
      lifecycleEvidence
    };
  } catch {
    return {};
  }
}

function readLifecycleEvidence(currentSnapshot) {
  if (process.env.SOURCE_PREVIOUS_SNAPSHOT_FILE === undefined || process.env.SOURCE_PREVIOUS_SNAPSHOT_FILE.trim() === "") {
    return undefined;
  }

  const previousSnapshot = JSON.parse(fs.readFileSync(process.env.SOURCE_PREVIOUS_SNAPSHOT_FILE, "utf8"));
  const lifecycle = buildSourceSnapshotLifecyclePlan({
    previous: previousSnapshot,
    current: currentSnapshot,
    deletionEvidence: readDeletionEvidence()
  });

  return {
    previousSnapshotId: lifecycle.previousSnapshotId,
    currentSnapshotId: lifecycle.currentSnapshotId,
    currentRows: lifecycle.currentRows.length,
    historicalRows: lifecycle.historicalRows.length,
    unresolvedDisappearedRows: lifecycle.unresolvedDisappearedRows.length,
    deletedRows: lifecycle.deletedRows.length,
    currentCountBySource: lifecycle.currentCountBySource,
    unresolvedEvidence: lifecycle.unresolvedDisappearedRows.map((row) => ({
      source: row.source,
      lifecycleState: row.lifecycleState,
      stableSourceRowKey: row.identity.stableSourceRowKey,
      sourceObjectId: row.identity.sourceObjectId
    }))
  };
}

function readDeletionEvidence() {
  if (process.env.SOURCE_DELETION_EVIDENCE_FILE === undefined || process.env.SOURCE_DELETION_EVIDENCE_FILE.trim() === "") {
    return [];
  }

  const parsed = JSON.parse(fs.readFileSync(process.env.SOURCE_DELETION_EVIDENCE_FILE, "utf8"));
  return Array.isArray(parsed) ? parsed : [];
}
