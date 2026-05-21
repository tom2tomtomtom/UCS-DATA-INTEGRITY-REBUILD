import { ReadOnlyRouteSurface } from "../../../src/components/dashboard/admin/readonly-route";
import { DashboardChrome } from "../../../src/components/dashboard/chrome/dashboard-chrome";
import type { ReconciliationCheck, SourceWarning } from "../../../src/lib";
import { scopedHref } from "../../../src/lib";
import { getDashboardContract } from "../../../src/lib/runtime/dashboard-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../../src/lib/ui/scope-params";

export default async function SyncAuditPage({
  searchParams
}: {
  searchParams?: Promise<UiSearchParams>;
}) {
  const scope = scopeFromSearchParams((await searchParams) ?? {});
  const contract = await getDashboardContract(scope);
  const warningCount = contract.warnings.length + contract.reconciliation.filter((check) => check.status !== "PASS").length;

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/audit">
      <ReadOnlyRouteSurface
        title="Sync Audit"
        status="Read-only sync evidence. Live sync actions stay unavailable until mutation guard changes."
        evidenceItems={[
          {
            label: "Latest display contract",
            detail: `Generated ${contract.generatedAt}. This is fixture/source evidence, not a live mutation sync.`,
            meta: [scope.office, scope.from, scope.to]
          },
          {
            label: `${warningCount} current contract issues`,
            detail: "Issue summary is generated from source warnings and reconciliation checks.",
            href: scopedHref("/dashboard/admin/sync-warnings", scope),
            meta: ["source warnings", "reconciliation checks"]
          },
          ...contract.warnings.map((warning) => warningEvidenceItem(warning)),
          ...contract.reconciliation.filter((check) => check.status !== "PASS").map((check) => checkEvidenceItem(check))
        ]}
      />
    </DashboardChrome>
  );
}

function warningEvidenceItem(warning: SourceWarning) {
  return {
    label: `${warning.status}: ${warning.code}`,
    detail: warning.message,
    href: scopedHref("/dashboard/data-quality", warning.scope),
    meta: [warning.source, warning.sourceLayer, warning.owner]
  };
}

function checkEvidenceItem(check: ReconciliationCheck) {
  return {
    label: `${check.status}: ${check.code}`,
    detail: check.message ?? check.label,
    href:
      check.scope.jobNumber === undefined
        ? scopedHref("/dashboard/data-quality", check.scope)
        : scopedHref(`/dashboard/projects/${check.scope.jobNumber}`, check.scope),
    meta: [check.sourceRefs.map((ref) => ref.source).join(","), check.scope.jobNumber ?? "No job number"]
  };
}
