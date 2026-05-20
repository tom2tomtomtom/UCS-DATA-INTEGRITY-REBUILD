import { describe, expect, test } from "vitest";

import { createInMemorySourceArchiveStore } from "../../src/lib/source-archive/archive-store";
import type {
  ArchivedRawSourceRow,
  SkippedSourceRow,
  SourceArchiveBatch,
  SourceArchivePayload
} from "../../src/lib/source-archive/types";

function batch(overrides: Partial<SourceArchiveBatch> = {}): SourceArchiveBatch {
  return {
    id: "batch_pipeline_001",
    source: "pipeline",
    status: "success",
    mode: "fixture",
    startedAt: "2026-05-20T10:00:00.000Z",
    completedAt: "2026-05-20T10:00:03.000Z",
    sourceLabel: "Pipeline fixture",
    readOnly: true,
    warnings: [],
    ...overrides
  };
}

function rawRow(overrides: Partial<ArchivedRawSourceRow> = {}): ArchivedRawSourceRow {
  return {
    kind: "raw_source_row",
    archiveStatus: "archived",
    id: "raw_pipeline_001",
    batchId: "batch_pipeline_001",
    source: "pipeline",
    identity: {
      stableSourceRowKey: "pipeline_sheet:Pipeline:42",
      sourceDocumentId: "pipeline_sheet",
      sourceTab: "Pipeline",
      sourceRowNumber: 42,
      sourceObjectId: "pipeline-object-42"
    },
    raw: {
      jobNumber: "TBC",
      client: "Example Client",
      project: "Pipeline project",
      amount: 100
    },
    contentHash: "sha256:pipeline-row",
    observedAt: "2026-05-20T10:00:01.000Z",
    sourceRefs: [
      {
        source: "pipeline",
        sourceLayer: "pipeline",
        batchId: "batch_pipeline_001",
        rawRowId: "raw_pipeline_001",
        sourceDocumentId: "pipeline_sheet",
        sourceTab: "Pipeline",
        sourceRowNumber: 42,
        sourceObjectId: "pipeline-object-42"
      }
    ],
    ...overrides
  };
}

function skippedRow(overrides: Partial<SkippedSourceRow> = {}): SkippedSourceRow {
  return {
    kind: "skipped_source_row",
    archiveStatus: "skipped",
    id: "skip_pipeline_001",
    batchId: "batch_pipeline_001",
    source: "pipeline",
    identity: {
      stableSourceRowKey: "pipeline_sheet:Pipeline:99",
      sourceDocumentId: "pipeline_sheet",
      sourceTab: "Pipeline",
      sourceRowNumber: 99
    },
    observedAt: "2026-05-20T10:00:02.000Z",
    raw: {},
    contentHash: "sha256:empty-row",
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
        source: "pipeline",
        sourceLayer: "pipeline",
        batchId: "batch_pipeline_001",
        sourceDocumentId: "pipeline_sheet",
        sourceTab: "Pipeline",
        sourceRowNumber: 99
      }
    ],
    ...overrides
  };
}

