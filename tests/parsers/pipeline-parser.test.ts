import { describe, expect, test } from "vitest";

import type { PipelineFact } from "../../src/lib/canon/types";
import { parsePipelineRows } from "../../src/lib/parsers/pipeline";
import type { SourceArchiveRecord } from "../../src/lib/source-archive/types";
import expectedFixture from "../../fixtures/parsed-facts/pipeline/mixed-rows.expected.json";
import sourceRowsFixture from "../../fixtures/source-rows/pipeline/mixed-rows.json";

const sourceRows = sourceRowsFixture as SourceArchiveRecord[];
const expectedFacts = expectedFixture.facts;

function parseFixture() {
  return parsePipelineRows(sourceRows);
}

function factByRawRowId(facts: readonly PipelineFact[], rawRowId: string): PipelineFact {
  const fact = facts.find((candidate) => candidate.rawRowIds.includes(rawRowId));

  if (!fact) {
    throw new Error(`Expected parsed pipeline fact for ${rawRowId}.`);
  }

  return fact;
}

describe("P3-C pipeline parser", () => {
  test("keeps TBC rows as separate source-row identities instead of one bucket", () => {
    const result = parseFixture();
    const tbcFacts = ["raw_pipeline_001", "raw_pipeline_002"].map((rawRowId) =>
      factByRawRowId(result.facts, rawRowId)
    );

    expect(tbcFacts.map((fact) => fact.stablePipelineIdentity)).toEqual([
      "source-row:raw_pipeline_001",
      "source-row:raw_pipeline_002"
    ]);
    expect(new Set(tbcFacts.map((fact) => fact.stablePipelineIdentity))).toHaveLength(2);
    expect(tbcFacts.map((fact) => fact.rawRowIds)).toEqual([["raw_pipeline_001"], ["raw_pipeline_002"]]);
    expect(result.warnings.filter((warning) => warning.code === "PIPELINE_TBC_JOB_NUMBER")).toHaveLength(2);
  });

  test("turns non-empty no-job rows into facts with parser warnings", () => {
    const result = parseFixture();
    const fact = factByRawRowId(result.facts, "raw_pipeline_003");
    const warning = result.warnings.find((candidate) =>
      candidate.code === "PIPELINE_NO_JOB_NUMBER" && candidate.rawRowIds.includes("raw_pipeline_003")
    );

    expect(fact.jobNumber).toBeUndefined();
    expect(fact.stablePipelineIdentity).toBe("source-row:raw_pipeline_003");
    expect(fact.sourceClient).toBe("B&Q Retail + Digital");
    expect(fact.sourceProjectName).toBe("Retail: Q3 Store/Online + Partner Launch");
    expect(warning).toMatchObject({
      code: "PIPELINE_NO_JOB_NUMBER",
      source: "pipeline",
      sourceLayer: "pipeline",
      batchId: "batch_pipeline_001",
      rawRowIds: ["raw_pipeline_003"],
      severity: "DATA_WARN"
    });
  });

  test("preserves source text and source evidence on every parsed fact", () => {
    const result = parseFixture();

    expect(result.sourceRowsRead).toBe(4);
    expect(result.sourceRowsSkipped).toBe(1);
    expect(result.facts).toHaveLength(expectedFacts.length);

    for (const expectedFact of expectedFacts) {
      const rawRowId = expectedFact.rawRowIds[0];

      if (rawRowId === undefined) {
        throw new Error("Expected fixture fact to include a raw row ID.");
      }

      const fact = factByRawRowId(result.facts, rawRowId);

      expect(fact).toMatchObject({
        id: expectedFact.id,
        source: "pipeline",
        sourceLayer: "pipeline",
        batchId: expectedFact.batchId,
        rawRowIds: expectedFact.rawRowIds,
        stablePipelineIdentity: expectedFact.stablePipelineIdentity,
        sourceClient: expectedFact.sourceClient,
        client: expectedFact.sourceClient,
        sourceProjectName: expectedFact.sourceProjectName,
        projectName: expectedFact.sourceProjectName,
        month: expectedFact.month,
        isAdditive: expectedFact.isAdditive
      });
      expect(fact.trace).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            source: "pipeline",
            sourceLayer: "pipeline",
            batchId: expectedFact.batchId,
            rawRowId
          })
        ])
      );
      expect(fact.amount).toMatchObject({
        kind: "money",
        value: {
          amountOriginal: expectedFact.amountGbp,
          currencyOriginal: "GBP",
          amountGbp: expectedFact.amountGbp,
          fxRateToGbp: 1
        }
      });
    }
  });

  test("marks department, role, and person as unsupported capabilities", () => {
    const result = parseFixture();
    const pipelineCapabilities = result.capabilities.find((capability) => capability.source === "pipeline");

    expect(pipelineCapabilities?.capabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "department", status: "unsupported" }),
        expect.objectContaining({ key: "role", status: "unsupported" }),
        expect.objectContaining({ key: "person", status: "unsupported" })
      ])
    );
    for (const fact of result.facts) {
      expect(fact.department).toBeUndefined();
      expect(fact.role).toBeUndefined();
      expect(fact.person).toBeUndefined();
    }
  });

  test("does not turn pipeline into sold fee, display rows, or dashboard totals", () => {
    const result = parseFixture();

    expect("displayRows" in result).toBe(false);
    expect("visibleRows" in result).toBe(false);
    expect("totals" in result).toBe(false);
    for (const fact of result.facts) {
      expect(fact.source).toBe("pipeline");
      expect(fact.sourceLayer).toBe("pipeline");
      expect("feeSheetFloatId" in fact).toBe(false);
      expect("soldFee" in fact).toBe(false);
      expect("displayRow" in fact).toBe(false);
      expect("dashboardTotal" in fact).toBe(false);
    }
  });

  test("only skips literal empty rows already classified by the source archive", () => {
    const result = parseFixture();

    expect(result.facts.some((fact) => fact.rawRowIds.includes("raw_pipeline_empty_005"))).toBe(false);
    expect(result.warnings.some((warning) => warning.rawRowIds.includes("raw_pipeline_empty_005"))).toBe(false);
    expect(result.sourceRowsSkipped).toBe(expectedFixture.skippedRows.length);
  });
});
