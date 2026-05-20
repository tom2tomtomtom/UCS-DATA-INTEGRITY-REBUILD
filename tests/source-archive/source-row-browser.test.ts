import { describe, expect, test } from "vitest";

import type { SourceArchiveRecord } from "../../src/lib/source-archive";
import {
  browseSourceRows,
  type SourceRowBrowserQuery
} from "../../src/lib/source-archive/source-row-browser";

const records: readonly SourceArchiveRecord[] = [
  {
    kind: "raw_source_row",
    archiveStatus: "archived",
    id: "raw_pipeline_tbc_42",
    batchId: "batch_pipeline_2026_05",
    source: "pipeline",
    identity: {
      sourceDocumentId: "pipeline_sheet",
      sourceTab: "Pipeline",
      sourceRowNumber: 42,
      stableSourceRowKey: "TBC:pipeline:pipeline_sheet:Pipeline:42"
    },
    raw: {
      jobNumber: "TBC",
      client: "Example",
      projectName: "Future pipeline work",
      amount: 1000
    },
    contentHash: "sha256:tbc42",
    observedAt: "2026-05-20T10:00:01.000Z",
    sourceRefs: [
      {
        source: "pipeline",
        sourceLayer: "pipeline",
        batchId: "batch_pipeline_2026_05",
        rawRowId: "raw_pipeline_tbc_42",
        sourceDocumentId: "pipeline_sheet",
        sourceTab: "Pipeline",
        sourceRowNumber: 42
      }
    ]
  },
  {
    kind: "raw_source_row",
    archiveStatus: "archived",
    id: "raw_production_revenue_17",
    batchId: "batch_production_2026_05",
    source: "production_revenue",
    identity: {
      sourceDocumentId: "production_revenue_sheet",
      sourceTab: "May",
      sourceRowNumber: 17,
      stableSourceRowKey: "production_revenue_sheet:May:17"
    },
    raw: {
      projectName: "Raw only search phrase must not match",
      amount: 2500,
      status: "ARCHIVED"
    },
    contentHash: "sha256:prod17",
    observedAt: "2026-05-20T10:00:02.000Z",
    sourceRefs: [
      {
        source: "production_revenue",
        sourceLayer: "production_revenue",
        batchId: "batch_production_2026_05",
        rawRowId: "raw_production_revenue_17",
        sourceDocumentId: "production_revenue_sheet",
        sourceTab: "May",
        sourceRowNumber: 17
      }
    ]
  },
  {
    kind: "raw_source_row",
    archiveStatus: "archived",
    id: "raw_float_project_123",
    batchId: "batch_float_2026_05",
    source: "float",
    identity: {
      sourceObjectId: "float_project_123",
      stableSourceRowKey: "float:project:float_project_123"
    },
    raw: {
      id: "float_project_123",
      name: "UCS04787 Float task evidence"
    },
    contentHash: "sha256:float123",
    observedAt: "2026-05-20T10:00:03.000Z",
    sourceRefs: [
      {
        source: "float",
        sourceLayer: "float_raw",
        batchId: "batch_float_2026_05",
        rawRowId: "raw_float_project_123",
        sourceObjectId: "float_project_123"
      }
    ]
  },
  {
    kind: "raw_source_row",
    archiveStatus: "archived",
    id: "raw_pipeline_duplicate_50",
    batchId: "batch_pipeline_2026_05",
    source: "pipeline",
    identity: {
      sourceDocumentId: "pipeline_sheet",
      sourceTab: "Pipeline",
      sourceRowNumber: 50,
      stableSourceRowKey: "pipeline_sheet:Pipeline:50"
    },
    raw: {
      jobNumber: "UCS09999",
      client: "Duplicate Client",
      projectName: "Duplicate row",
      amount: 500
    },
    contentHash: "sha256:duplicate-pipeline-row",
    observedAt: "2026-05-20T10:00:04.000Z",
    sourceRefs: [
      {
        source: "pipeline",
        sourceLayer: "pipeline",
        batchId: "batch_pipeline_2026_05",
        rawRowId: "raw_pipeline_duplicate_50",
        sourceDocumentId: "pipeline_sheet",
        sourceTab: "Pipeline",
        sourceRowNumber: 50
      }
    ]
  },
  {
    kind: "raw_source_row",
    archiveStatus: "archived",
    id: "raw_pipeline_duplicate_51",
    batchId: "batch_pipeline_2026_05",
    source: "pipeline",
    identity: {
      sourceDocumentId: "pipeline_sheet",
      sourceTab: "Pipeline",
      sourceRowNumber: 51,
      stableSourceRowKey: "pipeline_sheet:Pipeline:51"
    },
    raw: {
      jobNumber: "UCS09999",
      client: "Duplicate Client",
      projectName: "Duplicate row",
      amount: 500
    },
    contentHash: "sha256:duplicate-pipeline-row",
    observedAt: "2026-05-20T10:00:05.000Z",
    sourceRefs: [
      {
        source: "pipeline",
        sourceLayer: "pipeline",
        batchId: "batch_pipeline_2026_05",
        rawRowId: "raw_pipeline_duplicate_51",
        sourceDocumentId: "pipeline_sheet",
        sourceTab: "Pipeline",
        sourceRowNumber: 51
      }
    ]
  },
  {
    kind: "skipped_source_row",
    archiveStatus: "skipped",
    id: "skip_fee_sheet_empty_99",
    batchId: "batch_fee_2026_05",
    source: "fee_sheet",
    identity: {
      sourceDocumentId: "fee_sheet_001",
      sourceTab: "CLIENT SUMMARY",
      sourceRowNumber: 99,
      stableSourceRowKey: "fee_sheet_001:CLIENT SUMMARY:99"
    },
    raw: null,
    contentHash: "sha256:empty99",
    observedAt: "2026-05-20T10:00:06.000Z",
    skip: {
      allowedByLaw: true,
      classification: "literally_empty",
      reason: "No job, project, client, date, amount, hours, or useful source identifier.",
      evidence: {
        hasJobNumber: false,
        hasProjectName: false,
        hasClient: false,
        hasDate: false,
        hasAmount: false,
        hasHours: false,
        hasUsefulSourceIdentifier: false
      }
    },
    sourceRefs: [
      {
        source: "fee_sheet",
        sourceLayer: "sold",
        batchId: "batch_fee_2026_05",
        rawRowId: "skip_fee_sheet_empty_99",
        sourceDocumentId: "fee_sheet_001",
        sourceTab: "CLIENT SUMMARY",
        sourceRowNumber: 99
      }
    ]
  }
];

