import type { SourceName, SourceTraceRef } from "../canon/types";

export const SOURCE_ARCHIVE_VERSION = 1;

export const SOURCE_ARCHIVE_SOURCES = [
  "fee_sheet",
  "pipeline",
  "production_revenue",
  "float",
  "read_only_sql",
  "sync_log"
] as const satisfies readonly SourceName[];

export type SourceArchiveMode =
  | "fixture"
  | "read_only_live"
  | "legacy_import"
  | "manual_snapshot"
  | "backfill";

export type SourceArchiveBatchStatus = "running" | "success" | "partial" | "failed" | "cancelled";

export type SourceArchiveBatch = {
  readonly id: string;
  readonly source: SourceName;
  readonly status: SourceArchiveBatchStatus;
  readonly mode: SourceArchiveMode;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly sourceLabel: string;
  readonly sourceVersion?: string;
  readonly readOnly: true;
  readonly warnings: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
};

export type SourceRowIdentity = {
  readonly stableSourceRowKey: string;
  readonly sourceDocumentId?: string;
  readonly sourceTab?: string;
  readonly sourceRowNumber?: number;
  readonly sourceObjectId?: string;
};

export type SourceArchivePayload =
  | Readonly<Record<string, unknown>>
  | readonly unknown[]
  | string
  | number
  | boolean
  | null;

export type ArchivedRawSourceRow = {
  readonly kind: "raw_source_row";
  readonly archiveStatus: "archived";
  readonly id: string;
  readonly batchId: string;
  readonly source: SourceName;
  readonly identity: SourceRowIdentity;
  readonly raw: SourceArchivePayload;
  readonly contentHash: string;
  readonly observedAt: string;
  readonly sourceRefs: readonly SourceTraceRef[];
};

export type AllowedSkipClassification = "literally_empty";

export type AllowedSkipEvidence = {
  readonly hasJobNumber: boolean;
  readonly hasProjectName: boolean;
  readonly hasClient: boolean;
  readonly hasDate: boolean;
  readonly hasAmount: boolean;
  readonly hasHours: boolean;
  readonly hasUsefulSourceIdentifier: boolean;
};

export type SkippedSourceRow = {
  readonly kind: "skipped_source_row";
  readonly archiveStatus: "skipped";
  readonly id: string;
  readonly batchId: string;
  readonly source: SourceName;
  readonly identity: SourceRowIdentity;
  readonly observedAt: string;
  readonly raw?: SourceArchivePayload;
  readonly contentHash?: string;
  readonly skip: {
    readonly allowedByLaw: true;
    readonly classification: AllowedSkipClassification;
    readonly reason: string;
    readonly evidence: AllowedSkipEvidence;
  };
  readonly sourceRefs: readonly SourceTraceRef[];
};

export type SourceArchiveRecord = ArchivedRawSourceRow | SkippedSourceRow;

export type SourcePullMetadata = {
  readonly source: SourceName;
  readonly mode: SourceArchiveMode;
  readonly requestedAt: string;
  readonly completedAt?: string;
  readonly readOnly: true;
  readonly request: {
    readonly sourceDocumentId?: string;
    readonly sourceTab?: string;
    readonly sourceObjectId?: string;
    readonly description?: string;
  };
  readonly warnings: readonly string[];
};
