import type { SourceName, SourceTraceRef } from "../canon/types";
import type {
  AllowedSkipClassification,
  SourceArchivePayload,
  SourceArchiveRecord,
  SourceRowIdentity
} from "./types";

export type SourceRowBrowserQuery = {
  readonly source?: SourceName;
  readonly batchId?: string;
  readonly sourceDocumentId?: string;
  readonly sourceTab?: string;
  readonly sourceRowNumber?: number;
  readonly sourceObjectId?: string;
  readonly contentHash?: string;
  readonly text?: string;
};

export type SourceRowBrowserResult = {
  readonly id: string;
  readonly kind: SourceArchiveRecord["kind"];
  readonly archiveStatus: SourceArchiveRecord["archiveStatus"];
  readonly batchId: string;
  readonly source: SourceName;
  readonly identity: SourceRowIdentity;
  readonly observedAt: string;
  readonly sourceRefs: readonly SourceTraceRef[];
  readonly raw?: SourceArchivePayload;
  readonly contentHash?: string;
  readonly skipReason?: string;
  readonly skipClassification?: AllowedSkipClassification;
};

export function browseSourceRows(
  records: readonly SourceArchiveRecord[],
  query: SourceRowBrowserQuery = {}
): SourceRowBrowserResult[] {
  return records.filter((record) => matchesQuery(record, query)).map(toBrowserResult);
}

function matchesQuery(record: SourceArchiveRecord, query: SourceRowBrowserQuery): boolean {
  if (query.source !== undefined && record.source !== query.source) {
    return false;
  }

  if (query.batchId !== undefined && record.batchId !== query.batchId) {
    return false;
  }

  if (
    query.sourceDocumentId !== undefined &&
    record.identity.sourceDocumentId !== query.sourceDocumentId
  ) {
    return false;
  }

  if (query.sourceTab !== undefined && record.identity.sourceTab !== query.sourceTab) {
    return false;
  }

  if (
    query.sourceRowNumber !== undefined &&
    record.identity.sourceRowNumber !== query.sourceRowNumber
  ) {
    return false;
  }

  if (
    query.sourceObjectId !== undefined &&
    record.identity.sourceObjectId !== query.sourceObjectId
  ) {
    return false;
  }

  if (query.contentHash !== undefined && record.contentHash !== query.contentHash) {
    return false;
  }

  if (query.text !== undefined && !matchesIdentityText(record, query.text)) {
    return false;
  }

  return true;
}

function matchesIdentityText(record: SourceArchiveRecord, text: string): boolean {
  const needle = text.trim().toLowerCase();

  if (needle.length === 0) {
    return true;
  }

  return sourceIdentityValues(record).some((value) => value.toLowerCase().includes(needle));
}

function sourceIdentityValues(record: SourceArchiveRecord): string[] {
  const values = [
    record.id,
    record.batchId,
    record.source,
    record.contentHash,
    record.identity.stableSourceRowKey,
    record.identity.sourceDocumentId,
    record.identity.sourceTab,
    record.identity.sourceRowNumber?.toString(),
    record.identity.sourceObjectId
  ];

  for (const sourceRef of record.sourceRefs) {
    values.push(
      sourceRef.batchId,
      sourceRef.rawRowId,
      sourceRef.sourceDocumentId,
      sourceRef.sourceTab,
      sourceRef.sourceRowNumber?.toString(),
      sourceRef.sourceObjectId,
      sourceRef.field
    );
  }

  return values.filter((value): value is string => value !== undefined);
}

function toBrowserResult(record: SourceArchiveRecord): SourceRowBrowserResult {
  return {
    id: record.id,
    kind: record.kind,
    archiveStatus: record.archiveStatus,
    batchId: record.batchId,
    source: record.source,
    identity: { ...record.identity },
    observedAt: record.observedAt,
    sourceRefs: record.sourceRefs.map((sourceRef) => ({ ...sourceRef })),
    ...(record.raw !== undefined ? { raw: record.raw } : {}),
    ...(record.contentHash !== undefined ? { contentHash: record.contentHash } : {}),
    ...(record.kind === "skipped_source_row"
      ? {
          skipReason: record.skip.reason,
          skipClassification: record.skip.classification
        }
      : {})
  };
}
