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

type FloatApiProject = {
  readonly row: ArchivedRawSourceRow;
  readonly floatProjectId: string;
  readonly projectCode?: string;
  readonly projectName?: string;
  readonly activeState: FloatActiveState;
  readonly tentative?: boolean;
};

type FloatApiPerson = {
  readonly row: ArchivedRawSourceRow;
  readonly personId: string;
  readonly personName?: string;
  readonly office?: FloatFact["office"];
  readonly department?: string;
  readonly role?: string;
  readonly allocationClass: FloatAllocationClass;
};

type ShapedFloatRows = {
  readonly rows: readonly ArchivedRawSourceRow[];
  readonly lookupRowsSkipped: number;
};

export type FloatArchivedTaskPayload = {
  readonly objectType: "task";
  readonly floatProjectId?: string;
  readonly projectCode?: string;
  readonly projectName?: string;
  readonly taskId?: string;
  readonly personId?: string;
  readonly personName?: string;
  readonly office?: FloatFact["office"];
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
  readonly sourceRefs?: readonly SourceTraceRef[];
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
  const shapedFloatRows = shapeLiveFloatApiRows(floatRows);
  const parsedRows: ParsedFloatRow[] = [];
  const warnings: ParserWarning[] = [];

  for (const row of shapedFloatRows.rows) {
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
    sourceRowsSkipped: shapedFloatRows.lookupRowsSkipped
  });
}

