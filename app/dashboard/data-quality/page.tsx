import { DashboardChrome } from "../../../src/components/dashboard/chrome/dashboard-chrome";
import { DataQualityDashboard } from "../../../src/components/dashboard/data-quality/data-quality-dashboard";
import { getFixtureDashboardContract } from "../../../src/lib/ui/fixture-contract";

export default function DataQualityPage() {
  const contract = getFixtureDashboardContract();

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/data-quality">
      <DataQualityDashboard contract={contract} />
    </DashboardChrome>
  );
}
