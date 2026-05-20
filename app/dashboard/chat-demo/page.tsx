import { ChatShell } from "../../../src/components/dashboard/chat/chat-shell";
import { DashboardChrome } from "../../../src/components/dashboard/chrome/dashboard-chrome";
import { getFixtureDashboardContract } from "../../../src/lib/ui/fixture-contract";

export default function ChatDemoPage() {
  const contract = getFixtureDashboardContract({
    office: "LDN",
    from: "2026-01-01",
    to: "2026-03-31",
    department: "Design"
  });

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
