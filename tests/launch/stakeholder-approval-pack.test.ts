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
    expect(pack.warnings).toEqual([
      "ucs04787",
      "ucs05186",
      "pcs00250",
      "usa00262",
      "usa00323",
      "bt-raw-without-cache"
    ]);
    expect(pack.warningEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "ucs04787",
          owner: "Yunni",
          evidence: expect.objectContaining({
            evidenceStatus: "source_snapshot_ready",
            sourceLayersChecked: [
              "fee_sheet",
              "pipeline",
              "production_revenue",
              "float",
              "live_float_manifest"
            ],
            knownFloatIdsFromLiveManifest: [],
            rawCacheVisibleStatus: {
              raw: "represented",
              cache: "missing",
              visible: "represented"
            },
            rawCacheVisibleStatusBasis: "named_scenario_fixture",
            classification: "cache/import issue",
            nextHumanAction: expect.stringContaining("Float export settings")
          })
        }),
        expect.objectContaining({
          id: "bt-raw-without-cache",
          evidence: expect.objectContaining({
            knownFloatIdsFromLiveManifest: [],
            rawCacheVisibleStatus: {
              raw: "represented",
              cache: "missing",
              visible: "missing"
            },
            classification: "unresolved",
            nextHumanAction: expect.stringContaining("import/cache path")
          })
        }),
        expect.objectContaining({
          id: "usa00262",
          nextHumanAction: expect.stringContaining("targeted USA fee-sheet source rows")
        }),
        expect.objectContaining({
          id: "usa00323",
          nextHumanAction: expect.stringContaining("targeted USA fee-sheet source rows")
        })
      ])
    );
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

  test("requires targeted Float manifest evidence before source approval evidence is ready", () => {
    const snapshotFile = writeSnapshotFile({
      ...fourStreamSnapshot(),
      sources: fourStreamSnapshot().sources.map((source) =>
        source.source === "float"
          ? {
            ...source,
              rows: source.rows.filter((row) => !("objectType" in row.raw) || row.raw.objectType !== "target_manifest")
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
        mode: "read_only_live",
        sourceLabel: "Float API targeted evidence",
        rows: [
          {
            identity: {
              stableSourceRowKey: "float:projects:10480262",
              sourceObjectId: "10480262"
            },
            raw: {
              objectType: "project",
              project_id: 10480262,
              project_code: "UCS04154",
              name: "UCS04154 Float project"
            }
          },
          {
            identity: {
              stableSourceRowKey: "float:target-manifest",
              sourceObjectId: "target_manifest"
            },
            raw: {
              objectType: "target_manifest",
              requestedScenarioCodes: ["UCS04154", "BT"],
              requestedProjectIds: ["10480262"],
              resolvedProjectIds: ["10480262"],
              resolvedScenarios: [
                {
                  scenarioCode: "UCS04154",
                  floatProjectId: "10480262",
                  sourceStableSourceRowKey: "float:projects:10480262",
                  sourceObjectId: "10480262"
                }
              ],
              unresolvedScenarioCodes: ["BT"]
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
