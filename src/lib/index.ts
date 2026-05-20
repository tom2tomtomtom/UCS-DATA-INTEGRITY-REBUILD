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

export type {
  BuildDashboardDisplayContractInput,
  DashboardCsvRow,
  DashboardDisplayContract,
  DashboardProjectRow,
  DashboardTotals,
  RollupRow
} from "./display/contract";
export { buildDashboardDisplayContract } from "./display/contract";
