import { ChatShell } from "../../../src/components/dashboard/chat/chat-shell";
import type { ChatShellState } from "../../../src/components/dashboard/chat/chat-shell";
import { DashboardChrome } from "../../../src/components/dashboard/chrome/dashboard-chrome";
import { getFixtureDashboardContract } from "../../../src/lib/ui/fixture-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../../src/lib/ui/scope-params";

export default async function ChatDemoPage({
  searchParams
}: {
  searchParams?: Promise<UiSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const contract = getFixtureDashboardContract(scopeFromSearchParams(params));
  const state = chatStateFromParam(params.state);
  const evidence =
    state === "closed" || state === "idle"
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
        {...(evidence !== undefined ? { evidence } : {})}
        needsCodexReasons={["repo inspection", "browser testing", "sync", "deployment", "stakeholder communication"]}
      />
    </DashboardChrome>
  );
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
