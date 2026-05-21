const DEFAULT_CHUNK_SIZE = 500;

export function buildSupabaseSnapshotImportRows(plan) {
  return {
    source_batches: (plan.batches ?? []).map(batchRow),
    raw_source_rows: (plan.rawRows ?? []).map(rawRow),
    skipped_source_rows: (plan.skippedRows ?? []).map(skippedRow)
  };
}

export async function writeSourceSnapshotImportToSupabase(plan, options) {
  const dryRun = options?.dryRun !== false;
  const chunkSize = normaliseChunkSize(options?.chunkSize);
  const rows = buildSupabaseSnapshotImportRows(plan);
  const tableCounts = Object.fromEntries(
    Object.entries(rows).map(([table, tableRows]) => [table, tableRows.length])
  );
  const report = {
    status: dryRun ? "dry_run" : "pass",
    dryRun,
    sourceMutation: false,
    snapshotId: plan.report?.snapshotId,
    capturedAt: plan.report?.capturedAt,
    tableCounts,
    sourceReport: plan.report,
    warnings: plan.report?.warnings ?? []
  };

  if (dryRun) {
    return report;
  }

  if (options?.allowWrite !== true) {
    throw new Error("Supabase snapshot import writes require allowWrite: true.");
  }

  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL", options?.supabaseUrl);
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY", options?.serviceRoleKey);
  const fetcher = options?.fetcher ?? globalThis.fetch;

  if (typeof fetcher !== "function") {
    throw new Error("A fetch implementation is required for Supabase snapshot import writes.");
  }

  for (const table of ["source_batches", "raw_source_rows", "skipped_source_rows"]) {
    await postRows({
      table,
      rows: rows[table],
      supabaseUrl,
      serviceRoleKey,
      fetcher,
      chunkSize
    });
  }

  return report;
}

async function postRows({ table, rows, supabaseUrl, serviceRoleKey, fetcher, chunkSize }) {
  if (rows.length === 0) return;

  for (const chunk of chunks(rows, chunkSize)) {
    const response = await fetcher(`${cleanSupabaseUrl(supabaseUrl)}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
        prefer: "return=minimal"
      },
      body: JSON.stringify(chunk)
    });

    if (!response.ok) {
      const body = typeof response.text === "function" ? await response.text() : "";
      throw new Error(
        `Supabase snapshot import failed for ${table}: HTTP ${response.status} ${redactSecrets(body, serviceRoleKey)}`
      );
    }
  }
}

function batchRow(batch) {
  return {
    id: batch.id,
    source: batch.source,
    mode: batch.mode,
    status: batch.status,
    source_label: batch.sourceLabel,
    source_version: batch.sourceVersion ?? null,
    read_only: batch.readOnly === true,
    started_at: batch.startedAt,
    completed_at: batch.completedAt ?? null,
    warnings: batch.warnings ?? [],
    metadata: batch.metadata ?? {}
  };
}

function rawRow(row) {
  return {
    id: row.id,
    batch_id: row.batchId,
    source: row.source,
    stable_source_row_key: row.identity?.stableSourceRowKey,
    source_document_id: row.identity?.sourceDocumentId ?? null,
    source_tab: row.identity?.sourceTab ?? null,
    source_row_number: row.identity?.sourceRowNumber ?? null,
    source_object_id: row.identity?.sourceObjectId ?? null,
    raw: row.raw,
    content_hash: row.contentHash,
    observed_at: row.observedAt,
    source_refs: row.sourceRefs ?? []
  };
}

function skippedRow(row) {
  return {
    id: row.id,
    batch_id: row.batchId,
    source: row.source,
    stable_source_row_key: row.identity?.stableSourceRowKey,
    source_document_id: row.identity?.sourceDocumentId ?? null,
    source_tab: row.identity?.sourceTab ?? null,
    source_row_number: row.identity?.sourceRowNumber ?? null,
    source_object_id: row.identity?.sourceObjectId ?? null,
    raw: row.raw ?? null,
    content_hash: row.contentHash ?? null,
    observed_at: row.observedAt,
    skip: row.skip,
    source_refs: row.sourceRefs ?? []
  };
}

function* chunks(rows, chunkSize) {
  for (let index = 0; index < rows.length; index += chunkSize) {
    yield rows.slice(index, index + chunkSize);
  }
}

function normaliseChunkSize(value) {
  if (value === undefined) return DEFAULT_CHUNK_SIZE;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) {
    throw new Error("Supabase snapshot import chunk size must be an integer from 1 to 1000.");
  }
  return parsed;
}

function requiredEnv(key, explicitValue) {
  const value = explicitValue ?? process.env[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required for Supabase snapshot import writes.`);
  }
  return value.trim();
}

function cleanSupabaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function redactSecrets(value, serviceRoleKey) {
  return String(value)
    .replaceAll(serviceRoleKey, "[redacted-service-role-key]")
    .replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted-database-url]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}
