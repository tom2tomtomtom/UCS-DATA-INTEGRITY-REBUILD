import { createHash } from "node:crypto";

import type { SourceLayer, SourceName, SourceTraceRef } from "../canon/types";
import { classifyRawSourceRow, createSkippedSourceRow } from "../source-archive/row-classifier";
import type {
  ArchivedRawSourceRow,
  SourceArchiveBatch,
  SourceArchiveMode,
  SourceArchivePayload,
  SourceRowIdentity,
  SkippedSourceRow
} from "../source-archive/types";

export type SourceSnapshotRow = {
  readonly identity: SourceRowIdentity;
  readonly raw: SourceArchivePayload;
};

export type SourceSnapshotSource = {
  readonly source: SourceName;
  readonly mode: Extract<SourceArchiveMode, "manual_snapshot" | "legacy_import" | "read_only_live" | "backfill">;
  readonly sourceLabel: string;
  readonly sourceVersion?: string;
  readonly rows: readonly SourceSnapshotRow[];
};

export type SourceSnapshotImportInput = {
  readonly snapshotId: string;
  readonly capturedAt: string;
  readonly readOnly: boolean;
  readonly sources: readonly SourceSnapshotSource[];
};

export type SourceSnapshotImportSourceReport = {
  readonly totalRows: number;
  readonly rawRows: number;
  readonly skippedRows: number;
  readonly cacheEvidenceRows: number;
};

export type SourceSnapshotImportReport = {
  readonly status: "pass" | "warn";
  readonly snapshotId: string;
  readonly capturedAt: string;
  readonly totalRows: number;
  readonly rawRows: number;
  readonly skippedRows: number;
  readonly cacheEvidenceRows: number;
  readonly bySource: Partial<Record<SourceName, SourceSnapshotImportSourceReport>>;
  readonly warnings: readonly string[];
};

export type SourceSnapshotImportPlan = {
  readonly batches: readonly SourceArchiveBatch[];
  readonly rawRows: readonly ArchivedRawSourceRow[];
  readonly skippedRows: readonly SkippedSourceRow[];
  readonly report: SourceSnapshotImportReport;
};

const SOURCE_LAYER_BY_SOURCE = {
  fee_sheet: "sold",
  pipeline: "pipeline",
  production_revenue: "production_revenue",
  float: "float_raw",
  read_only_sql: "read_only_sql",
  sync_log: "sync_log"
} as const satisfies Record<SourceName, SourceLayer>;

const legacyCacheTables = new Set([
  "float_allocations",
  "float_tasks_canon",
  "pipeline_data",
  "sold_monthly",
  "production_revenue",
  "projects_cache",
  "dashboard_cache",
  "fee_sheet_cache"
]);

export function buildSourceSnapshotImportPlan(
  input: SourceSnapshotImportInput
): SourceSnapshotImportPlan {
  if (input.readOnly !== true) {
    throw new Error("Snapshot imports must be explicitly read-only.");
  }

  const snapshotKey = safeId(input.snapshotId);
  const batches: SourceArchiveBatch[] = [];
  const rawRows: ArchivedRawSourceRow[] = [];
  const skippedRows: SkippedSourceRow[] = [];
  const bySource: Partial<Record<SourceName, MutableSourceReport>> = {};
  const warnings = new Set<string>();
  let cacheEvidenceRows = 0;

  input.sources.forEach((sourceSnapshot, sourceIndex) => {
    const batchId = deterministicUuid(`batch:${snapshotKey}:${sourceSnapshot.source}:${sourceIndex}`);
    const batchWarnings: string[] = [];
    const sourceReport = reportForSource(bySource, sourceSnapshot.source);

    const batch: SourceArchiveBatch = {
      id: batchId,
      source: sourceSnapshot.source,
      status: "success",
      mode: sourceSnapshot.mode,
      startedAt: input.capturedAt,
      completedAt: input.capturedAt,
      sourceLabel: sourceSnapshot.sourceLabel,
      ...(sourceSnapshot.sourceVersion === undefined ? {} : { sourceVersion: sourceSnapshot.sourceVersion }),
      readOnly: true,
      warnings: batchWarnings,
      metadata: {
        snapshotId: input.snapshotId,
        importedAsTruth: false
      }
    };
    batches.push(batch);

    sourceSnapshot.rows.forEach((row, rowIndex) => {
      assertValidRowIdentity(sourceSnapshot.source, row.identity);
      sourceReport.totalRows += 1;
      const rawRowId = deterministicUuid(`raw:${snapshotKey}:${sourceSnapshot.source}:${sourceIndex}:${rowIndex}:${row.identity.stableSourceRowKey}`);
      const raw = clonePayload(row.raw);
      const contentHash = hashPayload({
        identity: row.identity,
        raw
      });
      const sourceRefs = createSourceRefs({
        source: sourceSnapshot.source,
        batchId,
        rawRowId,
        identity: row.identity,
        legacyCacheEvidence: isLegacyCacheEvidence(sourceSnapshot, row)
      });
      const classification = classifyRawSourceRow(raw, { identity: row.identity });

      if (classification.decision === "skip") {
        skippedRows.push(
          createSkippedSourceRow({
            id: rawRowId,
            batchId,
            source: sourceSnapshot.source,
            identity: row.identity,
            observedAt: input.capturedAt,
            raw,
            contentHash,
            sourceRefs
          })
        );
        sourceReport.skippedRows += 1;
        return;
      }

      const legacyCacheEvidence = isLegacyCacheEvidence(sourceSnapshot, row);
      if (legacyCacheEvidence) {
        cacheEvidenceRows += 1;
        sourceReport.cacheEvidenceRows += 1;
        warnings.add("legacy_cache_imported_as_evidence_only");
        batchWarnings.push("legacy_cache_imported_as_evidence_only");
      }

      rawRows.push({
        kind: "raw_source_row",
        archiveStatus: "archived",
        id: rawRowId,
        batchId,
        source: sourceSnapshot.source,
        identity: row.identity,
        raw,
        contentHash,
        observedAt: input.capturedAt,
        sourceRefs
      });
      sourceReport.rawRows += 1;
    });
  });

  const reportWarnings = [...warnings].sort();
  const report: SourceSnapshotImportReport = {
    status: reportWarnings.length > 0 ? "warn" : "pass",
    snapshotId: input.snapshotId,
    capturedAt: input.capturedAt,
    totalRows: rawRows.length + skippedRows.length,
    rawRows: rawRows.length,
    skippedRows: skippedRows.length,
    cacheEvidenceRows,
    bySource,
    warnings: reportWarnings
  };

  return {
    batches,
    rawRows,
    skippedRows,
    report
  };
}

