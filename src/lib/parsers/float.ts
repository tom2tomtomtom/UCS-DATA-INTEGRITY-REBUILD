import type { FloatFact, SourceLayer, SourceName, SourceTraceRef } from "../canon/types";
import type { ArchivedRawSourceRow } from "../source-archive/types";
import { createParserFactEvidence, createParserResult, createParserWarning } from "./shared";
import type { ParserFactEvidence, ParserResult, ParserWarning } from "./types";

const FLOAT_SOURCE = "float" satisfies SourceName;
const PARSER_NAME = "float";
const FLOAT_RAW_LAYER = "float_raw" satisfies SourceLayer;

type FloatActiveState = NonNullable<FloatFact["activeState"]>;
type FloatAllocationClass = NonNullable<FloatFact["allocationClass"]>;
type DuplicateCandidateType = "float_candidate" | "manual_duplicate";

type AssignedPerson = {
  readonly personId?: string;
  readonly personName?: string;
};

export type FloatArchivedTaskPayload = {
  readonly objectType: "task";
  readonly floatProjectId?: string;
  readonly projectCode?: string;
  readonly projectName?: string;
  readonly taskId?: string;
  readonly personId?: string;
  readonly personName?: string;
  readonly department?: string;
  readonly role?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly month?: string;
  readonly hours?: number;
  readonly tentative?: boolean;
  readonly activeState?: FloatActiveState;
  readonly allocationClass?: FloatAllocationClass;
  readonly expansionRule?: string;
  readonly duplicateGroupKey?: string;
  readonly duplicateCandidateType?: DuplicateCandidateType;
  readonly assignedPeople?: readonly AssignedPerson[];
};

export type FloatParserFact = FloatFact & {
  readonly parserEvidence: ParserFactEvidence;
};

type ParsedFloatRow = {
  readonly row: ArchivedRawSourceRow;
  readonly payload: FloatArchivedTaskPayload;
};

export function parseArchivedFloatRows(
  sourceRows: readonly ArchivedRawSourceRow[]
): ParserResult<FloatParserFact> {
  const floatRows = sourceRows.filter((row) => row.source === FLOAT_SOURCE);
  const parsedRows: ParsedFloatRow[] = [];
  const warnings: ParserWarning[] = [];

  for (const row of floatRows) {
    const payload = parsePayload(row);

    if (!payload) {
      warnings.push(
        createParserWarning({
          code: "UNSUPPORTED_FLOAT_ROW_SHAPE",
          message: "Float raw row did not match the explicit archived fixture shape.",
          source: FLOAT_SOURCE,
          sourceLayer: FLOAT_RAW_LAYER,
          batchId: row.batchId,
          rawRowIds: [row.id],
          sourceRefs: sourceRefsFor(row),
          severity: "PROCESS_WARN"
        })
      );
      continue;
    }

    parsedRows.push({ row, payload });
  }

  const facts = parsedRows.map(({ row, payload }) => {
    const fact = createFloatFact(row, payload);
    const hours = payload.hours ?? 0;

    if (hours > 0 && payload.activeState === "inactive") {
      warnings.push(
        createParserWarning({
          code: "INACTIVE_FLOAT_WITH_HOURS",
          message: "Inactive Float task has hours and is preserved as source evidence.",
          source: FLOAT_SOURCE,
          sourceLayer: FLOAT_RAW_LAYER,
          batchId: row.batchId,
          rawRowIds: [row.id],
          sourceRefs: sourceRefsFor(row),
          severity: "DATA_WARN"
        })
      );
    }

    if (hours > 0 && payload.activeState === "archived") {
      warnings.push(
        createParserWarning({
          code: "ARCHIVED_FLOAT_WITH_HOURS",
          message: "Archived Float task has hours and is preserved as source evidence.",
          source: FLOAT_SOURCE,
          sourceLayer: FLOAT_RAW_LAYER,
          batchId: row.batchId,
          rawRowIds: [row.id],
          sourceRefs: sourceRefsFor(row),
          severity: "DATA_WARN"
        })
      );
    }

    if ((payload.assignedPeople?.length ?? 0) > 1) {
      warnings.push(
        createParserWarning({
          code: "MULTI_PERSON_SPLIT_AMBIGUITY",
          message: "Float task names multiple people but does not prove the hour split.",
          source: FLOAT_SOURCE,
          sourceLayer: FLOAT_RAW_LAYER,
          batchId: row.batchId,
          rawRowIds: [row.id],
          sourceRefs: sourceRefsFor(row),
          severity: "DATA_WARN"
        })
      );
    }

    if (payload.duplicateCandidateType === "manual_duplicate") {
      warnings.push(
        createParserWarning({
          code: "MANUAL_DUPLICATE_CANDIDATE",
          message: "Float row is labelled as a manual duplicate candidate; no canonical row was selected.",
          source: FLOAT_SOURCE,
          sourceLayer: FLOAT_RAW_LAYER,
          batchId: row.batchId,
          rawRowIds: [row.id],
          sourceRefs: sourceRefsFor(row),
          severity: "DATA_WARN"
        })
      );
    }

    return fact;
  });

  warnings.push(...duplicateCandidateWarnings(parsedRows));

  return createParserResult({
    parserName: PARSER_NAME,
    source: FLOAT_SOURCE,
    facts,
    warnings,
    capabilities: [
      {
        source: FLOAT_SOURCE,
        capabilities: [
          { key: "project", status: "supported", reason: "Float project ID is preserved." },
          { key: "month", status: "supported", reason: "Fixture rows carry the expansion month." },
          { key: "office", status: "partial", reason: "Float rows do not always carry office." },
          { key: "client", status: "partial", reason: "Float project names may imply client but do not prove it." },
          { key: "department", status: "partial", reason: "Department is preserved when Float provides it." },
          { key: "role", status: "partial", reason: "Role is preserved when Float provides it." },
          { key: "person", status: "supported", reason: "Float task person IDs and names are preserved." }
        ]
      }
    ],
    sourceRowsRead: floatRows.length,
    sourceRowsSkipped: 0
  });
}

