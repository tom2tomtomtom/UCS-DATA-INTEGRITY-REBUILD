import { describe, expect, test } from "vitest";

import {
  PARSER_ADDITIVE_STATUSES,
  createParserFactEvidence,
  createParserResult,
  createParserWarning,
  toIsAdditive,
  type ParserCapabilitySummary
} from "../../src/lib/parsers";

const sourceRef = {
  source: "fee_sheet" as const,
  sourceLayer: "sold" as const,
  batchId: "batch_fee_001",
  rawRowId: "raw_fee_001",
  sourceDocumentId: "fee_sheet_001",
  sourceTab: "CLIENT SUMMARY",
  sourceRowNumber: 12
};

describe("P3-A parser contracts", () => {
  test("makes additive status explicit instead of defaulting parser rows to totals", () => {
    expect(PARSER_ADDITIVE_STATUSES).toEqual([
      "additive",
      "not_additive",
      "source_summary",
      "unknown_requires_review"
    ]);

    expect(toIsAdditive("additive")).toBe(true);
    expect(toIsAdditive("not_additive")).toBe(false);
    expect(toIsAdditive("source_summary")).toBe(false);
    expect(toIsAdditive("unknown_requires_review")).toBe(false);
  });

  test("requires parser facts to carry batch ID, raw row IDs, source refs, and additive status", () => {
    const evidence = createParserFactEvidence({
      batchId: "batch_fee_001",
      rawRowIds: ["raw_fee_001"],
      sourceRefs: [sourceRef],
      additiveStatus: "not_additive"
    });

    expect(evidence).toEqual({
      batchId: "batch_fee_001",
      rawRowIds: ["raw_fee_001"],
      sourceRefs: [sourceRef],
      additiveStatus: "not_additive",
      isAdditive: false
    });

    expect(() =>
      createParserFactEvidence({
        batchId: "",
        rawRowIds: ["raw_fee_001"],
        sourceRefs: [sourceRef],
        additiveStatus: "additive"
      })
    ).toThrow("Parser facts require a batch ID.");

    expect(() =>
      createParserFactEvidence({
        batchId: "batch_fee_001",
        rawRowIds: [],
        sourceRefs: [sourceRef],
        additiveStatus: "additive"
      })
    ).toThrow("Parser facts require at least one raw row ID.");

    expect(() =>
      createParserFactEvidence({
        batchId: "batch_fee_001",
        rawRowIds: ["raw_fee_001"],
        sourceRefs: [],
        additiveStatus: "additive"
      })
    ).toThrow("Parser facts require at least one source ref.");
  });

  test("requires parser warnings to carry source refs and unresolved parser context", () => {
    const warning = createParserWarning({
      code: "CLIENT_SUMMARY_VTAB_DISAGREE",
      message: "CLIENT SUMMARY and V-tab values differ.",
      source: "fee_sheet",
      sourceLayer: "sold",
      batchId: "batch_fee_001",
      rawRowIds: ["raw_fee_001", "raw_fee_002"],
      sourceRefs: [sourceRef],
      severity: "DATA_WARN"
    });

    expect(warning).toEqual({
      code: "CLIENT_SUMMARY_VTAB_DISAGREE",
      message: "CLIENT SUMMARY and V-tab values differ.",
      source: "fee_sheet",
      sourceLayer: "sold",
      batchId: "batch_fee_001",
      rawRowIds: ["raw_fee_001", "raw_fee_002"],
      sourceRefs: [sourceRef],
      severity: "DATA_WARN"
    });

    expect(() =>
      createParserWarning({
        code: "MISSING_REFS",
        message: "Bad warning.",
        source: "fee_sheet",
        sourceLayer: "sold",
        batchId: "batch_fee_001",
        rawRowIds: ["raw_fee_001"],
        sourceRefs: [],
        severity: "DATA_WARN"
      })
    ).toThrow("Parser warnings require at least one source ref.");
  });

  test("creates parser results without display rows, UI fields, or selector output", () => {
    const capabilities: ParserCapabilitySummary[] = [
      {
        source: "pipeline",
        capabilities: [
          {
            key: "department",
            status: "unsupported",
            reason: "Pipeline source rows do not carry department attribution."
          }
        ]
      }
    ];

    const result = createParserResult({
      parserName: "pipeline",
      source: "pipeline",
      facts: [],
      warnings: [],
      capabilities,
      sourceRowsRead: 2,
      sourceRowsSkipped: 1
    });

    expect(result).toMatchObject({
      parserName: "pipeline",
      source: "pipeline",
      facts: [],
      warnings: [],
      capabilities,
      sourceRowsRead: 2,
      sourceRowsSkipped: 1
    });
    expect("displayRows" in result).toBe(false);
    expect("visibleRows" in result).toBe(false);
    expect("totals" in result).toBe(false);
    expect("selectDashboardView" in result).toBe(false);
  });
});
