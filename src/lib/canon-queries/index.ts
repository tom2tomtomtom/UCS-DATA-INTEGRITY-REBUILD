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
