import { describe, expect, test } from "vitest";

import {
  mapSupabaseRawSourceRow,
  readLatestArchivedSourceRowsFromSupabase,
  selectLatestArchivedSourceBatchIds
} from "../../src/lib/runtime/source-archive-supabase-reader";
import type {
  SupabaseRawSourceRow,
  SupabaseSourceBatchRow
} from "../../src/lib/runtime/source-archive-supabase-reader";

describe("source archive Supabase reader", () => {
  test("maps raw_source_rows into ArchivedRawSourceRow shape", () => {
    const row = mapSupabaseRawSourceRow(rawSourceRow({
      id: "22222222-2222-4222-8222-222222222222",
      batch_id: "11111111-1111-4111-8111-111111111111",
      source: "fee_sheet",
      stable_source_row_key: "fee-sheet:client-summary:4",
      source_document_id: "fee-sheet-id",
      source_tab: "CLIENT SUMMARY",
      source_row_number: 4,
      source_object_id: null,
      raw: { jobNumber: "UCS04787", soldFee: 1000 },
      content_hash: "hash-1",
      observed_at: "2026-05-21T04:00:00.000Z",
      source_refs: [
        {
          source: "fee_sheet",
          sourceLayer: "sold",
          batchId: "11111111-1111-4111-8111-111111111111",
          rawRowId: "22222222-2222-4222-8222-222222222222",
          sourceDocumentId: "fee-sheet-id",
          sourceTab: "CLIENT SUMMARY",
          sourceRowNumber: 4
        }
      ]
    }));

    expect(row).toEqual({
      kind: "raw_source_row",
      archiveStatus: "archived",
      id: "22222222-2222-4222-8222-222222222222",
      batchId: "11111111-1111-4111-8111-111111111111",
      source: "fee_sheet",
      identity: {
        stableSourceRowKey: "fee-sheet:client-summary:4",
        sourceDocumentId: "fee-sheet-id",
        sourceTab: "CLIENT SUMMARY",
        sourceRowNumber: 4
      },
      raw: { jobNumber: "UCS04787", soldFee: 1000 },
      contentHash: "hash-1",
      observedAt: "2026-05-21T04:00:00.000Z",
      sourceRefs: [
        {
          source: "fee_sheet",
          sourceLayer: "sold",
          batchId: "11111111-1111-4111-8111-111111111111",
          rawRowId: "22222222-2222-4222-8222-222222222222",
          sourceDocumentId: "fee-sheet-id",
          sourceTab: "CLIENT SUMMARY",
          sourceRowNumber: 4
        }
      ]
    });
  });

  test("selects the newest successful read-only snapshot batch group", () => {
    const batchIds = selectLatestArchivedSourceBatchIds([
      sourceBatchRow({
        id: "older-fee",
        completed_at: "2026-05-21T01:00:00.000Z",
        metadata: { snapshotId: "snapshot-older" }
      }),
      sourceBatchRow({
        id: "latest-float",
        completed_at: "2026-05-21T04:00:00.000Z",
        metadata: { snapshotId: "snapshot-latest" }
      }),
      sourceBatchRow({
        id: "latest-fee",
        completed_at: "2026-05-21T04:00:00.000Z",
        metadata: { snapshotId: "snapshot-latest" }
      }),
      sourceBatchRow({
        id: "newer-failed",
        status: "failed",
        completed_at: "2026-05-21T05:00:00.000Z",
        metadata: { snapshotId: "snapshot-failed" }
      }),
      sourceBatchRow({
        id: "newer-write-mode",
        read_only: false,
        completed_at: "2026-05-21T06:00:00.000Z",
        metadata: { snapshotId: "snapshot-write-mode" }
      })
    ]);

    expect(batchIds).toEqual(["latest-fee", "latest-float"]);
  });

  test("reads latest snapshot raw rows with GET requests only", async () => {
    const calls: Array<{ url: string; method: string | undefined; cache: RequestCache | undefined }> = [];
    const fetcher = (async (input, init) => {
      const url = String(input);
      calls.push({ url, method: init?.method, cache: init?.cache });

      if (url.includes("/source_batches?")) {
        return Response.json([
          sourceBatchRow({
            id: "older-fee",
            completed_at: "2026-05-21T01:00:00.000Z",
            metadata: { snapshotId: "snapshot-older" }
          }),
          sourceBatchRow({
            id: "latest-float",
            completed_at: "2026-05-21T04:00:00.000Z",
            metadata: { snapshotId: "snapshot-latest" }
          }),
          sourceBatchRow({
            id: "latest-fee",
            completed_at: "2026-05-21T04:00:00.000Z",
            metadata: { snapshotId: "snapshot-latest" }
          })
        ]);
      }

      if (url.includes("/raw_source_rows?")) {
        expect(decodeURIComponent(url)).toContain("batch_id=in.(latest-fee,latest-float)");
        expect(url).toContain("limit=1000");
        expect(url).toContain("offset=0");
        return Response.json([
          rawSourceRow({
            id: "raw-fee",
            batch_id: "latest-fee",
            source: "fee_sheet",
            stable_source_row_key: "fee-sheet:1",
            source_document_id: "sheet-1",
            source_tab: "CLIENT SUMMARY",
            source_row_number: 1,
            raw: { jobNumber: "UCS04787" },
            source_refs: [{ source: "fee_sheet", sourceLayer: "sold", batchId: "latest-fee", rawRowId: "raw-fee" }]
          }),
          rawSourceRow({
            id: "raw-float",
            batch_id: "latest-float",
            source: "float",
            stable_source_row_key: "float:project:10480262",
            source_object_id: "10480262",
            raw: { objectType: "project", project_id: 10480262 },
            source_refs: [{ source: "float", sourceLayer: "float_raw", batchId: "latest-float", rawRowId: "raw-float" }]
          })
        ]);
      }

      return new Response("unexpected URL", { status: 404 });
    }) as typeof fetch;

    const rows = await readLatestArchivedSourceRowsFromSupabase({
      env: { MUTATION_GUARD: "read_only" },
      supabaseUrl: "https://nxrzhwqsswhjgeouxsyr.supabase.co",
      serviceRoleKey: "service-secret",
      fetcher
    });

    expect(rows.map((row) => row.id)).toEqual(["raw-fee", "raw-float"]);
    expect(rows[1]?.identity).toMatchObject({ sourceObjectId: "10480262" });
    expect(calls).toHaveLength(2);
    expect(calls.every((call) => call.method === "GET")).toBe(true);
    expect(calls.every((call) => call.cache === "no-store")).toBe(true);
  });

  test("paginates raw source rows beyond the Supabase default page size", async () => {
    const rawRowCalls: string[] = [];
    const firstPage = Array.from({ length: 1000 }, (_, index) =>
      rawSourceRow({
        id: `raw-${index}`,
        batch_id: "latest-fee",
        source: "fee_sheet",
        stable_source_row_key: `fee-sheet:${index}`,
        source_refs: [{ source: "fee_sheet", sourceLayer: "sold", batchId: "latest-fee", rawRowId: `raw-${index}` }]
      })
    );
    const secondPage = [
      rawSourceRow({
        id: "raw-1000",
        batch_id: "latest-fee",
        source: "fee_sheet",
        stable_source_row_key: "fee-sheet:1000",
        source_refs: [{ source: "fee_sheet", sourceLayer: "sold", batchId: "latest-fee", rawRowId: "raw-1000" }]
      })
    ];
    const fetcher = (async (input) => {
      const url = String(input);

      if (url.includes("/source_batches?")) {
        return Response.json([
          sourceBatchRow({
            id: "latest-fee",
            completed_at: "2026-05-21T04:00:00.000Z",
            metadata: { snapshotId: "snapshot-latest" }
          })
        ]);
      }

      if (url.includes("/raw_source_rows?")) {
        rawRowCalls.push(url);
        return Response.json(url.includes("offset=1000") ? secondPage : firstPage);
      }

      return new Response("unexpected URL", { status: 404 });
    }) as typeof fetch;

    const rows = await readLatestArchivedSourceRowsFromSupabase({
      env: { MUTATION_GUARD: "read_only" },
      supabaseUrl: "https://nxrzhwqsswhjgeouxsyr.supabase.co",
      serviceRoleKey: "service-secret",
      fetcher
    });

    expect(rows).toHaveLength(1001);
    expect(rawRowCalls).toHaveLength(2);
    expect(rawRowCalls[0]).toContain("offset=0");
    expect(rawRowCalls[1]).toContain("offset=1000");
  });

  test("requires the read-only mutation guard", async () => {
    await expect(
      readLatestArchivedSourceRowsFromSupabase({
        env: { MUTATION_GUARD: "write_enabled" },
        supabaseUrl: "https://nxrzhwqsswhjgeouxsyr.supabase.co",
        serviceRoleKey: "service-secret",
        fetcher: (async () => Response.json([])) as typeof fetch
      })
    ).rejects.toThrow(/MUTATION_GUARD must be read_only/);
  });
});

function sourceBatchRow(overrides: Partial<SupabaseSourceBatchRow> = {}): SupabaseSourceBatchRow {
  return {
    id: "batch-id",
    status: "success",
    read_only: true,
    started_at: "2026-05-21T04:00:00.000Z",
    completed_at: "2026-05-21T04:00:00.000Z",
    created_at: "2026-05-21T04:00:00.000Z",
    metadata: { snapshotId: "snapshot-id" },
    ...overrides
  };
}

function rawSourceRow(overrides: Partial<SupabaseRawSourceRow> = {}): SupabaseRawSourceRow {
  return {
    id: "raw-id",
    batch_id: "batch-id",
    source: "fee_sheet",
    stable_source_row_key: "source:key",
    source_document_id: null,
    source_tab: null,
    source_row_number: null,
    source_object_id: null,
    raw: {},
    content_hash: "hash",
    observed_at: "2026-05-21T04:00:00.000Z",
    source_refs: [],
    ...overrides
  };
}
