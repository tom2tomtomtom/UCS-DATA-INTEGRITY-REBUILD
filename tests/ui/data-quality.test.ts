import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { DataQualityDashboard } from "../../src/components/dashboard/data-quality/data-quality-dashboard";
import { buildNamedScenarioReport } from "../../src/lib";
import { getFixtureDashboardContract } from "../../src/lib/ui/fixture-contract";

describe("P6-E Data Quality", () => {
  test("shows integrity statuses, named checks, and source-owner warnings from scenario report and contract evidence", () => {
    const contract = getFixtureDashboardContract();
    const html = renderToStaticMarkup(React.createElement(DataQualityDashboard, { contract }));

    expect(html).toContain("Data Quality");
    expect(html).toContain("All issues");
    expect(html).toContain("Named checks");
    expect(html).toContain("Float");
    expect(html).toContain("Affected rows");
    expect(html).toContain("Chase list");
    expect(html).toContain("Data quality chase rows");
    expect(html).toContain("Suggested fix");
    expect(html).toContain("At risk");
    expect(html).toContain("Source refs");
    expect(html).toContain("Check Float project ID");
    expect(html).toContain("Check Pipeline row identity");
    expect(html).toContain("Orphan revenue");
    expect(html).toContain("Parser diagnostics");
    expect(html).toContain("Archived");
    expect(html).toContain("FAIL");
    expect(html).toContain("WARN");
    expect(html).toContain("UNRESOLVED");
    expect(html).toContain("PCS00250");
    expect(html).toContain("BT Raw Without Cache");
    expect(html).toContain("UCS04787");
    expect(html).toContain("UCS05186");
    expect(html).toContain("USA00262");
    expect(html).toContain("Yunni");
    expect(html).toContain("Sian");
    expect(html).toContain("Jade");
    expect(html).toContain("Needs Codex");
    expect(html).toContain("Approval blocked_source_evidence");
    expect(html).toContain("Display");
    expect(html).toContain("CSV");
    expect(html).toContain("Chat");
    expect(html).toContain("Float issues");
    expect(html).toContain("Affected dashboard rows");
    expect(html).toContain("FLOAT_ONLY: UCS05186");
    expect(html).toContain("href=\"/dashboard/float/11413292?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;floatProjectId=11413292\"");
    expect(html).toContain("Yunni:");
    expect(html).toContain("Sian:");
    expect(html).toContain("Jade:");
    expect(html).toContain("PRODUCTION_REVENUE_ONLY: UCS09999");
    expect(html).toContain("PIPELINE_ONLY: Pipeline source row fixture-pipeline-tbc");
    expect(html).toContain("Archived source rows");
    expect(html).toContain("Use Codex for repo changes");
  });

  test("surfaces USA warnings from the named scenario report when source rows are missing", () => {
    const contract = getFixtureDashboardContract();
    const scenarioReport = buildNamedScenarioReport({
      sourceEvidence: {
        status: "ready",
        snapshotId: "data-quality-test-snapshot",
        sourcesChecked: ["fee_sheet", "pipeline", "production_revenue", "float"],
        rawRows: 1,
        floatTargetManifest: {
          status: "ready",
          source: "float",
          sourceMode: "read_only_live",
          manifestStableSourceRowKey: "float:target-manifest",
          manifestSourceObjectId: "target_manifest",
          requestedScenarioCodes: [],
          requestedProjectIds: [],
          resolvedProjectIds: [],
          unresolvedScenarioCodes: [],
          resolvedScenarios: [],
          unresolvedScenarios: []
        },
        floatLayerEvidence: [],
        scenarioSourceEvidence: [
          {
            scenarioCode: "USA00262",
            sources: [],
            sourceRowKeys: [],
            rowCount: 0
          },
          {
            scenarioCode: "USA00323",
            sources: [],
            sourceRowKeys: [],
            rowCount: 0
          }
        ]
      }
    });
    const html = renderToStaticMarkup(React.createElement(DataQualityDashboard, { contract, scenarioReport }));

    expect(html).toContain("WARN: USA00262 Sold-hours False-zero Guard");
    expect(html).toContain("WARN: USA00323 Sold-hours False-zero Guard");
    expect(html).toContain("contains no raw rows for USA00262");
    expect(html).toContain("contains no raw rows for USA00323");
    expect(html).toContain("Capture targeted USA fee-sheet source rows");
    expect(html).toContain("Approval blocked_warning");
    expect(html).toContain("Scope USA 2026-01-01 to 2026-12-31 job=USA00262");
    expect(html).toContain("Source refs 2");
    expect(html).toContain("Chat needs_codex");
  });
});
