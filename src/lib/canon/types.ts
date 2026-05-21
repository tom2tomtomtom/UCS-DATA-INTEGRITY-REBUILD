export type DashboardOffice = "LDN" | "USA" | "UCX" | "ALL";
export type DashboardConcreteOffice = Exclude<DashboardOffice, "ALL">;

export type DashboardScope = {
  office: DashboardOffice;
  offices?: readonly DashboardConcreteOffice[];
  from: string;
  to: string;
  department?: string;
  role?: string;
  client?: string;
  search?: string;
  jobNumber?: string;
  floatProjectId?: string;
};

export type SourceName =
  | "fee_sheet"
  | "pipeline"
  | "production_revenue"
  | "float"
  | "read_only_sql"
  | "sync_log";

export type SourceLayer =
  | "sold"
  | "pipeline"
  | "production_revenue"
  | "float_raw"
  | "float_cache"
  | "float_visible"
  | "float_export"
  | "fee_sheet_parser_summary"
  | "read_only_sql"
  | "sync_log";

export type SourceCapabilityStatus = "supported" | "partial" | "unsupported";

export type SourceCapabilityKey =
  | "project"
  | "month"
  | "office"
  | "client"
  | "department"
  | "role"
  | "person";

export type SourceCapability = {
  key: SourceCapabilityKey;
  status: SourceCapabilityStatus;
  reason?: string;
};

export type SourceCapabilitiesForSource = {
  source: SourceName;
  capabilities: SourceCapability[];
};

export type CheckStatus = "PASS" | "DATA_WARN" | "PROCESS_WARN" | "FAIL";

export type WarningLifecycleState =
  | "open"
  | "acknowledged"
  | "source_fixed_pending_refresh"
  | "resolved_by_source"
  | "resolved_by_code"
  | "wont_fix_source_limitation"
  | "superseded";

export type WarningOwner =
  | "Jade"
  | "Yunni"
  | "Production"
  | "Project owner"
  | "Tom"
  | "Codex"
  | "Unknown";

export type SourceWarning = {
  id: string;
  status: CheckStatus;
  lifecycleState: WarningLifecycleState;
  source: SourceName;
  sourceLayer: SourceLayer;
  code: string;
  message: string;
  scope: DashboardScope;
  owner: WarningOwner;
  sourceRefs: SourceTraceRef[];
  firstSeenAt: string;
  lastSeenAt: string;
  resolutionEvidence?: string;
};

export type ReconciliationCheck = {
  id: string;
  status: CheckStatus;
  code: string;
  label: string;
  scope: DashboardScope;
  sourceRefs: SourceTraceRef[];
  expected?: MetricValue;
  actual?: MetricValue;
  tolerance?: number;
  message?: string;
};

export type MoneyValue = {
  amountOriginal: number;
  currencyOriginal: "GBP" | "USD" | "EUR" | "SEK" | "UNKNOWN";
  amountGbp: number;
  fxRateToGbp: number;
  fxSource: string;
  fxCapturedAt: string;
};

export type SupportedMetricValue =
  | {
      kind: "money";
      value: MoneyValue;
    }
  | {
      kind: "hours";
      value: number;
      unit: "decimal_hours";
    }
  | {
      kind: "count";
      value: number;
    };

export type UnsupportedMetric = {
  kind: "unsupported";
  metric: string;
  scope: DashboardScope;
  source: SourceName;
  reason: string;
  displayLabel: "Unsupported";
  severity: "info" | "warn";
};

export type MetricValue = SupportedMetricValue | UnsupportedMetric;

export type SourceTraceRef = {
  source: SourceName;
  sourceLayer: SourceLayer;
  batchId?: string;
  rawRowId?: string;
  sourceDocumentId?: string;
  sourceTab?: string;
  sourceRowNumber?: number;
  sourceObjectId?: string;
  field?: string;
};

export type SourceTraceSummary = {
  id: string;
  scope: DashboardScope;
  metric: string;
  value: MetricValue;
  refs: SourceTraceRef[];
  warnings: SourceWarning[];
};

export type SourceBatch = {
  id: string;
  source: SourceName;
  startedAt: string;
  completedAt?: string;
  status: "running" | "success" | "partial" | "failed";
  pulledBy: "sync" | "manual" | "test" | "backfill";
  sourceVersion?: string;
  warnings: SourceWarning[];
};

export type RawSourceRow = {
  id: string;
  batchId: string;
  source: SourceName;
  sourceDocumentId?: string;
  sourceTab?: string;
  sourceRowNumber?: number;
  sourceObjectId?: string;
  raw: unknown;
  contentHash: string;
  observedAt: string;
};

export type ParsedFactBase = {
  id: string;
  source: SourceName;
  sourceLayer: SourceLayer;
  rawRowIds: string[];
  batchId: string;
  jobNumber?: string;
  floatProjectId?: string;
  client?: string;
  sourceClient?: string;
  canonicalClient?: string;
  projectName?: string;
  sourceProjectName?: string;
  office?: "LDN" | "USA" | "UCX" | "UNKNOWN";
  month?: string;
  from?: string;
  to?: string;
  department?: string;
  role?: string;
  person?: string;
  amount?: MetricValue;
  hours?: MetricValue;
  status?: string;
  isAdditive: boolean;
  confidence: "high" | "medium" | "low";
  warnings: SourceWarning[];
  trace: SourceTraceRef[];
};

export type SoldFact = ParsedFactBase & {
  source: "fee_sheet";
  sourceLayer: "sold" | "fee_sheet_parser_summary";
  feeSheetFloatId?: string;
};

export type PipelineFact = ParsedFactBase & {
  source: "pipeline";
  sourceLayer: "pipeline";
  stablePipelineIdentity: string;
};

export type ProductionRevenueFact = ParsedFactBase & {
  source: "production_revenue";
  sourceLayer: "production_revenue";
  productionStatus: "CONFIRMED" | "NEGOTIATING" | "UNKNOWN" | string;
};

export type FloatFact = ParsedFactBase & {
  source: "float";
  sourceLayer: "float_raw" | "float_cache" | "float_visible" | "float_export";
  taskId?: string;
  personId?: string;
  tentative?: boolean;
  activeState?: "active" | "inactive" | "archived" | "unknown";
  expansionRule?: string;
  allocationClass?: "allocated" | "unallocated" | "orphan" | "placeholder" | "pencil";
};

export type ReadOnlySqlFact = ParsedFactBase & {
  source: "read_only_sql";
  sourceLayer: "read_only_sql";
  queryName: string;
};

export type SyncLogFact = ParsedFactBase & {
  source: "sync_log";
  sourceLayer: "sync_log";
  syncStatus: SourceBatch["status"];
};

export type CanonFact =
  | SoldFact
  | PipelineFact
  | ProductionRevenueFact
  | FloatFact
  | ReadOnlySqlFact
  | SyncLogFact;

export type SourceFactSet = {
  soldFacts: SoldFact[];
  pipelineFacts: PipelineFact[];
  productionRevenueFacts: ProductionRevenueFact[];
  floatFacts: FloatFact[];
  readOnlySqlFacts: ReadOnlySqlFact[];
  syncLogFacts: SyncLogFact[];
  sourceIssues: SourceWarning[];
  capabilities: SourceCapabilitiesForSource[];
};
