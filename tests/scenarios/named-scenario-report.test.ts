import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  buildFloatLayerEvidenceFromSnapshot,
  buildFloatTargetManifestEvidenceFromSnapshot,
  buildNamedScenarioReport,
  buildScenarioSourceEvidenceFromSnapshot
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

describe("P8-E named Sian Yunni Jade scenario report", { timeout: 15000 }, () => {
  test("covers every Gate 5 named scenario with owner, status, classification, and checks", () => {
    const report = buildNamedScenarioReport();

    expect(report.scenarios.map((scenario) => scenario.id)).toEqual(requiredScenarioIds);
    for (const scenario of report.scenarios) {
      expect(scenario.scope).toMatchObject({
        office: expect.any(String),
        from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
      });
      expect(scenario.displayContractResult).toMatchObject({
        status: expect.any(String),
        sourceLayer: "display_contract",
        basis: expect.any(String)
      });
      expect(scenario.uiSurfaceResult).toMatchObject({
        status: "pass",
        sourceLayer: "data_quality_ui"
      });
      expect(scenario.csvResult).toMatchObject({
        status: expect.any(String),
        sourceLayer: "display_contract_csv",
        basis: expect.any(String)
      });
      expect(scenario.chatEvidenceResult).toMatchObject({
        status: expect.any(String),
        sourceLayer: "chat_evidence_pack",
        basis: expect.any(String)
      });
      expect(Array.isArray(scenario.sourceSnapshotRefs)).toBe(true);
      expect(Array.isArray(scenario.warnings)).toBe(true);
      expect(Array.isArray(scenario.unresolvedConflicts)).toBe(true);
      expect(scenario.approvalStatus).toBe("blocked_source_evidence");
    }
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

  test("keeps richer source-warning evidence on the four remaining warnings", () => {
    const report = buildNamedScenarioReport();

    expect(warningEvidence(report, "ucs04787")).toMatchObject({
      evidenceStatus: "source_snapshot_missing",
      sourceLayersChecked: [],
      knownFloatIdsFromLiveManifest: [],
      rawCacheVisibleStatus: {
        raw: "represented",
        cache: "missing",
        visible: "represented"
      },
      rawCacheVisibleStatusBasis: "named_scenario_fixture",
      classification: "cache/import issue",
      nextHumanAction: expect.stringContaining("Float export settings")
    });
    expect(warningEvidence(report, "ucs05186")).toMatchObject({
      rawCacheVisibleStatus: {
        raw: "missing",
        cache: "missing",
        visible: "represented"
      },
      classification: "source issue",
      nextHumanAction: expect.stringContaining("duplicate/manual Float rows")
    });
    expect(warningEvidence(report, "pcs00250")).toMatchObject({
      rawCacheVisibleStatus: {
        raw: "missing",
        cache: "represented",
        visible: "missing"
      },
      classification: "cache/import issue",
      nextHumanAction: expect.stringContaining("fresh Float pull")
    });
    expect(warningEvidence(report, "bt-raw-without-cache")).toMatchObject({
      rawCacheVisibleStatus: {
        raw: "represented",
        cache: "missing",
        visible: "missing"
      },
      classification: "unresolved",
      nextHumanAction: expect.stringContaining("import/cache path")
    });
    expect(report.status).toBe("warn");
    expect(report.approvalReady).toBe(false);
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

  test("downgrades USA false-zero guards when ready source snapshot lacks USA rows", () => {
    const floatTargetManifest = buildFloatTargetManifestEvidenceFromSnapshot(fourStreamSnapshot());
    expect(floatTargetManifest).toBeDefined();

    const report = buildNamedScenarioReport({
      sourceEvidence: {
        status: "ready",
        snapshotId: "named-scenario-test-snapshot",
        sourcesChecked: ["fee_sheet", "pipeline", "production_revenue", "float"],
        rawRows: 10,
        floatTargetManifest: floatTargetManifest!,
        floatLayerEvidence: [],
        scenarioSourceEvidence: buildScenarioSourceEvidenceFromSnapshot(fourStreamSnapshot())
      }
    });

    for (const scenarioId of ["usa00262", "usa00323"]) {
      const scenario = report.scenarios.find((item) => item.id === scenarioId);
      expect(scenario).toMatchObject({
        status: "warn",
        scope: {
          office: "USA",
          jobNumber: scenarioId.toUpperCase()
        },
        approvalStatus: "blocked_warning",
        chatEvidenceResult: {
          status: "needs_codex",
          sourceLayer: "chat_evidence_pack"
        },
        nextHumanAction: expect.stringContaining("targeted USA fee-sheet source rows"),
        checks: expect.arrayContaining([
          expect.objectContaining({
            code: "source_snapshot_scenario_rows_missing",
            status: "warn",
            evidence: expect.stringContaining("contains no raw rows")
          })
        ])
      });
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
      rawRows: 10,
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
    expect(report.scenarios.find((scenario: { id: string }) => scenario.id === "ucs04154")).toMatchObject({
      approvalStatus: "ready_for_stakeholder_review",
      displayContractResult: {
        status: "pass",
        sourceLayer: "display_contract"
      },
      csvResult: {
        status: "not_applicable"
      },
      sourceSnapshotRefs: expect.arrayContaining([
        { layer: "source_snapshot", ref: "named-scenario-test-snapshot" },
        { layer: "float_manifest", ref: "float:target-manifest" },
        { layer: "source_row", ref: "fee_tracker:CLIENT SUMMARY:1" }
      ])
    });
    expect(report.scenarios.find((scenario: { id: string }) => scenario.id === "ldn-q1-design")).toMatchObject({
      approvalStatus: "ready_for_stakeholder_review",
      chatEvidenceResult: {
        status: "not_applicable"
      }
    });
    expect(report.scenarios.find((scenario: { id: string }) => scenario.id === "tbc-pipeline-identity")).toMatchObject({
      approvalStatus: "ready_for_stakeholder_review",
      sourceSnapshotRefs: expect.arrayContaining([
        { layer: "source_row", ref: "pipeline_sheet:Pipeline:2" }
      ])
    });
    expect(report.scenarios.find((scenario: { id: string }) => scenario.id === "archived-production-revenue")).toMatchObject({
      approvalStatus: "ready_for_stakeholder_review",
      sourceSnapshotRefs: expect.arrayContaining([
        { layer: "source_row", ref: "production_revenue_sheet:PRODUCTION ONLY:2" }
      ])
    });
    expect(report.scenarios.find((scenario: { id: string }) => scenario.id === "usa00262")).toMatchObject({
      approvalStatus: "blocked_warning",
      unresolvedConflicts: expect.arrayContaining([expect.stringContaining("source_snapshot_scenario_rows_missing")])
    });
  });

  test("marks USA false-zero guards ready when source rows and deterministic display proof are both present", () => {
    const snapshot = {
      ...fourStreamSnapshot(),
      sources: fourStreamSnapshot().sources.map((source) =>
        source.source === "fee_sheet"
          ? {
              ...source,
              rows: [
                ...source.rows,
                {
                  identity: {
                    stableSourceRowKey: "fee_tracker:USA:27",
                    sourceDocumentId: "fee_tracker",
                    sourceTab: "USA",
                    sourceRowNumber: 27
                  },
                  raw: {
                    jobNumber: "USA00262",
                    client: "White & Case"
                  }
                },
                {
                  identity: {
                    stableSourceRowKey: "fee_tracker:USA:64",
                    sourceDocumentId: "fee_tracker",
                    sourceTab: "USA",
                    sourceRowNumber: 64
                  },
                  raw: {
                    jobNumber: "USA00323",
                    client: "Chobani"
                  }
                }
              ]
            }
          : source
      )
    };
    const floatTargetManifest = buildFloatTargetManifestEvidenceFromSnapshot(snapshot);
    expect(floatTargetManifest).toBeDefined();

    const report = buildNamedScenarioReport({
      sourceEvidence: {
        status: "ready",
        snapshotId: "named-scenario-usa-source-present",
        sourcesChecked: ["fee_sheet", "pipeline", "production_revenue", "float"],
        rawRows: 10,
        floatTargetManifest: floatTargetManifest!,
        floatLayerEvidence: [],
        scenarioSourceEvidence: buildScenarioSourceEvidenceFromSnapshot(snapshot)
      }
    });

    for (const scenarioId of ["usa00262", "usa00323"]) {
      expect(report.scenarios.find((scenario) => scenario.id === scenarioId)).toMatchObject({
        status: "pass",
        approvalStatus: "ready_for_stakeholder_review",
        displayContractResult: {
          status: "pass",
          sourceLayer: "display_contract"
        },
        checks: expect.arrayContaining([
          expect.objectContaining({
            code: "source_snapshot_scenario_rows_present",
            status: "pass"
          })
        ]),
        unresolvedConflicts: []
      });
    }
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
        floatTargetManifest: floatTargetManifest!,
        floatLayerEvidence: []
      }
    });

    expect(liveCheckEvidence(report, "ucs04154")).toContain("Live Float target manifest float:target-manifest resolved UCS04154 to Float project 10480262.");
    expect(liveCheckEvidence(report, "ucs04787")).toContain("Live Float target manifest float:target-manifest resolved UCS04787 to Float project 10979146.");
    expect(liveCheckEvidence(report, "ucs05186")).toContain("Live Float target manifest float:target-manifest resolved UCS05186 to Float project 11413292.");
    expect(liveCheckEvidence(report, "pcs00250")).toContain("Live Float target manifest float:target-manifest resolved PCS00250 to Float project 11330982.");
    expect(liveCheckEvidence(report, "bt-raw-without-cache")).toContain("Live Float target manifest float:target-manifest leaves BT unresolved; no Float project ID is safe to infer.");
    expect(warningEvidence(report, "ucs04787")?.knownFloatIdsFromLiveManifest).toEqual(["10979146"]);
    expect(warningEvidence(report, "ucs05186")?.knownFloatIdsFromLiveManifest).toEqual(["11413292"]);
    expect(warningEvidence(report, "pcs00250")?.knownFloatIdsFromLiveManifest).toEqual(["11330982"]);
    expect(warningEvidence(report, "bt-raw-without-cache")?.knownFloatIdsFromLiveManifest).toEqual([]);
    expect(warningEvidence(report, "ucs04787")).toMatchObject({
      evidenceStatus: "source_snapshot_ready",
      sourceLayersChecked: ["fee_sheet", "pipeline", "production_revenue", "float", "live_float_manifest"],
      rawCacheVisibleStatusBasis: "named_scenario_fixture"
    });
    expect(report.scenarios.find((scenario) => scenario.id === "ucs04787")?.status).toBe("warn");
    expect(report.scenarios.find((scenario) => scenario.id === "bt-raw-without-cache")?.status).toBe("warn");
    expect(report.approvalReady).toBe(false);
  });

  test("derives Float warning layer status from live source evidence when task and display evidence exists", () => {
    const snapshot = floatLayerEvidenceSnapshot();
    const floatTargetManifest = buildFloatTargetManifestEvidenceFromSnapshot(snapshot);
    expect(floatTargetManifest).toBeDefined();
    const floatLayerEvidence = buildFloatLayerEvidenceFromSnapshot(snapshot, floatTargetManifest!);

    const report = buildNamedScenarioReport({
      sourceEvidence: {
        status: "ready",
        snapshotId: "named-scenario-layer-evidence-snapshot",
        sourcesChecked: ["fee_sheet", "pipeline", "production_revenue", "float"],
        rawRows: 10,
        floatTargetManifest: floatTargetManifest!,
        floatLayerEvidence
      }
    });

    expect(floatLayerEvidence.find((item) => item.scenarioCode === "UCS04787")).toMatchObject({
      raw: "represented",
      cache: "missing",
      visible: "represented",
      displayContract: "represented",
      derivedLayers: ["raw", "cache", "visible", "display_contract"]
    });
    expect(floatLayerEvidence.find((item) => item.scenarioCode === "PCS00250")).toMatchObject({
      raw: "missing",
      derivedLayers: ["raw"]
    });
    expect(warningEvidence(report, "ucs04787")).toMatchObject({
      evidenceStatus: "source_snapshot_ready",
      sourceLayersChecked: [
        "fee_sheet",
        "pipeline",
        "production_revenue",
        "float",
        "live_float_manifest",
        "float_raw",
        "float_cache",
        "float_visible",
        "display_contract"
      ],
      rawCacheVisibleStatus: {
        raw: "represented",
        cache: "missing",
        visible: "represented"
      },
      rawCacheVisibleStatusBasis: "derived_source_snapshot",
      derivedLayers: ["raw", "cache", "visible", "display_contract"],
      fixtureLayers: [],
      displayContractRowStatus: "represented"
    });
    expect(warningEvidence(report, "pcs00250")).toMatchObject({
      rawCacheVisibleStatus: {
        raw: "missing",
        cache: "represented",
        visible: "missing"
      },
      rawCacheVisibleStatusBasis: "mixed_source_snapshot_and_fixture",
      derivedLayers: ["raw"],
      fixtureLayers: ["cache", "visible"]
    });
    expect(report.status).toBe("warn");
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

function warningEvidence(report: ReturnType<typeof buildNamedScenarioReport>, scenarioId: string) {
  return report.scenarios.find((scenario) => scenario.id === scenarioId)?.warningEvidence;
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
      sheetSource("pipeline", "Pipeline", "pipeline_sheet", "Pipeline", [
        { jobNumber: "UCS04154" },
        { jobNumber: "TBC", projectName: "TBC Retail Pitch" }
      ]),
      sheetSource("production_revenue", "Production Revenue", "production_revenue_sheet", "PRODUCTION ONLY", [
        { jobNumber: "UCS04154" },
        { jobNumber: "UCS09999", projectName: "Archived Production Revenue" }
      ]),
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

function floatLayerEvidenceSnapshot() {
  return {
    ...fourStreamSnapshot(),
    sources: fourStreamSnapshot().sources.map((source) =>
      source.source === "float"
        ? {
            ...source,
            rows: [
              ...source.rows,
              floatTaskRow("UCS04787", "10979146", "task-04787-1"),
              floatTaskRow("UCS05186", "11413292", "task-05186-1"),
              floatLayerEvidenceRow("UCS04787", "10979146", {
                cache: "missing",
                visible: "represented",
                displayContract: "represented"
              })
            ]
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

function floatTaskRow(scenarioCode: string, floatProjectId: string, taskId: string) {
  return {
    identity: {
      stableSourceRowKey: `float:tasks:${taskId}`,
      sourceObjectId: taskId
    },
    raw: {
      objectType: "task",
      task_id: taskId,
      project_id: Number(floatProjectId),
      project_code: scenarioCode,
      hours: 8
    }
  };
}

function floatLayerEvidenceRow(
  scenarioCode: string,
  floatProjectId: string,
  layers: {
    readonly cache: "represented" | "missing";
    readonly visible: "represented" | "missing";
    readonly displayContract: "represented" | "missing";
  }
) {
  return {
    identity: {
      stableSourceRowKey: `float:layer-evidence:${scenarioCode}`,
      sourceObjectId: `layer-evidence:${scenarioCode}`
    },
    raw: {
      objectType: "float_layer_evidence",
      scenarioCode,
      floatProjectId,
      ...layers
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

function sheetSource(
  source: string,
  sourceLabel: string,
  sourceDocumentId: string,
  sourceTab: string,
  rawRows: readonly Record<string, string>[] = [{ jobNumber: "UCS04154" }]
) {
  return {
    source,
    mode: "manual_snapshot",
    sourceLabel,
    rows: rawRows.map((raw, index) => ({
        identity: {
          stableSourceRowKey: `${sourceDocumentId}:${sourceTab}:${index + 1}`,
          sourceDocumentId,
          sourceTab,
          sourceRowNumber: index + 1
        },
        raw
      }))
  };
}
