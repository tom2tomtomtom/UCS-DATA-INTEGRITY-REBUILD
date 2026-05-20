export type {
  CanonFact,
  CheckStatus,
  DashboardOffice,
  DashboardScope,
  FloatFact,
  MetricValue,
  MoneyValue,
  ParsedFactBase,
  PipelineFact,
  ProductionRevenueFact,
  RawSourceRow,
  ReadOnlySqlFact,
  ReconciliationCheck,
  SoldFact,
  SourceBatch,
  SourceCapabilitiesForSource,
  SourceCapability,
  SourceFactSet,
  SourceLayer,
  SourceName,
  SourceTraceRef,
  SourceTraceSummary,
  SourceWarning,
  SyncLogFact,
  UnsupportedMetric
} from "./canon/types";
export type { DashboardScope as CanonDashboardScope } from "./canon/scope";

export {
  capabilityFor,
  buildSourceCapabilityIndex,
  buildSourceCapabilityIndexFromParserResults,
  buildSourceFactSetFromParserResults,
  capabilitiesForSource,
  createCanonQueryResult,
  createUnsupportedScopeMetrics,
  factMatchesScope,
  filterFactsByScope,
  FLOAT_SOURCE_CAPABILITIES,
  queryResultSource,
  selectFloatFacts,
  selectPipelineFacts,
  selectProductionRevenueFacts,
  selectSoldFacts,
  SOLD_SOURCE_CAPABILITIES,
  sourceCapabilityProfiles,
  sourceCapabilityProfilesFromParserResults,
  sourceSupportsCapability,
  sourceSupportsScopedField,
  unsupportedMetricsForSourceScope
} from "./canon-queries";

export type {
  BuildSourceFactSetOptions,
  CanonQueryInput,
  CanonQueryResult,
  SelectFloatFactsInput,
  SelectPipelineFactsInput,
  SelectProductionRevenueFactsInput,
  SelectSoldFactsInput,
  ScopedCapabilityKey,
  SourceCapabilityIndex,
  UnsupportedMetricsForSourceScopeInput,
  UnsupportedScopeMetricInput
} from "./canon-queries";

export {
  ARCHIVABLE_ROW_REASON,
  browseSourceRows,
  classifyRawSourceRow,
  createFixturePullResult,
  createFixtureSourcePullAdapter,
  createInMemorySourceArchiveStore,
  createSkippedSourceRow,
  LITERALLY_EMPTY_SKIP_REASON,
  SOURCE_ARCHIVE_SOURCES,
  SOURCE_ARCHIVE_VERSION
} from "./source-archive";

export type {
  AllowedSkipClassification,
  AllowedSkipEvidence,
  ArchiveRowClassification,
  ArchivedRawSourceRow,
  ClassifyRawSourceRowOptions,
  CreateSkippedSourceRowInput,
  FixturePullResultInput,
  FixtureSourcePullDefinition,
  RawRowArchiveClassification,
  RawSourceCandidateRow,
  RowClassifierFieldHints,
  SkippedSourceRow,
  SkipRowClassification,
  SourceArchiveBatch,
  SourceArchiveBatchStatus,
  SourceArchiveIdentityQuery,
  SourceArchiveMode,
  SourceArchivePayload,
  SourceArchiveRecord,
  SourceArchiveStore,
  SourcePullAdapter,
  SourcePullDescriptor,
  SourcePullFetchRequest,
  SourcePullListRequest,
  SourcePullMetadata,
  SourcePullProvider,
  SourcePullReadRequest,
  SourcePullRequestTarget,
  SourcePullResult,
  SourceRowBrowserQuery,
  SourceRowBrowserResult,
  SourceRowIdentity
} from "./source-archive";

export type {
  CompactDashboardTraceRow,
  BuildDashboardDisplayContractInput,
  DashboardApprovalOutput,
  DashboardCsvRow,
  DashboardDisplayContract,
  DashboardProjectRow,
  DashboardTotals,
  RollupRow
} from "./display/contract";
export { buildDashboardDisplayContract } from "./display/contract";
export {
  buildApprovalOutputFromDisplayContract,
  buildApprovalOutputRow
} from "./display/approval-output";
export type { ApprovalContractOutput, ApprovalOutputRow } from "./display/approval-output";
export { buildCsvRowFromDisplayRow, buildCsvRowsFromDisplayContract } from "./display/csv";
export { createFloatReconciliationChecks } from "./display/float-reconciliation";
export type { FloatReconciliationInput } from "./display/float-reconciliation";
export { buildProjectRows } from "./display/project-rows";
export type { BuildProjectRowsInput, ProjectDisplayRow, ProjectRowSourceLabel } from "./display/project-rows";
export {
  buildClientRollups,
  buildDepartmentRollups,
  buildDisplayRollups,
  buildMonthRollups,
  buildRoleRollups,
  preserveScopeForLink,
  scopedHref,
  scopeForRollupDrilldown,
  scopeToSearchParams
} from "./display/rollups";
export type { BuildRollupsInput, DisplayRollups, RollupDimension } from "./display/rollups";
export {
  buildCompactTraceRowsFromDisplayContract,
  buildCompactTraceRowsFromDisplayRow
} from "./display/traces";
export type { CompactSourceTraceRow } from "./display/traces";

export {
  createParserFactEvidence,
  createParserResult,
  createParserWarning,
  PARSER_ADDITIVE_STATUSES,
  parseArchivedFeeSheetRows,
  parseArchivedFloatRows,
  parsePipelineRows,
  parseProductionRevenueRows,
  toIsAdditive
} from "./parsers";

export type {
  FeeSheetArchivedRowPayload,
  FeeSheetRowKind,
  FeeSheetSoldFact,
  FloatArchivedTaskPayload,
  FloatParserFact,
  ParserAdditiveStatus,
  ParserCapabilitySummary,
  ParserFactEvidence,
  ParserFactEvidenceInput,
  ParserResult,
  ParserResultInput,
  ParserWarning,
  ParserWarningInput,
  ParserWarningSeverity
} from "./parsers";

export {
  compareDualRunSnapshots
} from "./dual-run";

export type {
  DualRunComparisonInput,
  DualRunComparisonResult,
  DualRunDifference,
  DualRunDifferenceClassification,
  DualRunEvidenceRow,
  DualRunLane,
  DualRunMetric,
  OldDashboardComparisonLane
} from "./dual-run";
