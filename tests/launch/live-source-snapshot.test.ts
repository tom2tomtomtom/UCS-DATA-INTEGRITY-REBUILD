import { describe, expect, test } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { pathToFileURL } from "node:url";

type LiveSourceSnapshotModule = {
  readonly buildLiveSourceSnapshot: (input: {
    readonly env: Record<string, string>;
    readonly fetchImpl: (url: string, init?: unknown) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;
    readonly now: string;
    readonly maxRows: number;
  }) => Promise<{
    readonly snapshot: { readonly readOnly: boolean; readonly sources: readonly { readonly source: string }[] };
    readonly summary: {
      readonly ready: boolean;
      readonly sourceRows: Record<string, number>;
    };
  }>;
  readonly summarizeSnapshot: (snapshot: unknown) => {
    readonly ready: boolean;
    readonly sourceRows: Record<string, number>;
  };
};

const liveSourceSnapshotModuleUrl = pathToFileURL(
  `${process.cwd()}/scripts/lib/live-source-snapshot.mjs`
).href;

const env = {
  GOOGLE_ACCESS_TOKEN: "fake_google_access_token",
  GOOGLE_SERVICE_ACCOUNT_KEY: "{}",
  FEE_TRACKER_SPREADSHEET_ID: "fee_tracker_sheet",
  PIPELINE_SHEET_ID: "pipeline_sheet",
  PRODUCTION_REVENUE_SHEET_ID: "production_revenue_sheet",
  FLOAT_API_KEY: "fake_float_key"
};

describe("Phase 10 live source snapshot builder", () => {
  test("builds a read-only four-stream snapshot without leaking secrets into the summary", async () => {
    const { buildLiveSourceSnapshot } = await loadLiveSourceSnapshotModule();
    const fetchCalls: string[] = [];
    const fetchImpl = async (url: string) => {
      fetchCalls.push(url);

      if (url.includes("/values/")) {
        return ok({
          values: [
            ["Header A", "Header B"],
            ["UCS04154", "Uncommon New Biz"]
          ]
        });
      }

      if (url.endsWith("/projects")) {
        return ok([
          {
            project_id: 10480262,
            project_code: "UCS04154",
            name: "UCS04154 Auto Linked"
          }
        ]);
      }

      return ok({ sheets: [{ properties: { title: "Sheet1" } }] });
    };

    const { snapshot, summary } = await buildLiveSourceSnapshot({
      env,
      fetchImpl,
      now: "2026-05-21T00:00:00.000Z",
      maxRows: 2
    });

    expect(snapshot.readOnly).toBe(true);
    expect(snapshot.sources.map((source: { readonly source: string }) => source.source)).toEqual([
      "fee_sheet",
      "pipeline",
      "production_revenue",
      "float"
    ]);
    expect(summary.ready).toBe(true);
    expect(summary.sourceRows).toEqual({
      fee_sheet: 2,
      pipeline: 2,
      production_revenue: 2,
      float: 1
    });
    expect(JSON.stringify(summary)).not.toContain("fake_google_access_token");
    expect(JSON.stringify(summary)).not.toContain("fake_float_key");
    expect(fetchCalls.some((url) => url.includes("fee_tracker_sheet"))).toBe(true);
    expect(fetchCalls.some((url) => url.includes("pipeline_sheet"))).toBe(true);
    expect(fetchCalls.some((url) => url.includes("production_revenue_sheet"))).toBe(true);
  });

  test("summary is not ready when any required source has no rows", async () => {
    const { summarizeSnapshot } = await loadLiveSourceSnapshotModule();
    const summary = summarizeSnapshot({
      snapshotId: "missing-float",
      capturedAt: "2026-05-21T00:00:00.000Z",
      readOnly: true,
      sources: [
        source("fee_sheet", 1),
        source("pipeline", 1),
        source("production_revenue", 1),
        source("float", 0)
      ]
    });

    expect(summary.ready).toBe(false);
    expect(summary.sourceRows.float).toBe(0);
  });

  test("accepts base64-encoded Google service account JSON without exposing it in output", async () => {
    const { buildLiveSourceSnapshot } = await loadLiveSourceSnapshotModule();
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const serviceAccountKey = Buffer.from(
      JSON.stringify({
        client_email: "snapshot@example.iam.gserviceaccount.com",
        private_key: privateKey.export({ format: "pem", type: "pkcs8" })
      })
    ).toString("base64");
    let tokenBody = "";
    const fetchImpl = async (url: string, init?: unknown) => {
      const requestInit = init as { readonly body?: URLSearchParams } | undefined;
      if (url.includes("oauth2.googleapis.com/token")) {
        tokenBody = requestInit?.body?.toString() ?? "";
        return ok({ access_token: "fake_google_access_token" });
      }

      if (url.includes("/values/")) {
        return ok({ values: [["A"], ["B"]] });
      }

      if (url.endsWith("/projects")) {
        return ok([{ project_id: 1 }]);
      }

      return ok({ sheets: [{ properties: { title: "Sheet1" } }] });
    };

    const { summary } = await buildLiveSourceSnapshot({
      env: {
        ...env,
        GOOGLE_ACCESS_TOKEN: "",
        GOOGLE_SERVICE_ACCOUNT_KEY: serviceAccountKey,
        GOOGLE_IMPERSONATE_EMAIL: "jade.barrett@uncommon.studio"
      },
      fetchImpl,
      now: "2026-05-21T00:00:00.000Z",
      maxRows: 2
    });

    expect(summary.ready).toBe(true);
    expect(decodeJwtClaimFromTokenRequest(tokenBody).sub).toBe("jade.barrett@uncommon.studio");
    expect(JSON.stringify(summary)).not.toContain(serviceAccountKey);
  });
});

async function loadLiveSourceSnapshotModule(): Promise<LiveSourceSnapshotModule> {
  return (await import(liveSourceSnapshotModuleUrl)) as LiveSourceSnapshotModule;
}

function source(name: string, rows: number) {
  return {
    source: name,
    rows: Array.from({ length: rows }, (_, index) => ({
      identity: { stableSourceRowKey: `${name}:${index}` },
      raw: { row: index }
    }))
  };
}

function ok(payload: unknown) {
  return {
    ok: true,
    status: 200,
    async json() {
      return payload;
    }
  };
}

function decodeJwtClaimFromTokenRequest(body: string): Record<string, unknown> {
  const assertion = new URLSearchParams(body).get("assertion");
  const claim = assertion?.split(".")[1] ?? "";

  return JSON.parse(Buffer.from(claim, "base64url").toString("utf8"));
}
