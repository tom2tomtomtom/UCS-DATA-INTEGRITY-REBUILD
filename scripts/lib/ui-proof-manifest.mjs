export function buildUiProofManifest({
  baseUrl,
  capturedAt,
  artifactRoot = "test-results/ui-proof/p8f",
  status = "ready_for_capture"
}) {
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const scope = "office=LDN&from=2026-01-01&to=2026-03-31";
  const designScope = `${scope}&department=Design`;

  return {
    proofType: "deterministic-ui-proof",
    capturedAt,
    status,
    artifactRoot,
    surfaces: [
      surface({
        id: "dashboard-home",
        label: "Dashboard home rollups",
        url: `${cleanBaseUrl}/dashboard?${scope}`,
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
        url: `${cleanBaseUrl}/dashboard/projects?${designScope}`,
        screenshotFile: "p8f-projects-design-drilldown.png",
        expectedText: ["Projects", "British Airways", "UCS04787", "Unsupported", "Total"],
        mustNotContain: ["£0 pipeline attributed to Design"]
      }),
      surface({
        id: "project-detail-ucs04787",
        label: "UCS04787 scoped project detail",
        url: `${cleanBaseUrl}/dashboard/projects/UCS04787?${designScope}&jobNumber=UCS04787`,
        screenshotFile: "p8f-project-detail-ucs04787.png",
        expectedText: ["British Airways / UCS04787", "FLOAT_VISIBLE_CACHE_MISSING_CACHE", "fixture-float-visible-ucs04787", "Back to Projects"]
      }),
      surface({
        id: "float-diagnostics",
        label: "Float diagnostics",
        url: `${cleanBaseUrl}/dashboard/float?${scope}`,
        screenshotFile: "p8f-float-diagnostics.png",
        expectedText: ["Float Diagnostics", "PCS00250_RAW_CACHE_UNRESOLVED", "BT_RAW_CACHE_UNRESOLVED", "UCS05186", "archived/manual/source-only candidate"]
      }),
      surface({
        id: "data-quality",
        label: "Data Quality",
        url: `${cleanBaseUrl}/dashboard/data-quality?${scope}`,
        screenshotFile: "p8f-data-quality.png",
        expectedText: ["Data Quality", "FAIL", "WARN", "USA00262", "Needs Codex"]
      }),
      surface({
        id: "approval-audit",
        label: "Approval Audit",
        url: `${cleanBaseUrl}/dashboard/approval?${scope}`,
        screenshotFile: "p8f-approval-audit.png",
        expectedText: ["Approval Audit", "Rows reviewed", "source trace", "source-only rows remain visible", "Needs Codex"]
      }),
      surface({
        id: "chat-evidence",
        label: "Chat evidence shell",
        url: `${cleanBaseUrl}/dashboard/chat-demo?${designScope}`,
        screenshotFile: "p8f-chat-evidence.png",
        expectedText: ["Dashboard Chat", "Working", "display contract", "Needs Codex", "browser testing"]
      }),
      surface({
        id: "sync-audit",
        label: "Sync Audit read-only evidence",
        url: `${cleanBaseUrl}/dashboard/audit?${scope}`,
        screenshotFile: "p8f-sync-audit.png",
        expectedText: ["Sync Audit", "Read-only sync evidence", "Issue details"]
      }),
      surface({
        id: "sync-warnings",
        label: "Sync Warnings read-only review",
        url: `${cleanBaseUrl}/dashboard/admin/sync-warnings?${scope}`,
        screenshotFile: "p8f-sync-warnings.png",
        expectedText: ["Sync Warnings", "Read-only warning review", "MUTATION_GUARD is read_only"],
        mustNotContain: ["Archive selected", "Dismiss selected"]
      }),
      surface({
        id: "capacity-reduced",
        label: "Capacity Reduced read-only evidence",
        url: `${cleanBaseUrl}/dashboard/admin/timeoffs?${scope}`,
        screenshotFile: "p8f-capacity-reduced.png",
        expectedText: ["Capacity Reduced", "Time-off rows stay separate from booked project hours", "Latest batch awareness"]
      }),
      surface({
        id: "users",
        label: "Users read-only access surface",
        url: `${cleanBaseUrl}/dashboard/users?${scope}`,
        screenshotFile: "p8f-users.png",
        expectedText: ["Users", "Read-only access surface", "Role management"],
        mustNotContain: ["Send invite"]
      })
    ]
  };
}

function surface({
  id,
  label,
  url,
  screenshotFile,
  expectedText,
  mustNotContain = [],
  clickProofs = []
}) {
  return {
    id,
    label,
    url,
    screenshotFile,
    expectedText,
    mustNotContain,
    sourceSafety: "redacted_or_fixture_safe",
    clickProofs
  };
}
