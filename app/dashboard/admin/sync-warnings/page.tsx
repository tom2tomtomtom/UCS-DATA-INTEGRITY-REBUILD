import { ReadOnlyRouteSurface } from "../../../../src/components/dashboard/admin/readonly-route";
import { DashboardChrome } from "../../../../src/components/dashboard/chrome/dashboard-chrome";
import { getFixtureDashboardContract } from "../../../../src/lib/ui/fixture-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../../../src/lib/ui/scope-params";

export default async function SyncWarningsPage({
  searchParams
}: {
  searchParams?: Promise<UiSearchParams>;
}) {
  const contract = getFixtureDashboardContract(scopeFromSearchParams((await searchParams) ?? {}));

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/admin/sync-warnings">
      <ReadOnlyRouteSurface
        title="Sync Warnings"
        status="Read-only warning review. Dismiss, resync, and archive actions are unavailable in staging."
        evidenceItems={[
          {
            label: "Warning table",
            detail: "Preserves source, project, severity, message, and trace-link slots."
          },
          {
            label: "Filters",
            detail: "Source and severity filters must be backed by warning evidence, not free-text guessing."
          },
          {
            label: "Mutation boundary",
            detail: "Warning dismissal is a future workflow and cannot run while MUTATION_GUARD is read_only."
          }
        ]}
      />
    </DashboardChrome>
  );
}
