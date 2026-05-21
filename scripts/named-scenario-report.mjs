#!/usr/bin/env node

import fs from "node:fs";

import { buildSourceSnapshotImportPlan } from "./lib/source-import-report.mjs";
import {
  buildFloatLayerEvidenceFromSnapshot,
  buildFloatTargetManifestEvidenceFromSnapshot,
  buildNamedScenarioReport,
  buildScenarioSourceEvidenceFromSnapshot
} from "./lib/named-scenario-report.mjs";

process.stdout.write(`${JSON.stringify(buildNamedScenarioReport({ sourceEvidence: readSourceEvidence() }), null, 2)}\n`);

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
      floatTargetManifest,
      floatLayerEvidence: buildFloatLayerEvidenceFromSnapshot(snapshot, floatTargetManifest),
      scenarioSourceEvidence: buildScenarioSourceEvidenceFromSnapshot(snapshot)
    };
  } catch {
    return undefined;
  }
}
