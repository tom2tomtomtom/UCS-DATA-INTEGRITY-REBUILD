const appName = "ucs-data-integrity-rebuild";

export function GET(): Response {
  return Response.json({
    status: "ok",
    app: appName,
    environment: process.env.APP_ENV ?? "unknown",
    commit: process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? "unknown"
  });
}
