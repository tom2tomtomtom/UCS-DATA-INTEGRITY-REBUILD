import { describe, expect, test } from "vitest";

import type { PipelineFact, SourceCapability } from "../../src/lib";
import {
  createCanonQueryResult,
  createUnsupportedScopeMetrics
} from "../../src/lib/canon-queries";

const pipelineCapabilities: SourceCapability[] = [
  { key: "project", status: "partial" },
  { key: "month", status: "supported" },
  { key: "office", status: "partial" },
  { key: "client", status: "supported" },
  { key: "department", status: "unsupported", reason: "Pipeline has no department field." },
  { key: "role", status: "unsupported", reason: "Pipeline has no role field." },
  { key: "person", status: "unsupported", reason: "Pipeline has no person field." }
];

const pipelineFact: PipelineFact = {
  id: "pipeline:batch:row-1",
  source: "pipeline",
  sourceLayer: "pipeline",
  rawRowIds: ["row-1"],
  batchId: "batch",
  stablePipelineIdentity: "source-row:row-1",
  client: "Acme Studios",
  sourceClient: "Acme Studios",
  projectName: "Q1 Launch",
  sourceProjectName: "Q1 Launch",
  office: "LDN",
  month: "2026-03",
  amount: {
    kind: "money",
    value: {
      amountOriginal: 1000,
      currencyOriginal: "GBP",
      amountGbp: 1000,
      fxRateToGbp: 1,
      fxSource: "fixture",
      fxCapturedAt: "2026-05-20T00:00:00.000Z"
    }
  },
  isAdditive: false,
  confidence: "medium",
  warnings: [],
  trace: [
    {
      source: "pipeline",
      sourceLayer: "pipeline",
      batchId: "batch",
      rawRowId: "row-1"
    }
  ]
};

describe("P4-A canon query contracts", () => {
  test("returns source facts, unsupported metrics, warnings, capabilities, and scope without display totals", () => {
    const result = createCanonQueryResult({
      source: "pipeline",
      scope: {
        office: "LDN",
        from: "2026-01-01",
        to: "2026-03-31",
        department: "Design"
      },
      facts: [pipelineFact],
      capabilities: pipelineCapabilities,
      warnings: []
    });

    expect(result.source).toBe("pipeline");
    expect(result.scope.department).toBe("Design");
    expect(result.facts).toEqual([pipelineFact]);
    expect(result.capabilities).toEqual(pipelineCapabilities);
    expect(result.unsupportedMetrics).toHaveLength(1);
    expect(result.unsupportedMetrics[0]).toMatchObject({
      kind: "unsupported",
      source: "pipeline",
      metric: "department",
      displayLabel: "Unsupported",
      severity: "warn"
    });
    expect("totals" in result).toBe(false);
    expect("displayRows" in result).toBe(false);
    expect("visibleRows" in result).toBe(false);
    expect("csvRows" in result).toBe(false);
    expect("dashboardRows" in result).toBe(false);
  });

  test("unsupported source capability produces unsupported metadata, not zero", () => {
    const unsupported = createUnsupportedScopeMetrics({
      source: "pipeline",
      scope: {
        office: "LDN",
        from: "2026-01-01",
        to: "2026-03-31",
        department: "Design",
        role: "Senior Designer"
      },
      capabilities: pipelineCapabilities
    });

    expect(unsupported.map((metric) => metric.metric).sort()).toEqual(["department", "role"]);
    expect(unsupported.every((metric) => metric.kind === "unsupported")).toBe(true);
    expect(unsupported.some((metric) => "value" in metric)).toBe(false);
  });
});
