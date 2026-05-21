import { ReadOnlyRouteSurface } from "../../../src/components/dashboard/admin/readonly-route";
import { DashboardChrome } from "../../../src/components/dashboard/chrome/dashboard-chrome";
import { getFixtureDashboardContract } from "../../../src/lib/ui/fixture-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../../src/lib/ui/scope-params";

export default async function SyncAuditPage({
  searchParams
}: {
  searchParams?: Promise<UiSearchParams>;
}) {
  const contract = getFixtureDashboardContract(scopeFromSearchParams((await searchParams) ?? {}));

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/audit">
      <ReadOnlyRouteSurface
        title="Sync Audit"
        status="Read-only sync evidence. Live sync actions stay unavailable until mutation guard changes."
        evidenceItems={[
          {
            label: "Sync run list",
            detail: "Preserved route slot for source snapshot and sync run evidence."
          },
          {
            label: "Issue details",
            detail: "Sync issue summaries must be generated from checks, not model-invented prose."
          },
          {
            label: "View details target",
            detail: "The global sync issue banner can link here without hiding the underlying warning evidence."
          }
        ]}
      />
    </DashboardChrome>
  );
}
