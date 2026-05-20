import type {
  DashboardScope,
  SourceCapabilitiesForSource,
  SourceCapability,
  SourceCapabilityKey,
  SourceName,
  UnsupportedMetric
} from "../canon/types";
import type { ParserCapabilitySummary, ParserResult } from "../parsers/types";
import { createUnsupportedScopeMetrics } from "./scope";

export type SourceCapabilityIndex = ReadonlyMap<SourceName, readonly SourceCapability[]>;

export type UnsupportedMetricsForSourceScopeInput = {
  readonly capabilityIndex: SourceCapabilityIndex;
  readonly source: SourceName;
  readonly scope: DashboardScope;
};

export function sourceCapabilityProfilesFromParserResults(
  parserResults: readonly ParserResult[]
): SourceCapabilitiesForSource[] {
  const summaries: ParserCapabilitySummary[] = [];

  for (const parserResult of parserResults) {
    for (const summary of parserResult.capabilities) {
      summaries.push(summary);
    }
  }

  return sourceCapabilityProfiles(summaries);
}

export function sourceCapabilityProfiles(
  summaries: readonly ParserCapabilitySummary[]
): SourceCapabilitiesForSource[] {
  const bySource = new Map<SourceName, SourceCapability[]>();

  for (const summary of summaries) {
    const capabilities = bySource.get(summary.source) ?? [];

    for (const capability of summary.capabilities) {
      upsertCapability(capabilities, capability);
    }

    bySource.set(summary.source, capabilities);
  }

  return [...bySource.entries()].map(([source, capabilities]) => ({
    source,
    capabilities: capabilities.map((capability) => ({ ...capability }))
  }));
}

export function buildSourceCapabilityIndexFromParserResults(
  parserResults: readonly ParserResult[]
): SourceCapabilityIndex {
  return buildSourceCapabilityIndex(sourceCapabilityProfilesFromParserResults(parserResults));
}

export function buildSourceCapabilityIndex(
  profiles: readonly SourceCapabilitiesForSource[]
): SourceCapabilityIndex {
  const bySource = new Map<SourceName, SourceCapability[]>();

  for (const profile of profiles) {
    const capabilities = bySource.get(profile.source) ?? [];

    for (const capability of profile.capabilities) {
      upsertCapability(capabilities, capability);
    }

    bySource.set(profile.source, capabilities);
  }

  return bySource;
}

export function capabilitiesForSource(
  capabilityIndex: SourceCapabilityIndex,
  source: SourceName
): SourceCapability[] {
  return (capabilityIndex.get(source) ?? []).map((capability) => ({ ...capability }));
}

export function capabilityForSource(
  capabilityIndex: SourceCapabilityIndex,
  source: SourceName,
  key: SourceCapabilityKey
): SourceCapability | undefined {
  const capability = capabilityIndex.get(source)?.find((candidate) => candidate.key === key);
  return capability === undefined ? undefined : { ...capability };
}

export function sourceSupportsCapability(
  capabilityIndex: SourceCapabilityIndex,
  source: SourceName,
  key: SourceCapabilityKey
): boolean {
  const capability = capabilityForSource(capabilityIndex, source, key);
  return capability !== undefined && capability.status !== "unsupported";
}

export function unsupportedMetricsForSourceScope(
  input: UnsupportedMetricsForSourceScopeInput
): UnsupportedMetric[] {
  return createUnsupportedScopeMetrics({
    source: input.source,
    scope: input.scope,
    capabilities: capabilitiesForSource(input.capabilityIndex, input.source)
  });
}

function upsertCapability(
  capabilities: SourceCapability[],
  capability: SourceCapability
): void {
  const existingIndex = capabilities.findIndex((candidate) => candidate.key === capability.key);
  const copy = { ...capability };

  if (existingIndex === -1) {
    capabilities.push(copy);
    return;
  }

  capabilities[existingIndex] = copy;
}
