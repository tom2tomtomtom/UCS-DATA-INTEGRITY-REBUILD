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

  test("turns Fee Tracker master rows into non-additive identity facts only", () => {
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

    expect(result.facts).toHaveLength(1);
    expect(result.facts[0]).toMatchObject({
      id: "fee_sheet:batch_fee_tracker_master:raw_fee_tracker_project:fee-tracker-project",
      sourceLayer: "fee_sheet_parser_summary",
      feeSheetRowKind: "source_summary",
      jobNumber: "UCS04787",
      client: "British Airways",
      sourceClient: "British Airways",
      projectName: "UCS04787 - BA_FEE_MARCH MADNESS",
      sourceProjectName: "UCS04787 - BA_FEE_MARCH MADNESS",
      office: "LDN",
      isAdditive: false
    });
    expect(result.facts[0]?.amount).toBeUndefined();
    expect(result.facts[0]?.hours).toBeUndefined();
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNSUPPORTED_FEE_SHEET_ROW_SHAPE",
          rawRowIds: ["raw_fee_tracker_header"]
        })
      ])
    );
    expect(result.warnings.map((warning) => warning.rawRowIds)).not.toContainEqual([
      "raw_fee_tracker_project"
    ]);
  });

  test("uses linked fee-sheet first-tab Float ID rows as the project header join key", () => {
    const result = parseArchivedFeeSheetRows([
      linkedFirstTabFloatIdRow(),
      {
        ...feeTrackerMasterRow("raw_linked_vtab_fact", 42, []),
        identity: {
          stableSourceRowKey: "linked-fee-sheet:V1:42",
          sourceDocumentId: "linked-fee-sheet-id",
          sourceTab: "V1",
          sourceRowNumber: 42
        },
        raw: {
          rowKind: "v_tab",
          jobNumber: "UCS04787",
          month: "2026-03",
          department: "Design",
          role: "Designer",
          soldFee: 1000,
          soldHours: 12
        }
      }
    ]);

    expect(result.facts).toHaveLength(1);
    expect(result.facts[0]?.jobNumber).toBe("UCS04787");
    expect(result.facts[0]?.feeSheetFloatId).toBe("10480262");
    expect(result.facts[0]?.floatProjectId).toBe("10480262");
    expect(result.facts[0]?.client).toBe("British Airways");
    expect(result.facts[0]?.office).toBe("LDN");
    expect(result.facts[0]?.rawRowIds).toEqual([
      "raw_linked_first_tab_float_id",
      "raw_linked_vtab_fact"
    ]);
    expect(result.warnings.map((warning) => warning.rawRowIds)).not.toContainEqual([
      "raw_linked_first_tab_float_id"
    ]);
  });

  test("parses only main linked V-tab subtotal rows into additive sold facts", () => {
    const result = parseArchivedFeeSheetRows([
      linkedFirstTabFloatIdRow(),
      linkedVTabRow("raw_v1_title", "V1", 3, ["V1 FEE CALCULATOR", "", "", "MAIN FEE SHEET"]),
      linkedVTabRow("raw_v1_group", "V1", 9, [
        "",
        "",
        "",
        "",
        "",
        "",
        "SOLD",
        "",
        "",
        "ALLOCATED",
        "",
        "",
        "SOLD"
      ]),
      linkedVTabRow("raw_v1_months", "V1", 10, [
        "",
        "",
        "",
        "",
        "",
        "",
        "01-Jan-26",
        "",
        "",
        "01-Jan-26",
        "",
        "",
        "01-Feb-26"
      ]),
      linkedVTabRow("raw_v1_headers", "V1", 11, [
        "OFFICE",
        "ROLE",
        "NAME(S)",
        "DAY RATE:",
        "PHASE",
        "",
        "%",
        "FEE P/M",
        "HOURS",
        "%",
        "FEE P/M",
        "HOURS",
        "%",
        "FEE P/M",
        "HOURS"
      ]),
      linkedVTabRow("raw_v1_strategy_subtotal", "V1", 64, [
        "SUB-TOTAL 01 STRATEGY",
        "",
        "",
        "",
        "",
        "",
        "50%",
        "1,000",
        "12",
        "99%",
        "999",
        "999",
        "25%",
        "250",
        "3"
      ]),
      linkedVTabRow("raw_v2_title", "V2", 3, ["V2 FEE CALCULATOR", "", "", "ASSIGN AS MAIN FEE SHEET"]),
      linkedVTabRow("raw_v2_group", "V2", 9, ["", "", "", "", "", "", "SOLD"]),
      linkedVTabRow("raw_v2_months", "V2", 10, ["", "", "", "", "", "", "01-Jan-26"]),
      linkedVTabRow("raw_v2_headers", "V2", 11, ["OFFICE", "ROLE", "NAME(S)", "DAY RATE:", "PHASE", "", "%", "FEE P/M", "HOURS"]),
      linkedVTabRow("raw_v2_strategy_subtotal", "V2", 64, ["SUB-TOTAL 01 STRATEGY", "", "", "", "", "", "50%", "9999", "99"])
    ]);

    expect(result.facts.map((fact) => ({
      sourceTab: fact.trace.find((sourceRef) => sourceRef.rawRowId === "raw_v1_strategy_subtotal")?.sourceTab,
      month: fact.month,
      department: fact.department,
      soldFee: moneyAmount(fact),
      soldHours: hoursValue(fact),
      isAdditive: fact.isAdditive
    }))).toEqual([
      {
        sourceTab: "V1",
        month: "2026-01",
        department: "Strategy",
        soldFee: 1000,
        soldHours: 12,
        isAdditive: true
      },
      {
        sourceTab: "V1",
        month: "2026-02",
        department: "Strategy",
        soldFee: 250,
        soldHours: 3,
        isAdditive: true
      }
    ]);
    expect(result.facts.every((fact) => fact.feeSheetFloatId === "10480262")).toBe(true);
    expect(result.facts.map((fact) => fact.rawRowIds)).toEqual([
      ["raw_linked_first_tab_float_id", "raw_v1_strategy_subtotal"],
      ["raw_linked_first_tab_float_id", "raw_v1_strategy_subtotal"]
    ]);
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

function linkedFirstTabFloatIdRow(): ArchivedRawSourceRow {
  return {
    kind: "raw_source_row",
    archiveStatus: "archived",
    id: "raw_linked_first_tab_float_id",
    batchId: "batch_fee_tracker_master",
    source: "fee_sheet",
    identity: {
      stableSourceRowKey: "linked-fee-sheet:*ALWAYS START HERE*:15",
      sourceDocumentId: "linked-fee-sheet-id",
      sourceTab: "*ALWAYS START HERE*",
      sourceRowNumber: 15
    },
    raw: {
      source: "fee_sheet",
      rowNumber: 15,
      cells: ["", "FLOAT PROJECT ID", "10480262"],
      linkedFeeSheet: {
        feeTrackerStableSourceRowKey: "fee-tracker:LDN:12",
        feeTrackerSourceDocumentId: "fee_tracker",
        feeTrackerSourceTab: "LDN",
        feeTrackerSourceRowNumber: 12,
        feeTrackerOffice: "LDN",
        feeTrackerClient: "British Airways",
        feeTrackerJobNumber: "UCS04787",
        feeTrackerProjectName: "UCS04787 - BA_FEE_MARCH MADNESS",
        feeSheetSpreadsheetId: "linked-fee-sheet-id",
        feeSheetUrl: "https://docs.google.com/spreadsheets/d/linked-fee-sheet-id/edit"
      }
    },
    contentHash: "hash:raw_linked_first_tab_float_id",
    observedAt: "2026-05-21T00:00:00.000Z",
    sourceRefs: [
      {
        source: "fee_sheet",
        sourceLayer: "fee_sheet_parser_summary",
        batchId: "batch_fee_tracker_master",
        rawRowId: "raw_linked_first_tab_float_id",
        sourceDocumentId: "linked-fee-sheet-id",
        sourceTab: "*ALWAYS START HERE*",
        sourceRowNumber: 15
      }
    ]
  };
}

function linkedVTabRow(id: string, tab: string, sourceRowNumber: number, cells: readonly string[]): ArchivedRawSourceRow {
  return {
    ...feeTrackerMasterRow(id, sourceRowNumber, cells),
    identity: {
      stableSourceRowKey: `linked-fee-sheet:${tab}:${sourceRowNumber}`,
      sourceDocumentId: "linked-fee-sheet-id",
      sourceTab: tab,
      sourceRowNumber
    },
    raw: {
      source: "fee_sheet",
      rowNumber: sourceRowNumber,
      cells,
      linkedFeeSheet: {
        feeTrackerStableSourceRowKey: "fee-tracker:LDN:12",
        feeTrackerSourceDocumentId: "fee_tracker",
        feeTrackerSourceTab: "LDN",
        feeTrackerSourceRowNumber: 12,
        feeTrackerOffice: "LDN",
        feeTrackerClient: "British Airways",
        feeTrackerJobNumber: "UCS04787",
        feeTrackerProjectName: "UCS04787 - BA_FEE_MARCH MADNESS",
        feeSheetSpreadsheetId: "linked-fee-sheet-id",
        feeSheetUrl: "https://docs.google.com/spreadsheets/d/linked-fee-sheet-id/edit"
      }
    },
    sourceRefs: [
      {
        source: "fee_sheet",
        sourceLayer: "sold",
        batchId: "batch_fee_tracker_master",
        rawRowId: id,
        sourceDocumentId: "linked-fee-sheet-id",
        sourceTab: tab,
        sourceRowNumber
      }
    ]
  };
}
