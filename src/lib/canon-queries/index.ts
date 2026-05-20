import type { CanonFact } from "../canon/types";
import { filterFactsByScope, createUnsupportedScopeMetrics } from "./scope";
import type { CanonQueryInput, CanonQueryResult } from "./types";

export function createCanonQueryResult<TFact extends CanonFact>(
  input: CanonQueryInput<TFact>
): CanonQueryResult<TFact> {
  return {
    source: input.source,
    scope: { ...input.scope },
    facts: filterFactsByScope(input.facts, input.scope, input.capabilities),
    capabilities: input.capabilities.map((capability) => ({ ...capability })),
    unsupportedMetrics: createUnsupportedScopeMetrics({
      source: input.source,
      scope: input.scope,
      capabilities: input.capabilities
    }),
    warnings: (input.warnings ?? []).map((warning) => ({ ...warning }))
  };
}

export {
  buildSourceCapabilityIndex,
  buildSourceCapabilityIndexFromParserResults,
  capabilitiesForSource,
  capabilityForSource,
  sourceCapabilityProfiles,
  sourceCapabilityProfilesFromParserResults,
  sourceSupportsCapability,
  unsupportedMetricsForSourceScope
} from "./capabilities";

export {
  FLOAT_SOURCE_CAPABILITIES,
  selectFloatFacts
} from "./float";

export {
  selectPipelineFacts
} from "./pipeline";

export {
  selectProductionRevenueFacts
} from "./production-revenue";

export {
  SOLD_SOURCE_CAPABILITIES,
  selectSoldFacts
} from "./sold";

export {
  buildSourceFactSetFromParserResults
} from "./source-fact-set";

export {
  capabilityFor,
  createUnsupportedScopeMetrics,
  factMatchesScope,
  filterFactsByScope,
  queryResultSource,
  sourceSupportsScopedField
} from "./scope";

export type {
  CanonQueryInput,
  CanonQueryResult,
  ScopedCapabilityKey,
  UnsupportedScopeMetricInput
} from "./types";

export type {
  SelectFloatFactsInput
} from "./float";

export type {
  SelectPipelineFactsInput
} from "./pipeline";

export type {
  SelectProductionRevenueFactsInput
} from "./production-revenue";

export type {
  SelectSoldFactsInput
} from "./sold";

export type {
  BuildSourceFactSetOptions
} from "./source-fact-set";

export type {
  SourceCapabilityIndex,
  UnsupportedMetricsForSourceScopeInput
} from "./capabilities";
