import type { SourceLayer, SourceName, SourceTraceRef } from "../canon/types";
import type {
  AllowedSkipClassification,
  AllowedSkipEvidence,
  SkippedSourceRow,
  SourceArchivePayload,
  SourceRowIdentity
} from "./types";

export const LITERALLY_EMPTY_SKIP_REASON =
  "No job, project, client, date, amount, hours, or useful source identifier.";

export const ARCHIVABLE_ROW_REASON = "Raw source row has source evidence and must be archived.";

type EvidenceKey = keyof AllowedSkipEvidence;
type MutableEvidence = { -readonly [Key in EvidenceKey]: boolean };

export type RowClassifierFieldHints = Partial<Record<EvidenceKey, readonly string[]>>;

export const DEFAULT_ROW_CLASSIFIER_FIELD_HINTS = {
  hasJobNumber: ["job", "jobNumber", "jobNo", "jobCode", "jobId", "job_number", "projectCode"],
  hasProjectName: ["project", "projectName", "project_name", "campaign", "name"],
  hasClient: ["client", "clientName", "client_name", "brand"],
  hasDate: ["date", "month", "from", "to", "startDate", "endDate", "createdAt", "updatedAt"],
  hasAmount: ["amount", "fee", "revenue", "value", "budget", "total", "pipelineAmount", "soldFee"],
  hasHours: ["hours", "soldHours", "allocatedHours", "duration"],
  hasUsefulSourceIdentifier: [
    "id",
    "sourceId",
    "sourceRowId",
    "sourceObjectId",
    "floatProjectId",
    "taskId",
    "personId",
    "stableSourceRowKey",
    "key"
  ]
} as const satisfies Record<EvidenceKey, readonly string[]>;

const EVIDENCE_KEYS = [
  "hasJobNumber",
  "hasProjectName",
  "hasClient",
  "hasDate",
  "hasAmount",
  "hasHours",
  "hasUsefulSourceIdentifier"
] as const satisfies readonly EvidenceKey[];

const SOURCE_LAYER_BY_SOURCE = {
  fee_sheet: "sold",
  pipeline: "pipeline",
  production_revenue: "production_revenue",
  float: "float_raw",
  read_only_sql: "read_only_sql",
  sync_log: "sync_log"
} as const satisfies Record<SourceName, SourceLayer>;

export type ArchiveRowClassification = {
  readonly decision: "archive";
  readonly reason: string;
  readonly evidence: AllowedSkipEvidence;
};

export type SkipRowClassification = {
  readonly decision: "skip";
  readonly allowedByLaw: true;
  readonly classification: AllowedSkipClassification;
  readonly reason: string;
  readonly evidence: AllowedSkipEvidence;
};

export type RawRowArchiveClassification = ArchiveRowClassification | SkipRowClassification;

export type ClassifyRawSourceRowOptions = {
  readonly identity?: SourceRowIdentity;
  readonly fieldHints?: RowClassifierFieldHints;
};

export type CreateSkippedSourceRowInput = {
  readonly id: string;
  readonly batchId: string;
  readonly source: SourceName;
  readonly identity: SourceRowIdentity;
  readonly observedAt: string;
  readonly raw?: SourceArchivePayload;
  readonly contentHash?: string;
  readonly sourceRefs?: readonly SourceTraceRef[];
  readonly fieldHints?: RowClassifierFieldHints;
};

export function classifyRawSourceRow(
  raw: SourceArchivePayload,
  options: ClassifyRawSourceRowOptions = {}
): RawRowArchiveClassification {
  const evidence = createEmptyEvidence();
  const hints = mergeFieldHints(options.fieldHints);
  let hasAnyRawContent = false;

  if (hasSourceObjectIdentifier(options.identity)) {
    evidence.hasUsefulSourceIdentifier = true;
    hasAnyRawContent = true;
  }

  visitRawValue(raw, [], (path) => {
    hasAnyRawContent = true;
    applyPathEvidence(path, hints, evidence);
  });

  const immutableEvidence = toAllowedSkipEvidence(evidence);

  if (!hasAnyRawContent && !hasAnyEvidence(immutableEvidence)) {
    return {
      decision: "skip",
      allowedByLaw: true,
      classification: "literally_empty",
      reason: LITERALLY_EMPTY_SKIP_REASON,
      evidence: immutableEvidence
    };
  }

  return {
    decision: "archive",
    reason: ARCHIVABLE_ROW_REASON,
    evidence: immutableEvidence
  };
}

