import type { SourceName, SourceTraceRef } from "../canon/types";
import { SOURCE_ARCHIVE_SOURCES } from "../source-archive/types";
import type { ArchivedRawSourceRow, SourceArchivePayload } from "../source-archive/types";

const DEFAULT_BATCH_LIMIT = 100;
const MAX_BATCH_LIMIT = 500;
const RAW_ROW_PAGE_SIZE = 1000;

const SOURCE_BATCH_SELECT = [
  "id",
  "status",
  "read_only",
  "started_at",
  "completed_at",
  "created_at",
  "metadata"
].join(",");

const RAW_SOURCE_ROW_SELECT = [
  "id",
  "batch_id",
  "source",
  "stable_source_row_key",
  "source_document_id",
  "source_tab",
  "source_row_number",
  "source_object_id",
  "raw",
  "content_hash",
  "observed_at",
  "source_refs"
].join(",");

export type SourceArchiveSupabaseReaderEnv = Readonly<Record<string, string | undefined>>;

export type SourceArchiveSupabaseReaderOptions = {
  readonly env?: SourceArchiveSupabaseReaderEnv;
  readonly supabaseUrl?: string;
  readonly serviceRoleKey?: string;
  readonly fetcher?: typeof fetch;
  readonly batchLimit?: number;
};

export type SupabaseSourceBatchRow = {
  readonly id: string;
  readonly status: string;
  readonly read_only: boolean;
  readonly started_at: string;
  readonly completed_at: string | null;
  readonly created_at: string;
  readonly metadata: Readonly<Record<string, unknown>>;
};

export type SupabaseRawSourceRow = {
  readonly id: string;
  readonly batch_id: string;
  readonly source: string;
  readonly stable_source_row_key: string;
  readonly source_document_id: string | null;
  readonly source_tab: string | null;
  readonly source_row_number: number | null;
  readonly source_object_id: string | null;
  readonly raw: SourceArchivePayload;
  readonly content_hash: string;
  readonly observed_at: string;
  readonly source_refs: unknown;
};

export async function readLatestArchivedSourceRowsFromSupabase(
  options: SourceArchiveSupabaseReaderOptions = {}
): Promise<ArchivedRawSourceRow[]> {
  assertServerSide();

  const env = options.env ?? process.env;
  assertReadOnlyMutationGuard(env);

  const supabaseUrl = requiredOption("NEXT_PUBLIC_SUPABASE_URL", options.supabaseUrl ?? env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = requiredOption("SUPABASE_SERVICE_ROLE_KEY", options.serviceRoleKey ?? env.SUPABASE_SERVICE_ROLE_KEY);
  const fetcher = options.fetcher ?? globalThis.fetch;
  const batchLimit = normaliseBatchLimit(options.batchLimit);

  if (typeof fetcher !== "function") {
    throw new Error("A fetch implementation is required for source archive reads.");
  }

  const batchRows = await fetchJson<SupabaseSourceBatchRow[]>({
    supabaseUrl,
    serviceRoleKey,
    fetcher,
    table: "source_batches",
    params: {
      select: SOURCE_BATCH_SELECT,
      read_only: "eq.true",
      status: "eq.success",
      order: "completed_at.desc.nullslast,started_at.desc,created_at.desc",
      limit: String(batchLimit)
    }
  });
  const batchIds = selectLatestArchivedSourceBatchIds(batchRows);

  if (batchIds.length === 0) {
    return [];
  }

  const rawRows = await fetchJsonPages<SupabaseRawSourceRow>({
    supabaseUrl,
    serviceRoleKey,
    fetcher,
    table: "raw_source_rows",
    params: {
      select: RAW_SOURCE_ROW_SELECT,
      batch_id: `in.(${batchIds.join(",")})`,
      order: "source.asc,source_row_number.asc.nullslast,source_object_id.asc,id.asc"
    }
  });

  return rawRows.map(mapSupabaseRawSourceRow);
}

export function selectLatestArchivedSourceBatchIds(
  rows: readonly SupabaseSourceBatchRow[]
): string[] {
  const eligibleRows = rows.filter((row) => row.status === "success" && row.read_only === true);
  const latestRow = [...eligibleRows].sort(compareBatchesDesc)[0];

  if (latestRow === undefined) {
    return [];
  }

  const snapshotId = snapshotIdFromMetadata(latestRow.metadata);
  const selectedRows =
    snapshotId === undefined
      ? [latestRow]
      : eligibleRows.filter((row) => snapshotIdFromMetadata(row.metadata) === snapshotId);

  return selectedRows.map((row) => row.id).sort();
}

export function mapSupabaseRawSourceRow(row: SupabaseRawSourceRow): ArchivedRawSourceRow {
  if (!isSourceName(row.source)) {
    throw new Error(`Unsupported raw source row source: ${row.source}`);
  }

  if (!Array.isArray(row.source_refs)) {
    throw new Error(`raw_source_rows.source_refs must be an array for row ${row.id}.`);
  }

  const identity = {
    stableSourceRowKey: row.stable_source_row_key,
    ...(row.source_document_id === null ? {} : { sourceDocumentId: row.source_document_id }),
    ...(row.source_tab === null ? {} : { sourceTab: row.source_tab }),
    ...(row.source_row_number === null ? {} : { sourceRowNumber: row.source_row_number }),
    ...(row.source_object_id === null ? {} : { sourceObjectId: row.source_object_id })
  };

  return {
    kind: "raw_source_row",
    archiveStatus: "archived",
    id: row.id,
    batchId: row.batch_id,
    source: row.source,
    identity,
    raw: row.raw,
    contentHash: row.content_hash,
    observedAt: row.observed_at,
    sourceRefs: row.source_refs as SourceTraceRef[]
  };
}

async function fetchJson<T>({
  supabaseUrl,
  serviceRoleKey,
  fetcher,
  table,
  params
}: {
  readonly supabaseUrl: string;
  readonly serviceRoleKey: string;
  readonly fetcher: typeof fetch;
  readonly table: string;
  readonly params: Readonly<Record<string, string>>;
}): Promise<T> {
  const url = new URL(`${cleanSupabaseUrl(supabaseUrl)}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetcher(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      accept: "application/json",
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`
    }
  });

  if (!response.ok) {
    const body = typeof response.text === "function" ? await response.text() : "";
    throw new Error(
      `Source archive read failed for ${table}: HTTP ${response.status} ${redactSecrets(body, serviceRoleKey)}`
    );
  }

  return (await response.json()) as T;
}

