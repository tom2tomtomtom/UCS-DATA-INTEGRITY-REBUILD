import type {
  DashboardScope,
  FloatFact,
  SourceCapability,
  SourceTraceRef,
  SourceWarning
} from "../canon/types";
import { createUnsupportedScopeMetrics, filterFactsByScope } from "./scope";
import type { CanonQueryResult } from "./types";

const FLOAT_SOURCE = "float" as const;
const FLOAT_CACHE_LAYER = "float_cache" as const;
const WARNING_SEEN_AT = "1970-01-01T00:00:00.000Z";

export const FLOAT_SOURCE_CAPABILITIES = [
  { key: "project", status: "supported", reason: "Float project ID is preserved." },
  { key: "month", status: "supported", reason: "Fixture rows carry the expansion month." },
  { key: "office", status: "partial", reason: "Float rows do not always carry office." },
  { key: "client", status: "partial", reason: "Float project names may imply client but do not prove it." },
  { key: "department", status: "partial", reason: "Department is preserved when Float provides it." },
  { key: "role", status: "partial", reason: "Role is preserved when Float provides it." },
  { key: "person", status: "supported", reason: "Float task person IDs and names are preserved." }
] as const satisfies readonly SourceCapability[];

export type SelectFloatFactsInput = {
  readonly scope: DashboardScope;
  readonly facts: readonly FloatFact[];
  readonly capabilities?: readonly SourceCapability[];
  readonly warnings?: readonly SourceWarning[];
};

type RawCacheRegression = {
  readonly id: "BT_RAW_CACHE" | "PCS00250";
  readonly code: "BT_RAW_CACHE_UNRESOLVED" | "PCS00250_RAW_CACHE_UNRESOLVED";
  readonly label: string;
};

const RAW_CACHE_REGRESSIONS = [
  {
    id: "BT_RAW_CACHE",
    code: "BT_RAW_CACHE_UNRESOLVED",
    label: "BT Float raw rows without allocation cache rows"
  },
  {
    id: "PCS00250",
    code: "PCS00250_RAW_CACHE_UNRESOLVED",
    label: "PCS00250 cache/raw Float evidence"
  }
] as const satisfies readonly RawCacheRegression[];

export function selectFloatFacts(input: SelectFloatFactsInput): CanonQueryResult<FloatFact> {
  const capabilities = input.capabilities ?? FLOAT_SOURCE_CAPABILITIES;
  const scopedFacts = filterFactsByScope(input.facts, input.scope, capabilities);
  const warnings = [
    ...(input.warnings ?? []),
    ...createRawCacheUnresolvedWarnings(input.scope, scopedFacts)
  ];

  return {
    source: FLOAT_SOURCE,
    scope: { ...input.scope },
    facts: scopedFacts,
    capabilities: capabilities.map((capability) => ({ ...capability })),
    unsupportedMetrics: createUnsupportedScopeMetrics({
      source: FLOAT_SOURCE,
      scope: input.scope,
      capabilities
    }),
    warnings: warnings.map((warning) => ({ ...warning }))
  };
}

function createRawCacheUnresolvedWarnings(
  scope: DashboardScope,
  facts: readonly FloatFact[]
): SourceWarning[] {
  const rawFacts = facts.filter((fact) => fact.sourceLayer === "float_raw");
  const hasCacheFacts = facts.some((fact) => fact.sourceLayer === FLOAT_CACHE_LAYER);

  if (rawFacts.length === 0 || hasCacheFacts) {
    return [];
  }

  const sourceRefs = rawFacts.flatMap((fact) => fact.trace).map(copySourceRef);

  return RAW_CACHE_REGRESSIONS.map((regression) => ({
    id: `${FLOAT_SOURCE}:${regression.id}:raw-cache-unresolved`,
    status: "PROCESS_WARN",
    lifecycleState: "open",
    source: FLOAT_SOURCE,
    sourceLayer: FLOAT_CACHE_LAYER,
    code: regression.code,
    message: `${regression.label} remains unresolved because scoped Float cache facts are absent.`,
    scope: { ...scope },
    owner: "Codex",
    sourceRefs,
    firstSeenAt: WARNING_SEEN_AT,
    lastSeenAt: WARNING_SEEN_AT
  }));
}

function copySourceRef(sourceRef: SourceTraceRef): SourceTraceRef {
  return { ...sourceRef };
}
