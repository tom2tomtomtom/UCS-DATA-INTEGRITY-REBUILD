import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  buildFloatTargetManifestEvidenceFromSnapshot,
  buildNamedScenarioReport
} from "../../src/lib/scenarios/named-scenario-report";

const requiredScenarioIds = [
  "ldn-q1-design",
  "ucs04787",
  "ucs05186",
  "ucs04154",
  "pcs00250",
  "usa00262",
  "usa00323",
  "bt-raw-without-cache",
  "tbc-pipeline-identity",
  "archived-production-revenue",
  "exact-client-drilldown"
];

describe("P8-E named Sian Yunni Jade scenario report", () => {
  test("covers every Gate 5 named scenario with owner, status, classification, and checks", () => {
    const report = buildNamedScenarioReport();

    expect(report.scenarios.map((scenario) => scenario.id)).toEqual(requiredScenarioIds);
    expect(report.scenarios).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "ldn-q1-design",
          owner: "Sian",
          status: "pass",
          classification: "display_contract_agrees",
          checks: expect.arrayContaining([
            expect.objectContaining({ code: "same_scope_same_number", status: "pass" }),
            expect.objectContaining({ code: "projects_csv_detail_parity", status: "pass" })
          ])
        }),
        expect.objectContaining({
          id: "ucs04787",
          owner: "Yunni",
          status: "warn",
          classification: "source_or_cache_warning",
          checks: expect.arrayContaining([
            expect.objectContaining({ code: "float_layers_compared", status: "pass" }),
            expect.objectContaining({ code: "raw_cache_visible_mismatch_surfaced", status: "warn" })
          ])
        }),
        expect.objectContaining({
          id: "tbc-pipeline-identity",
          owner: "Jade",
          status: "pass",
          classification: "source_only_visible"
        })
      ])
    );
  });

  test("does not let known scenario warnings become hidden new-code failures", () => {
    const report = buildNamedScenarioReport();

    expect(report.status).toBe("warn");
    expect(report.summary.fail).toBe(0);
    expect(report.scenarios.filter((scenario) => scenario.classification === "new_code_bug")).toEqual([]);
    expect(report.scenarios.filter((scenario) => scenario.status === "warn").map((scenario) => scenario.id)).toEqual(
      ["ucs04787", "ucs05186", "pcs00250", "bt-raw-without-cache"]
    );
  });

  test("encodes the USA sold-hours false-zero guard as source-supported, not zero", () => {
    const report = buildNamedScenarioReport();
    const usaScenarios = report.scenarios.filter((scenario) => scenario.id === "usa00262" || scenario.id === "usa00323");

    expect(usaScenarios).toHaveLength(2);
    for (const scenario of usaScenarios) {
      expect(scenario.checks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "sold_hours_false_zero_guard",
            status: "pass",
            evidence: expect.stringContaining("source sold hours are nonzero")
          })
        ])
      );
    }
  });

  test("script emits stakeholder-safe JSON without raw source refs or payloads", () => {
    const output = execFileSync("node", ["scripts/named-scenario-report.mjs"], { encoding: "utf8" });
    const report = JSON.parse(output) as ReturnType<typeof buildNamedScenarioReport>;

    expect(report.status).toBe("warn");
    expect(report.scenarios).toHaveLength(requiredScenarioIds.length);
    expect(output).not.toContain("rawRowId");
    expect(output).not.toContain("sourceRefs");
    expect(output).not.toContain("old selector truth");
  });

  test("marks the report as not approval-ready without source snapshot evidence", () => {
    const report = buildNamedScenarioReport();

    expect(report.approvalReady).toBe(false);
    expect(report.sourceEvidence).toEqual({
      status: "missing",
      sourcesChecked: [],
      blocker: "source_snapshot_missing"
    });
  });

  test("script attaches source snapshot evidence when SOURCE_SNAPSHOT_FILE is provided", () => {
    const snapshotFile = writeSnapshotFile(fourStreamSnapshot());
    const output = execFileSync("node", ["scripts/named-scenario-report.mjs"], {
      encoding: "utf8",
      env: {
        ...process.env,
        SOURCE_SNAPSHOT_FILE: snapshotFile
      }
    });
    const report = JSON.parse(output);

    expect(report.approvalReady).toBe(false);
    expect(report.sourceEvidence).toMatchObject({
      status: "ready",
      snapshotId: "named-scenario-test-snapshot",
      sourcesChecked: ["fee_sheet", "pipeline", "production_revenue", "float"],
      rawRows: 8,
      floatTargetManifest: {
        status: "ready",
        manifestStableSourceRowKey: "float:target-manifest",
        requestedScenarioCodes: ["UCS04787", "UCS05186", "UCS04154", "PCS00250", "BT"],
        requestedProjectIds: ["10480262"],
        resolvedProjectIds: ["10979146", "11413292", "10480262", "11330982"],
        unresolvedScenarioCodes: ["BT"],
        resolvedScenarios: expect.arrayContaining([
          expect.objectContaining({ scenarioCode: "UCS04787", floatProjectId: "10979146" }),
          expect.objectContaining({ scenarioCode: "UCS05186", floatProjectId: "11413292" }),
          expect.objectContaining({ scenarioCode: "UCS04154", floatProjectId: "10480262" }),
          expect.objectContaining({ scenarioCode: "PCS00250", floatProjectId: "11330982" })
        ]),
        unresolvedScenarios: ["BT"]
      }
    });
  });

  test("enriches named Float scenarios with live manifest IDs without clearing warning scenarios", () => {
    const floatTargetManifest = buildFloatTargetManifestEvidenceFromSnapshot(fourStreamSnapshot());
    expect(floatTargetManifest).toBeDefined();

    const report = buildNamedScenarioReport({
      sourceEvidence: {
        status: "ready",
        snapshotId: "named-scenario-test-snapshot",
        sourcesChecked: ["fee_sheet", "pipeline", "production_revenue", "float"],
        rawRows: 8,
        floatTargetManifest: floatTargetManifest!
      }
    });

    expect(liveCheckEvidence(report, "ucs04154")).toContain("Live Float target manifest float:target-manifest resolved UCS04154 to Float project 10480262.");
    expect(liveCheckEvidence(report, "ucs04787")).toContain("Live Float target manifest float:target-manifest resolved UCS04787 to Float project 10979146.");
    expect(liveCheckEvidence(report, "ucs05186")).toContain("Live Float target manifest float:target-manifest resolved UCS05186 to Float project 11413292.");
    expect(liveCheckEvidence(report, "pcs00250")).toContain("Live Float target manifest float:target-manifest resolved PCS00250 to Float project 11330982.");
    expect(liveCheckEvidence(report, "bt-raw-without-cache")).toContain("Live Float target manifest float:target-manifest leaves BT unresolved; no Float project ID is safe to infer.");
    expect(report.scenarios.find((scenario) => scenario.id === "ucs04787")?.status).toBe("warn");
    expect(report.scenarios.find((scenario) => scenario.id === "bt-raw-without-cache")?.status).toBe("warn");
    expect(report.approvalReady).toBe(false);
  });

  test("does not let non-live Float snapshots satisfy live named Float evidence", () => {
    expect(buildFloatTargetManifestEvidenceFromSnapshot(nonLiveSnapshot())).toBeUndefined();

    const snapshotFile = writeSnapshotFile(nonLiveSnapshot());
    const output = execFileSync("node", ["scripts/named-scenario-report.mjs"], {
      encoding: "utf8",
      env: {
        ...process.env,
        SOURCE_SNAPSHOT_FILE: snapshotFile
      }
    });
    const report = JSON.parse(output);

    expect(report.sourceEvidence).toEqual({
      status: "missing",
      sourcesChecked: [],
      blocker: "source_snapshot_missing"
    });
    expect(output).not.toContain("live_float_target_manifest_resolved");
  });

  test("does not infer resolved Float scenarios from project rows without explicit manifest mappings", () => {
    const manifest = buildFloatTargetManifestEvidenceFromSnapshot(liveSnapshotWithoutResolvedScenarios());

    expect(manifest?.resolvedProjectIds).toEqual(["10979146", "11413292", "10480262", "11330982"]);
    expect(manifest?.resolvedScenarios).toEqual([]);
    expect(manifest?.unresolvedScenarios).toEqual(["BT", "UCS04787", "UCS05186", "UCS04154", "PCS00250"]);
  });
});

