export type UiProofStatus = "ready_for_capture" | "captured";

export type UiProofClickProof = {
  readonly label: string;
  readonly fromSurfaceId: string;
  readonly targetText: string;
  readonly expectedUrlIncludes: readonly string[];
};

export type UiProofSurface = {
  readonly id: string;
  readonly label: string;
  readonly url: string;
  readonly screenshotFile: string;
  readonly expectedText: readonly string[];
  readonly mustNotContain: readonly string[];
  readonly sourceSafety: "redacted_or_fixture_safe";
  readonly clickProofs: readonly UiProofClickProof[];
};

export type UiProofManifest = {
  readonly proofType: "deterministic-ui-proof";
  readonly capturedAt: string;
  readonly status: UiProofStatus;
  readonly artifactRoot: string;
  readonly surfaces: readonly UiProofSurface[];
};

export type BuildUiProofManifestInput = {
  readonly baseUrl: string;
  readonly capturedAt: string;
  readonly artifactRoot?: string;
  readonly status?: UiProofStatus;
};

const defaultArtifactRoot = "test-results/ui-proof/p8f";

export function buildUiProofManifest(input: BuildUiProofManifestInput): UiProofManifest {
  const baseUrl = input.baseUrl.replace(/\/$/, "");
  const scope = "office=LDN&from=2026-01-01&to=2026-03-31";
  const designScope = `${scope}&department=Design`;

  return {
    proofType: "deterministic-ui-proof",
    capturedAt: input.capturedAt,
    status: input.status ?? "ready_for_capture",
    artifactRoot: input.artifactRoot ?? defaultArtifactRoot,
    surfaces: [
      surface({
        id: "dashboard-home",
        label: "Dashboard home rollups",
        url: `${baseUrl}/dashboard?${scope}`,
        screenshotFile: "p8f-dashboard-home.png",
        expectedText: ["UCS Commercial Dashboard", "Department Rollup", "Design", "Unsupported", "Confidence"],
        clickProofs: [
          {
            label: "Design department row opens Projects with the same scope",
            fromSurfaceId: "dashboard-home",
            targetText: "Design",
            expectedUrlIncludes: ["/dashboard/projects", "office=LDN", "from=2026-01-01", "to=2026-03-31", "department=Design"]
          }
        ]
      }),
      surface({
        id: "projects-design-drilldown",
        label: "Projects table scoped to LDN Q1 Design",
        url: `${baseUrl}/dashboard/projects?${designScope}`,
        screenshotFile: "p8f-projects-design-drilldown.png",
        expectedText: ["Projects", "British Airways", "UCS04787", "Unsupported", "Total"],
        mustNotContain: ["£0 pipeline attributed to Design"]
      }),
      surface({
        id: "project-detail-ucs04787",
        label: "UCS04787 scoped project detail",
        url: `${baseUrl}/dashboard/projects/UCS04787?${designScope}&jobNumber=UCS04787`,
        screenshotFile: "p8f-project-detail-ucs04787.png",
        expectedText: ["British Airways / UCS04787", "FLOAT_VISIBLE_CACHE_MISSING_CACHE", "fixture-float-visible-ucs04787", "Back to Projects"]
      }),
      surface({
        id: "float-diagnostics",
        label: "Float diagnostics",
        url: `${baseUrl}/dashboard/float?${scope}`,
        screenshotFile: "p8f-float-diagnostics.png",
        expectedText: ["Float Diagnostics", "PCS00250_RAW_CACHE_UNRESOLVED", "BT_RAW_CACHE_UNRESOLVED", "UCS05186", "archived/manual/source-only candidate"]
      }),
      surface({
        id: "data-quality",
        label: "Data Quality",
        url: `${baseUrl}/dashboard/data-quality?${scope}`,
        screenshotFile: "p8f-data-quality.png",
        expectedText: ["Data Quality", "FAIL", "WARN", "USA00262", "Needs Codex"]
      }),
      surface({
        id: "approval-audit",
        label: "Approval Audit",
        url: `${baseUrl}/dashboard/approval?${scope}`,
        screenshotFile: "p8f-approval-audit.png",
        expectedText: ["Approval Audit", "Rows reviewed", "source trace", "source-only rows remain visible", "Needs Codex"]
      }),
      surface({
        id: "chat-evidence",
        label: "Chat evidence shell",
        url: `${baseUrl}/dashboard/chat-demo?${designScope}`,
        screenshotFile: "p8f-chat-evidence.png",
        expectedText: ["Dashboard Chat", "Working", "display contract", "Needs Codex", "browser testing"]
      }),
      surface({
        id: "sync-audit",
        label: "Sync Audit read-only evidence",
        url: `${baseUrl}/dashboard/audit?${scope}`,
        screenshotFile: "p8f-sync-audit.png",
        expectedText: ["Sync Audit", "Read-only sync evidence", "Issue details"]
      }),
      surface({
        id: "sync-warnings",
        label: "Sync Warnings read-only review",
        url: `${baseUrl}/dashboard/admin/sync-warnings?${scope}`,
        screenshotFile: "p8f-sync-warnings.png",
        expectedText: ["Sync Warnings", "Read-only warning review", "MUTATION_GUARD is read_only"],
        mustNotContain: ["Archive selected", "Dismiss selected"]
      }),
      surface({
        id: "capacity-reduced",
        label: "Capacity Reduced read-only evidence",
        url: `${baseUrl}/dashboard/admin/timeoffs?${scope}`,
        screenshotFile: "p8f-capacity-reduced.png",
        expectedText: ["Capacity Reduced", "Time-off rows stay separate from booked project hours", "Latest batch awareness"]
      }),
      surface({
        id: "users",
        label: "Users read-only access surface",
        url: `${baseUrl}/dashboard/users?${scope}`,
        screenshotFile: "p8f-users.png",
        expectedText: ["Users", "Read-only access surface", "Role management"],
        mustNotContain: ["Send invite"]
      })
    ]
  };
}

function surface(input: {
  readonly id: string;
  readonly label: string;
  readonly url: string;
  readonly screenshotFile: string;
  readonly expectedText: readonly string[];
  readonly mustNotContain?: readonly string[];
  readonly clickProofs?: readonly UiProofClickProof[];
}): UiProofSurface {
  return {
    id: input.id,
    label: input.label,
    url: input.url,
    screenshotFile: input.screenshotFile,
    expectedText: input.expectedText,
    mustNotContain: input.mustNotContain ?? [],
    sourceSafety: "redacted_or_fixture_safe",
    clickProofs: input.clickProofs ?? []
  };
}
