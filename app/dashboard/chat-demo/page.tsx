import { ChatShell } from "../../../src/components/dashboard/chat/chat-shell";
import type { ChatShellState } from "../../../src/components/dashboard/chat/chat-shell";
import { DashboardChrome } from "../../../src/components/dashboard/chrome/dashboard-chrome";
import { generateEvidenceReport, runInvestigation } from "../../../src/lib/chat";
import { getFixtureDashboardContract } from "../../../src/lib/ui/fixture-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../../src/lib/ui/scope-params";

export default async function ChatDemoPage({
  searchParams
}: {
  searchParams?: Promise<UiSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const contract = getFixtureDashboardContract(scopeFromSearchParams(params));
  const question = scalarParam(params.question);
  const pastedFloatExport = scalarParam(params.floatExport);
  const pack =
    question === undefined
      ? undefined
      : runInvestigation({
          question,
          scope: contract.scope,
          ...(contract.scope.jobNumber !== undefined ? { jobNumber: contract.scope.jobNumber } : {}),
          ...(contract.scope.floatProjectId !== undefined ? { floatProjectId: contract.scope.floatProjectId } : {}),
          ...(pastedFloatExport !== undefined ? { pastedFloatExport } : {})
        });
  const report = pack === undefined ? undefined : generateEvidenceReport(pack);
  const state = pack === undefined ? chatStateFromParam(params.state) : report?.guard.status === "blocked" ? "error" : "evidence";
  const evidence =
    pack !== undefined
      ? {
          sourcesChecked: uniqueStrings(pack.sourceLayers),
          confidence: pack.confidence,
          warnings: pack.warnings,
          unresolved: pack.unresolved.map((item) => item.code)
        }
      : state === "closed" || state === "idle"
      ? undefined
      : {
          sourcesChecked: ["display contract", "visible rows", "Float reconciliation"],
          confidence: "medium" as const,
          warnings: ["Full investigation tools arrive in Phase 7."],
          ...(state === "evidence" ? { unresolved: ["LIVE_FLOAT_API_NOT_CHECKED"] } : {})
        };

  return (
    <DashboardChrome contract={contract} activePath="/dashboard">
      <ChatShell
        scope={contract.scope}
        state={state}
        {...(question !== undefined ? { question } : {})}
        {...(report !== undefined ? { answer: report.text } : {})}
        {...(evidence !== undefined ? { evidence } : {})}
        needsCodexReasons={
          pack?.needsCodex.needed === true
            ? [pack.needsCodex.reason, ...pack.needsCodex.triggers]
            : ["repo inspection", "browser testing", "sync", "deployment", "stakeholder communication"]
        }
      />
    </DashboardChrome>
  );
}

function scalarParam(value: UiSearchParams[string]): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === undefined || candidate.trim() === "" ? undefined : candidate;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function chatStateFromParam(value: UiSearchParams[string]): ChatShellState {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    candidate === "closed" ||
    candidate === "idle" ||
    candidate === "working" ||
    candidate === "evidence" ||
    candidate === "error"
  ) {
    return candidate;
  }

  return "working";
}
