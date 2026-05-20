import type {
  DashboardDisplayContract,
  DashboardScope,
  FloatFact,
  MetricValue,
  PipelineFact,
  ProductionRevenueFact,
  SoldFact,
  SourceFactSet,
  SourceTraceRef,
  SourceWarning
} from "../index";
import { buildDashboardDisplayContract } from "../index";

const generatedAt = "2026-05-20T00:00:00.000Z";

export function getFixtureDashboardContract(
  scope: DashboardScope = {
    office: "LDN",
    from: "2026-01-01",
    to: "2026-03-31"
  }
): DashboardDisplayContract {
  return buildDashboardDisplayContract({
    ...fixtureFactSet(),
    scope,
    generatedAt
  });
}

export function fixtureFactSet(): SourceFactSet {
  const designSold = soldFact({
    id: "fixture:sold:ucs04787",
    rawRowId: "fixture-fee-ucs04787-design",
    jobNumber: "UCS04787",
    floatProjectId: "11413929",
    client: "British Airways",
    projectName: "BA March Madness",
    department: "Design",
    role: "Senior Designer",
    amountGbp: 183_947,
    hoursValue: 420,
    month: "2026-02"
  });
  const strategySold = soldFact({
    id: "fixture:sold:ucs04154",
    rawRowId: "fixture-fee-ucs04154-strategy",
    jobNumber: "UCS04154",
    floatProjectId: "10480262",
    client: "Acme Studios",
    projectName: "Launch Planning",
    department: "Strategy",
    role: "Strategist",
    amountGbp: 92_000,
    hoursValue: 120,
    month: "2026-03"
  });
  const floatWarning = sourceWarning({
    id: "fixture:warning:pcs00250",
    sourceLayer: "float_cache",
    code: "PCS00250_CACHE_WITHOUT_RAW",
    message: "Cache has Float hours but raw Float canon has no current task rows.",
    rawRowId: "fixture-float-cache-pcs00250"
  });

  return {
    soldFacts: [designSold, strategySold],
    pipelineFacts: [
      pipelineFact({
        id: "fixture:pipeline:tbc",
        rawRowId: "fixture-pipeline-tbc",
        stablePipelineIdentity: "source-row:fixture-pipeline-tbc",
        client: "Jade Pipeline",
        projectName: "TBC Retail Pitch",
        amountGbp: 75_000,
        month: "2026-02"
      })
    ],
    productionRevenueFacts: [
      productionRevenueFact({
        id: "fixture:prod:archived",
        rawRowId: "fixture-prod-archived",
        jobNumber: "UCS09999",
        client: "Archived Client",
        projectName: "Archived Production Revenue",
        amountGbp: 35_000,
        month: "2026-03"
      })
    ],
    floatFacts: [
      floatFact({
        id: "fixture:float:ucs04787-visible",
        rawRowId: "fixture-float-visible-ucs04787",
        sourceLayer: "float_visible",
        jobNumber: "UCS04787",
        floatProjectId: "11413929",
        client: "British Airways",
        projectName: "BA March Madness",
        hoursValue: 861,
        month: "2026-02",
        department: "Design"
      }),
      floatFact({
        id: "fixture:float:ucs04787-raw",
        rawRowId: "fixture-float-raw-ucs04787",
        sourceLayer: "float_raw",
        jobNumber: "UCS04787",
        floatProjectId: "11413929",
        client: "British Airways",
        projectName: "BA March Madness",
        hoursValue: 1_597.5,
        month: "2026-02",
        department: "Design"
      }),
      floatFact({
        id: "fixture:float:pcs00250-cache",
        rawRowId: "fixture-float-cache-pcs00250",
        sourceLayer: "float_cache",
        jobNumber: "PCS00250",
        floatProjectId: "11392976",
        client: "Uncommon New Biz",
        projectName: "PCS00250 New Biz",
        hoursValue: 20,
        month: "2026-03",
        warnings: [floatWarning]
      }),
      floatFact({
        id: "fixture:float:bt-raw",
        rawRowId: "fixture-float-raw-bt",
        sourceLayer: "float_raw",
        jobNumber: "UCSBT001",
        floatProjectId: "1350219",
        client: "BT Group",
        projectName: "BT Launch Campaign",
        hoursValue: 2.1,
        month: "2026-02"
      }),
      floatFact({
        id: "fixture:float:ucs05186-canonical-visible",
        rawRowId: "fixture-float-visible-ucs05186-canonical",
        sourceLayer: "float_visible",
        jobNumber: "UCS05186",
        floatProjectId: "11413292",
        client: "Boldbean",
        projectName: "Boldbean Brand Platform",
        hoursValue: 1_051.4,
        month: "2026-03"
      }),
      floatFact({
        id: "fixture:float:ucs05186-manual-visible",
        rawRowId: "fixture-float-visible-ucs05186-manual",
        sourceLayer: "float_visible",
        jobNumber: "UCS05186",
        floatProjectId: "manual-ucs05186",
        client: "Boldbean",
        projectName: "Boldbean Manual Duplicate",
        hoursValue: 1_051,
        month: "2026-03",
        activeState: "archived",
        allocationClass: "orphan"
      })
    ],
    readOnlySqlFacts: [],
    syncLogFacts: [],
    sourceIssues: [floatWarning],
    capabilities: []
  };
}