type MutableSourceReport = {
  totalRows: number;
  rawRows: number;
  skippedRows: number;
  cacheEvidenceRows: number;
};

function reportForSource(
  reports: Partial<Record<SourceName, MutableSourceReport>>,
  source: SourceName
): MutableSourceReport {
  const existing = reports[source];
  if (existing !== undefined) return existing;

  const created = {
    totalRows: 0,
    rawRows: 0,
    skippedRows: 0,
    cacheEvidenceRows: 0
  };
  reports[source] = created;
  return created;
}

function assertValidRowIdentity(source: SourceName, identity: SourceRowIdentity): void {
  if (identity.stableSourceRowKey.trim() === "") {
    throw new Error("Source row is missing stableSourceRowKey.");
  }

  if (
    (source === "fee_sheet" || source === "pipeline" || source === "production_revenue") &&
    (identity.sourceDocumentId === undefined ||
      identity.sourceDocumentId.trim() === "" ||
      identity.sourceTab === undefined ||
      identity.sourceTab.trim() === "" ||
      identity.sourceRowNumber === undefined)
  ) {
    throw new Error(`${source} snapshot rows require sourceDocumentId, sourceTab, and sourceRowNumber.`);
  }

  if (
    source === "float" &&
    (identity.sourceObjectId === undefined || identity.sourceObjectId.trim() === "")
  ) {
    throw new Error("float snapshot rows require sourceObjectId.");
  }
}

function createSourceRefs(input: {
  readonly source: SourceName;
  readonly batchId: string;
  readonly rawRowId: string;
  readonly identity: SourceRowIdentity;
  readonly legacyCacheEvidence: boolean;
}): readonly SourceTraceRef[] {
  return [
    {
      source: input.source,
      sourceLayer: SOURCE_LAYER_BY_SOURCE[input.source],
      batchId: input.batchId,
      rawRowId: input.rawRowId,
      ...(input.identity.sourceDocumentId === undefined
        ? {}
        : { sourceDocumentId: input.identity.sourceDocumentId }),
      ...(input.identity.sourceTab === undefined ? {} : { sourceTab: input.identity.sourceTab }),
      ...(input.identity.sourceRowNumber === undefined
        ? {}
        : { sourceRowNumber: input.identity.sourceRowNumber }),
      ...(input.identity.sourceObjectId === undefined
        ? {}
        : { sourceObjectId: input.identity.sourceObjectId }),
      ...(input.legacyCacheEvidence ? { field: "legacy_cache_evidence_only" } : {})
    }
  ];
}

function isLegacyCacheEvidence(
  sourceSnapshot: SourceSnapshotSource,
  row: SourceSnapshotRow
): boolean {
  if (sourceSnapshot.mode !== "legacy_import" && sourceSnapshot.source !== "read_only_sql") {
    return false;
  }

  const tableName = tableNameFromRaw(row.raw);
  if (tableName !== undefined && legacyCacheTables.has(tableName)) return true;

  const identityText = [
    row.identity.stableSourceRowKey,
    row.identity.sourceObjectId,
    row.identity.sourceDocumentId,
    row.identity.sourceTab
  ]
    .filter((value): value is string => value !== undefined)
    .join(" ")
    .toLowerCase();

  return [...legacyCacheTables].some((table) => identityText.includes(table));
}

function tableNameFromRaw(raw: SourceArchivePayload): string | undefined {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return undefined;

  const rawRecord = raw as Readonly<Record<string, unknown>>;
  const value = rawRecord.table ?? rawRecord.tableName ?? rawRecord.sourceTable;
  return typeof value === "string" ? value.trim().toLowerCase() : undefined;
}

function hashPayload(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function deterministicUuid(seed: string): string {
  const hash = createHash("sha256").update(seed).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `${((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, "0")}${hash.slice(18, 20)}`,
    hash.slice(20, 32)
  ].join("-");
}

function clonePayload<T extends SourceArchivePayload>(payload: T): T {
  return deepFreeze(structuredClone(payload));
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object") {
    return value;
  }

  const objectValue = value as object;
  if (seen.has(objectValue)) {
    return value;
  }
  seen.add(objectValue);

  for (const nestedValue of Object.values(value)) {
    deepFreeze(nestedValue, seen);
  }

  return Object.freeze(value);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;

  const record = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function safeId(value: string): string {
  const safe = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (safe === "") throw new Error("Snapshot import identifiers cannot be blank.");
  return safe;
}
