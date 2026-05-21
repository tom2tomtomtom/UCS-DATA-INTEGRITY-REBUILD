import { DashboardChrome } from "../../src/components/dashboard/chrome/dashboard-chrome";
import { DashboardHome } from "../../src/components/dashboard/rollups/dashboard-home";
import type { RollupDimension } from "../../src/lib";
import { getFixtureDashboardContract } from "../../src/lib/ui/fixture-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../src/lib/ui/scope-params";

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<UiSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const contract = getFixtureDashboardContract(scopeFromSearchParams(params));
  const view = rollupViewFromSearchParams(params);

  return (
    <DashboardChrome contract={contract} activePath="/dashboard" extraScopeParams={{ view }}>
      <DashboardHome contract={contract} view={view} />
    </DashboardChrome>
  );
}

function rollupViewFromSearchParams(params: UiSearchParams): RollupDimension {
  const raw = Array.isArray(params.view) ? params.view[0] : params.view;

  if (raw === "month" || raw === "role" || raw === "client") {
    return raw;
  }

  return "department";
}
