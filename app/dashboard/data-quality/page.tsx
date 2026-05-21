import { DashboardChrome } from "../../../src/components/dashboard/chrome/dashboard-chrome";
import { DataQualityDashboard } from "../../../src/components/dashboard/data-quality/data-quality-dashboard";
import { getDashboardContract } from "../../../src/lib/runtime/dashboard-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../../src/lib/ui/scope-params";

export default async function DataQualityPage({
  searchParams
}: {
  searchParams?: Promise<UiSearchParams>;
}) {
  const contract = await getDashboardContract(scopeFromSearchParams((await searchParams) ?? {}));

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/data-quality">
      <DataQualityDashboard contract={contract} />
    </DashboardChrome>
  );
}
