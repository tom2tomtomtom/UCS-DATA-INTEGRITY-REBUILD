import { DashboardChrome } from "../../../src/components/dashboard/chrome/dashboard-chrome";
import { FloatDiagnostics } from "../../../src/components/dashboard/float/float-diagnostics";
import { getFixtureDashboardContract } from "../../../src/lib/ui/fixture-contract";

export default function FloatPage() {
  const contract = getFixtureDashboardContract({
    office: "LDN",
    from: "2026-01-01",
    to: "2026-03-31"
  });

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/float">
      <FloatDiagnostics contract={contract} />
    </DashboardChrome>
  );
}
