import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import { buildNamedScenarioReport } from "../../src/lib/scenarios/named-scenario-report";

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
    expect(report.sourceEvidence).toEqual({
      status: "ready",
      snapshotId: "named-scenario-test-snapshot",
      sourcesChecked: ["fee_sheet", "pipeline", "production_revenue", "float"],
      rawRows: 4
    });
  });
});

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
