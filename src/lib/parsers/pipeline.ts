import type {
  MoneyValue,
  PipelineFact,
  SourceCapability,
  SourceTraceRef
} from "../canon/types";
import type { ArchivedRawSourceRow, SourceArchiveRecord } from "../source-archive/types";
import { createParserFactEvidence, createParserResult, createParserWarning } from "./shared";
import type { ParserResult, ParserWarning } from "./types";

type PipelineRawRow = {
  readonly jobNumber?: string | null;
  readonly client?: string | null;
  readonly projectName?: string | null;
  readonly month?: string | null;
  readonly amountGbp?: number | string | null;
  readonly status?: string | null;
  readonly office?: "LDN" | "USA" | "UCX" | "UNKNOWN" | string | null;
  readonly sourceLabel?: string | null;
};

const PIPELINE_CAPABILITIES: readonly SourceCapability[] = [
  {
    key: "project",
    status: "partial",
    reason: "Pipeline rows support project when a job or project exists; no-job rows remain source-row facts."
  },
  {
    key: "month",
    status: "supported"
  },
  {
    key: "office",
    status: "partial",
    reason: "Pipeline office attribution is only as strong as the source row field."
  },
  {
    key: "client",
    status: "supported"
  },
  {
    key: "department",
    status: "unsupported",
    reason: "Pipeline source rows do not carry department attribution."
  },
  {
    key: "role",
    status: "unsupported",
    reason: "Pipeline source rows do not carry role attribution."
  },
  {
    key: "person",
    status: "unsupported",
    reason: "Pipeline source rows do not carry person attribution."
  }
];

export function parsePipelineRows(records: readonly SourceArchiveRecord[]): ParserResult<PipelineFact> {
  const facts: PipelineFact[] = [];
  const warnings: ParserWarning[] = [];
  let sourceRowsRead = 0;
  let sourceRowsSkipped = 0;

  for (const record of records) {
    if (record.source !== "pipeline") {
      throw new Error("Pipeline parser can only consume pipeline source archive records.");
    }

    if (record.kind === "skipped_source_row") {
      if (record.skip.classification === "literally_empty") {
        sourceRowsSkipped += 1;
        continue;
      }

      warnings.push(
        warningFor(record, "PIPELINE_UNSUPPORTED_SKIP_CLASSIFICATION", "Pipeline row was skipped for an unsupported reason.", "PROCESS_WARN")
      );
      sourceRowsSkipped += 1;
      continue;
    }

    sourceRowsRead += 1;

    const raw = asPipelineRawRow(record.raw);
    const sourceRefs = sourceRefsFor(record);
    const jobNumber = readText(raw, "jobNumber");
    const hasUsefulJobNumber = hasText(jobNumber) && !isTbc(jobNumber);
    const stablePipelineIdentity = hasUsefulJobNumber ? `job:${jobNumber}` : `source-row:${record.id}`;

    if (isTbc(jobNumber)) {
      warnings.push(
        warningFor(record, "PIPELINE_TBC_JOB_NUMBER", "Pipeline row uses TBC instead of a useful job number.", "DATA_WARN")
      );
    } else if (!hasUsefulJobNumber && hasPipelineContent(raw)) {
      warnings.push(
        warningFor(record, "PIPELINE_NO_JOB_NUMBER", "Pipeline row has no job number but contains source data.", "DATA_WARN")
      );
    } else if (!hasPipelineContent(raw)) {
      warnings.push(
        warningFor(
          record,
          "PIPELINE_EMPTY_RAW_ROW_NOT_CLASSIFIED",
          "Archived raw pipeline row is empty but was not source-archive classified as skipped.",
          "PROCESS_WARN"
        )
      );
    }

    facts.push(buildPipelineFact(record, raw, sourceRefs, stablePipelineIdentity, hasUsefulJobNumber ? jobNumber : undefined));
  }

  return createParserResult({
    parserName: "pipeline",
    source: "pipeline",
    facts,
    warnings,
    capabilities: [
      {
        source: "pipeline",
        capabilities: PIPELINE_CAPABILITIES
      }
    ],
    sourceRowsRead,
    sourceRowsSkipped
  });
}