const ids = (rows: readonly { readonly id: string }[]) => rows.map((row) => row.id);

describe("P2-E source row browser query helpers", () => {
  test("filters archived records by source archive identity fields", () => {
    expect(
      ids(
        browseSourceRows(records, {
          source: "pipeline",
          batchId: "batch_pipeline_2026_05",
          sourceDocumentId: "pipeline_sheet",
          sourceTab: "Pipeline",
          sourceRowNumber: 42
        })
      )
    ).toEqual(["raw_pipeline_tbc_42"]);

    expect(
      ids(
        browseSourceRows(records, {
          source: "float",
          sourceObjectId: "float_project_123"
        })
      )
    ).toEqual(["raw_float_project_123"]);

    expect(ids(browseSourceRows(records, { contentHash: "sha256:prod17" }))).toEqual([
      "raw_production_revenue_17"
    ]);
  });

  test("searches source identity text without parsing raw payload values", () => {
    const tbcLookup: SourceRowBrowserQuery = {
      source: "pipeline",
      text: "tbc:PIPELINE"
    };
    const floatLookup: SourceRowBrowserQuery = {
      source: "float",
      text: "FLOAT_PROJECT_123"
    };

    expect(ids(browseSourceRows(records, tbcLookup))).toEqual(["raw_pipeline_tbc_42"]);
    expect(ids(browseSourceRows(records, floatLookup))).toEqual(["raw_float_project_123"]);
    expect(ids(browseSourceRows(records, { text: "Raw only search phrase" }))).toEqual([]);
  });

  test("keeps skipped rows visible with source refs and skip reasons", () => {
    const skipped = browseSourceRows(records, {
      source: "fee_sheet",
      sourceDocumentId: "fee_sheet_001",
      sourceTab: "CLIENT SUMMARY",
      sourceRowNumber: 99
    });

    expect(ids(skipped)).toEqual(["skip_fee_sheet_empty_99"]);
    expect(skipped[0]?.archiveStatus).toBe("skipped");
    expect(skipped[0]?.skipReason).toBe(
      "No job, project, client, date, amount, hours, or useful source identifier."
    );
    expect(skipped[0]?.skipClassification).toBe("literally_empty");
    expect(skipped[0]?.sourceRefs).toEqual([
      {
        source: "fee_sheet",
        sourceLayer: "sold",
        batchId: "batch_fee_2026_05",
        rawRowId: "skip_fee_sheet_empty_99",
        sourceDocumentId: "fee_sheet_001",
        sourceTab: "CLIENT SUMMARY",
        sourceRowNumber: 99
      }
    ]);
  });

  test("includes archived and skipped rows when no status filter is supplied", () => {
    expect(ids(browseSourceRows(records))).toEqual([
      "raw_pipeline_tbc_42",
      "raw_production_revenue_17",
      "raw_float_project_123",
      "raw_pipeline_duplicate_50",
      "raw_pipeline_duplicate_51",
      "skip_fee_sheet_empty_99"
    ]);
  });

  test("does not suppress duplicate rows with the same content hash", () => {
    expect(ids(browseSourceRows(records, { contentHash: "sha256:duplicate-pipeline-row" }))).toEqual([
      "raw_pipeline_duplicate_50",
      "raw_pipeline_duplicate_51"
    ]);
  });

  test("does not create parsed facts, display rows, totals, or mutate source records", () => {
    const before = JSON.stringify(records);
    const results = browseSourceRows(records, { source: "pipeline" });

    expect(JSON.stringify(records)).toBe(before);

    for (const result of results) {
      const keys = result as Record<string, unknown>;
      expect("parsedFact" in keys).toBe(false);
      expect("displayRow" in keys).toBe(false);
      expect("visibleRows" in keys).toBe(false);
      expect("totals" in keys).toBe(false);
    }
  });
});