function liveCheckEvidence(report: ReturnType<typeof buildNamedScenarioReport>, scenarioId: string): string[] {
  return report.scenarios
    .find((scenario) => scenario.id === scenarioId)
    ?.checks.filter((check) => check.code.startsWith("live_float_target_manifest"))
    .map((check) => check.evidence) ?? [];
}

function writeSnapshotFile(snapshot: unknown): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "named-scenario-snapshot-"));
  const filePath = path.join(tempDir, "snapshot.json");
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
  return filePath;
}

function fourStreamSnapshot() {
  return {
    snapshotId: "named-scenario-test-snapshot",
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
          floatProjectRow("UCS04787", "10979146"),
          floatProjectRow("UCS05186", "11413292"),
          floatProjectRow("UCS04154", "10480262"),
          floatProjectRow("PCS00250", "11330982"),
          floatTargetManifestRow()
        ]
      }
    ]
  };
}

function nonLiveSnapshot() {
  return {
    ...fourStreamSnapshot(),
    sources: fourStreamSnapshot().sources.map((source) =>
      source.source === "float"
        ? {
            ...source,
            mode: "manual_snapshot",
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
              },
              floatTargetManifestRow()
            ]
          }
        : source
    )
  };
}

function liveSnapshotWithoutResolvedScenarios() {
  const snapshot = fourStreamSnapshot();

  return {
    ...snapshot,
    sources: snapshot.sources.map((source) =>
      source.source === "float"
        ? {
            ...source,
            rows: source.rows.map((row) =>
              "objectType" in row.raw && row.raw.objectType === "target_manifest"
                ? {
                    ...row,
                    raw: {
                      ...row.raw,
                      resolvedScenarios: undefined
                    }
                  }
                : row
            )
          }
        : source
    )
  };
}

