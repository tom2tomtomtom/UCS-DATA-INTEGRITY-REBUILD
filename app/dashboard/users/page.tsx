import { ReadOnlyRouteSurface } from "../../../src/components/dashboard/admin/readonly-route";
import { DashboardChrome } from "../../../src/components/dashboard/chrome/dashboard-chrome";
import { getFixtureDashboardContract } from "../../../src/lib/ui/fixture-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../../src/lib/ui/scope-params";

export default async function UsersPage({
  searchParams
}: {
  searchParams?: Promise<UiSearchParams>;
}) {
  const contract = getFixtureDashboardContract(scopeFromSearchParams((await searchParams) ?? {}));

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/users">
      <ReadOnlyRouteSurface
        title="Users"
        status="Read-only access surface. Invites and role edits stay unavailable until stakeholder approval."
        evidenceItems={[
          {
            label: "User list",
            detail: "Preserves the route slot for email, role, and access display."
          },
          {
            label: "Invite workflow",
            detail: "Invite controls are intentionally unavailable while production cutover is blocked."
          },
          {
            label: "Role management",
            detail: "Role mutations must respect the same mutation boundary as sync and archive actions."
          }
        ]}
      />
    </DashboardChrome>
  );
}
