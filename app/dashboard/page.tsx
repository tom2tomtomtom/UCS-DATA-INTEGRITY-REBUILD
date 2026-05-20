import { DashboardChrome } from "../../src/components/dashboard/chrome/dashboard-chrome";
import { DashboardHome } from "../../src/components/dashboard/rollups/dashboard-home";
import { getFixtureDashboardContract } from "../../src/lib/ui/fixture-contract";

export default function DashboardPage() {
  const contract = getFixtureDashboardContract({
    office: "LDN",
    from: "2026-01-01",
    to: "2026-03-31"
  });

  return (
    <DashboardChrome contract={contract} activePath="/dashboard">
      <DashboardHome contract={contract} />
    </DashboardChrome>
  );
}
