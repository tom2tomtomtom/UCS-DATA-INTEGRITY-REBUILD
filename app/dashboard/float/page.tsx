import { DashboardChrome } from "../../../src/components/dashboard/chrome/dashboard-chrome";
import { FloatDiagnostics } from "../../../src/components/dashboard/float/float-diagnostics";
import { getFixtureDashboardContract } from "../../../src/lib/ui/fixture-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../../src/lib/ui/scope-params";

export default async function FloatPage({
  searchParams
}: {
  searchParams?: Promise<UiSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const contract = getFixtureDashboardContract(scopeFromSearchParams(params));

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/float">
      <FloatDiagnostics contract={contract} pastedFloatExport={scalarParam(params.floatExport)} />
    </DashboardChrome>
  );
}

function scalarParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
