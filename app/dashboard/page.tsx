import { DashboardChrome } from "../../src/components/dashboard/chrome/dashboard-chrome";
import { getFixtureDashboardContract } from "../../src/lib/ui/fixture-contract";

export default function DashboardPage() {
  const contract = getFixtureDashboardContract({
    office: "LDN",
    from: "2026-01-01",
    to: "2026-03-31"
  });

  return (
    <DashboardChrome contract={contract} activePath="/dashboard">
      <section className="placeholder-panel">
        <h2>Department Rollup</h2>
        <p>
          Phase 6 shell is wired to a deterministic display contract fixture. Rollup rows come next under
          P6-B.
        </p>
      </section>
    </DashboardChrome>
  );
}