export function createSkippedSourceRow(input: CreateSkippedSourceRowInput): SkippedSourceRow {
  const raw = input.raw === undefined ? null : input.raw;
  const classification = classifyRawSourceRow(
    raw,
    input.fieldHints === undefined
      ? { identity: input.identity }
      : { identity: input.identity, fieldHints: input.fieldHints }
  );

  if (classification.decision !== "skip") {
    throw new Error("Only literally empty rows can be recorded as skipped.");
  }

  return {
    kind: "skipped_source_row",
    archiveStatus: "skipped",
    id: input.id,
    batchId: input.batchId,
    source: input.source,
    identity: input.identity,
    observedAt: input.observedAt,
    ...(input.raw !== undefined ? { raw: input.raw } : {}),
    ...(input.contentHash !== undefined ? { contentHash: input.contentHash } : {}),
    skip: {
      allowedByLaw: true,
      classification: classification.classification,
      reason: classification.reason,
      evidence: classification.evidence
    },
    sourceRefs:
      input.sourceRefs ??
      [
        createSourceTraceRef({
          source: input.source,
          batchId: input.batchId,
          rawRowId: input.id,
          identity: input.identity
        })
      ]
  };
}

function createEmptyEvidence(): MutableEvidence {
  return {
    hasJobNumber: false,
    hasProjectName: false,
    hasClient: false,
    hasDate: false,
    hasAmount: false,
    hasHours: false,
    hasUsefulSourceIdentifier: false
  };
}

function toAllowedSkipEvidence(evidence: MutableEvidence): AllowedSkipEvidence {
  return {
    hasJobNumber: evidence.hasJobNumber,
    hasProjectName: evidence.hasProjectName,
    hasClient: evidence.hasClient,
    hasDate: evidence.hasDate,
    hasAmount: evidence.hasAmount,
    hasHours: evidence.hasHours,
    hasUsefulSourceIdentifier: evidence.hasUsefulSourceIdentifier
  };
}

function mergeFieldHints(fieldHints: RowClassifierFieldHints | undefined): Record<EvidenceKey, readonly string[]> {
  return {
    hasJobNumber: mergeHints("hasJobNumber", fieldHints),
    hasProjectName: mergeHints("hasProjectName", fieldHints),
    hasClient: mergeHints("hasClient", fieldHints),
    hasDate: mergeHints("hasDate", fieldHints),
    hasAmount: mergeHints("hasAmount", fieldHints),
    hasHours: mergeHints("hasHours", fieldHints),
    hasUsefulSourceIdentifier: mergeHints("hasUsefulSourceIdentifier", fieldHints)
  };
}

function mergeHints(key: EvidenceKey, fieldHints: RowClassifierFieldHints | undefined): readonly string[] {
  return [...DEFAULT_ROW_CLASSIFIER_FIELD_HINTS[key], ...(fieldHints?.[key] ?? [])];
}

function visitRawValue(
  value: unknown,
  path: readonly string[],
  onNonEmptyLeaf: (path: readonly string[]) => void
): void {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === "string") {
    if (value.trim() !== "") {
      onNonEmptyLeaf(path);
    }
    return;
  }

  if (typeof value !== "object") {
    onNonEmptyLeaf(path);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      visitRawValue(item, path, onNonEmptyLeaf);
    }
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    visitRawValue(nestedValue, [...path, key], onNonEmptyLeaf);
  }
}

function applyPathEvidence(
  path: readonly string[],
  hints: Record<EvidenceKey, readonly string[]>,
  evidence: MutableEvidence
): void {
  if (path.length === 0) {
    return;
  }

  const normalizedPath = normalizeFieldName(path.join("."));

  for (const key of EVIDENCE_KEYS) {
    if (hints[key].some((hint) => normalizedPath.includes(normalizeFieldName(hint)))) {
      evidence[key] = true;
    }
  }
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function hasSourceObjectIdentifier(identity: SourceRowIdentity | undefined): boolean {
  return typeof identity?.sourceObjectId === "string" && identity.sourceObjectId.trim() !== "";
}

function hasAnyEvidence(evidence: AllowedSkipEvidence): boolean {
  return EVIDENCE_KEYS.some((key) => evidence[key]);
}

function createSourceTraceRef(input: {
  readonly source: SourceName;
  readonly batchId: string;
  readonly rawRowId: string;
  readonly identity: SourceRowIdentity;
}): SourceTraceRef {
  return {
    source: input.source,
    sourceLayer: SOURCE_LAYER_BY_SOURCE[input.source],
    batchId: input.batchId,
    rawRowId: input.rawRowId,
    ...(input.identity.sourceDocumentId !== undefined
      ? { sourceDocumentId: input.identity.sourceDocumentId }
      : {}),
    ...(input.identity.sourceTab !== undefined ? { sourceTab: input.identity.sourceTab } : {}),
    ...(input.identity.sourceRowNumber !== undefined
      ? { sourceRowNumber: input.identity.sourceRowNumber }
      : {}),
    ...(input.identity.sourceObjectId !== undefined ? { sourceObjectId: input.identity.sourceObjectId } : {})
  };
}
