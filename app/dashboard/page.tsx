import { DashboardChrome } from "../../src/components/dashboard/chrome/dashboard-chrome";
import { DashboardHome } from "../../src/components/dashboard/rollups/dashboard-home";
import { getFixtureDashboardContract } from "../../src/lib/ui/fixture-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../src/lib/ui/scope-params";

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<UiSearchParams>;
}) {
  const contract = getFixtureDashboardContract(scopeFromSearchParams((await searchParams) ?? {}));

  return (
    <DashboardChrome contract={contract} activePath="/dashboard">
      <DashboardHome contract={contract} />
    </DashboardChrome>
  );
}