function createFloatFact(
  row: ArchivedRawSourceRow,
  payload: FloatArchivedTaskPayload
): FloatParserFact {
  const trace = payload.sourceRefs ?? sourceRefsFor(row);
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
    trace: [...trace],
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
  if (payload.office) {
    fact.office = payload.office;
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
  const office = asOffice(row.raw.office);
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
  const sourceRefs = payloadSourceRefs(row.raw);

  return {
    objectType: "task",
    ...(floatProjectId ? { floatProjectId } : {}),
    ...(projectCode ? { projectCode } : {}),
    ...(projectName ? { projectName } : {}),
    ...(taskId ? { taskId } : {}),
    ...(personId ? { personId } : {}),
    ...(personName ? { personName } : {}),
    ...(office ? { office } : {}),
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
    ...(assignedPeople ? { assignedPeople } : {}),
    ...(sourceRefs !== undefined ? { sourceRefs } : {})
  };
}

function shapeLiveFloatApiRows(rows: readonly ArchivedRawSourceRow[]): ShapedFloatRows {
  const projects = new Map<string, FloatApiProject>();
  const people = new Map<string, FloatApiPerson>();
  const explicitTaskRows: ArchivedRawSourceRow[] = [];
  const apiTaskRows: ArchivedRawSourceRow[] = [];
  let lookupRowsSkipped = 0;

  for (const row of rows) {
    if (!isRecord(row.raw)) {
      explicitTaskRows.push(row);
      continue;
    }

    if (row.raw.objectType === "project") {
      const project = parseApiProject(row);
      if (project !== undefined) {
        projects.set(project.floatProjectId, project);
      }
      lookupRowsSkipped += 1;
      continue;
    }

    if (row.raw.objectType === "person") {
      const person = parseApiPerson(row);
      if (person !== undefined) {
        people.set(person.personId, person);
      }
      lookupRowsSkipped += 1;
      continue;
    }

    if (row.raw.objectType === "target_manifest") {
      lookupRowsSkipped += 1;
      continue;
    }

    if (row.raw.objectType === "task" && row.raw.floatProjectId === undefined && row.raw.project_id !== undefined) {
      apiTaskRows.push(row);
      continue;
    }

    explicitTaskRows.push(row);
  }

  return {
    rows: [
      ...explicitTaskRows,
      ...apiTaskRows.map((row) => shapeApiTaskRow(row, projects, people))
    ],
    lookupRowsSkipped
  };
}

function parseApiProject(row: ArchivedRawSourceRow): FloatApiProject | undefined {
  if (!isRecord(row.raw)) {
    return undefined;
  }

  const floatProjectId = asString(row.raw.project_id) ?? asString(row.raw.projectId) ?? row.identity.sourceObjectId;
  if (floatProjectId === undefined) {
    return undefined;
  }

  const activeValue = asNumber(row.raw.active);
  const projectName = asString(row.raw.name) ?? asString(row.raw.project_name);
  const projectCode = asString(row.raw.project_code) ?? asString(row.raw.projectCode) ?? projectCodeFromName(projectName);
  const tentative = asBooleanish(row.raw.tentative);

  return {
    row,
    floatProjectId,
    ...(projectCode !== undefined ? { projectCode } : {}),
    ...(projectName !== undefined ? { projectName } : {}),
    activeState: activeValue === 0 ? "inactive" : activeValue === 1 ? "active" : "unknown",
    ...(tentative !== undefined ? { tentative } : {})
  };
}

function parseApiPerson(row: ArchivedRawSourceRow): FloatApiPerson | undefined {
  if (!isRecord(row.raw)) {
    return undefined;
  }

  const personId = asString(row.raw.people_id) ?? asString(row.raw.person_id) ?? row.identity.sourceObjectId;
  if (personId === undefined) {
    return undefined;
  }

  const personName = asString(row.raw.name);
  const office = officeFromFloatDepartment(row.raw.department);
  const department = departmentFromFloatDepartment(row.raw.department);
  const role = asString(row.raw.job_title) ?? asString(row.raw.role);
  const peopleTypeId = asNumber(row.raw.people_type_id);
  const allocationClass =
    peopleTypeId === 4 || personName?.toLowerCase().includes("unallocated") === true
      ? "unallocated"
      : "allocated";

  return {
    row,
    personId,
    ...(personName !== undefined ? { personName } : {}),
    ...(office !== undefined ? { office } : {}),
    ...(department !== undefined ? { department } : {}),
    ...(role !== undefined ? { role } : {}),
    allocationClass
  };
}

function shapeApiTaskRow(
  row: ArchivedRawSourceRow,
  projects: ReadonlyMap<string, FloatApiProject>,
  people: ReadonlyMap<string, FloatApiPerson>
): ArchivedRawSourceRow {
  const raw = isRecord(row.raw) ? row.raw : {};
  const projectId = asString(raw.project_id) ?? asString(raw.projectId);
  const project = projectId === undefined ? undefined : projects.get(projectId);
  const peopleIds = personIdsFromTask(raw);
  const taskPeople = peopleIds.map((personId) => people.get(personId)).filter((person): person is FloatApiPerson => person !== undefined);
  const firstPerson = taskPeople[0];
  const hasMultiplePeople = peopleIds.length > 1;
  const activeState = project?.activeState ?? "unknown";
  const startDate = asString(raw.start_date) ?? asString(raw.startDate);
  const endDate = asString(raw.end_date) ?? asString(raw.endDate);
  const shapedRaw: Record<string, unknown> = {
    objectType: "task",
    floatProjectId: project?.floatProjectId ?? projectId,
    projectCode: project?.projectCode,
    projectName: project?.projectName,
    taskId: asString(raw.task_id) ?? asString(raw.taskId) ?? row.identity.sourceObjectId,
    personId: hasMultiplePeople ? undefined : firstPerson?.personId,
    personName: hasMultiplePeople ? "Multiple people" : firstPerson?.personName,
    office: firstPerson?.office,
    department: firstPerson?.department,
    role: firstPerson?.role,
    startDate,
    endDate,
    month: monthFromDate(startDate),
    hours: asNumber(raw.hours),
    tentative: asBooleanish(raw.tentative) ?? project?.tentative,
    activeState,
    allocationClass: hasMultiplePeople ? "pencil" : firstPerson?.allocationClass ?? "orphan",
    expansionRule: "float_api_daily_hours_not_calendar_expanded",
    assignedPeople: hasMultiplePeople
      ? taskPeople.map((person) => ({
          personId: person.personId,
          ...(person.personName !== undefined ? { personName: person.personName } : {})
        }))
      : undefined,
    sourceRefs: [
      ...sourceRefsFor(row),
      ...(project === undefined ? [] : sourceRefsFor(project.row)),
      ...taskPeople.flatMap((person) => sourceRefsFor(person.row))
    ]
  };

  return {
    ...row,
    raw: shapedRaw
  };
}

function payloadSourceRefs(raw: ArchivedRawSourceRow["raw"]): readonly SourceTraceRef[] | undefined {
  if (!isRecord(raw) || !Array.isArray(raw.sourceRefs)) {
    return undefined;
  }

  return raw.sourceRefs.filter(isSourceTraceRef);
}

function isSourceTraceRef(value: unknown): value is SourceTraceRef {
  return isRecord(value) && value.source === FLOAT_SOURCE && typeof value.sourceLayer === "string";
}

function personIdsFromTask(raw: Readonly<Record<string, unknown>>): string[] {
  const ids = new Set<string>();

  addPersonId(ids, raw.people_id);
  addPersonId(ids, raw.person_id);
  addPersonId(ids, raw.people_ids);
  addPersonId(ids, raw.person_ids);

  return [...ids];
}

function addPersonId(ids: Set<string>, value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach((item) => addPersonId(ids, item));
    return;
  }

  const stringValue = asString(value);
  if (stringValue !== undefined) {
    ids.add(stringValue);
  }
}

function projectCodeFromName(projectName: string | undefined): string | undefined {
  if (projectName === undefined) {
    return undefined;
  }

  return /\b[A-Z]{2,4}\d{4,5}\b/.exec(projectName)?.[0];
}

function departmentFromFloatDepartment(value: unknown): string | undefined {
  const rawName = isRecord(value) ? asString(value.name) : asString(value);
  if (rawName === undefined) {
    return undefined;
  }

  return rawName.replace(/^(LDN|NYC|USA|UCX)\s+/i, "").trim() || undefined;
}

function officeFromFloatDepartment(value: unknown): FloatFact["office"] | undefined {
  const rawName = isRecord(value) ? asString(value.name) : asString(value);
  const prefix = rawName?.trim().split(/\s+/)[0]?.toUpperCase();

  if (prefix === "LDN") return "LDN";
  if (prefix === "UCX") return "UCX";
  if (prefix === "USA" || prefix === "NYC") return "USA";

  return undefined;
}

function monthFromDate(value: string | undefined): string | undefined {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? value?.slice(0, 7) : undefined;
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

function asOffice(value: unknown): FloatFact["office"] | undefined {
  if (value === "LDN" || value === "USA" || value === "UCX" || value === "UNKNOWN") {
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
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asBooleanish(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1 ? true : value === 0 ? false : undefined;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }

  return undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
