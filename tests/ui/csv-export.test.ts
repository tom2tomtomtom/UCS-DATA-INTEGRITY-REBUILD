import { describe, expect, test } from "vitest";

import { buildCsvTextFromContract } from "../../src/components/dashboard/export/csv-export";
import { getFixtureDashboardContract } from "../../src/lib/ui/fixture-contract";

describe("P6-C CSV export", () => {
  test("exports contract CSV rows without recalculating visible values", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31"
    });
    const csv = buildCsvTextFromContract(contract);

    expect(csv).toContain("jobNumber");
    expect(csv).toContain("rowType");
    expect(csv).toContain("UCS04787");
    expect(csv).toContain("pipeline_only");
    expect(csv).toContain("production_revenue_only");
    expect(csv).toContain("float_only");
    expect(csv).toContain("warningCodes");
    expect(csv).toContain("ARCHIVED_PRODUCTION_REVENUE_VISIBLE");
    expect(csv).toContain("Source-only");
    expect(csv).not.toContain(",0,");
    expect(csv).not.toContain("[object Object]");
  });

  test("keeps unsupported CSV values as unsupported rather than zero", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      department: "Design"
    });
    const unsupported = {
      kind: "unsupported" as const,
      metric: "pipelineFee",
      scope: contract.scope,
      source: "pipeline" as const,
      reason: "Pipeline does not support department scope.",
      displayLabel: "Unsupported" as const,
      severity: "warn" as const
    };
    const firstRow = contract.csvRows[0];

    if (firstRow === undefined) {
      throw new Error("Fixture contract must include at least one CSV row");
    }

    const csv = buildCsvTextFromContract({
      ...contract,
      csvRows: [
        {
          ...firstRow,
          cells: {
            ...firstRow.cells,
            pipelineFee: "Unsupported"
          },
          unsupported: [unsupported]
        }
      ]
    });

    expect(csv).toContain("unsupportedMetrics");
    expect(csv).toContain("pipelineFee");
    expect(csv).toContain("Unsupported");
    expect(csv).toContain("Pipeline does not support department scope.");
    expect(csv).not.toContain("pipelineFee,0");
  });
});
