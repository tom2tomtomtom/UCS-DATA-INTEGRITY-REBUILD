import { DashboardChrome } from "../../../src/components/dashboard/chrome/dashboard-chrome";
import { FloatDiagnostics } from "../../../src/components/dashboard/float/float-diagnostics";
import { getFixtureDashboardContract } from "../../../src/lib/ui/fixture-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../../src/lib/ui/scope-params";

export default async function FloatPage({
  searchParams
}: {
  searchParams?: Promise<UiSearchParams>;
}) {
  const contract = getFixtureDashboardContract(scopeFromSearchParams((await searchParams) ?? {}));

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/float">
      <FloatDiagnostics contract={contract} />
    </DashboardChrome>
  );
}
