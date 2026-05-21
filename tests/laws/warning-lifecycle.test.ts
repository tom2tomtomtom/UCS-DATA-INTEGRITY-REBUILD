import { describe, expect, test } from "vitest";

import type { SourceWarning, WarningLifecycleState } from "../../src/lib/canon/types";
import {
  transitionWarningLifecycle,
  warningBlocksApproval,
  warningLifecycleDisplayLabel,
  warningRemainsVisible
} from "../../src/lib/canon/warning-lifecycle";

const currentSourceRef = {
  source: "fee_sheet",
  sourceLayer: "sold",
  batchId: "batch-1",
  rawRowId: "raw-1",
  sourceDocumentId: "fees",
  sourceTab: "CLIENT SUMMARY",
  sourceRowNumber: 12,
  field: "soldFee"
} as const;

const refreshedSourceRef = {
  ...currentSourceRef,
  batchId: "batch-2",
  rawRowId: "raw-2",
  sourceRowNumber: 13
} as const;

function warningInState(lifecycleState: WarningLifecycleState): SourceWarning {
  return {
    id: "warning-UCS04787-soldFee",
    status: "DATA_WARN",
    lifecycleState,
    source: "fee_sheet",
    sourceLayer: "sold",
    code: "CLIENT_SUMMARY_VTAB_DISAGREE",
    message: "CLIENT SUMMARY and V-tab source summary values differ; both rows are preserved.",
    scope: {
      office: "LDN",
      from: "2026-01-01",
      to: "2026-01-31",
      jobNumber: "UCS04787"
    },
    owner: "Unknown",
    sourceRefs: [currentSourceRef],
    firstSeenAt: "2026-05-20T10:00:00.000Z",
    lastSeenAt: "2026-05-20T10:00:00.000Z"
  };
}

