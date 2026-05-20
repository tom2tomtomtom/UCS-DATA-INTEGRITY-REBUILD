import type {
  CanonFact,
  CheckStatus,
  SourceCapability,
  SourceLayer,
  SourceName,
  SourceTraceRef
} from "../canon/types";

export const PARSER_ADDITIVE_STATUSES = [
  "additive",
  "not_additive",
  "source_summary",
  "unknown_requires_review"
] as const;

export type ParserAdditiveStatus = (typeof PARSER_ADDITIVE_STATUSES)[number];

export type ParserFactEvidenceInput = {
  readonly batchId: string;
  readonly rawRowIds: readonly string[];
  readonly sourceRefs: readonly SourceTraceRef[];
  readonly additiveStatus: ParserAdditiveStatus;
};

export type ParserFactEvidence = ParserFactEvidenceInput & {
  readonly isAdditive: boolean;
};

export type ParserWarningSeverity = Extract<CheckStatus, "DATA_WARN" | "PROCESS_WARN" | "FAIL">;

export type ParserWarning = {
  readonly code: string;
  readonly message: string;
  readonly source: SourceName;
  readonly sourceLayer: SourceLayer;
  readonly batchId: string;
  readonly rawRowIds: readonly string[];
  readonly sourceRefs: readonly SourceTraceRef[];
  readonly severity: ParserWarningSeverity;
};

export type ParserWarningInput = ParserWarning;

export type ParserCapabilitySummary = {
  readonly source: SourceName;
  readonly capabilities: readonly SourceCapability[];
};

export type ParserResult<TFact extends CanonFact = CanonFact> = {
  readonly parserName: string;
  readonly source: SourceName;
  readonly facts: readonly TFact[];
  readonly warnings: readonly ParserWarning[];
  readonly capabilities: readonly ParserCapabilitySummary[];
  readonly sourceRowsRead: number;
  readonly sourceRowsSkipped: number;
};

export type ParserResultInput<TFact extends CanonFact = CanonFact> = ParserResult<TFact>;
