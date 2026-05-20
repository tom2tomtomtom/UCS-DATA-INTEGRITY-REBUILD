import { describe, expect, test } from "vitest";

import {
  classifyRawSourceRow,
  createSkippedSourceRow,
  LITERALLY_EMPTY_SKIP_REASON
} from "../../src/lib/source-archive/row-classifier";

import type { SourceArchivePayload, SourceRowIdentity } from "../../src/lib/source-archive/types";

const emptyEvidence = {
  hasJobNumber: false,
  hasProjectName: false,
  hasClient: false,
  hasDate: false,
  hasAmount: false,
  hasHours: false,
  hasUsefulSourceIdentifier: false
};

const identity: SourceRowIdentity = {
  sourceDocumentId: "pipeline_sheet",
  sourceTab: "Pipeline",
  sourceRowNumber: 42,
  stableSourceRowKey: "pipeline_sheet:Pipeline:42"
};

describe("P2-B raw row classifier", () => {
  test("classifies only literally empty raw rows as allowed skips", () => {
    const literalEmpties: readonly SourceArchivePayload[] = [
      null,
      "",
      "   ",
      [],
      ["", " ", null],
      {},
      {
        jobNumber: "",
        projectName: " ",
        client: null,
        date: "",
        amount: "",
        hours: ""
      }
    ];

    for (const raw of literalEmpties) {
      expect(classifyRawSourceRow(raw)).toEqual({
        decision: "skip",
        allowedByLaw: true,
        classification: "literally_empty",
        reason: LITERALLY_EMPTY_SKIP_REASON,
        evidence: emptyEvidence
      });
    }

    const nonEmptyRows: readonly SourceArchivePayload[] = [
      { note: "investigate at source" },
      ["", 0],
      { sourceObjectId: "float-task-123" }
    ];

    for (const raw of nonEmptyRows) {
      expect(classifyRawSourceRow(raw).decision).toBe("archive");
    }
  });

  test("archives Law 1 rows even when they look incomplete, awkward, or duplicate", () => {
    const rows: readonly SourceArchivePayload[] = [
      {
        jobNumber: "USA00262",
        projectName: "Nonzero hours with no fee",
        soldFee: 0,
        soldHours: 12
      },
      {
        jobNumber: "TBC",
        client: "Future Client",
        projectName: "Pipeline pitch",
        pipelineAmount: 5000
      },
      {
        jobNumber: "UCS04787",
        projectName: "Archived production job",
        productionStatus: "ARCHIVED",
        amount: 2500
      },
      {
        floatProjectId: "float-archived-001",
        projectName: "Inactive Float with hours",
        activeState: "inactive",
        hours: 16
      },
      {
        jobNumber: "PROVISIONAL-001",
        projectName: "Provisional job",
        status: "provisional"
      },
      {
        projectName: "Unmatched source-only row",
        unmatched: true
      },
      {
        jobNumber: "UCS05186",
        projectName: "Manual duplicate candidate",
        duplicateCandidate: true
      }
    ];

    for (const raw of rows) {
      expect(classifyRawSourceRow(raw).decision).toBe("archive");
    }
  });

  test("creates skipped-row ledger entries with explicit reason and source evidence", () => {
    const skipped = createSkippedSourceRow({
      id: "skip_pipeline_042",
      batchId: "batch_pipeline_001",
      source: "pipeline",
      identity,
      observedAt: "2026-05-20T10:00:00.000Z",
      raw: {
        jobNumber: "",
        projectName: "",
        client: "",
        date: "",
        amount: "",
        hours: ""
      },
      contentHash: "sha256:empty"
    });

    expect(skipped).toMatchObject({
      kind: "skipped_source_row",
      archiveStatus: "skipped",
      id: "skip_pipeline_042",
      batchId: "batch_pipeline_001",
      source: "pipeline",
      identity,
      observedAt: "2026-05-20T10:00:00.000Z",
      raw: {
        jobNumber: "",
        projectName: "",
        client: "",
        date: "",
        amount: "",
        hours: ""
      },
      contentHash: "sha256:empty",
      skip: {
        allowedByLaw: true,
        classification: "literally_empty",
        reason: LITERALLY_EMPTY_SKIP_REASON,
        evidence: emptyEvidence
      },
      sourceRefs: [
        {
          source: "pipeline",
          sourceLayer: "pipeline",
          batchId: "batch_pipeline_001",
          rawRowId: "skip_pipeline_042",
          sourceDocumentId: "pipeline_sheet",
          sourceTab: "Pipeline",
          sourceRowNumber: 42
        }
      ]
    });
  });

  test("refuses to record non-empty rows as skipped", () => {
    expect(() =>
      createSkippedSourceRow({
        id: "skip_pipeline_tbc",
        batchId: "batch_pipeline_001",
        source: "pipeline",
        identity,
        observedAt: "2026-05-20T10:00:00.000Z",
        raw: {
          jobNumber: "TBC",
          projectName: ""
        }
      })
    ).toThrow("Only literally empty rows can be recorded as skipped.");
  });

  test("does not parse facts, calculate totals, reconcile sources, or turn unsupported fields into zero", () => {
    const classification = classifyRawSourceRow({
      jobNumber: "USA00262",
      soldHours: "",
      roleHours: "",
      amountRows: [10, 20],
      unsupportedRoleDetail: ""
    });

    expect(classification).toMatchObject({
      decision: "archive",
      evidence: {
        hasJobNumber: true,
        hasHours: false
      }
    });
    expect("facts" in classification).toBe(false);
    expect("parsedFacts" in classification).toBe(false);
    expect("totals" in classification).toBe(false);
    expect("reconciled" in classification).toBe(false);
    expect(JSON.stringify(classification)).not.toContain("30");
    expect(JSON.stringify(classification)).not.toContain("\"hours\":0");
  });
});
