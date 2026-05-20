import { describe, expect, test } from "vitest";

import type { ParserResult } from "../../src/lib/parsers/types";
import {
  buildSourceCapabilityIndexFromParserResults,
  capabilitiesForSource,
  capabilityForSource,
  sourceSupportsCapability,
  unsupportedMetricsForSourceScope
} from "../../src/lib/canon-queries/capabilities";

const pipelineResult = {
  parserName: "pipeline",
  source: "pipeline",
  facts: [],
  warnings: [],
  capabilities: [
    {
      source: "pipeline",
      capabilities: [
        { key: "project", status: "partial" },
        { key: "month", status: "supported" },
        { key: "department", status: "unsupported", reason: "Pipeline has no department field." },
        { key: "role", status: "unsupported", reason: "Pipeline has no role field." }
      ]
    }
  ],
  sourceRowsRead: 0,
  sourceRowsSkipped: 0
} satisfies ParserResult;

const floatResult = {
  parserName: "float",
  source: "float",
  facts: [],
  warnings: [],
  capabilities: [
    {
      source: "float",
      capabilities: [
        { key: "project", status: "supported" },
        { key: "department", status: "partial" },
        { key: "role", status: "partial" },
        { key: "person", status: "supported" }
      ]
    }
  ],
  sourceRowsRead: 0,
  sourceRowsSkipped: 0
} satisfies ParserResult;

describe("P4-E source capability index", () => {
  test("keeps capabilities attached to their source", () => {
    const index = buildSourceCapabilityIndexFromParserResults([pipelineResult, floatResult]);

    expect(capabilitiesForSource(index, "pipeline")).toEqual(
      pipelineResult.capabilities[0]?.capabilities
    );
    expect(capabilitiesForSource(index, "float")).toEqual(floatResult.capabilities[0]?.capabilities);
    expect(capabilityForSource(index, "pipeline", "department")).toMatchObject({
      key: "department",
      status: "unsupported"
    });
    expect(capabilityForSource(index, "float", "department")).toMatchObject({
      key: "department",
      status: "partial"
    });
  });

  test("turns unsupported scoped fields into unsupported metadata, not zero", () => {
    const index = buildSourceCapabilityIndexFromParserResults([pipelineResult, floatResult]);
    const unsupported = unsupportedMetricsForSourceScope({
      capabilityIndex: index,
      source: "pipeline",
      scope: {
        office: "LDN",
        from: "2026-01-01",
        to: "2026-03-31",
        department: "Design",
        role: "Senior Designer"
      }
    });

    expect(unsupported.map((metric) => metric.metric).sort()).toEqual(["department", "role"]);
    expect(unsupported.every((metric) => metric.kind === "unsupported")).toBe(true);
    expect(unsupported.some((metric) => "value" in metric)).toBe(false);
    expect(sourceSupportsCapability(index, "pipeline", "department")).toBe(false);
    expect(sourceSupportsCapability(index, "float", "person")).toBe(true);
  });
});