function soldFact(input: {
  id: string;
  rawRowId: string;
  jobNumber: string;
  floatProjectId: string;
  client: string;
  projectName: string;
  department: string;
  role: string;
  amountGbp: number;
  hoursValue: number;
  month: string;
}): SoldFact {
  return {
    id: input.id,
    source: "fee_sheet",
    sourceLayer: "sold",
    rawRowIds: [input.rawRowId],
    batchId: "fixture-fee-sheet",
    jobNumber: input.jobNumber,
    floatProjectId: input.floatProjectId,
    feeSheetFloatId: input.floatProjectId,
    client: input.client,
    canonicalClient: input.client,
    projectName: input.projectName,
    sourceProjectName: input.projectName,
    office: "LDN",
    month: input.month,
    department: input.department,
    role: input.role,
    amount: money(input.amountGbp),
    hours: hours(input.hoursValue),
    isAdditive: true,
    confidence: "high",
    warnings: [],
    trace: trace("fee_sheet", "sold", input.rawRowId, "sold")
  };
}

function pipelineFact(input: {
  id: string;
  rawRowId: string;
  stablePipelineIdentity: string;
  client: string;
  projectName: string;
  amountGbp: number;
  month: string;
}): PipelineFact {
  return {
    id: input.id,
    source: "pipeline",
    sourceLayer: "pipeline",
    rawRowIds: [input.rawRowId],
    batchId: "fixture-pipeline",
    stablePipelineIdentity: input.stablePipelineIdentity,
    client: input.client,
    canonicalClient: input.client,
    projectName: input.projectName,
    sourceProjectName: input.projectName,
    office: "LDN",
    month: input.month,
    amount: money(input.amountGbp),
    isAdditive: true,
    confidence: "medium",
    warnings: [],
    trace: trace("pipeline", "pipeline", input.rawRowId, "pipeline")
  };
}

function productionRevenueFact(input: {
  id: string;
  rawRowId: string;
  jobNumber: string;
  client: string;
  projectName: string;
  amountGbp: number;
  month: string;
}): ProductionRevenueFact {
  return {
    id: input.id,
    source: "production_revenue",
    sourceLayer: "production_revenue",
    rawRowIds: [input.rawRowId],
    batchId: "fixture-production-revenue",
    jobNumber: input.jobNumber,
    client: input.client,
    canonicalClient: input.client,
    projectName: input.projectName,
    sourceProjectName: input.projectName,
    office: "LDN",
    month: input.month,
    amount: money(input.amountGbp),
    productionStatus: "CONFIRMED",
    isAdditive: true,
    confidence: "medium",
    warnings: [],
    trace: trace("production_revenue", "production_revenue", input.rawRowId, "productionRevenue")
  };
}

function floatFact(input: {
  id: string;
  rawRowId: string;
  sourceLayer: FloatFact["sourceLayer"];
  jobNumber: string;
  floatProjectId: string;
  client: string;
  projectName: string;
  hoursValue: number;
  month: string;
  department?: string;
  activeState?: FloatFact["activeState"];
  allocationClass?: FloatFact["allocationClass"];
  warnings?: SourceWarning[];
}): FloatFact {
  return {
    id: input.id,
    source: "float",
    sourceLayer: input.sourceLayer,
    rawRowIds: [input.rawRowId],
    batchId: "fixture-float",
    jobNumber: input.jobNumber,
    floatProjectId: input.floatProjectId,
    client: input.client,
    canonicalClient: input.client,
    projectName: input.projectName,
    sourceProjectName: input.projectName,
    office: "LDN",
    month: input.month,
    ...(input.department !== undefined ? { department: input.department } : {}),
    hours: hours(input.hoursValue),
    activeState: input.activeState ?? "active",
    allocationClass: input.allocationClass ?? (input.sourceLayer === "float_cache" ? "allocated" : "placeholder"),
    isAdditive: true,
    confidence: input.sourceLayer === "float_cache" ? "medium" : "high",
    warnings: input.warnings ?? [],
    trace: trace("float", input.sourceLayer, input.rawRowId, "floatHours")
  };
}

function money(amountGbp: number): MetricValue {
  return {
    kind: "money",
    value: {
      amountOriginal: amountGbp,
      currencyOriginal: "GBP",
      amountGbp,
      fxRateToGbp: 1,
      fxSource: "fixture",
      fxCapturedAt: generatedAt
    }
  };
}

function hours(value: number): MetricValue {
  return {
    kind: "hours",
    value,
    unit: "decimal_hours"
  };
}

function trace(
  source: SourceTraceRef["source"],
  sourceLayer: SourceTraceRef["sourceLayer"],
  rawRowId: string,
  field: string
): SourceTraceRef[] {
  return [
    {
      source,
      sourceLayer,
      batchId: `fixture-${source}`,
      rawRowId,
      field
    }
  ];
}

function sourceWarning(input: {
  id: string;
  sourceLayer: FloatFact["sourceLayer"];
  code: string;
  message: string;
  rawRowId: string;
}): SourceWarning {
  const sourceRefs = trace("float", input.sourceLayer, input.rawRowId, "floatHours");

  return {
    id: input.id,
    status: "PROCESS_WARN",
    lifecycleState: "open",
    source: "float",
    sourceLayer: input.sourceLayer,
    code: input.code,
    message: input.message,
    scope: {
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31"
    },
    owner: "Yunni",
    sourceRefs,
    firstSeenAt: generatedAt,
    lastSeenAt: generatedAt
  };
}