function createFloatFact(
  row: ArchivedRawSourceRow,
  payload: FloatArchivedTaskPayload
): FloatParserFact {
  const trace = sourceRefsFor(row);
  const parserEvidence = createParserFactEvidence({
    batchId: row.batchId,
    rawRowIds: [row.id],
    sourceRefs: trace,
    additiveStatus: "unknown_requires_review"
  });
  const fact: FloatParserFact = {
    id: `${FLOAT_SOURCE}:${row.batchId}:${row.id}`,
    source: FLOAT_SOURCE,
    sourceLayer: FLOAT_RAW_LAYER,
    rawRowIds: [row.id],
    batchId: row.batchId,
    hours: {
      kind: "hours",
      value: payload.hours ?? 0,
      unit: "decimal_hours"
    },
    isAdditive: parserEvidence.isAdditive,
    confidence: "high",
    warnings: [],
    trace,
    parserEvidence
  };

  if (payload.projectCode) {
    fact.jobNumber = payload.projectCode;
  }
  if (payload.floatProjectId) {
    fact.floatProjectId = payload.floatProjectId;
  }
  if (payload.projectName) {
    fact.projectName = payload.projectName;
    fact.sourceProjectName = payload.projectName;
  }
  if (payload.taskId) {
    fact.taskId = payload.taskId;
  }
  if (payload.personId) {
    fact.personId = payload.personId;
  }
  if (payload.personName) {
    fact.person = payload.personName;
  }
  if (payload.department) {
    fact.department = payload.department;
  }
  if (payload.role) {
    fact.role = payload.role;
  }
  if (payload.startDate) {
    fact.from = payload.startDate;
  }
  if (payload.endDate) {
    fact.to = payload.endDate;
  }
  if (payload.month) {
    fact.month = payload.month;
  }
  if (payload.tentative !== undefined) {
    fact.tentative = payload.tentative;
  }
  if (payload.activeState) {
    fact.activeState = payload.activeState;
  }
  if (payload.expansionRule) {
    fact.expansionRule = payload.expansionRule;
  }
  if (payload.allocationClass) {
    fact.allocationClass = payload.allocationClass;
  }

  return fact;
}

function duplicateCandidateWarnings(parsedRows: readonly ParsedFloatRow[]): ParserWarning[] {
  const duplicateGroups = new Map<string, ParsedFloatRow[]>();

  for (const parsedRow of parsedRows) {
    const key = parsedRow.payload.duplicateGroupKey;
    if (!key) {
      continue;
    }

    duplicateGroups.set(key, [...(duplicateGroups.get(key) ?? []), parsedRow]);
  }

  return [...duplicateGroups.values()]
    .filter((group) => group.length > 1)
    .map((group) =>
      createParserWarning({
        code: "DUPLICATE_FLOAT_CANDIDATE",
        message: "Float rows share a duplicate candidate key; all candidates are preserved.",
        source: FLOAT_SOURCE,
        sourceLayer: FLOAT_RAW_LAYER,
        batchId: group[0]?.row.batchId ?? "",
        rawRowIds: group.map(({ row }) => row.id),
        sourceRefs: group.flatMap(({ row }) => sourceRefsFor(row)),
        severity: "DATA_WARN"
      })
    );
}

