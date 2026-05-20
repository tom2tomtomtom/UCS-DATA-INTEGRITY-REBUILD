import type {
  CanonFact,
  DashboardScope,
  FloatFact,
  PipelineFact,
  ProductionRevenueFact,
  ReadOnlySqlFact,
  SoldFact,
  SourceFactSet,
  SourceTraceRef,
  SourceWarning,
  SyncLogFact
} from "../canon/types";
import type { ParserResult, ParserWarning } from "../parsers/types";
import { sourceCapabilityProfilesFromParserResults } from "./capabilities";

export type BuildSourceFactSetOptions = {
  readonly warningObservedAt?: string;
};

export function buildSourceFactSetFromParserResults(
  parserResults: readonly ParserResult[],
  options: BuildSourceFactSetOptions = {}
): SourceFactSet {
  const factSet: SourceFactSet = {
    soldFacts: [],
    pipelineFacts: [],
    productionRevenueFacts: [],
    floatFacts: [],
    readOnlySqlFacts: [],
    syncLogFacts: [],
    sourceIssues: [],
    capabilities: sourceCapabilityProfilesFromParserResults(parserResults)
  };
  const facts: CanonFact[] = [];

  for (const parserResult of parserResults) {
    for (const fact of parserResult.facts) {
      const clonedFact = cloneFact(fact);
      facts.push(clonedFact);
      appendFact(factSet, clonedFact);
    }
  }

  for (const fact of facts) {
    for (const warning of fact.warnings) {
      factSet.sourceIssues.push(cloneSourceWarning(warning));
    }
  }

  for (const parserResult of parserResults) {
    for (const parserWarning of parserResult.warnings) {
      const sourceWarning = sourceWarningFromParserWarning(
        parserWarning,
        facts,
        options.warningObservedAt
      );

      if (sourceWarning !== undefined) {
        factSet.sourceIssues.push(sourceWarning);
      }
    }
  }

  return factSet;
}

function appendFact(factSet: SourceFactSet, fact: CanonFact): void {
  if (fact.source === "fee_sheet") {
    factSet.soldFacts.push(fact as SoldFact);
    return;
  }

  if (fact.source === "pipeline") {
    factSet.pipelineFacts.push(fact as PipelineFact);
    return;
  }

  if (fact.source === "production_revenue") {
    factSet.productionRevenueFacts.push(fact as ProductionRevenueFact);
    return;
  }

  if (fact.source === "float") {
    factSet.floatFacts.push(fact as FloatFact);
    return;
  }

  if (fact.source === "read_only_sql") {
    factSet.readOnlySqlFacts.push(fact as ReadOnlySqlFact);
    return;
  }

  factSet.syncLogFacts.push(fact as SyncLogFact);
}

function sourceWarningFromParserWarning(
  parserWarning: ParserWarning,
  facts: readonly CanonFact[],
  warningObservedAt: string | undefined
): SourceWarning | undefined {
  if (!safeToPromote(parserWarning)) {
    return undefined;
  }

  const relatedFact = relatedFactFor(parserWarning, facts);
  const observedAt = warningObservedAt ?? "";

  return {
    id: parserWarningId(parserWarning),
    status: parserWarning.severity,
    lifecycleState: "open",
    source: parserWarning.source,
    sourceLayer: parserWarning.sourceLayer,
    code: parserWarning.code,
    message: parserWarning.message,
    scope: relatedFact === undefined ? sourceWideScope() : scopeForFact(relatedFact),
    owner: "Unknown",
    sourceRefs: parserWarning.sourceRefs.map(cloneSourceRef),
    firstSeenAt: observedAt,
    lastSeenAt: observedAt
  };
}

function safeToPromote(parserWarning: ParserWarning): boolean {
  return (
    parserWarning.batchId.trim() !== "" &&
    parserWarning.rawRowIds.length > 0 &&
    parserWarning.sourceRefs.length > 0
  );
}

function relatedFactFor(
  parserWarning: ParserWarning,
  facts: readonly CanonFact[]
): CanonFact | undefined {
  const rawRowIds = new Set(parserWarning.rawRowIds);

  return facts.find(
    (fact) =>
      fact.source === parserWarning.source &&
      fact.rawRowIds.some((rawRowId) => rawRowIds.has(rawRowId))
  );
}

function scopeForFact(fact: CanonFact): DashboardScope {
  const dates = datesForFact(fact);
  const scope: DashboardScope = {
    office: fact.office === "LDN" || fact.office === "USA" || fact.office === "UCX" ? fact.office : "ALL",
    from: dates.from,
    to: dates.to
  };

  if (fact.client !== undefined) {
    scope.client = fact.client;
  }
  if (fact.jobNumber !== undefined) {
    scope.jobNumber = fact.jobNumber;
  }
  if (fact.floatProjectId !== undefined) {
    scope.floatProjectId = fact.floatProjectId;
  }
  if (fact.department !== undefined) {
    scope.department = fact.department;
  }
  if (fact.role !== undefined) {
    scope.role = fact.role;
  }

  return scope;
}

function datesForFact(fact: CanonFact): Pick<DashboardScope, "from" | "to"> {
  if (fact.from !== undefined || fact.to !== undefined) {
    const from = fact.from ?? fact.to ?? "";
    const to = fact.to ?? fact.from ?? "";
    return { from, to };
  }

  if (fact.month !== undefined) {
    const from = `${fact.month.slice(0, 7)}-01`;
    return { from, to: monthEndFor(from) };
  }

  return { from: "", to: "" };
}

function sourceWideScope(): DashboardScope {
  return {
    office: "ALL",
    from: "",
    to: ""
  };
}

function monthEndFor(monthStart: string): string {
  const [yearPart, monthPart] = monthStart.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex)) {
    return monthStart;
  }

  return new Date(Date.UTC(year, monthIndex + 1, 0)).toISOString().slice(0, 10);
}

function parserWarningId(parserWarning: ParserWarning): string {
  return [
    "parser",
    parserWarning.source,
    parserWarning.sourceLayer,
    parserWarning.batchId,
    parserWarning.code,
    ...parserWarning.rawRowIds
  ].join(":");
}

function cloneFact<TFact extends CanonFact>(fact: TFact): TFact {
  return {
    ...fact,
    rawRowIds: [...fact.rawRowIds],
    warnings: fact.warnings.map(cloneSourceWarning),
    trace: fact.trace.map(cloneSourceRef)
  } as TFact;
}

function cloneSourceWarning(warning: SourceWarning): SourceWarning {
  return {
    ...warning,
    scope: { ...warning.scope },
    sourceRefs: warning.sourceRefs.map(cloneSourceRef)
  };
}

function cloneSourceRef(sourceRef: SourceTraceRef): SourceTraceRef {
  return { ...sourceRef };
}