function floatProjectRow(scenarioCode: string, floatProjectId: string) {
  return {
    identity: {
      stableSourceRowKey: `float:projects:${floatProjectId}`,
      sourceObjectId: floatProjectId
    },
    raw: {
      objectType: "project",
      project_id: Number(floatProjectId),
      project_code: scenarioCode,
      name: `${scenarioCode} Float project`
    }
  };
}

function floatTargetManifestRow() {
  return {
    identity: {
      stableSourceRowKey: "float:target-manifest",
      sourceObjectId: "target_manifest"
    },
    raw: {
      objectType: "target_manifest",
      requestedScenarioCodes: ["UCS04787", "UCS05186", "UCS04154", "PCS00250", "BT"],
      requestedProjectIds: ["10480262"],
      resolvedProjectIds: ["10979146", "11413292", "10480262", "11330982"],
      resolvedScenarios: [
        {
          scenarioCode: "UCS04787",
          floatProjectId: "10979146",
          sourceStableSourceRowKey: "float:projects:10979146",
          sourceObjectId: "10979146"
        },
        {
          scenarioCode: "UCS05186",
          floatProjectId: "11413292",
          sourceStableSourceRowKey: "float:projects:11413292",
          sourceObjectId: "11413292"
        },
        {
          scenarioCode: "UCS04154",
          floatProjectId: "10480262",
          sourceStableSourceRowKey: "float:projects:10480262",
          sourceObjectId: "10480262"
        },
        {
          scenarioCode: "PCS00250",
          floatProjectId: "11330982",
          sourceStableSourceRowKey: "float:projects:11330982",
          sourceObjectId: "11330982"
        }
      ],
      unresolvedScenarioCodes: ["BT"]
    }
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
