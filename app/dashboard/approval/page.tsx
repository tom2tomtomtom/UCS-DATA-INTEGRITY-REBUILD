import { ApprovalDashboard } from "../../../src/components/dashboard/approval/approval-dashboard";
import { DashboardChrome } from "../../../src/components/dashboard/chrome/dashboard-chrome";
import { getFixtureDashboardContract } from "../../../src/lib/ui/fixture-contract";

export default function ApprovalPage() {
  const contract = getFixtureDashboardContract();

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/approval">
      <ApprovalDashboard contract={contract} />
    </DashboardChrome>
  );
}
