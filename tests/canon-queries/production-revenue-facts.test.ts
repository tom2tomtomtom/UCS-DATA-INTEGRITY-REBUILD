import { describe, expect, test } from "vitest";

import sourceRowsFixture from "../../fixtures/source-rows/production-revenue/p3-d-production-revenue-rows.json";
import { selectProductionRevenueFacts } from "../../src/lib/canon-queries/production-revenue";
import { parseProductionRevenueRows } from "../../src/lib/parsers/production-revenue";
import type { DashboardScope, SourceCapability } from "../../src/lib";
import type { ArchivedRawSourceRow } from "../../src/lib/source-archive/types";

const sourceRows = sourceRowsFixture as readonly ArchivedRawSourceRow[];

const aprilScope: DashboardScope = {
  office: "ALL",
  from: "2026-04-01",
  to: "2026-04-30"
};

function parseFixture() {
  const result = parseProductionRevenueRows(sourceRows);
  const capabilities = result.capabilities.find((capability) => capability.source === "production_revenue")?.capabilities;

  if (capabilities === undefined) {
    throw new Error("Expected production revenue parser capabilities.");
  }

  return {
    facts: result.facts,
    capabilities: capabilities as readonly SourceCapability[]
  };
}

describe("P4-C production revenue source fact selector", () => {
  test("returns scoped source facts with archived, unknown-status, and collision evidence intact", () => {
    const parsed = parseFixture();

    const result = selectProductionRevenueFacts({
      scope: aprilScope,
      facts: parsed.facts,
      capabilities: parsed.capabilities
    });

    expect(result.source).toBe("production_revenue");
    expect(result.scope).toEqual(aprilScope);
    expect(result.facts).toHaveLength(5);
    expect(result.facts.find((fact) => fact.rawRowIds.includes("raw_pr_001"))?.warnings.map((warning) => warning.code)).toContain(
      "ARCHIVED_PROJECT_REVENUE"
    );
    expect(result.facts.find((fact) => fact.rawRowIds.includes("raw_pr_002"))?.productionStatus).toBe("UNKNOWN");
    expect(result.facts.filter((fact) => fact.jobNumber === "UCS90003").map((fact) => fact.productionStatus)).toEqual([
      "CONFIRMED",
      "NEGOTIATING"
    ]);
    expect(result.facts.filter((fact) => fact.jobNumber === "UCS90003")).toHaveLength(2);
    expect(result.unsupportedMetrics).toEqual([]);
    expect("displayRows" in result).toBe(false);
    expect("totals" in result).toBe(false);
    expect("csvRows" in result).toBe(false);
  });

  test("returns unsupported metadata instead of zero for department and role scope", () => {
    const parsed = parseFixture();

    const result = selectProductionRevenueFacts({
      scope: {
        office: "ALL",
        from: "2026-04-01",
        to: "2026-04-30",
        department: "Design",
        role: "Producer"
      },
      facts: parsed.facts,
      capabilities: parsed.capabilities
    });

    expect(result.facts).toHaveLength(5);
    expect(result.unsupportedMetrics.map((metric) => metric.metric).sort()).toEqual(["department", "role"]);
    expect(result.unsupportedMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "unsupported",
          source: "production_revenue",
          metric: "department",
          displayLabel: "Unsupported",
          severity: "warn"
        }),
        expect.objectContaining({
          kind: "unsupported",
          source: "production_revenue",
          metric: "role",
          displayLabel: "Unsupported",
          severity: "warn"
        })
      ])
    );
  });
});
