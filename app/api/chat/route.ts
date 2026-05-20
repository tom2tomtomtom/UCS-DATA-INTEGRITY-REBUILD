import {
  evidenceEventFromPack,
  generateEvidenceReport,
  routePlaybook,
  runInvestigation,
  type ChatStreamEvent
} from "../../../src/lib/chat";
import type { DashboardScope } from "../../../src/lib";

type ChatRequestBody = {
  readonly message?: string;
  readonly question?: string;
  readonly debugDraft?: string;
  readonly scope?: Partial<DashboardScope>;
  readonly jobNumber?: string;
  readonly floatProjectId?: string;
  readonly pastedFloatExport?: string;
};

const defaultScope: DashboardScope = {
  office: "LDN",
  from: "2026-01-01",
  to: "2026-03-31"
};

export async function POST(request: Request): Promise<Response> {
  const body = await safeJson(request);
  const question = body.message ?? body.question ?? "";
  const scope = scopeFromBody(body.scope);
  const playbook = routePlaybook(question);
  const pack = runInvestigation({
    question,
    scope,
    ...(body.jobNumber !== undefined ? { jobNumber: body.jobNumber } : {}),
    ...(body.floatProjectId !== undefined ? { floatProjectId: body.floatProjectId } : {}),
    ...(body.pastedFloatExport !== undefined ? { pastedFloatExport: body.pastedFloatExport } : {})
  });
  const report = generateEvidenceReport(pack, body.debugDraft);
  const events: ChatStreamEvent[] = [
    { type: "status", message: "Planning read-only investigation" },
    { type: "investigation", playbook: playbook.id, tasks: playbook.tasks },
    ...pack.toolsRun.flatMap((toolRun) => [
      { type: "tool_start" as const, tool: toolRun.tool, label: toolRun.label },
      { type: "tool_result" as const, tool: toolRun.tool, status: toolRun.status }
    ]),
    evidenceEventFromPack(pack),
    {
      type: "needs_codex",
      needed: pack.needsCodex.needed,
      reason: pack.needsCodex.reason,
      triggers: pack.needsCodex.triggers
    },
    ...(report.guard.status === "blocked"
      ? [
          {
            type: "error" as const,
            message: `claim guard blocked: ${report.guard.blockedClaims.map((claim) => claim.code).join(", ")}`
          }
        ]
      : [{ type: "text" as const, delta: report.text }])
  ];

  return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""), {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

async function safeJson(request: Request): Promise<ChatRequestBody> {
  try {
    const value = (await request.json()) as unknown;

    return isRecord(value) ? value : {};
  } catch {
    return {};
  }
}

function scopeFromBody(scope: Partial<DashboardScope> | undefined): DashboardScope {
  return {
    office: scope?.office ?? defaultScope.office,
    from: scope?.from ?? defaultScope.from,
    to: scope?.to ?? defaultScope.to,
    ...(scope?.department !== undefined ? { department: scope.department } : {}),
    ...(scope?.role !== undefined ? { role: scope.role } : {}),
    ...(scope?.client !== undefined ? { client: scope.client } : {}),
    ...(scope?.search !== undefined ? { search: scope.search } : {}),
    ...(scope?.jobNumber !== undefined ? { jobNumber: scope.jobNumber } : {}),
    ...(scope?.floatProjectId !== undefined ? { floatProjectId: scope.floatProjectId } : {})
  };
}

function isRecord(value: unknown): value is ChatRequestBody {
  return typeof value === "object" && value !== null;
}
