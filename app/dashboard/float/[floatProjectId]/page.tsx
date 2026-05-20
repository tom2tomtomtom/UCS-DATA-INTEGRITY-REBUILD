import { DashboardChrome } from "../../../../src/components/dashboard/chrome/dashboard-chrome";
import { FloatDiagnostics } from "../../../../src/components/dashboard/float/float-diagnostics";
import { getFixtureDashboardContract } from "../../../../src/lib/ui/fixture-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../../../src/lib/ui/scope-params";

export default async function FloatTracePage({
  params,
  searchParams
}: {
  params: Promise<{ floatProjectId: string }>;
  searchParams?: Promise<UiSearchParams>;
}) {
  const { floatProjectId } = await params;
  const scope = scopeFromSearchParams((await searchParams) ?? {}, { floatProjectId });
  const contract = getFixtureDashboardContract(scope);

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/float">
      <FloatDiagnostics contract={contract} />
    </DashboardChrome>
  );
}
