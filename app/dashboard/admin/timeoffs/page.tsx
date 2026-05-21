import { ReadOnlyRouteSurface } from "../../../../src/components/dashboard/admin/readonly-route";
import { DashboardChrome } from "../../../../src/components/dashboard/chrome/dashboard-chrome";
import { getFixtureDashboardContract } from "../../../../src/lib/ui/fixture-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../../../src/lib/ui/scope-params";

export default async function CapacityReducedPage({
  searchParams
}: {
  searchParams?: Promise<UiSearchParams>;
}) {
  const contract = getFixtureDashboardContract(scopeFromSearchParams((await searchParams) ?? {}));

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/admin/timeoffs">
      <ReadOnlyRouteSurface
        title="Capacity Reduced"
        status="Read-only capacity evidence. Time-off rows stay separate from booked project hours."
        evidenceItems={[
          {
            label: "Person and date evidence",
            detail: "Capacity rows must retain person, date, hours, and source identity."
          },
          {
            label: "Latest batch awareness",
            detail: "Historic time-off rows cannot inflate current capacity or project allocation."
          },
          {
            label: "Source separation",
            detail: "Capacity reduction is not a Float project booking and must not alter project totals."
          }
        ]}
      />
    </DashboardChrome>
  );
}
