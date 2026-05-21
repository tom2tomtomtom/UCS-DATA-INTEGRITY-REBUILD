import { ApprovalDashboard } from "../../../src/components/dashboard/approval/approval-dashboard";
import { DashboardChrome } from "../../../src/components/dashboard/chrome/dashboard-chrome";
import { getDashboardContract } from "../../../src/lib/runtime/dashboard-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../../src/lib/ui/scope-params";

export default async function ApprovalPage({
  searchParams
}: {
  searchParams?: Promise<UiSearchParams>;
}) {
  const contract = await getDashboardContract(scopeFromSearchParams((await searchParams) ?? {}));

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/approval">
      <ApprovalDashboard contract={contract} />
    </DashboardChrome>
  );
}
