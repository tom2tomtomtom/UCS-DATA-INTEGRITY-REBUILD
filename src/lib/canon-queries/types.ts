import type {
  CanonFact,
  DashboardScope,
  SourceCapability,
  SourceCapabilityKey,
  SourceName,
  SourceWarning,
  UnsupportedMetric
} from "../canon/types";

export type CanonQueryInput<TFact extends CanonFact> = {
  readonly source: TFact["source"];
  readonly scope: DashboardScope;
  readonly facts: readonly TFact[];
  readonly capabilities: readonly SourceCapability[];
  readonly warnings?: readonly SourceWarning[];
};

export type CanonQueryResult<TFact extends CanonFact> = {
  readonly source: TFact["source"];
  readonly scope: DashboardScope;
  readonly facts: readonly TFact[];
  readonly capabilities: readonly SourceCapability[];
  readonly unsupportedMetrics: readonly UnsupportedMetric[];
  readonly warnings: readonly SourceWarning[];
};

export type UnsupportedScopeMetricInput = {
  readonly source: SourceName;
  readonly scope: DashboardScope;
  readonly capabilities: readonly SourceCapability[];
};

export type ScopedCapabilityKey = Extract<
  SourceCapabilityKey,
  "office" | "client" | "department" | "role" | "person"
>;
