import { buildRuntimeReadinessReport } from "../../../src/lib/launch";

export function GET(): Response {
  const report = buildRuntimeReadinessReport({ env: process.env });

  return Response.json(report, {
    status: report.status === "fail" ? 503 : 200
  });
}