async function fetchJsonPages<T>({
  supabaseUrl,
  serviceRoleKey,
  fetcher,
  table,
  params
}: {
  readonly supabaseUrl: string;
  readonly serviceRoleKey: string;
  readonly fetcher: typeof fetch;
  readonly table: string;
  readonly params: Readonly<Record<string, string>>;
}): Promise<T[]> {
  const rows: T[] = [];

  for (let offset = 0; ; offset += RAW_ROW_PAGE_SIZE) {
    const page = await fetchJson<T[]>({
      supabaseUrl,
      serviceRoleKey,
      fetcher,
      table,
      params: {
        ...params,
        limit: String(RAW_ROW_PAGE_SIZE),
        offset: String(offset)
      }
    });

    rows.push(...page);

    if (page.length < RAW_ROW_PAGE_SIZE) {
      return rows;
    }
  }
}

function compareBatchesDesc(left: SupabaseSourceBatchRow, right: SupabaseSourceBatchRow): number {
  return batchTime(right) - batchTime(left);
}

function batchTime(row: SupabaseSourceBatchRow): number {
  const parsed = Date.parse(row.completed_at ?? row.started_at ?? row.created_at);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function snapshotIdFromMetadata(metadata: Readonly<Record<string, unknown>>): string | undefined {
  const value = metadata.snapshotId;
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function isSourceName(value: string): value is SourceName {
  return (SOURCE_ARCHIVE_SOURCES as readonly string[]).includes(value);
}

function assertServerSide() {
  if (typeof window !== "undefined") {
    throw new Error("Source archive Supabase reads are server-side only.");
  }
}

function assertReadOnlyMutationGuard(env: SourceArchiveSupabaseReaderEnv) {
  if (env.MUTATION_GUARD !== "read_only") {
    throw new Error("MUTATION_GUARD must be read_only for source archive Supabase reads.");
  }
}

function requiredOption(name: string, value: string | undefined): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required for source archive Supabase reads.`);
  }

  return value.trim();
}

function normaliseBatchLimit(value: number | undefined): number {
  if (value === undefined) return DEFAULT_BATCH_LIMIT;
  if (!Number.isInteger(value) || value < 1 || value > MAX_BATCH_LIMIT) {
    throw new Error(`Source archive batch limit must be an integer from 1 to ${MAX_BATCH_LIMIT}.`);
  }

  return value;
}

function cleanSupabaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function redactSecrets(value: string, serviceRoleKey: string): string {
  return String(value)
    .replaceAll(serviceRoleKey, "[redacted-service-role-key]")
    .replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted-database-url]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}
