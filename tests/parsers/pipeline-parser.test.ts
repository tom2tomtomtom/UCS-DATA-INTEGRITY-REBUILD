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

function pipelineSheetRow(input: {
  readonly id: string;
  readonly rowNumber: number;
  readonly cells: readonly unknown[];
}): SourceArchiveRecord {
  return {
    kind: "raw_source_row",
    archiveStatus: "archived",
    id: input.id,
    batchId: "batch_pipeline_sheet_001",
    source: "pipeline",
    identity: {
      stableSourceRowKey: `pipeline_sheet:Pipeline:${input.rowNumber}`,
      sourceDocumentId: "pipeline_sheet",
      sourceTab: "Pipeline",
      sourceRowNumber: input.rowNumber
    },
    raw: {
      source: "pipeline",
      rowNumber: input.rowNumber,
      cells: input.cells
    },
    contentHash: `hash_${input.id}`,
    observedAt: "2026-05-21T00:00:00.000Z",
    sourceRefs: [
      {
        source: "pipeline",
        sourceLayer: "pipeline",
        batchId: "batch_pipeline_sheet_001",
        rawRowId: input.id,
        sourceDocumentId: "pipeline_sheet",
        sourceTab: "Pipeline",
        sourceRowNumber: input.rowNumber
      }
    ]
  };
}

const pipelineSheetHeaders = [
  "STATUS",
  "CLIENT",
  "OWNER",
  "REV",
  "JOB NO",
  "PROJECT",
  "OFFICE",
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC"
];

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

  test("expands archived Pipeline sheet month cells into parser-ready facts", () => {
    const result = parsePipelineRows([
      pipelineSheetRow({ id: "raw_pipeline_header_001", rowNumber: 1, cells: pipelineSheetHeaders }),
      pipelineSheetRow({
        id: "raw_pipeline_sheet_007",
        rowNumber: 7,
        cells: ["Likely", "Nike ACG", "Jade", "", "UCS12345", "Trail Launch", "LDN", "£12,500", "", "(2,500)"]
      })
    ]);

    expect(result.facts).toHaveLength(2);
    expect(result.sourceRowsRead).toBe(1);
    expect(result.sourceRowsSkipped).toBe(1);
    expect(result.facts.map((fact) => fact.id)).toEqual([
      "pipeline:batch_pipeline_sheet_001:raw_pipeline_sheet_007:2026-01",
      "pipeline:batch_pipeline_sheet_001:raw_pipeline_sheet_007:2026-03"
    ]);
    expect(result.facts.map((fact) => fact.month)).toEqual(["2026-01", "2026-03"]);
    expect(result.facts.map((fact) => fact.amount?.kind === "money" ? fact.amount.value.amountGbp : undefined)).toEqual([
      12500,
      -2500
    ]);
    expect(result.facts[0]).toMatchObject({
      jobNumber: "UCS12345",
      stablePipelineIdentity: "job:UCS12345",
      sourceClient: "Nike ACG",
      sourceProjectName: "Trail Launch",
      status: "Likely",
      office: "LDN",
      rawRowIds: ["raw_pipeline_sheet_007"]
    });
    expect(result.facts[0]?.trace).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rawRowId: "raw_pipeline_sheet_007",
          sourceRowNumber: 7,
          field: "JAN"
        })
      ])
    );
  });

  test("preserves TBC and no-job identities when shaping Pipeline sheet rows", () => {
    const result = parsePipelineRows([
      pipelineSheetRow({ id: "raw_pipeline_header_001", rowNumber: 1, cells: pipelineSheetHeaders }),
      pipelineSheetRow({
        id: "raw_pipeline_sheet_008",
        rowNumber: 8,
        cells: ["Provisional", "Acme + Co", "Jade", "", "TBC", "Spring Launch", "USA", "900"]
      }),
      pipelineSheetRow({
        id: "raw_pipeline_sheet_009",
        rowNumber: 9,
        cells: ["Likely", "B&Q Retail", "Yunni", "", "", "Partner Launch", "UCX", "", "1,200"]
      })
    ]);

    expect(result.facts).toHaveLength(2);
    expect(result.facts.map((fact) => fact.stablePipelineIdentity)).toEqual([
      "source-row:raw_pipeline_sheet_008",
      "source-row:raw_pipeline_sheet_009"
    ]);
    expect(result.facts.map((fact) => fact.jobNumber)).toEqual([undefined, undefined]);
    expect(result.facts.map((fact) => fact.month)).toEqual(["2026-01", "2026-02"]);
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      "PIPELINE_TBC_JOB_NUMBER",
      "PIPELINE_NO_JOB_NUMBER"
    ]);
  });
});
