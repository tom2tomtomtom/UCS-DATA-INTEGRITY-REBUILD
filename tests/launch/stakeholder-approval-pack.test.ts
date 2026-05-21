import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

describe("Phase 10 stakeholder approval pack", () => {
  test("blocks stakeholder approval and production cutover when named scenarios still warn", () => {
    const snapshotFile = writeSnapshotFile(fourStreamSnapshot());
    const output = execFileSync("node", ["scripts/stakeholder-approval-pack.mjs"], {
      encoding: "utf8",
      env: {
        ...process.env,
        SOURCE_SNAPSHOT_FILE: snapshotFile
      }
    });
    const pack = JSON.parse(output);

    expect(pack.status).toBe("blocked");
    expect(pack.productionCutoverAllowed).toBe(false);
    expect(pack.stakeholderApprovalReady).toBe(false);
    expect(pack.blockers).toEqual(
      expect.arrayContaining([
        "named_scenarios_not_fully_passed",
        "stakeholder_approval_not_recorded"
      ])
    );
    expect(pack.warnings).toEqual(["ucs04787", "ucs05186", "pcs00250", "bt-raw-without-cache"]);
    expect(output).not.toContain("production-ready");
    expect(output).not.toContain("approved for cutover");
  });

  test("marks missing source evidence as a blocker", () => {
    const output = execFileSync("node", ["scripts/stakeholder-approval-pack.mjs"], { encoding: "utf8" });
    const pack = JSON.parse(output);

    expect(pack.status).toBe("blocked");
    expect(pack.blockers).toEqual(expect.arrayContaining(["source_snapshot_missing"]));
  });

  test("does not let legacy cache evidence count as source snapshot approval evidence", () => {
    const snapshotFile = writeSnapshotFile({
      ...fourStreamSnapshot(),
      sources: fourStreamSnapshot().sources.map((source) =>
        source.source === "float"
          ? {
              ...source,
              mode: "legacy_import",
              rows: [
                {
                  identity: {
                    stableSourceRowKey: "float_allocations:10480262",
                    sourceObjectId: "10480262"
                  },
                  raw: {
                    table: "float_allocations",
                    projectId: 10480262
                  }
                }
              ]
            }
          : source
      )
    });
    const output = execFileSync("node", ["scripts/stakeholder-approval-pack.mjs"], {
      encoding: "utf8",
      env: {
        ...process.env,
        SOURCE_SNAPSHOT_FILE: snapshotFile
      }
    });
    const pack = JSON.parse(output);

    expect(pack.status).toBe("blocked");
    expect(pack.sourceEvidence).toEqual({
      status: "missing",
      sourcesChecked: [],
      blocker: "source_snapshot_missing"
    });
    expect(pack.blockers).toEqual(expect.arrayContaining(["source_snapshot_missing"]));
  });
});

function writeSnapshotFile(snapshot: unknown): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "stakeholder-pack-snapshot-"));
  const filePath = path.join(tempDir, "snapshot.json");
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
  return filePath;
}

function fourStreamSnapshot() {
  return {
    snapshotId: "stakeholder-pack-test-snapshot",
    capturedAt: "2026-05-21T00:00:00.000Z",
    readOnly: true,
    sources: [
      sheetSource("fee_sheet", "Fee Tracker", "fee_tracker", "CLIENT SUMMARY"),
      sheetSource("pipeline", "Pipeline", "pipeline_sheet", "Pipeline"),
      sheetSource("production_revenue", "Production Revenue", "production_revenue_sheet", "PRODUCTION ONLY"),
      {
        source: "float",
        mode: "manual_snapshot",
        sourceLabel: "Float API",
        rows: [
          {
            identity: {
              stableSourceRowKey: "float:project:10480262",
              sourceObjectId: "10480262"
            },
            raw: {
              projectId: 10480262
            }
          }
        ]
      }
    ]
  };
}

function sheetSource(source: string, sourceLabel: string, sourceDocumentId: string, sourceTab: string) {
  return {
    source,
    mode: "manual_snapshot",
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