function parsePayload(row: ArchivedRawSourceRow): FloatArchivedTaskPayload | undefined {
  if (!isRecord(row.raw) || row.raw.objectType !== "task") {
    return undefined;
  }

  const floatProjectId = asString(row.raw.floatProjectId);
  const projectCode = asString(row.raw.projectCode);
  const projectName = asString(row.raw.projectName);
  const taskId = asString(row.raw.taskId);
  const personId = asString(row.raw.personId);
  const personName = asString(row.raw.personName);
  const department = asString(row.raw.department);
  const role = asString(row.raw.role);
  const startDate = asString(row.raw.startDate);
  const endDate = asString(row.raw.endDate);
  const month = asString(row.raw.month);
  const hours = asNumber(row.raw.hours);
  const tentative = asBoolean(row.raw.tentative);
  const activeState = asActiveState(row.raw.activeState);
  const allocationClass = asAllocationClass(row.raw.allocationClass);
  const expansionRule = asString(row.raw.expansionRule);
  const duplicateGroupKey = asString(row.raw.duplicateGroupKey);
  const duplicateCandidateType = asDuplicateCandidateType(row.raw.duplicateCandidateType);
  const assignedPeople = asAssignedPeople(row.raw.assignedPeople);

  return {
    objectType: "task",
    ...(floatProjectId ? { floatProjectId } : {}),
    ...(projectCode ? { projectCode } : {}),
    ...(projectName ? { projectName } : {}),
    ...(taskId ? { taskId } : {}),
    ...(personId ? { personId } : {}),
    ...(personName ? { personName } : {}),
    ...(department ? { department } : {}),
    ...(role ? { role } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(month ? { month } : {}),
    ...(hours !== undefined ? { hours } : {}),
    ...(tentative !== undefined ? { tentative } : {}),
    ...(activeState ? { activeState } : {}),
    ...(allocationClass ? { allocationClass } : {}),
    ...(expansionRule ? { expansionRule } : {}),
    ...(duplicateGroupKey ? { duplicateGroupKey } : {}),
    ...(duplicateCandidateType ? { duplicateCandidateType } : {}),
    ...(assignedPeople ? { assignedPeople } : {})
  };
}

function sourceRefsFor(row: ArchivedRawSourceRow): SourceTraceRef[] {
  if (row.sourceRefs.length > 0) {
    return row.sourceRefs.map((sourceRef) => ({
      ...sourceRef,
      sourceLayer: sourceRef.sourceLayer ?? FLOAT_RAW_LAYER,
      batchId: sourceRef.batchId ?? row.batchId,
      rawRowId: sourceRef.rawRowId ?? row.id
    }));
  }

  const sourceRef: SourceTraceRef = {
    source: FLOAT_SOURCE,
    sourceLayer: FLOAT_RAW_LAYER,
    batchId: row.batchId,
    rawRowId: row.id
  };

  if (row.identity.sourceDocumentId) {
    sourceRef.sourceDocumentId = row.identity.sourceDocumentId;
  }
  if (row.identity.sourceTab) {
    sourceRef.sourceTab = row.identity.sourceTab;
  }
  if (row.identity.sourceRowNumber !== undefined) {
    sourceRef.sourceRowNumber = row.identity.sourceRowNumber;
  }
  if (row.identity.sourceObjectId) {
    sourceRef.sourceObjectId = row.identity.sourceObjectId;
  }

  return [sourceRef];
}

function asActiveState(value: unknown): FloatActiveState | undefined {
  if (value === "active" || value === "inactive" || value === "archived" || value === "unknown") {
    return value;
  }

  return undefined;
}

function asAllocationClass(value: unknown): FloatAllocationClass | undefined {
  if (
    value === "allocated" ||
    value === "unallocated" ||
    value === "orphan" ||
    value === "placeholder" ||
    value === "pencil"
  ) {
    return value;
  }

  return undefined;
}

function asDuplicateCandidateType(value: unknown): DuplicateCandidateType | undefined {
  if (value === "float_candidate" || value === "manual_duplicate") {
    return value;
  }

  return undefined;
}

function asAssignedPeople(value: unknown): readonly AssignedPerson[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter(isRecord).map((person) => {
    const personId = asString(person.personId);
    const personName = asString(person.personName);

    if (personId && personName) {
      return { personId, personName };
    }
    if (personId) {
      return { personId };
    }
    if (personName) {
      return { personName };
    }

    return {};
  });
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
