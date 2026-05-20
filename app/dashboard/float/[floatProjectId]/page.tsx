import { DashboardChrome } from "../../../../src/components/dashboard/chrome/dashboard-chrome";
import { FloatDiagnostics } from "../../../../src/components/dashboard/float/float-diagnostics";
import type { DashboardScope } from "../../../../src/lib";
import { getFixtureDashboardContract } from "../../../../src/lib/ui/fixture-contract";

export default async function FloatTracePage({
  params
}: {
  params: Promise<{ floatProjectId: string }>;
}) {
  const { floatProjectId } = await params;
  const scope: DashboardScope = {
    office: "LDN",
    from: "2026-01-01",
    to: "2026-03-31",
    floatProjectId
  };
  const contract = getFixtureDashboardContract(scope);

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/float">
      <FloatDiagnostics contract={contract} />
    </DashboardChrome>
  );
}
