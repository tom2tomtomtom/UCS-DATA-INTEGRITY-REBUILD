import { ChatShell } from "../../../src/components/dashboard/chat/chat-shell";
import { DashboardChrome } from "../../../src/components/dashboard/chrome/dashboard-chrome";
import { getFixtureDashboardContract } from "../../../src/lib/ui/fixture-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../../src/lib/ui/scope-params";

export default async function ChatDemoPage({
  searchParams
}: {
  searchParams?: Promise<UiSearchParams>;
}) {
  const contract = getFixtureDashboardContract(scopeFromSearchParams((await searchParams) ?? {}));

  return (
    <DashboardChrome contract={contract} activePath="/dashboard">
      <ChatShell
        scope={contract.scope}
        state="working"
        evidence={{
          sourcesChecked: ["display contract", "visible rows", "Float reconciliation"],
          confidence: "medium",
          warnings: ["Full investigation tools arrive in Phase 7."]
        }}
        needsCodexReasons={["repo inspection", "browser testing", "sync", "deployment", "stakeholder communication"]}
      />
    </DashboardChrome>
  );
}
