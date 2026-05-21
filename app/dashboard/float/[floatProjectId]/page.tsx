import { DashboardChrome } from "../../../../src/components/dashboard/chrome/dashboard-chrome";
import { FloatDiagnostics } from "../../../../src/components/dashboard/float/float-diagnostics";
import { getDashboardContract } from "../../../../src/lib/runtime/dashboard-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../../../src/lib/ui/scope-params";

export default async function FloatTracePage({
  params,
  searchParams
}: {
  params: Promise<{ floatProjectId: string }>;
  searchParams?: Promise<UiSearchParams>;
}) {
  const { floatProjectId } = await params;
  const query = (await searchParams) ?? {};
  const scope = scopeFromSearchParams(query, { floatProjectId });
  const contract = await getDashboardContract(scope);

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/float">
      <FloatDiagnostics contract={contract} pastedFloatExport={scalarParam(query.floatExport)} />
    </DashboardChrome>
  );
}

function scalarParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
