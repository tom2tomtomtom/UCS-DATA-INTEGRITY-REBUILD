import { createEvidencePack, needsCodexForTriggers, recordToolError } from "./evidence";
import { routePlaybook } from "./playbooks";
import { executeReadOnlyTool } from "./tactical-tools";
import type { ChatToolName, EvidencePack } from "./types";
import type { DashboardScope } from "../index";

export type RunInvestigationInput = {
  readonly question: string;
  readonly scope: DashboardScope;
  readonly jobNumber?: string;
  readonly floatProjectId?: string;
  readonly pastedFloatExport?: string;
  readonly simulateToolErrors?: Partial<Record<ChatToolName, string>>;
};

export function runInvestigation(input: RunInvestigationInput): EvidencePack {
  const playbook = routePlaybook(input.question);

  if (playbook.id === "needs_codex_handoff") {
    return createEvidencePack({
      question: input.question,
      scope: input.scope,
      playbook: playbook.id,
      needsCodex: needsCodexForTriggers(playbook.needsCodexTriggers),
      warnings: ["Chat cannot complete this request inside its read-only evidence boundary."]
    });
  }

  let pack = createEvidencePack({
    question: input.question,
    scope: input.scope,
    playbook: playbook.id
  });

  for (const tool of playbook.requiredTools) {
    const simulatedError = input.simulateToolErrors?.[tool];

    if (simulatedError !== undefined) {
      pack = recordToolError(pack, {
        tool,
        label: `Run ${tool}`,
        message: simulatedError
      });
      continue;
    }

    const result = executeReadOnlyTool({
      tool,
      scope: input.scope,
      ...(input.jobNumber !== undefined ? { jobNumber: input.jobNumber } : {}),
      ...(input.floatProjectId !== undefined ? { floatProjectId: input.floatProjectId } : {}),
      ...(input.pastedFloatExport !== undefined ? { pastedFloatExport: input.pastedFloatExport } : {})
    });

    pack = createEvidencePack({
      question: pack.question,
      scope: pack.scope,
      playbook: pack.playbook,
      toolsRun: [
        ...pack.toolsRun,
        {
          tool: result.tool,
          label: result.label,
          status: result.status,
          sourceLayers: result.sourceLayers,
          warnings: result.warnings
        }
      ],
      sourceLayers: [...pack.sourceLayers, ...result.sourceLayers],
      contractRows: [...pack.contractRows, ...result.contractRows],
      facts: [...pack.facts, ...result.facts],
      checks: [...pack.checks, ...result.checks],
      unsupported: [...pack.unsupported, ...result.unsupported],
      unresolved: [...pack.unresolved, ...result.unresolved],
      warnings: [...pack.warnings, ...result.warnings],
      needsCodex:
        result.unresolved.length > 0
          ? needsCodexForTriggers([...pack.needsCodex.triggers, "incomplete_evidence"])
          : pack.needsCodex
    });
  }

  return pack;
}
