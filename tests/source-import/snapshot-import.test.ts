import { execFileSync } from "node:child_process";
import { describe, expect, test } from "vitest";

import { buildSourceSnapshotImportPlan } from "../../src/lib/source-import/snapshot-import";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("P8-C read-only source snapshot import", () => {
  test("builds a dry-run import plan with source batches, raw row identity, and literal-empty skips only", () => {
    const plan = buildSourceSnapshotImportPlan({
      snapshotId: "p8c-basic",
      capturedAt: "2026-05-20T17:30:00.000Z",
      readOnly: true,
      sources: [
        {
          source: "fee_sheet",
          mode: "manual_snapshot",
          sourceLabel: "Redacted fee sheet snapshot",
          rows: [
            {
              identity: {
                stableSourceRowKey: "fee-sheet:UCS04787:client-summary:12",
                sourceDocumentId: "redacted-fee-sheet",
                sourceTab: "CLIENT SUMMARY",
                sourceRowNumber: 12
              },
              raw: {
                jobNumber: "UCS04787",
                client: "British Airways",
                month: "2026-01",
                soldFee: 32472,
                soldHours: 0
              }
            }
          ]
        },
        {
          source: "pipeline",
          mode: "manual_snapshot",
          sourceLabel: "Redacted pipeline snapshot",
          rows: [
            {
              identity: {
                stableSourceRowKey: "pipeline:blank:88",
                sourceDocumentId: "redacted-pipeline",
                sourceTab: "Pipeline",
                sourceRowNumber: 88
              },
              raw: {
                jobNumber: "",
                projectName: "",
                client: "",
                month: "",
                amount: ""
              }
            }
          ]
        }
      ]
    });

    expect(plan.batches).toHaveLength(2);
    expect(plan.rawRows).toHaveLength(1);
    expect(plan.skippedRows).toHaveLength(1);
    expect(plan.rawRows[0]).toMatchObject({
      source: "fee_sheet",
      identity: {
        stableSourceRowKey: "fee-sheet:UCS04787:client-summary:12",
        sourceTab: "CLIENT SUMMARY",
        sourceRowNumber: 12
      }
    });
    expect(plan.batches[0]?.id).toMatch(uuidPattern);
    expect(plan.rawRows[0]?.id).toMatch(uuidPattern);
    expect(plan.rawRows[0]?.batchId).toBe(plan.batches[0]?.id);
    expect(plan.rawRows[0]?.sourceRefs[0]).toMatchObject({
      source: "fee_sheet",
      sourceLayer: "sold",
      batchId: plan.batches[0]?.id,
      rawRowId: plan.rawRows[0]?.id
    });
    expect(plan.skippedRows[0]?.skip.classification).toBe("literally_empty");
    expect(plan.report.bySource.pipeline?.skippedRows).toBe(1);
  });

  test("labels legacy cache rows as imported evidence only", () => {
    const plan = buildSourceSnapshotImportPlan({
      snapshotId: "p8c-cache",
      capturedAt: "2026-05-20T17:31:00.000Z",
      readOnly: true,
      sources: [
        {
          source: "read_only_sql",
          mode: "legacy_import",
          sourceLabel: "Old dashboard diagnostic cache export",
          rows: [
            {
              identity: {
                stableSourceRowKey: "legacy:float_allocations:PCS00250",
                sourceObjectId: "float_allocations:PCS00250"
              },
              raw: {
                table: "float_allocations",
                jobNumber: "PCS00250",
                hours: 20
              }
            }
          ]
        }
      ]
    });

    expect(plan.rawRows).toHaveLength(1);
    expect(plan.report.cacheEvidenceRows).toBe(1);
    expect(plan.report.warnings).toEqual(
      expect.arrayContaining(["legacy_cache_imported_as_evidence_only"])
    );
    expect(plan.rawRows[0]?.sourceRefs[0]).toMatchObject({
      source: "read_only_sql",
      sourceLayer: "read_only_sql",
      field: "legacy_cache_evidence_only"
    });
  });

  test("deep clones raw rows before storing them so hashes cannot drift after planning", () => {
    const raw = {
      jobNumber: "UCS04787",
      client: "British Airways",
      soldFee: 32472
    };
    const plan = buildSourceSnapshotImportPlan({
      snapshotId: "p8c-clone",
      capturedAt: "2026-05-20T17:31:30.000Z",
      readOnly: true,
      sources: [
        {
          source: "fee_sheet",
          mode: "manual_snapshot",
          sourceLabel: "Clone test",
          rows: [
            {
              identity: {
                stableSourceRowKey: "fee-sheet:UCS04787:client-summary:12",
                sourceDocumentId: "redacted-fee-sheet",
                sourceTab: "CLIENT SUMMARY",
                sourceRowNumber: 12
              },
              raw
            }
          ]
        }
      ]
    });

    raw.soldFee = 999999;

    expect(plan.rawRows[0]?.raw).toMatchObject({ soldFee: 32472 });
  });

  test("rejects snapshots that are not explicitly read-only or lack stable source row identity", () => {
    expect(() =>
      buildSourceSnapshotImportPlan({
        snapshotId: "p8c-write",
        capturedAt: "2026-05-20T17:32:00.000Z",
        readOnly: false,
        sources: []
      })
    ).toThrow("Snapshot imports must be explicitly read-only.");

    expect(() =>
      buildSourceSnapshotImportPlan({
        snapshotId: "p8c-bad-row",
        capturedAt: "2026-05-20T17:33:00.000Z",
        readOnly: true,
        sources: [
          {
            source: "float",
            mode: "manual_snapshot",
            sourceLabel: "Bad Float shape",
            rows: [
              {
                identity: {
                  stableSourceRowKey: ""
                },
                raw: {
                  taskId: "task-1",
                  hours: 5
                }
              }
            ]
          }
        ]
      })
    ).toThrow("Source row is missing stableSourceRowKey.");
  });

  test("rejects source rows that do not satisfy source-specific identity requirements", () => {
    expect(() =>
      buildSourceSnapshotImportPlan({
        snapshotId: "p8c-missing-sheet-identity",
        capturedAt: "2026-05-20T17:33:30.000Z",
        readOnly: true,
        sources: [
          {
            source: "fee_sheet",
            mode: "manual_snapshot",
            sourceLabel: "Bad fee sheet shape",
            rows: [
              {
                identity: {
                  stableSourceRowKey: "fee-sheet:bad"
                },
                raw: {
                  jobNumber: "UCS04787",
                  soldFee: 1
                }
              }
            ]
          }
        ]
      })
    ).toThrow("fee_sheet snapshot rows require sourceDocumentId, sourceTab, and sourceRowNumber.");

    expect(() =>
      buildSourceSnapshotImportPlan({
        snapshotId: "p8c-missing-float-identity",
        capturedAt: "2026-05-20T17:33:45.000Z",
        readOnly: true,
        sources: [
          {
            source: "float",
            mode: "manual_snapshot",
            sourceLabel: "Bad Float shape",
            rows: [
              {
                identity: {
                  stableSourceRowKey: "float-task:bad"
                },
                raw: {
                  taskId: "task-1",
                  hours: 5
                }
              }
            ]
          }
        ]
      })
    ).toThrow("float snapshot rows require sourceObjectId.");
  });

  test("dry-run script emits a classified report from the redacted snapshot fixture", () => {
    const output = execFileSync(
      "node",
      ["scripts/dry-run-source-import.mjs", "fixtures/source-import/p8c-redacted-snapshot.json"],
      { encoding: "utf8" }
    );
    const report = JSON.parse(output) as {
      status: string;
      totalRows: number;
      rawRows: number;
      skippedRows: number;
      cacheEvidenceRows: number;
      bySource: Record<string, { totalRows: number; rawRows: number; skippedRows: number }>;
      warnings: string[];
    };

    expect(report).toMatchObject({
      status: "warn",
      totalRows: 4,
      rawRows: 3,
      skippedRows: 1,
      cacheEvidenceRows: 1
    });
    expect(report.bySource.fee_sheet).toMatchObject({ totalRows: 1, rawRows: 1 });
    expect(report.bySource.pipeline).toMatchObject({ totalRows: 1, skippedRows: 1 });
    expect(report.warnings).toEqual(
      expect.arrayContaining(["legacy_cache_imported_as_evidence_only"])
    );
    expect(output).not.toContain("British Airways");
    expect(output).not.toContain("stableSourceRowKey");
    expect(output).not.toContain("sourceRefs");
  }, 15000);
});
