import type {
  SourceTraceRef,
  SourceWarning,
  WarningLifecycleState
} from "./types";

export type WarningLifecycleTransitionInput = {
  readonly warning: SourceWarning;
  readonly nextState: WarningLifecycleState;
  readonly observedAt: string;
  readonly evidenceSourceRefs?: readonly SourceTraceRef[];
  readonly resolutionEvidence?: string;
};

const resolvedStates = new Set<WarningLifecycleState>([
  "resolved_by_source",
  "resolved_by_code"
]);

const evidenceRequiredStates = new Set<WarningLifecycleState>([
  "resolved_by_source",
  "resolved_by_code",
  "wont_fix_source_limitation",
  "superseded"
]);

export function transitionWarningLifecycle(
  input: WarningLifecycleTransitionInput
): SourceWarning {
  const resolutionEvidence = normalizedEvidence(input.resolutionEvidence);

  if (
    evidenceRequiredStates.has(input.nextState) &&
    resolutionEvidence === undefined
  ) {
    throw new Error(`${input.nextState} requires resolution evidence.`);
  }

  const sourceRefs = mergeSourceRefs(
    input.warning.sourceRefs,
    input.evidenceSourceRefs ?? []
  );

  if (sourceRefs.length === 0) {
    throw new Error("Warning lifecycle transitions require source refs.");
  }

  return {
    ...input.warning,
    lifecycleState: input.nextState,
    sourceRefs,
    firstSeenAt: input.warning.firstSeenAt,
    lastSeenAt: input.observedAt,
    ...(resolutionEvidence === undefined
      ? {}
      : { resolutionEvidence })
  };
}

export function warningRemainsVisible(warning: SourceWarning): boolean {
  return warning.lifecycleState !== "resolved_by_source" &&
    warning.lifecycleState !== "resolved_by_code";
}

export function warningBlocksApproval(
  warning: SourceWarning,
  currentWarningIds: ReadonlySet<string>
): boolean {
  if (resolvedStates.has(warning.lifecycleState)) {
    return currentWarningIds.has(warning.id);
  }

  return warning.lifecycleState !== "superseded";
}

export function warningLifecycleDisplayLabel(warning: SourceWarning): string {
  if (warning.lifecycleState === "acknowledged") {
    return "ACKNOWLEDGED";
  }

  return warning.status;
}

function normalizedEvidence(evidence: string | undefined): string | undefined {
  if (evidence === undefined) {
    return undefined;
  }

  const trimmedEvidence = evidence.trim();
  return trimmedEvidence === "" ? undefined : trimmedEvidence;
}

function mergeSourceRefs(
  existingRefs: readonly SourceTraceRef[],
  evidenceRefs: readonly SourceTraceRef[]
): SourceTraceRef[] {
  const refsByKey = new Map<string, SourceTraceRef>();

  for (const sourceRef of [...existingRefs, ...evidenceRefs]) {
    refsByKey.set(sourceRefKey(sourceRef), { ...sourceRef });
  }

  return [...refsByKey.values()];
}

function sourceRefKey(sourceRef: SourceTraceRef): string {
  return [
    sourceRef.source,
    sourceRef.sourceLayer,
    sourceRef.batchId ?? "",
    sourceRef.rawRowId ?? "",
    sourceRef.sourceDocumentId ?? "",
    sourceRef.sourceTab ?? "",
    sourceRef.sourceRowNumber ?? "",
    sourceRef.sourceObjectId ?? "",
    sourceRef.field ?? ""
  ].join("|");
}
