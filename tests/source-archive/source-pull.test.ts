import { describe, expect, test } from "vitest";

import type { SkippedSourceRow } from "../../src/lib/source-archive/types";
import {
  createFixturePullResult,
  createFixtureSourcePullAdapter,
  type RawSourceCandidateRow,
  type SourcePullAdapter,
  type SourcePullDescriptor
} from "../../src/lib/source-archive/source-pull";

type ForbiddenAdapterMethods = Extract<
  keyof SourcePullAdapter,
  "write" | "delete" | "archive" | "sync"
>;

const adapterHasNoForbiddenMethods: ForbiddenAdapterMethods extends never ? true : false = true;

const requestedAt = "2026-05-20T01:00:00.000Z";
const completedAt = "2026-05-20T01:00:01.000Z";

const pipelineCandidate: RawSourceCandidateRow = {
  kind: "raw_source_candidate_row",
  source: "pipeline",
  identity: {
    sourceDocumentId: "pipeline_sheet",
    sourceTab: "Pipeline",
    sourceRowNumber: 42,
    stableSourceRowKey: "pipeline_sheet:Pipeline:42"
  },
  raw: {
    jobNumber: "TBC",
    client: "Example Client",
    projectName: "Future campaign",
    amount: 1000
  },
  observedAt: completedAt,
  sourceRefs: [
    {
      source: "pipeline",
      sourceLayer: "pipeline",
      sourceDocumentId: "pipeline_sheet",
      sourceTab: "Pipeline",
      sourceRowNumber: 42
    }
  ]
};

const skippedPipelineRow: SkippedSourceRow = {
  kind: "skipped_source_row",
  archiveStatus: "skipped",
  id: "skip_pipeline_001",
  batchId: "fixture_pipeline_batch",
  source: "pipeline",
  identity: {
    sourceDocumentId: "pipeline_sheet",
    sourceTab: "Pipeline",
    sourceRowNumber: 43,
    stableSourceRowKey: "pipeline_sheet:Pipeline:43"
  },
  observedAt: completedAt,
  raw: {},
  skip: {
    allowedByLaw: true,
    classification: "literally_empty",
    reason: "No job, project, client, date, amount, hours, or useful source identifier.",
    evidence: {
      hasJobNumber: false,
      hasProjectName: false,
      hasClient: false,
      hasDate: false,
      hasAmount: false,
      hasHours: false,
      hasUsefulSourceIdentifier: false
    }
  },
  sourceRefs: []
};

describe("P2-D read-only source pull interface", () => {
  test("builds fixture pull results with read-only metadata, candidate rows, skipped rows, and warnings", () => {
    const result = createFixturePullResult({
      source: "pipeline",
      requestedAt,
      completedAt,
      request: {
        sourceDocumentId: "pipeline_sheet",
        sourceTab: "Pipeline",
        description: "Synthetic pipeline fixture"
      },
      rawCandidateRows: [pipelineCandidate],
      skippedRows: [skippedPipelineRow],
      warnings: ["fixture includes a TBC row"]
    });

    expect(result.metadata).toEqual({
      source: "pipeline",
      mode: "fixture",
      requestedAt,
      completedAt,
      readOnly: true,
      request: {
        sourceDocumentId: "pipeline_sheet",
        sourceTab: "Pipeline",
        description: "Synthetic pipeline fixture"
      },
      warnings: ["fixture includes a TBC row"]
    });
    expect(result.rawCandidateRows).toEqual([pipelineCandidate]);
    expect(result.skippedRows).toEqual([skippedPipelineRow]);
    expect(result.warnings).toEqual(["fixture includes a TBC row"]);
    expect("parsedFacts" in result).toBe(false);
    expect("facts" in result).toBe(false);
    expect("displayRows" in result).toBe(false);
    expect("visibleRows" in result).toBe(false);
  });

  test("fixture adapters expose only read, list, and fetch methods", async () => {
    expect(adapterHasNoForbiddenMethods).toBe(true);

    const adapter = createFixtureSourcePullAdapter([
      {
        id: "pipeline-fixture",
        source: "pipeline",
        request: {
          sourceDocumentId: "pipeline_sheet",
          sourceTab: "Pipeline"
        },
        requestedAt,
        completedAt,
        rawCandidateRows: [pipelineCandidate],
        skippedRows: [],
        warnings: []
      }
    ]);

    expect(Object.keys(adapter).sort()).toEqual(["fetch", "list", "read"]);
    expect("write" in adapter).toBe(false);
    expect("delete" in adapter).toBe(false);
    expect("archive" in adapter).toBe(false);
    expect("sync" in adapter).toBe(false);

    await expect(
      adapter.read({
        source: "pipeline",
        request: {
          sourceDocumentId: "pipeline_sheet",
          sourceTab: "Pipeline"
        }
      })
    ).resolves.toMatchObject({
      metadata: {
        source: "pipeline",
        readOnly: true
      },
      rawCandidateRows: [pipelineCandidate]
    });

    await expect(adapter.fetch({ id: "pipeline-fixture" })).resolves.toMatchObject({
      metadata: {
        source: "pipeline",
        readOnly: true
      },
      rawCandidateRows: [pipelineCandidate]
    });
  });

  test("source pull descriptors can represent Sheets, Float, legacy DB imports, and fixtures without live clients", () => {
    const descriptors: readonly SourcePullDescriptor[] = [
      {
        id: "fee-sheet-google",
        provider: "google_sheets",
        source: "fee_sheet",
        mode: "read_only_live",
        readOnly: true,
        request: {
          sourceDocumentId: "fee_sheet_google_id",
          sourceTab: "CLIENT SUMMARY",
          description: "Read-only Google Sheets fee sheet target"
        }
      },
      {
        id: "float-projects",
        provider: "float",
        source: "float",
        mode: "read_only_live",
        readOnly: true,
        request: {
          sourceObjectId: "projects",
          description: "Read-only Float projects endpoint target"
        }
      },
      {
        id: "legacy-production-import",
        provider: "legacy_db_import",
        source: "production_revenue",
        mode: "legacy_import",
        readOnly: true,
        request: {
          sourceObjectId: "legacy-production-revenue-snapshot",
          description: "Legacy database snapshot import target"
        }
      },
      {
        id: "pipeline-fixture",
        provider: "fixture",
        source: "pipeline",
        mode: "fixture",
        readOnly: true,
        request: {
          sourceDocumentId: "pipeline_fixture",
          sourceTab: "Pipeline",
          description: "In-memory fixture target"
        }
      }
    ];

    expect(descriptors.map((descriptor) => descriptor.provider)).toEqual([
      "google_sheets",
      "float",
      "legacy_db_import",
      "fixture"
    ]);
    expect(descriptors.every((descriptor) => descriptor.readOnly)).toBe(true);
    expect(descriptors.some((descriptor) => "client" in descriptor)).toBe(false);
    expect(descriptors.some((descriptor) => "connection" in descriptor)).toBe(false);
  });
});
