import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { describe, expect, test } from "vitest";

type WriterModule = {
  buildSupabaseSnapshotImportRows(plan: unknown): {
    source_batches: unknown[];
    raw_source_rows: unknown[];
    skipped_source_rows: unknown[];
  };
  writeSourceSnapshotImportToSupabase(
    plan: unknown,
    options: {
      dryRun?: boolean;
      allowWrite?: boolean;
      supabaseUrl?: string;
      serviceRoleKey?: string;
      fetcher?: typeof fetch;
      chunkSize?: number;
    }
  ): Promise<{
    status: "dry_run" | "pass";
    dryRun: boolean;
    sourceMutation: boolean;
    tableCounts: Record<string, number>;
  }>;
};

const moduleUrl = pathToFileURL(
  `${process.cwd()}/scripts/lib/source-snapshot-supabase-writer.mjs`
).href;

async function writer(): Promise<WriterModule> {
  return (await import(moduleUrl)) as WriterModule;
}

describe("source snapshot Supabase writer", () => {
  test("maps source batches, raw rows, and skipped rows to the staging schema shape", async () => {
    const { buildSupabaseSnapshotImportRows } = await writer();

    const rows = buildSupabaseSnapshotImportRows(planFixture());

    expect(rows.source_batches[0]).toMatchObject({
      id: "11111111-1111-4111-8111-111111111111",
      source_label: "Fee sheet snapshot",
      read_only: true,
      metadata: { snapshotId: "snapshot-1" }
    });
    expect(rows.raw_source_rows[0]).toMatchObject({
      id: "22222222-2222-4222-8222-222222222222",
      batch_id: "11111111-1111-4111-8111-111111111111",
      stable_source_row_key: "fee-sheet:1",
      source_document_id: "sheet-1",
      source_tab: "CLIENT SUMMARY",
      source_row_number: 4,
      source_object_id: null,
      raw: { jobNumber: "UCS04787", soldFee: 10 }
    });
    expect(rows.skipped_source_rows[0]).toMatchObject({
      id: "33333333-3333-4333-8333-333333333333",
      stable_source_row_key: "pipeline:empty",
      skip: expect.objectContaining({ classification: "literally_empty" })
    });
  });

  test("dry-run reports table counts without calling Supabase", async () => {
    const { writeSourceSnapshotImportToSupabase } = await writer();
    let calls = 0;

    const report = await writeSourceSnapshotImportToSupabase(planFixture(), {
      dryRun: true,
      fetcher: (() => {
        calls += 1;
        throw new Error("fetch should not be called during dry-run");
      }) as typeof fetch
    });

    expect(calls).toBe(0);
    expect(report).toMatchObject({
      status: "dry_run",
      dryRun: true,
      sourceMutation: false,
      tableCounts: {
        source_batches: 1,
        raw_source_rows: 1,
        skipped_source_rows: 1
      }
    });
  });

  test("write mode posts batches before raw rows before skipped rows and does not ignore conflicts", async () => {
    const { writeSourceSnapshotImportToSupabase } = await writer();
    const calls: Array<{ url: string; headers: HeadersInit | undefined }> = [];

    const report = await writeSourceSnapshotImportToSupabase(planFixture(), {
      dryRun: false,
      allowWrite: true,
      supabaseUrl: "https://nxrzhwqsswhjgeouxsyr.supabase.co",
      serviceRoleKey: "service-secret",
      fetcher: (async (url, init) => {
        calls.push({ url: String(url), headers: init?.headers });
        return new Response(null, { status: 201 });
      }) as typeof fetch
    });

    expect(report.status).toBe("pass");
    expect(calls.map((call) => call.url)).toEqual([
      "https://nxrzhwqsswhjgeouxsyr.supabase.co/rest/v1/source_batches",
      "https://nxrzhwqsswhjgeouxsyr.supabase.co/rest/v1/raw_source_rows",
      "https://nxrzhwqsswhjgeouxsyr.supabase.co/rest/v1/skipped_source_rows"
    ]);
    expect(JSON.stringify(calls.map((call) => call.headers))).toContain("return=minimal");
    expect(JSON.stringify(calls.map((call) => call.headers))).not.toContain("ignore-duplicates");
  });

  test("dry-run CLI emits counts without raw source payloads or secrets", () => {
    const output = execFileSync(
      "node",
      ["scripts/import-source-snapshot.mjs", "fixtures/source-import/p8c-redacted-snapshot.json", "--dry-run"],
      { encoding: "utf8" }
    );
    const report = JSON.parse(output);

    expect(report.status).toBe("dry_run");
    expect(report.sourceMutation).toBe(false);
    expect(report.tableCounts).toMatchObject({
      source_batches: 4,
      raw_source_rows: 3,
      skipped_source_rows: 1
    });
    expect(output).not.toContain("British Airways");
    expect(output).not.toContain("postgres://");
    expect(output).not.toContain("postgresql://");
  });
});

function planFixture() {
  return {
    batches: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        source: "fee_sheet",
        status: "success",
        mode: "manual_snapshot",
        startedAt: "2026-05-21T00:00:00.000Z",
        completedAt: "2026-05-21T00:00:00.000Z",
        sourceLabel: "Fee sheet snapshot",
        readOnly: true,
        warnings: [],
        metadata: { snapshotId: "snapshot-1" }
      }
    ],
    rawRows: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        batchId: "11111111-1111-4111-8111-111111111111",
        source: "fee_sheet",
        identity: {
          stableSourceRowKey: "fee-sheet:1",
          sourceDocumentId: "sheet-1",
          sourceTab: "CLIENT SUMMARY",
          sourceRowNumber: 4
        },
        raw: { jobNumber: "UCS04787", soldFee: 10 },
        contentHash: "hash-raw",
        observedAt: "2026-05-21T00:00:00.000Z",
        sourceRefs: [{ source: "fee_sheet", sourceLayer: "sold", rawRowId: "22222222-2222-4222-8222-222222222222" }]
      }
    ],
    skippedRows: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        batchId: "11111111-1111-4111-8111-111111111111",
        source: "pipeline",
        identity: {
          stableSourceRowKey: "pipeline:empty",
          sourceDocumentId: "pipeline-sheet",
          sourceTab: "Pipeline",
          sourceRowNumber: 99
        },
        raw: {},
        contentHash: "hash-skip",
        observedAt: "2026-05-21T00:00:00.000Z",
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
        sourceRefs: [{ source: "pipeline", sourceLayer: "pipeline", rawRowId: "33333333-3333-4333-8333-333333333333" }]
      }
    ],
    report: {
      snapshotId: "snapshot-1",
      capturedAt: "2026-05-21T00:00:00.000Z",
      warnings: []
    }
  };
}
