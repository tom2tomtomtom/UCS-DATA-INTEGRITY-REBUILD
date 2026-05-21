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
  });
});
