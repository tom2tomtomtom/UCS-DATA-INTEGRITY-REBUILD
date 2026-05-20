import { describe, expect, test } from "vitest";

import sourceRowsFixture from "../../fixtures/source-rows/pipeline/mixed-rows.json";
import { parsePipelineRows } from "../../src/lib/parsers/pipeline";
import { selectPipelineFacts } from "../../src/lib/canon-queries/pipeline";
import type { DashboardScope, SourceCapability } from "../../src/lib";
import type { SourceArchiveRecord } from "../../src/lib/source-archive/types";

const sourceRows = sourceRowsFixture as SourceArchiveRecord[];

const broadPipelineScope: DashboardScope = {
  office: "ALL",
  from: "2026-06-01",
  to: "2026-09-30"
};

function parseFixture() {
  const result = parsePipelineRows(sourceRows);
  const capabilities = result.capabilities.find((capability) => capability.source === "pipeline")?.capabilities;

  if (capabilities === undefined) {
    throw new Error("Expected pipeline parser capabilities.");
  }

  return {
    facts: result.facts,
    capabilities: capabilities as readonly SourceCapability[]
  };
}

describe("P4-C pipeline source fact selector", () => {
  test("returns scoped source facts while TBC rows keep per-row identity", () => {
    const parsed = parseFixture();

    const result = selectPipelineFacts({
      scope: broadPipelineScope,
      facts: parsed.facts,
      capabilities: parsed.capabilities
    });

    expect(result.source).toBe("pipeline");
    expect(result.scope).toEqual(broadPipelineScope);
    expect(result.facts).toHaveLength(4);
    expect(result.facts.map((fact) => fact.rawRowIds)).toEqual([
      ["raw_pipeline_001"],
      ["raw_pipeline_002"],
      ["raw_pipeline_003"],
      ["raw_pipeline_004"]
    ]);
    expect(
      result.facts
        .filter((fact) => fact.rawRowIds.includes("raw_pipeline_001") || fact.rawRowIds.includes("raw_pipeline_002"))
        .map((fact) => fact.stablePipelineIdentity)
    ).toEqual(["source-row:raw_pipeline_001", "source-row:raw_pipeline_002"]);
    expect(result.unsupportedMetrics).toEqual([]);
    expect("displayRows" in result).toBe(false);
    expect("totals" in result).toBe(false);
    expect("csvRows" in result).toBe(false);
  });

  test("returns unsupported metadata instead of zero for department and role scope", () => {
    const parsed = parseFixture();

    const result = selectPipelineFacts({
      scope: {
        office: "LDN",
        from: "2026-06-01",
        to: "2026-07-31",
        department: "Design",
        role: "Producer"
      },
      facts: parsed.facts,
      capabilities: parsed.capabilities
    });

    expect(result.facts).toHaveLength(2);
    expect(result.facts.map((fact) => fact.stablePipelineIdentity)).toEqual([
      "source-row:raw_pipeline_001",
      "source-row:raw_pipeline_002"
    ]);
    expect(result.unsupportedMetrics.map((metric) => metric.metric).sort()).toEqual(["department", "role"]);
    expect(result.unsupportedMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "unsupported",
          source: "pipeline",
          metric: "department",
          displayLabel: "Unsupported",
          severity: "warn"
        }),
        expect.objectContaining({
          kind: "unsupported",
          source: "pipeline",
          metric: "role",
          displayLabel: "Unsupported",
          severity: "warn"
        })
      ])
    );
  });
});
