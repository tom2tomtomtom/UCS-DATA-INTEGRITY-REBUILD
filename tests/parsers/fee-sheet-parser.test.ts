import { describe, expect, test } from "vitest";

import expected from "../../fixtures/parsed-facts/fee-sheets/p3-b-basic.json";
import sourceRowsFixture from "../../fixtures/source-rows/fee-sheets/p3-b-basic.json";
import { parseArchivedFeeSheetRows } from "../../src/lib/parsers/fee-sheet";
import type { MetricValue } from "../../src/lib/canon/types";
import type { ArchivedRawSourceRow } from "../../src/lib/source-archive/types";

const sourceRows = sourceRowsFixture as ArchivedRawSourceRow[];

function moneyAmount(fact: { amount?: MetricValue } | undefined): number | undefined {
  return fact?.amount?.kind === "money" ? fact.amount.value.amountGbp : undefined;
}

function hoursValue(fact: { hours?: MetricValue } | undefined): number | undefined {
  return fact?.hours?.kind === "hours" ? fact.hours.value : undefined;
}

describe("P3-B fee sheet parser", () => {
  test("preserves first-tab Float ID and keeps CLIENT SUMMARY separate from V-tab facts", () => {
    const result = parseArchivedFeeSheetRows(sourceRows);

    expect(result.parserName).toBe("fee-sheet");
    expect(result.source).toBe("fee_sheet");
    expect(result.sourceRowsRead).toBe(sourceRows.length);
    expect(result.sourceRowsSkipped).toBe(0);
    expect(result.facts.map((fact) => fact.id)).toEqual(expected.factIds);

    const clientSummary = result.facts.find((fact) =>
      fact.trace.some((sourceRef) => sourceRef.sourceTab === expected.clientSummaryFact.sourceTab)
    );
    const vTabFacts = result.facts.filter((fact) =>
      fact.trace.some((sourceRef) => sourceRef.sourceTab === "V1")
    );

    expect(clientSummary).toBeDefined();
    expect(vTabFacts).toHaveLength(3);
    expect(result.facts.every((fact) => fact.feeSheetFloatId === expected.firstTabFloatId)).toBe(true);
    expect(result.facts.every((fact) => fact.rawRowIds.includes("raw_fee_p3b_001_first_tab"))).toBe(true);
  });

  test("parses zero-fee nonzero-hour rows and lets row-level office beat project header office", () => {
    const result = parseArchivedFeeSheetRows(sourceRows);
    const rowLevelOfficeFact = result.facts.find((fact) =>
      fact.rawRowIds.includes(expected.rowLevelOfficeFact.rawRowId)
    );
    const zeroFeeHoursFact = result.facts.find((fact) =>
      fact.rawRowIds.includes(expected.zeroFeeHoursFact.rawRowId)
    );

    expect(rowLevelOfficeFact?.office).toBe(expected.rowLevelOfficeFact.office);
    expect(zeroFeeHoursFact).toBeDefined();
    expect(moneyAmount(zeroFeeHoursFact)).toBe(expected.zeroFeeHoursFact.soldFee);
    expect(hoursValue(zeroFeeHoursFact)).toBe(expected.zeroFeeHoursFact.soldHours);
    expect(zeroFeeHoursFact?.parserEvidence.additiveStatus).toBe(expected.zeroFeeHoursFact.additiveStatus);
    expect(zeroFeeHoursFact?.isAdditive).toBe(expected.zeroFeeHoursFact.isAdditive);
    expect(result.warnings.map((warning) => warning.code)).toContain("ZERO_FEE_WITH_HOURS");
  });

  test("keeps source summary rows non-additive and warns on CLIENT SUMMARY versus V-tab disagreement", () => {
    const result = parseArchivedFeeSheetRows(sourceRows);
    const clientSummary = result.facts.find((fact) =>
      fact.rawRowIds.includes("raw_fee_p3b_002_client_summary")
    );
    const vTabSummary = result.facts.find((fact) =>
      fact.rawRowIds.includes(expected.vTabSummaryFact.rawRowId)
    );
    const warning = result.warnings.find((parserWarning) =>
      parserWarning.code === "CLIENT_SUMMARY_VTAB_DISAGREE"
    );

    expect(clientSummary?.parserEvidence.additiveStatus).toBe(expected.clientSummaryFact.additiveStatus);
    expect(clientSummary?.isAdditive).toBe(expected.clientSummaryFact.isAdditive);
    expect(moneyAmount(clientSummary)).toBe(expected.clientSummaryFact.soldFee);
    expect(hoursValue(clientSummary)).toBe(expected.clientSummaryFact.soldHours);
    expect(vTabSummary?.parserEvidence.additiveStatus).toBe(expected.vTabSummaryFact.additiveStatus);
    expect(vTabSummary?.isAdditive).toBe(expected.vTabSummaryFact.isAdditive);
    expect(warning?.rawRowIds).toEqual([
      "raw_fee_p3b_002_client_summary",
      "raw_fee_p3b_005_vtab_total"
    ]);
    expect(result.facts.map((fact) => fact.id)).toEqual(expected.factIds);
  });

  test("emits parser facts only, never display rows or dashboard totals", () => {
    const result = parseArchivedFeeSheetRows(sourceRows);

    expect("displayRows" in result).toBe(false);
    expect("visibleRows" in result).toBe(false);
    expect("dashboardRows" in result).toBe(false);
    expect("totals" in result).toBe(false);
    expect(
      result.facts.every((fact) =>
        fact.batchId === "batch_fee_p3b_001" &&
        fact.rawRowIds.length > 0 &&
        fact.trace.length > 0 &&
        !("dashboardTotal" in fact)
      )
    ).toBe(true);
    expect(result.warnings.map((warning) => warning.code).sort()).toEqual(
      [...expected.expectedWarningCodes].sort()
    );
  });

  test("does not turn Fee Tracker master rows into sold facts before linked fee-sheet tabs are archived", () => {
    const result = parseArchivedFeeSheetRows([
      feeTrackerMasterRow("raw_fee_tracker_header", 2, [
        "Created",
        "Client",
        "Job Number",
        "Job Name",
        "Fee Sheet Link"
      ]),
      feeTrackerMasterRow("raw_fee_tracker_project", 3, [
        "09-06-2025, 7:26:53",
        "British Airways",
        "UCS04787",
        "UCS04787 - BA_FEE_MARCH MADNESS",
        "UCS04787 Fee Sheet"
      ])
    ]);

    expect(result.facts).toEqual([]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNSUPPORTED_FEE_SHEET_ROW_SHAPE",
          rawRowIds: ["raw_fee_tracker_header"]
        }),
        expect.objectContaining({
          code: "UNSUPPORTED_FEE_SHEET_ROW_SHAPE",
          rawRowIds: ["raw_fee_tracker_project"]
        })
      ])
    );
  });
});

function feeTrackerMasterRow(id: string, sourceRowNumber: number, cells: readonly string[]): ArchivedRawSourceRow {
  return {
    kind: "raw_source_row",
    archiveStatus: "archived",
    id,
    batchId: "batch_fee_tracker_master",
    source: "fee_sheet",
    identity: {
      stableSourceRowKey: `fee-tracker:LDN:${sourceRowNumber}`,
      sourceDocumentId: "fee_tracker",
      sourceTab: "LDN",
      sourceRowNumber
    },
    raw: {
      source: "fee_sheet",
      rowNumber: sourceRowNumber,
      cells
    },
    contentHash: `hash:${id}`,
    observedAt: "2026-05-21T00:00:00.000Z",
    sourceRefs: [
      {
        source: "fee_sheet",
        sourceLayer: "fee_sheet_parser_summary",
        batchId: "batch_fee_tracker_master",
        rawRowId: id,
        sourceDocumentId: "fee_tracker",
        sourceTab: "LDN",
        sourceRowNumber
      }
    ]
  };
}
