import type {
  ParserAdditiveStatus,
  ParserFactEvidence,
  ParserFactEvidenceInput,
  ParserResult,
  ParserResultInput,
  ParserWarning,
  ParserWarningInput
} from "./types";

export function toIsAdditive(status: ParserAdditiveStatus): boolean {
  return status === "additive";
}

export function createParserFactEvidence(input: ParserFactEvidenceInput): ParserFactEvidence {
  if (input.batchId.trim() === "") {
    throw new Error("Parser facts require a batch ID.");
  }

  if (input.rawRowIds.length === 0) {
    throw new Error("Parser facts require at least one raw row ID.");
  }

  if (input.sourceRefs.length === 0) {
    throw new Error("Parser facts require at least one source ref.");
  }

  return {
    batchId: input.batchId,
    rawRowIds: [...input.rawRowIds],
    sourceRefs: input.sourceRefs.map((sourceRef) => ({ ...sourceRef })),
    additiveStatus: input.additiveStatus,
    isAdditive: toIsAdditive(input.additiveStatus)
  };
}

export function createParserWarning(input: ParserWarningInput): ParserWarning {
  if (input.batchId.trim() === "") {
    throw new Error("Parser warnings require a batch ID.");
  }

  if (input.rawRowIds.length === 0) {
    throw new Error("Parser warnings require at least one raw row ID.");
  }

  if (input.sourceRefs.length === 0) {
    throw new Error("Parser warnings require at least one source ref.");
  }

  return {
    code: input.code,
    message: input.message,
    source: input.source,
    sourceLayer: input.sourceLayer,
    batchId: input.batchId,
    rawRowIds: [...input.rawRowIds],
    sourceRefs: input.sourceRefs.map((sourceRef) => ({ ...sourceRef })),
    severity: input.severity
  };
}

export function createParserResult<TFact extends ParserResultInput["facts"][number]>(
  input: ParserResultInput<TFact>
): ParserResult<TFact> {
  return {
    parserName: input.parserName,
    source: input.source,
    facts: [...input.facts],
    warnings: input.warnings.map((warning) => createParserWarning(warning)),
    capabilities: input.capabilities.map((capability) => ({
      source: capability.source,
      capabilities: capability.capabilities.map((sourceCapability) => ({ ...sourceCapability }))
    })),
    sourceRowsRead: input.sourceRowsRead,
    sourceRowsSkipped: input.sourceRowsSkipped
  };
}