describe("Warning lifecycle policy", () => {
  test("keeps open warnings visible, blocking, and tied to source evidence", () => {
    const warning = warningInState("open");

    expect(warningRemainsVisible(warning)).toBe(true);
    expect(warningBlocksApproval(warning, new Set([warning.id]))).toBe(true);
    expect(warningLifecycleDisplayLabel(warning)).toBe("DATA_WARN");
    expect(warning.sourceRefs).toEqual([currentSourceRef]);
    expect(warning.lastSeenAt).toBe("2026-05-20T10:00:00.000Z");
  });

  test("keeps acknowledged warnings visible as acknowledged, not pass language", () => {
    const warning = transitionWarningLifecycle({
      warning: warningInState("open"),
      nextState: "acknowledged",
      observedAt: "2026-05-20T11:00:00.000Z"
    });

    expect(warning.lifecycleState).toBe("acknowledged");
    expect(warningRemainsVisible(warning)).toBe(true);
    expect(warningBlocksApproval(warning, new Set([warning.id]))).toBe(true);
    expect(warningLifecycleDisplayLabel(warning)).toBe("ACKNOWLEDGED");
    expect(warningLifecycleDisplayLabel(warning)).not.toBe("PASS");
    expect(warning.sourceRefs).toEqual([currentSourceRef]);
    expect(warning.lastSeenAt).toBe("2026-05-20T11:00:00.000Z");
  });

  test("keeps source-fixed pending-refresh warnings visible until refreshed evidence exists", () => {
    const warning = transitionWarningLifecycle({
      warning: warningInState("acknowledged"),
      nextState: "source_fixed_pending_refresh",
      observedAt: "2026-05-20T12:00:00.000Z"
    });

    expect(warning.lifecycleState).toBe("source_fixed_pending_refresh");
    expect(warningRemainsVisible(warning)).toBe(true);
    expect(warningBlocksApproval(warning, new Set())).toBe(true);
    expect(warning.sourceRefs).toEqual([currentSourceRef]);
    expect(warning.lastSeenAt).toBe("2026-05-20T12:00:00.000Z");
  });

  test("resolves by source only with fresh source evidence and stops blocking if current source no longer reproduces it", () => {
    const warning = transitionWarningLifecycle({
      warning: warningInState("source_fixed_pending_refresh"),
      nextState: "resolved_by_source",
      observedAt: "2026-05-20T13:00:00.000Z",
      evidenceSourceRefs: [refreshedSourceRef],
      resolutionEvidence: "Batch batch-2 parsed the corrected source row without CLIENT_SUMMARY_VTAB_DISAGREE."
    });

    expect(warning.lifecycleState).toBe("resolved_by_source");
    expect(warningRemainsVisible(warning)).toBe(false);
    expect(warningBlocksApproval(warning, new Set())).toBe(false);
    expect(warningBlocksApproval(warning, new Set([warning.id]))).toBe(true);
    expect(warning.sourceRefs).toEqual([currentSourceRef, refreshedSourceRef]);
    expect(warning.lastSeenAt).toBe("2026-05-20T13:00:00.000Z");
    expect(warning.resolutionEvidence).toContain("batch-2");
  });

  test("resolves by code only with test evidence and still keeps the last source evidence", () => {
    const warning = transitionWarningLifecycle({
      warning: warningInState("open"),
      nextState: "resolved_by_code",
      observedAt: "2026-05-20T14:00:00.000Z",
      resolutionEvidence: "Focused parser law now reproduces and passes for duplicate fee tracker rows."
    });

    expect(warning.lifecycleState).toBe("resolved_by_code");
    expect(warningRemainsVisible(warning)).toBe(false);
    expect(warningBlocksApproval(warning, new Set())).toBe(false);
    expect(warning.sourceRefs).toEqual([currentSourceRef]);
    expect(warning.lastSeenAt).toBe("2026-05-20T14:00:00.000Z");
    expect(warning.resolutionEvidence).toContain("parser law");
  });

  test("keeps source limitations visible as unsupported source truth with evidence", () => {
    const warning = transitionWarningLifecycle({
      warning: {
        ...warningInState("open"),
        status: "PROCESS_WARN",
        code: "SOURCE_CANNOT_SCOPE_PERSON",
        message: "Fee sheet cannot support person-level allocation.",
        sourceRefs: [currentSourceRef]
      },
      nextState: "wont_fix_source_limitation",
      observedAt: "2026-05-20T15:00:00.000Z",
      resolutionEvidence: "Source contract confirms fee sheet has no person-level field."
    });

    expect(warning.lifecycleState).toBe("wont_fix_source_limitation");
    expect(warningRemainsVisible(warning)).toBe(true);
    expect(warningBlocksApproval(warning, new Set())).toBe(true);
    expect(warning.sourceRefs).toEqual([currentSourceRef]);
    expect(warning.resolutionEvidence).toContain("no person-level field");
  });

  test("supersedes warnings only with trace to newer evidence and without erasing source refs", () => {
    const warning = transitionWarningLifecycle({
      warning: warningInState("open"),
      nextState: "superseded",
      observedAt: "2026-05-20T16:00:00.000Z",
      evidenceSourceRefs: [refreshedSourceRef],
      resolutionEvidence: "Superseded by warning-UCS04787-soldFee-batch-2 after the latest parse."
    });

    expect(warning.lifecycleState).toBe("superseded");
    expect(warningRemainsVisible(warning)).toBe(true);
    expect(warningBlocksApproval(warning, new Set())).toBe(false);
    expect(warning.sourceRefs).toEqual([currentSourceRef, refreshedSourceRef]);
    expect(warning.lastSeenAt).toBe("2026-05-20T16:00:00.000Z");
    expect(warning.resolutionEvidence).toContain("warning-UCS04787-soldFee-batch-2");
  });

  test("rejects terminal lifecycle transitions that lack evidence", () => {
    expect(() =>
      transitionWarningLifecycle({
        warning: warningInState("open"),
        nextState: "resolved_by_source",
        observedAt: "2026-05-20T17:00:00.000Z"
      })
    ).toThrow("resolved_by_source requires resolution evidence.");
  });
});
