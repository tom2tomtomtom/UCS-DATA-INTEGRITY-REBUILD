import { describe, expect, test } from "vitest";

import {
  SOURCE_ARCHIVE_SOURCES,
  SOURCE_ARCHIVE_VERSION,
  type ArchivedRawSourceRow,
  type SkippedSourceRow,
  type SourceArchiveBatch,
  type SourcePullMetadata
} from "../../src/lib/source-archive";

describe("P2-A source archive domain types", () => {
  test("names every source stream that can produce raw archive rows", () => {
    expect(SOURCE_ARCHIVE_SOURCES).toEqual([
      "fee_sheet",
      "pipeline",
      "production_revenue",
      "float",
      "read_only_sql",
      "sync_log"
    ]);
    expect(SOURCE_ARCHIVE_VERSION).toBe(1);
  });

  test("models immutable batches without parsed facts or display rows", () => {
    const batch: SourceArchiveBatch = {
      id: "batch_fee_001",
      source: "fee_sheet",
      status: "success",
      mode: "fixture",
      startedAt: "2026-05-20T10:00:00.000Z",
      completedAt: "2026-05-20T10:00:03.000Z",
      sourceLabel: "Fixture fee sheet",
      sourceVersion: "fixture-v1",
      readOnly: true,
      warnings: []
    };

    expect(batch.readOnly).toBe(true);
    expect("facts" in batch).toBe(false);
    expect("visibleRows" in batch).toBe(false);
  });

  test("requires raw rows to carry source identity, content hash, and immutable payload", () => {
    const row: ArchivedRawSourceRow = {
      kind: "raw_source_row",
      archiveStatus: "archived",
      id: "raw_pipeline_001",
      batchId: "batch_pipeline_001",
      source: "pipeline",
      identity: {
        sourceDocumentId: "pipeline_sheet",
        sourceTab: "Pipeline",
        sourceRowNumber: 42,
        stableSourceRowKey: "pipeline_sheet:Pipeline:42"
      },
      raw: Object.freeze({
        jobNumber: "TBC",
        client: "Example",
        project: "Future work",
        amount: 100
      }),
      contentHash: "sha256:abc123",
      observedAt: "2026-05-20T10:00:01.000Z",
      sourceRefs: [
        {
          source: "pipeline",
          sourceLayer: "pipeline",
          batchId: "batch_pipeline_001",
          rawRowId: "raw_pipeline_001",
          sourceDocumentId: "pipeline_sheet",
          sourceTab: "Pipeline",
          sourceRowNumber: 42
        }
      ]
    };

    expect(row.archiveStatus).toBe("archived");
    expect(row.identity.stableSourceRowKey).toBe("pipeline_sheet:Pipeline:42");
    expect("isAdditive" in row).toBe(false);
    expect("totals" in row).toBe(false);
  });

  test("requires skipped rows to explain the allowed drop with evidence", () => {
    const skipped: SkippedSourceRow = {
      kind: "skipped_source_row",
      archiveStatus: "skipped",
      id: "skip_fee_001",
      batchId: "batch_fee_001",
      source: "fee_sheet",
      identity: {
        sourceDocumentId: "fee_sheet_001",
        sourceTab: "CLIENT SUMMARY",
        sourceRowNumber: 99,
        stableSourceRowKey: "fee_sheet_001:CLIENT SUMMARY:99"
      },
      observedAt: "2026-05-20T10:00:02.000Z",
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
      sourceRefs: []
    };

    expect(skipped.skip.allowedByLaw).toBe(true);
    expect(skipped.skip.classification).toBe("literally_empty");
    expect("parsedFact" in skipped).toBe(false);
  });

  test("source pull metadata is read-only by contract", () => {
    const metadata: SourcePullMetadata = {
      source: "float",
      mode: "fixture",
      requestedAt: "2026-05-20T10:00:00.000Z",
      completedAt: "2026-05-20T10:00:05.000Z",
      readOnly: true,
      request: {
        sourceDocumentId: "float_fixture",
        description: "Fixture pull for Float rows"
      },
      warnings: []
    };

    expect(metadata.readOnly).toBe(true);
    expect("write" in metadata).toBe(false);
    expect("sync" in metadata).toBe(false);
    expect("archive" in metadata).toBe(false);
  });
});
