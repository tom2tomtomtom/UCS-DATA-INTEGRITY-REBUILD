import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import { buildSourceSnapshotLifecyclePlan } from "../../src/lib/source-import";
import type { SourceSnapshotImportInput, SourceSnapshotRow } from "../../src/lib/source-import";

describe("Staleness and deletion policy", () => {
  test("marks rows absent from snapshot N+1 as disappeared evidence instead of silently correcting history", () => {
    const previous = snapshot("snapshot-n", [
      floatTask("float:task:present-then-missing", "task-present-then-missing", 24),
      floatTask("float:task:still-current", "task-still-current", 8)
    ]);
    const current = snapshot("snapshot-n-plus-1", [
      floatTask("float:task:still-current", "task-still-current", 8)
    ]);

    const lifecycle = buildSourceSnapshotLifecyclePlan({ previous, current });

    expect(lifecycle.currentRows.map((row) => row.identity.stableSourceRowKey)).toEqual([
      "float:task:still-current"
    ]);
    expect(lifecycle.currentCountBySource.float).toBe(1);
    expect(lifecycle.historicalRows.map((row) => row.identity.stableSourceRowKey)).toEqual([
      "float:task:present-then-missing",
      "float:task:still-current"
    ]);
    expect(lifecycle.unresolvedDisappearedRows).toEqual([
      expect.objectContaining({
        source: "float",
        lifecycleState: "not_seen_in_latest_batch",
        currentSupported: false,
        identity: expect.objectContaining({
          stableSourceRowKey: "float:task:present-then-missing",
          sourceObjectId: "task-present-then-missing"
        }),
        historicalRawRow: expect.objectContaining({
          raw: expect.objectContaining({ hours: 24 })
        })
      })
    ]);
  });

  test("does not count source-deleted rows as current unless the active snapshot still supports them", () => {
    const previous = snapshot("snapshot-before-delete", [
      floatTask("float:task:deleted", "task-deleted", 12),
      floatTask("float:task:retained", "task-retained", 6)
    ]);
    const current = snapshot("snapshot-after-delete", [
      floatTask("float:task:retained", "task-retained", 6)
    ]);

    const lifecycle = buildSourceSnapshotLifecyclePlan({
      previous,
      current,
      deletionEvidence: [
        {
          source: "float",
          identity: {
            stableSourceRowKey: "float:task:deleted",
            sourceObjectId: "task-deleted"
          },
          observedAt: "2026-05-21T10:05:00.000Z",
          evidenceRef: "float-api:task-deleted:404"
        }
      ]
    });

    expect(lifecycle.currentRows.map((row) => row.identity.sourceObjectId)).toEqual([
      "task-retained"
    ]);
    expect(lifecycle.currentRows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          identity: expect.objectContaining({ sourceObjectId: "task-deleted" })
        })
      ])
    );
    expect(lifecycle.deletedRows).toEqual([
      expect.objectContaining({
        lifecycleState: "deleted_by_source_evidence",
        currentSupported: false,
        deletionEvidence: expect.objectContaining({
          evidenceRef: "float-api:task-deleted:404"
        }),
        historicalRawRow: expect.objectContaining({
          identity: expect.objectContaining({ sourceObjectId: "task-deleted" })
        })
      })
    ]);
    expect(lifecycle.unresolvedDisappearedRows).toHaveLength(0);
  });

  test("blocks stakeholder approval when previous source evidence disappears without lifecycle resolution", () => {
    const previous = fourStreamApprovalSnapshot("approval-snapshot-n", [
      floatProject("10480262", "UCS04154"),
      floatProject("99999999", "UCS09999"),
      targetManifest(["10480262", "99999999"])
    ]);
    const current = fourStreamApprovalSnapshot("approval-snapshot-n-plus-1", [
      floatProject("10480262", "UCS04154"),
      targetManifest(["10480262"])
    ]);
    const previousSnapshotFile = writeSnapshotFile(previous);
    const currentSnapshotFile = writeSnapshotFile(current);
    const output = execFileSync("node", ["scripts/stakeholder-approval-pack.mjs"], {
      encoding: "utf8",
      env: {
        ...process.env,
        SOURCE_PREVIOUS_SNAPSHOT_FILE: previousSnapshotFile,
        SOURCE_SNAPSHOT_FILE: currentSnapshotFile,
        STAKEHOLDER_APPROVAL_STATUS: "approved",
        PRODUCTION_CUTOVER_STATUS: "not_cut_over"
      }
    });
    const pack = JSON.parse(output);

    expect(pack.status).toBe("blocked");
    expect(pack.blockers).toEqual(expect.arrayContaining(["source_lifecycle_unresolved"]));
    expect(pack.lifecycleEvidence).toMatchObject({
      previousSnapshotId: "approval-snapshot-n",
      currentSnapshotId: "approval-snapshot-n-plus-1",
      currentCountBySource: expect.objectContaining({ float: 2 }),
      unresolvedDisappearedRows: 1,
      deletedRows: 0,
      unresolvedEvidence: [
        expect.objectContaining({
          source: "float",
          lifecycleState: "not_seen_in_latest_batch",
          stableSourceRowKey: "float:projects:99999999",
          sourceObjectId: "99999999"
        })
      ]
    });
  }, 15000);
});

