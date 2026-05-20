import type {
  ChatStreamEvent,
  ChatToolName,
  ChatToolRun,
  EvidenceCheck,
  EvidenceFact,
  EvidencePack,
  NeedsCodexDecision,
  NeedsCodexTrigger,
  UnresolvedCheck
} from "./types";
import type { DashboardProjectRow, DashboardScope, SourceLayer, UnsupportedMetric } from "../index";

export type CreateEvidencePackInput = {
  readonly question: string;
  readonly scope: DashboardScope;
  readonly playbook: string;
  readonly toolsRun?: readonly PartialToolRun[];
  readonly sourceLayers?: readonly SourceLayer[];
  readonly contractRows?: readonly DashboardProjectRow[];
  readonly facts?: readonly EvidenceFact[];
  readonly checks?: readonly PartialEvidenceCheck[];
  readonly unsupported?: readonly UnsupportedMetric[];
  readonly unresolved?: readonly UnresolvedCheck[];
  readonly warnings?: readonly string[];
  readonly needsCodex?: NeedsCodexDecision;
};

export type PartialToolRun = Omit<ChatToolRun, "sourceLayers" | "warnings"> & {
  readonly sourceLayers?: readonly SourceLayer[];
  readonly warnings?: readonly string[];
};

export type PartialEvidenceCheck = Omit<EvidenceCheck, "sourceLayers" | "sourceRefs"> & {
  readonly sourceLayers?: readonly SourceLayer[];
  readonly sourceRefs?: EvidenceCheck["sourceRefs"];
};

export function createEvidencePack(input: CreateEvidencePackInput): EvidencePack {
  const warnings = [...(input.warnings ?? [])];
  const unresolved = [...(input.unresolved ?? [])];
  const checks = (input.checks ?? []).map(normaliseCheck);
  const sourceLayers = uniqueSourceLayers([
    ...(input.sourceLayers ?? []),
    ...checks.flatMap((check) => check.sourceLayers),
    ...(input.facts ?? []).map((fact) => fact.sourceLayer),
    ...(input.toolsRun ?? []).flatMap((tool) => tool.sourceLayers ?? [])
  ]);

  return {
    question: input.question,
    scope: { ...input.scope },
    playbook: input.playbook,
    toolsRun: (input.toolsRun ?? []).map(normaliseToolRun),
    sourceLayers,
    contractRows: [...(input.contractRows ?? [])],
    facts: [...(input.facts ?? [])],
    checks,
    unsupported: [...(input.unsupported ?? [])],
    unresolved,
    warnings,
    confidence: confidenceFor({
      checks,
      unresolved,
      warnings,
      ...(input.needsCodex !== undefined ? { needsCodex: input.needsCodex } : {})
    }),
    needsCodex: input.needsCodex ?? needsCodexForTriggers([])
  };
}

export function recordToolError(
  pack: EvidencePack,
  error: {
    readonly tool: ChatToolName;
    readonly label: string;
    readonly message: string;
    readonly sourceLayers?: readonly SourceLayer[];
  }
): EvidencePack {
  const warning = `${error.tool} failed: ${error.message}`;
  const toolRun: ChatToolRun = {
    tool: error.tool,
    label: error.label,
    status: "error",
    sourceLayers: [...(error.sourceLayers ?? [])],
    warnings: [warning],
    error: error.message
  };
  const unresolved: UnresolvedCheck = {
    code: "TOOL_ERROR",
    label: error.label,
    reason: error.message,
    requiredTool: error.tool,
    sourceLayers: [...(error.sourceLayers ?? [])]
  };
  const needsCodex = mergeNeedsCodex(pack.needsCodex, needsCodexForTriggers(["incomplete_evidence"]));

  return {
    ...pack,
    toolsRun: [...pack.toolsRun, toolRun],
    unresolved: [...pack.unresolved, unresolved],
    warnings: [...pack.warnings, warning],
    confidence: "low",
    needsCodex
  };
}

export function needsCodexForTriggers(triggers: readonly NeedsCodexTrigger[]): NeedsCodexDecision {
  const uniqueTriggers = [...new Set(triggers)];

  if (uniqueTriggers.length === 0) {
    return {
      needed: false,
      reason: "Chat has enough read-only evidence for this answer.",
      triggers: []
    };
  }

  return {
    needed: true,
    reason: "This request is outside chat's read-only evidence boundary or needs evidence chat cannot gather.",
    triggers: uniqueTriggers,
    suggestedCodexTask: "Use Codex to inspect code, browser, source systems, deployment, or stakeholder action safely."
  };
}

export function evidenceEventFromPack(pack: EvidencePack): ChatStreamEvent {
  return {
    type: "evidence",
    sourcesChecked: pack.sourceLayers,
    confidence: pack.confidence,
    warnings: pack.warnings
  };
}

function normaliseToolRun(tool: PartialToolRun): ChatToolRun {
  return {
    ...tool,
    sourceLayers: [...(tool.sourceLayers ?? [])],
    warnings: [...(tool.warnings ?? [])]
  };
}

function normaliseCheck(check: PartialEvidenceCheck): EvidenceCheck {
  return {
    ...check,
    sourceLayers: [...(check.sourceLayers ?? [])],
    sourceRefs: [...(check.sourceRefs ?? [])]
  };
}

function confidenceFor(input: {
  readonly checks: readonly EvidenceCheck[];
  readonly unresolved: readonly UnresolvedCheck[];
  readonly warnings: readonly string[];
  readonly needsCodex?: NeedsCodexDecision;
}): "high" | "medium" | "low" {
  if (input.unresolved.length > 0 || input.needsCodex?.needed === true) {
    return "low";
  }

  if (input.warnings.length > 0 || input.checks.some((check) => check.status !== "pass")) {
    return "medium";
  }

  return "high";
}

function mergeNeedsCodex(left: NeedsCodexDecision, right: NeedsCodexDecision): NeedsCodexDecision {
  return needsCodexForTriggers([...left.triggers, ...right.triggers]);
}

function uniqueSourceLayers(sourceLayers: readonly SourceLayer[]): SourceLayer[] {
  return [...new Set(sourceLayers)];
}