describe("P2-C immutable in-memory source archive store", () => {
  test("appends batches and raw rows without mutating earlier store snapshots", () => {
    const emptyStore = createInMemorySourceArchiveStore();
    const withBatch = emptyStore.appendBatch(batch());
    const withRow = withBatch.appendRawRow(rawRow());

    expect(emptyStore.listBatches()).toEqual([]);
    expect(emptyStore.listRawRows()).toEqual([]);
    expect(withBatch.listBatches()).toHaveLength(1);
    expect(withBatch.listRawRows()).toEqual([]);
    expect(withRow.listBatches()).toHaveLength(1);
    expect(withRow.listRawRows()).toHaveLength(1);
    expect(withRow.getRawRow("raw_pipeline_001")?.id).toBe("raw_pipeline_001");

    expect(() => withRow.appendBatch(batch({ sourceLabel: "Changed label" }))).toThrow(
      /batch_pipeline_001/
    );
    expect(() => withRow.appendRawRow(rawRow({ raw: { changed: true } }))).toThrow(
      /raw_pipeline_001/
    );
  });

  test("preserves duplicate content as separate raw row IDs", () => {
    const first = rawRow({
      id: "raw_pipeline_001",
      contentHash: "sha256:same-content",
      identity: {
        stableSourceRowKey: "pipeline_sheet:Pipeline:42",
        sourceDocumentId: "pipeline_sheet",
        sourceTab: "Pipeline",
        sourceRowNumber: 42
      }
    });
    const second = rawRow({
      id: "raw_pipeline_002",
      contentHash: "sha256:same-content",
      identity: {
        stableSourceRowKey: "pipeline_sheet:Pipeline:43",
        sourceDocumentId: "pipeline_sheet",
        sourceTab: "Pipeline",
        sourceRowNumber: 43
      }
    });

    const store = createInMemorySourceArchiveStore()
      .appendBatch(batch())
      .appendRawRow(first)
      .appendRawRow(second);

    expect(store.listRawRowsByContentHash("sha256:same-content").map((row) => row.id)).toEqual([
      "raw_pipeline_001",
      "raw_pipeline_002"
    ]);
  });

  test("looks up rows by raw row ID, batch, source, and content hash", () => {
    const pipelineBatch = batch();
    const floatBatch = batch({
      id: "batch_float_001",
      source: "float",
      sourceLabel: "Float fixture"
    });
    const pipelineRow = rawRow();
    const floatRow = rawRow({
      id: "raw_float_001",
      batchId: "batch_float_001",
      source: "float",
      identity: {
        stableSourceRowKey: "float:project:123",
        sourceObjectId: "123"
      },
      raw: {
        id: "123",
        name: "Float project"
      },
      contentHash: "sha256:float-project",
      sourceRefs: [
        {
          source: "float",
          sourceLayer: "float_raw",
          batchId: "batch_float_001",
          rawRowId: "raw_float_001",
          sourceObjectId: "123"
        }
      ]
    });

    const store = createInMemorySourceArchiveStore()
      .appendBatch(pipelineBatch)
      .appendBatch(floatBatch)
      .appendRawRow(pipelineRow)
      .appendRawRow(floatRow);

    expect(store.getBatch("batch_float_001")?.source).toBe("float");
    expect(store.getRawRow("raw_float_001")?.source).toBe("float");
    expect(store.listRowsByBatch("batch_pipeline_001").map((row) => row.id)).toEqual([
      "raw_pipeline_001"
    ]);
    expect(store.listRowsBySource("float").map((row) => row.id)).toEqual(["raw_float_001"]);
    expect(store.listRawRowsByContentHash("sha256:float-project").map((row) => row.id)).toEqual([
      "raw_float_001"
    ]);
  });

  test("looks up rows by source document, tab, row number, and source object ID", () => {
    const sheetRow = rawRow({
      id: "raw_fee_001",
      source: "fee_sheet",
      identity: {
        stableSourceRowKey: "fee_sheet_001:CLIENT SUMMARY:12",
        sourceDocumentId: "fee_sheet_001",
        sourceTab: "CLIENT SUMMARY",
        sourceRowNumber: 12
      }
    });
    const objectRow = rawRow({
      id: "raw_float_001",
      source: "float",
      identity: {
        stableSourceRowKey: "float:task:task_001",
        sourceObjectId: "task_001"
      }
    });

    const store = createInMemorySourceArchiveStore()
      .appendBatch(batch({ source: "fee_sheet" }))
      .appendBatch(batch({ id: "batch_float_001", source: "float", sourceLabel: "Float fixture" }))
      .appendRawRow(sheetRow)
      .appendRawRow(objectRow);

    expect(store.findRowsByIdentity({ sourceDocumentId: "fee_sheet_001" }).map((row) => row.id)).toEqual([
      "raw_fee_001"
    ]);
    expect(
      store.findRowsByIdentity({ sourceDocumentId: "fee_sheet_001", sourceTab: "CLIENT SUMMARY" }).map(
        (row) => row.id
      )
    ).toEqual(["raw_fee_001"]);
    expect(store.findRowsByIdentity({ sourceRowNumber: 12 }).map((row) => row.id)).toEqual([
      "raw_fee_001"
    ]);
    expect(store.findRowsByIdentity({ sourceObjectId: "task_001" }).map((row) => row.id)).toEqual([
      "raw_float_001"
    ]);
  });

  test("stores skipped rows and makes them queryable without treating them as raw rows", () => {
    const store = createInMemorySourceArchiveStore()
      .appendBatch(batch())
      .appendSkippedRow(skippedRow());

    expect(store.listRawRows()).toEqual([]);
    expect(store.getSkippedRow("skip_pipeline_001")?.skip.classification).toBe("literally_empty");
    expect(store.listSkippedRows().map((row) => row.id)).toEqual(["skip_pipeline_001"]);
    expect(store.listRowsByBatch("batch_pipeline_001").map((row) => row.id)).toEqual([
      "skip_pipeline_001"
    ]);
    expect(store.listRowsBySource("pipeline").map((row) => row.id)).toEqual(["skip_pipeline_001"]);
    expect(store.findRowsByIdentity({ sourceRowNumber: 99 }).map((row) => row.id)).toEqual([
      "skip_pipeline_001"
    ]);
  });

  test("freezes archived payloads so caller mutations cannot change stored evidence", () => {
    const mutablePayload = {
      jobNumber: "UCS04787",
      nested: {
        hours: 12
      },
      rows: [{ value: "preserved" }]
    };

    const store = createInMemorySourceArchiveStore()
      .appendBatch(batch())
      .appendRawRow(rawRow({ raw: mutablePayload }));

    mutablePayload.nested.hours = 999;
    mutablePayload.rows[0] = { value: "changed outside" };

    const archived = store.getRawRow("raw_pipeline_001");
    const raw = archived?.raw as SourceArchivePayload & {
      nested: { hours: number };
      rows: Array<{ value: string }>;
    };

    expect(raw.nested.hours).toBe(12);
    expect(raw.rows[0]?.value).toBe("preserved");
    expect(Object.isFrozen(raw)).toBe(true);
    expect(Object.isFrozen(raw.nested)).toBe(true);
    expect(Object.isFrozen(raw.rows)).toBe(true);
    expect(Object.isFrozen(raw.rows[0])).toBe(true);

    expect(() => {
      raw.nested.hours = 321;
    }).toThrow(TypeError);

    expect(store.getRawRow("raw_pipeline_001")?.raw).toEqual({
      jobNumber: "UCS04787",
      nested: {
        hours: 12
      },
      rows: [{ value: "preserved" }]
    });
  });
});