function buildPipelineFact(
  record: ArchivedRawSourceRow,
  raw: PipelineRawRow,
  sourceRefs: readonly SourceTraceRef[],
  stablePipelineIdentity: string,
  usefulJobNumber: string | undefined
): PipelineFact {
  const evidence = createParserFactEvidence({
    batchId: record.batchId,
    rawRowIds: [record.id],
    sourceRefs,
    additiveStatus: "not_additive"
  });
  const sourceClient = readText(raw, "client");
  const sourceProjectName = readText(raw, "projectName");
  const month = readText(raw, "month");
  const status = readText(raw, "status");
  const office = readOffice(raw);
  const amountGbp = readNumber(raw, "amountGbp");

  return {
    id: `pipeline:${record.batchId}:${record.id}`,
    source: "pipeline",
    sourceLayer: "pipeline",
    rawRowIds: [...evidence.rawRowIds],
    batchId: evidence.batchId,
    stablePipelineIdentity,
    ...(usefulJobNumber !== undefined ? { jobNumber: usefulJobNumber } : {}),
    ...(hasText(sourceClient) ? { client: sourceClient, sourceClient } : {}),
    ...(hasText(sourceProjectName) ? { projectName: sourceProjectName, sourceProjectName } : {}),
    ...(office !== undefined ? { office } : {}),
    ...(hasText(month) ? { month } : {}),
    ...(hasText(status) ? { status } : {}),
    ...(amountGbp !== undefined ? { amount: moneyValue(amountGbp, record.observedAt) } : {}),
    isAdditive: evidence.isAdditive,
    confidence: confidenceFor(usefulJobNumber, raw),
    warnings: [],
    trace: sourceRefs.map((sourceRef) => ({ ...sourceRef }))
  };
}

function warningFor(
  record: SourceArchiveRecord,
  code: string,
  message: string,
  severity: ParserWarning["severity"]
): ParserWarning {
  return createParserWarning({
    code,
    message,
    source: "pipeline",
    sourceLayer: "pipeline",
    batchId: record.batchId,
    rawRowIds: [record.id],
    sourceRefs: sourceRefsFor(record),
    severity
  });
}

function asPipelineRawRow(raw: ArchivedRawSourceRow["raw"]): PipelineRawRow {
  if (raw === null || Array.isArray(raw) || typeof raw !== "object") {
    return {};
  }

  return raw as PipelineRawRow;
}

function readText(raw: PipelineRawRow, key: keyof PipelineRawRow): string | undefined {
  const value = raw[key];

  if (typeof value !== "string") {
    return undefined;
  }

  return value;
}

function readNumber(raw: PipelineRawRow, key: keyof PipelineRawRow): number | undefined {
  const value = raw[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/,/g, ""));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function readOffice(raw: PipelineRawRow): PipelineFact["office"] | undefined {
  const office = readText(raw, "office");

  if (office === "LDN" || office === "USA" || office === "UCX" || office === "UNKNOWN") {
    return office;
  }

  return undefined;
}

function hasText(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== "";
}

function isTbc(value: string | undefined): boolean {
  return value !== undefined && value.trim().toUpperCase() === "TBC";
}

function hasPipelineContent(raw: PipelineRawRow): boolean {
  return (
    hasText(readText(raw, "jobNumber")) ||
    hasText(readText(raw, "client")) ||
    hasText(readText(raw, "projectName")) ||
    hasText(readText(raw, "month")) ||
    hasText(readText(raw, "status")) ||
    hasText(readText(raw, "sourceLabel")) ||
    readNumber(raw, "amountGbp") !== undefined
  );
}

function confidenceFor(usefulJobNumber: string | undefined, raw: PipelineRawRow): PipelineFact["confidence"] {
  if (usefulJobNumber !== undefined && hasText(readText(raw, "client")) && hasText(readText(raw, "projectName"))) {
    return "high";
  }

  if (hasPipelineContent(raw)) {
    return "medium";
  }

  return "low";
}

function moneyValue(amountGbp: number, observedAt: string): { kind: "money"; value: MoneyValue } {
  return {
    kind: "money",
    value: {
      amountOriginal: amountGbp,
      currencyOriginal: "GBP",
      amountGbp,
      fxRateToGbp: 1,
      fxSource: "pipeline_source_gbp",
      fxCapturedAt: observedAt
    }
  };
}

function sourceRefsFor(record: SourceArchiveRecord): SourceTraceRef[] {
  if (record.sourceRefs.length > 0) {
    return record.sourceRefs.map((sourceRef) => ({ ...sourceRef }));
  }

  return [
    {
      source: "pipeline",
      sourceLayer: "pipeline",
      batchId: record.batchId,
      rawRowId: record.id,
      ...(record.identity.sourceDocumentId !== undefined ? { sourceDocumentId: record.identity.sourceDocumentId } : {}),
      ...(record.identity.sourceTab !== undefined ? { sourceTab: record.identity.sourceTab } : {}),
      ...(record.identity.sourceRowNumber !== undefined ? { sourceRowNumber: record.identity.sourceRowNumber } : {}),
      ...(record.identity.sourceObjectId !== undefined ? { sourceObjectId: record.identity.sourceObjectId } : {})
    }
  ];
}