function snapshot(snapshotId: string, rows: readonly SourceSnapshotRow[]): SourceSnapshotImportInput {
  return {
    snapshotId,
    capturedAt: "2026-05-21T10:00:00.000Z",
    readOnly: true,
    sources: [
      {
        source: "float",
        mode: "read_only_live",
        sourceLabel: "Float API lifecycle law fixture",
        rows
      }
    ]
  };
}

function floatTask(stableSourceRowKey: string, sourceObjectId: string, hours: number): SourceSnapshotRow {
  return {
    identity: {
      stableSourceRowKey,
      sourceObjectId
    },
    raw: {
      objectType: "task",
      taskId: sourceObjectId,
      floatProjectId: "10480262",
      jobNumber: "UCS04154",
      hours
    }
  };
}

function writeSnapshotFile(snapshotValue: unknown): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "staleness-deletion-snapshot-"));
  const filePath = path.join(tempDir, "snapshot.json");
  fs.writeFileSync(filePath, JSON.stringify(snapshotValue, null, 2));
  return filePath;
}

function fourStreamApprovalSnapshot(snapshotId: string, floatRows: readonly SourceSnapshotRow[]): SourceSnapshotImportInput {
  return {
    snapshotId,
    capturedAt: "2026-05-21T10:10:00.000Z",
    readOnly: true,
    sources: [
      sheetSource("fee_sheet", "Fee Tracker", "fee_tracker", "CLIENT SUMMARY"),
      sheetSource("pipeline", "Pipeline", "pipeline_sheet", "Pipeline"),
      sheetSource("production_revenue", "Production Revenue", "production_revenue_sheet", "PRODUCTION ONLY"),
      {
        source: "float",
        mode: "read_only_live",
        sourceLabel: "Float API lifecycle approval fixture",
        rows: floatRows
      }
    ]
  };
}

function sheetSource(
  source: "fee_sheet" | "pipeline" | "production_revenue",
  sourceLabel: string,
  sourceDocumentId: string,
  sourceTab: string
) {
  return {
    source,
    mode: "manual_snapshot" as const,
    sourceLabel,
    rows: [
      {
        identity: {
          stableSourceRowKey: `${sourceDocumentId}:${sourceTab}:1`,
          sourceDocumentId,
          sourceTab,
          sourceRowNumber: 1
        },
        raw: {
          jobNumber: "UCS04154"
        }
      }
    ]
  };
}

function floatProject(sourceObjectId: string, jobNumber: string): SourceSnapshotRow {
  return {
    identity: {
      stableSourceRowKey: `float:projects:${sourceObjectId}`,
      sourceObjectId
    },
    raw: {
      objectType: "project",
      project_id: Number(sourceObjectId),
      project_code: jobNumber,
      name: `${jobNumber} Float project`
    }
  };
}

function targetManifest(resolvedProjectIds: readonly string[]): SourceSnapshotRow {
  return {
    identity: {
      stableSourceRowKey: "float:target-manifest",
      sourceObjectId: "target_manifest"
    },
    raw: {
      objectType: "target_manifest",
      requestedScenarioCodes: ["UCS04154"],
      requestedProjectIds: resolvedProjectIds,
      resolvedProjectIds,
      resolvedScenarios: [
        {
          scenarioCode: "UCS04154",
          floatProjectId: "10480262",
          sourceStableSourceRowKey: "float:projects:10480262",
          sourceObjectId: "10480262"
        }
      ],
      unresolvedScenarioCodes: []
    }
  };
}
