import { describe, expect, test } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { pathToFileURL } from "node:url";

import {
  buildFloatTargetManifestEvidenceFromSnapshot,
  buildScenarioSourceEvidenceFromSnapshot
} from "../../src/lib/scenarios/named-scenario-report";

type LiveSourceSnapshotModule = {
  readonly buildLiveSourceSnapshot: (input: {
    readonly env: Record<string, string>;
    readonly fetchImpl: (url: string, init?: unknown) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;
    readonly now: string;
    readonly maxRows: number | "all";
    readonly floatScenarioCodes?: readonly string[];
    readonly floatProjectIds?: readonly string[];
    readonly includeLinkedFeeSheets?: boolean;
    readonly linkedFeeSheetLimit?: number | "all";
  }) => Promise<{
    readonly snapshot: {
      readonly readOnly: boolean;
      readonly sources: readonly {
        readonly source: string;
        readonly sourceVersion?: string;
        readonly rows?: readonly {
          readonly identity?: {
            readonly stableSourceRowKey?: string;
            readonly sourceObjectId?: string;
            readonly sourceTab?: string;
          };
          readonly raw?: Record<string, unknown>;
        }[];
      }[];
    };
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
      fee_sheet: 6,
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

  test("captures every Fee Tracker office tab so USA scenario evidence is not hidden behind LDN", async () => {
    const { buildLiveSourceSnapshot } = await loadLiveSourceSnapshotModule();
    const fetchImpl = async (url: string) => {
      if (url.includes("/values/")) {
        const decodedUrl = decodeURIComponent(url);

        if (decodedUrl.includes("LDN!")) {
          return ok({ values: [["JOB"], ["UCS04154"]] });
        }

        if (decodedUrl.includes("UCX!")) {
          return ok({ values: [["JOB"], ["UCX00001"]] });
        }

        if (decodedUrl.includes("USA!")) {
          return ok({ values: [["JOB"], ["USA00262"], ["USA00323"]] });
        }

        return ok({ values: [["Header"], ["Source row"]] });
      }

      if (url.endsWith("/projects")) {
        return ok([{ project_id: 10480262, project_code: "UCS04154" }]);
      }

      return ok({ sheets: [{ properties: { title: "Sheet1" } }] });
    };

    const { snapshot, summary } = await buildLiveSourceSnapshot({
      env,
      fetchImpl,
      now: "2026-05-21T00:00:00.000Z",
      maxRows: 10
    });
    const feeTracker = snapshot.sources.find((sourceRow) => sourceRow.source === "fee_sheet");
    const scenarioEvidence = buildScenarioSourceEvidenceFromSnapshot(snapshot, ["USA00262", "USA00323"]);

    expect(summary.sourceRows.fee_sheet).toBe(7);
    expect(feeTracker?.sourceVersion).toBe("ranges:LDN!A1:I10,UCX!A1:I10,USA!A1:I10");
    expect(feeTracker?.rows?.map((row) => row.identity?.sourceTab)).toEqual([
      "LDN",
      "LDN",
      "UCX",
      "UCX",
      "USA",
      "USA",
      "USA"
    ]);
    expect(scenarioEvidence).toEqual([
      expect.objectContaining({
        scenarioCode: "USA00262",
        sources: ["fee_sheet"],
        rowCount: 1
      }),
      expect.objectContaining({
        scenarioCode: "USA00323",
        sources: ["fee_sheet"],
        rowCount: 1
      })
    ]);
  });

  test("preserves Fee Tracker fee-sheet hyperlink evidence from grid cell metadata", async () => {
    const { buildLiveSourceSnapshot } = await loadLiveSourceSnapshotModule();
    const fetchCalls: string[] = [];
    const fetchImpl = async (url: string) => {
      fetchCalls.push(url);
      const decodedUrl = decodeURIComponent(url);

      if (decodedUrl.includes("fee_tracker_sheet") && decodedUrl.includes("includeGridData=true")) {
        return ok({
          sheets: [
            {
              properties: { title: "LDN" },
              data: [
                {
                  startRow: 0,
                  rowData: [
                    {
                      values: [
                        { formattedValue: "Created" },
                        { formattedValue: "Client" },
                        { formattedValue: "Job Number" },
                        { formattedValue: "Job Name" },
                        { formattedValue: "Fee Sheet Link" }
                      ]
                    },
                    {
                      values: [
                        { formattedValue: "09-06-2025" },
                        { formattedValue: "British Airways" },
                        { formattedValue: "UCS04787" },
                        { formattedValue: "BA Retainer" },
                        {
                          formattedValue: "UCS04787 Fee Sheet",
                          hyperlink: "https://docs.google.com/spreadsheets/d/linked-fee-sheet-id/edit"
                        },
                        {
                          formattedValue: "Formula Link",
                          effectiveValue: { numberValue: 1234 },
                          userEnteredValue: {
                            formulaValue: "=HYPERLINK(\"https://docs.google.com/spreadsheets/d/formula-linked-id/edit\",\"Formula Link\")"
                          }
                        },
                        {
                          formattedValue: "Rich Link",
                          textFormatRuns: [
                            {
                              startIndex: 0,
                              format: {
                                link: { uri: "https://docs.google.com/spreadsheets/d/rich-linked-id/edit" }
                              }
                            }
                          ]
                        },
                        {
                          formattedValue: "Format Link",
                          userEnteredFormat: {
                            textFormat: {
                              link: { uri: "https://docs.google.com/spreadsheets/d/format-linked-id/edit" }
                            }
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        });
      }

      if (decodedUrl.includes("fee_tracker_sheet") && decodedUrl.includes("/values/")) {
        return ok({
          values: [
            ["Created", "Client", "Job Number", "Job Name", "Fee Sheet Link"],
            [
              "09-06-2025",
              "British Airways",
              "UCS04787",
              "BA Retainer",
              "UCS04787 Fee Sheet",
              "Formula Link",
              "Rich Link",
              "Format Link"
            ]
          ]
        });
      }

      if (url.includes("/values/")) {
        return ok({ values: [["Header"], ["Source row"]] });
      }

      if (url.endsWith("/projects")) {
        return ok([{ project_id: 10480262, project_code: "UCS04154" }]);
      }

      return ok({ sheets: [{ properties: { title: "Sheet1" } }] });
    };

    const { snapshot } = await buildLiveSourceSnapshot({
      env: {
        ...env,
        FEE_TRACKER_SNAPSHOT_RANGE: "LDN!A1:I2"
      },
      fetchImpl,
      now: "2026-05-21T00:00:00.000Z",
      maxRows: 10
    });
    const feeRows = snapshot.sources.find((sourceRow) => sourceRow.source === "fee_sheet")?.rows ?? [];

    expect(fetchCalls.some((url) => decodeURIComponent(url).includes("includeGridData=true"))).toBe(true);
    expect(feeRows[1]?.raw).toMatchObject({
      cells: [
        "09-06-2025",
        "British Airways",
        "UCS04787",
        "BA Retainer",
        "UCS04787 Fee Sheet",
        "Formula Link",
        "Rich Link",
        "Format Link"
      ],
      cellLinks: [
        {
          columnIndex: 5,
          columnLetter: "E",
          displayValue: "UCS04787 Fee Sheet",
          uri: "https://docs.google.com/spreadsheets/d/linked-fee-sheet-id/edit",
          linkSource: "hyperlink"
        },
        {
          columnIndex: 6,
          columnLetter: "F",
          displayValue: "Formula Link",
          uri: "https://docs.google.com/spreadsheets/d/formula-linked-id/edit",
          linkSource: "formula"
        },
        {
          columnIndex: 7,
          columnLetter: "G",
          displayValue: "Rich Link",
          uri: "https://docs.google.com/spreadsheets/d/rich-linked-id/edit",
          linkSource: "text_format_run"
        },
        {
          columnIndex: 8,
          columnLetter: "H",
          displayValue: "Format Link",
          uri: "https://docs.google.com/spreadsheets/d/format-linked-id/edit",
          linkSource: "user_entered_format"
        }
      ],
      cellData: expect.arrayContaining([
        expect.objectContaining({
          columnIndex: 6,
          columnLetter: "F",
          formattedValue: "Formula Link",
          effectiveValue: 1234,
          userEnteredValue: "=HYPERLINK(\"https://docs.google.com/spreadsheets/d/formula-linked-id/edit\",\"Formula Link\")"
        })
      ])
    });
  });

  test("falls back to rendered values when rich fee tracker metadata is temporarily unavailable", async () => {
    const { buildLiveSourceSnapshot } = await loadLiveSourceSnapshotModule();
    const fetchImpl = async (url: string) => {
      const decodedUrl = decodeURIComponent(url);

      if (decodedUrl.includes("fee_tracker_sheet") && decodedUrl.includes("includeGridData=true")) {
        return {
          ok: false,
          status: 500,
          async json() {
            return {};
          },
          async text() {
            return "metadata unavailable";
          }
        };
      }

      if (decodedUrl.includes("fee_tracker_sheet") && decodedUrl.includes("/values/")) {
        return ok({
          values: [
            ["Created", "Client", "Job Number", "Job Name"],
            ["09-06-2025", "British Airways", "UCS04787", "BA Retainer"]
          ]
        });
      }

      if (url.includes("/values/")) {
        return ok({ values: [["Header"], ["Source row"]] });
      }

      if (url.endsWith("/projects")) {
        return ok([{ project_id: 10480262, project_code: "UCS04154" }]);
      }

      return ok({ sheets: [{ properties: { title: "Sheet1" } }] });
    };

    const { snapshot, summary } = await buildLiveSourceSnapshot({
      env: {
        ...env,
        FEE_TRACKER_SNAPSHOT_RANGE: "LDN!A1:I2"
      },
      fetchImpl,
      now: "2026-05-21T00:00:00.000Z",
      maxRows: 10
    });
    const feeRows = snapshot.sources.find((sourceRow) => sourceRow.source === "fee_sheet")?.rows ?? [];

    expect(summary.ready).toBe(true);
    expect(feeRows).toHaveLength(2);
    expect(feeRows[1]?.raw?.cells).toEqual(["09-06-2025", "British Airways", "UCS04787", "BA Retainer"]);
  });

  test("optionally archives linked fee-sheet tabs as raw source evidence", async () => {
    const { buildLiveSourceSnapshot } = await loadLiveSourceSnapshotModule();
    const fetchCalls: string[] = [];
    const fetchImpl = async (url: string) => {
      fetchCalls.push(url);
      const decodedUrl = decodeURIComponent(url);

      if (decodedUrl.includes("fee_tracker_sheet") && decodedUrl.includes("includeGridData=true")) {
        return ok({
          sheets: [
            {
              properties: { title: "LDN" },
              data: [
                {
                  startRow: 0,
                  rowData: [
                    {
                      values: [
                        { formattedValue: "Created" },
                        { formattedValue: "Client" },
                        { formattedValue: "Job Number" },
                        { formattedValue: "Job Name" },
                        { formattedValue: "Fee Sheet Link" }
                      ]
                    },
                    {
                      values: [
                        { formattedValue: "09-06-2025" },
                        { formattedValue: "British Airways" },
                        { formattedValue: "UCS04787" },
                        { formattedValue: "BA Retainer" },
                        {
                          formattedValue: "UCS04787 Fee Sheet",
                          hyperlink: "https://docs.google.com/spreadsheets/d/linked-fee-sheet-id/edit"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        });
      }

      if (decodedUrl.includes("fee_tracker_sheet") && decodedUrl.includes("/values/")) {
        return ok({
          values: [
            ["Created", "Client", "Job Number", "Job Name", "Fee Sheet Link"],
            ["09-06-2025", "British Airways", "UCS04787", "BA Retainer", "UCS04787 Fee Sheet"]
          ]
        });
      }

      if (decodedUrl.includes("linked-fee-sheet-id") && decodedUrl.includes("fields=sheets.properties")) {
        return ok({
          sheets: [
            { properties: { title: "FIRST TAB", index: 0 } },
            { properties: { title: "CLIENT SUMMARY", index: 1 } },
            { properties: { title: "V1", index: 2 } }
          ]
        });
      }

      if (decodedUrl.includes("linked-fee-sheet-id") && decodedUrl.includes("includeGridData=true")) {
        const title = decodedUrl.includes("CLIENT SUMMARY")
          ? "CLIENT SUMMARY"
          : decodedUrl.includes("V1")
            ? "V1"
            : "FIRST TAB";

        return ok({
          sheets: [
            {
              properties: { title },
              data: [
                {
                  startRow: 0,
                  rowData: [
                    {
                      values: [
                        { formattedValue: title },
                        { formattedValue: "UCS04787" },
                        { formattedValue: title === "FIRST TAB" ? "Float ID 10480262" : "100" }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        });
      }

      if (decodedUrl.includes("linked-fee-sheet-id") && decodedUrl.includes("/values/")) {
        const title = decodedUrl.includes("CLIENT%20SUMMARY") || decodedUrl.includes("CLIENT SUMMARY")
          ? "CLIENT SUMMARY"
          : decodedUrl.includes("V1")
            ? "V1"
            : "FIRST TAB";

        return ok({
          values: [[title, "UCS04787", title === "FIRST TAB" ? "Float ID 10480262" : "100"]]
        });
      }

      if (url.includes("/values/")) {
        return ok({ values: [["Header"], ["Source row"]] });
      }

      if (url.endsWith("/projects")) {
        return ok([{ project_id: 10480262, project_code: "UCS04154" }]);
      }

      return ok({ sheets: [{ properties: { title: "Sheet1" } }] });
    };

    const { snapshot, summary } = await buildLiveSourceSnapshot({
      env: {
        ...env,
        FEE_TRACKER_SNAPSHOT_RANGE: "LDN!A1:I2"
      },
      fetchImpl,
      now: "2026-05-21T00:00:00.000Z",
      maxRows: 10,
      includeLinkedFeeSheets: true,
      linkedFeeSheetLimit: 1
    });
    const feeRows = snapshot.sources.find((sourceRow) => sourceRow.source === "fee_sheet")?.rows ?? [];
    const linkedRows = feeRows.filter((row) => row.raw?.linkedFeeSheet);

    expect(summary.sourceRows.fee_sheet).toBe(5);
    expect(linkedRows.map((row) => row.identity?.sourceTab)).toEqual(["FIRST TAB", "CLIENT SUMMARY", "V1"]);
    expect(linkedRows[0]?.raw?.linkedFeeSheet).toMatchObject({
      feeTrackerJobNumber: "UCS04787",
      feeTrackerClient: "British Airways",
      feeTrackerOffice: "LDN",
      feeSheetSpreadsheetId: "linked-fee-sheet-id",
      feeSheetUrl: "https://docs.google.com/spreadsheets/d/linked-fee-sheet-id/edit"
    });
    expect(fetchCalls.some((url) => decodeURIComponent(url).includes("linked-fee-sheet-id"))).toBe(true);
  });

  test("preserves inaccessible linked fee sheets as read-error evidence instead of aborting", async () => {
    const { buildLiveSourceSnapshot } = await loadLiveSourceSnapshotModule();
    const fetchImpl = async (url: string) => {
      const decodedUrl = decodeURIComponent(url);

      if (decodedUrl.includes("fee_tracker_sheet") && decodedUrl.includes("includeGridData=true")) {
        return ok({
          sheets: [
            {
              properties: { title: "LDN" },
              data: [
                {
                  startRow: 0,
                  rowData: [
                    {
                      values: [
                        { formattedValue: "Created" },
                        { formattedValue: "Client" },
                        { formattedValue: "Job Number" },
                        { formattedValue: "Job Name" },
                        {
                          formattedValue: "Blocked Fee Sheet",
                          hyperlink: "https://docs.google.com/spreadsheets/d/blocked-fee-sheet-id/edit"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        });
      }

      if (decodedUrl.includes("fee_tracker_sheet") && decodedUrl.includes("/values/")) {
        return ok({ values: [["Created", "Client", "Job Number", "Job Name", "Blocked Fee Sheet"]] });
      }

      if (decodedUrl.includes("blocked-fee-sheet-id") && decodedUrl.includes("fields=sheets.properties")) {
        return {
          ok: false,
          status: 403,
          async json() {
            return {};
          },
          async text() {
            return "permission denied";
          }
        };
      }

      if (url.includes("/values/")) {
        return ok({ values: [["Header"], ["Source row"]] });
      }

      if (url.endsWith("/projects")) {
        return ok([{ project_id: 10480262, project_code: "UCS04154" }]);
      }

      return ok({ sheets: [{ properties: { title: "Sheet1" } }] });
    };

    const { snapshot, summary } = await buildLiveSourceSnapshot({
      env: {
        ...env,
        FEE_TRACKER_SNAPSHOT_RANGE: "LDN!A1:I1"
      },
      fetchImpl,
      now: "2026-05-21T00:00:00.000Z",
      maxRows: 10,
      includeLinkedFeeSheets: true,
      linkedFeeSheetLimit: 1
    });
    const feeRows = snapshot.sources.find((sourceRow) => sourceRow.source === "fee_sheet")?.rows ?? [];
    const errorRow = feeRows.find((row) => row.raw?.readError);

    expect(summary.ready).toBe(true);
    const raw = errorRow?.raw as { linkedFeeSheet?: { feeSheetSpreadsheetId?: string }; readError?: unknown } | undefined;

    expect(raw?.linkedFeeSheet?.feeSheetSpreadsheetId).toBe("blocked-fee-sheet-id");
    expect(raw?.readError).toMatchObject({
      stage: "metadata",
      tabTitle: "metadata"
    });
  });

  test("supports explicit all-row snapshots without the 1000-row approval cap", async () => {
    const { buildLiveSourceSnapshot } = await loadLiveSourceSnapshotModule();
    const fetchCalls: string[] = [];
    const fetchImpl = async (url: string) => {
      fetchCalls.push(url);

      if (url.includes("/values/")) {
        return ok({ values: [["Header"], ["Row 1"], ["Row 2"], ["Row 3"]] });
      }

      if (url.includes("/projects?")) {
        const page = new URL(url).searchParams.get("page");
        return ok(
          page === "1"
            ? [{ project_id: 1, project_code: "FLOAT001" }]
            : [{ project_id: 2, project_code: "FLOAT002" }],
          { "x-pagination-page-count": "2" }
        );
      }

      if (url.includes("/tasks?")) {
        return ok([{ task_id: 83, project_id: 1, people_id: 501, hours: 8 }]);
      }

      if (url.includes("/people?")) {
        return ok([{ people_id: 501, name: "Yunni Float Person" }]);
      }

      return ok({ sheets: [{ properties: { title: "Sheet1" } }] });
    };

    const { snapshot, summary } = await buildLiveSourceSnapshot({
      env,
      fetchImpl,
      now: "2026-05-21T00:00:00.000Z",
      maxRows: "all"
    });
    const decodedCalls = fetchCalls.map((url) => decodeURIComponent(url));

    expect(summary.sourceRows).toMatchObject({
      fee_sheet: 12,
      pipeline: 4,
      production_revenue: 4,
      float: 5
    });
    expect(snapshot.sources.find((sourceRow) => sourceRow.source === "float")?.sourceVersion).toBe(
      "GET /v3/projects + /v3/tasks + /v3/people"
    );
    expect(snapshot.sources.find((sourceRow) => sourceRow.source === "fee_sheet")?.sourceVersion).toBe(
      "ranges:'LDN'!A:I,'UCX'!A:I,'USA'!A:I"
    );
    expect(decodedCalls).toEqual(expect.arrayContaining([
      expect.stringContaining("'LDN'!A:I"),
      expect.stringContaining("'UCX'!A:I"),
      expect.stringContaining("'USA'!A:I"),
      expect.stringContaining("'PRODUCTION ONLY'!A:U"),
      expect.stringContaining("/projects?per-page=200&page=1"),
      expect.stringContaining("/projects?per-page=200&page=2"),
      expect.stringContaining("/tasks?per-page=200&page=1&start_date=2026-01-01&end_date=2027-12-31"),
      expect.stringContaining("/people?per-page=200&page=1")
    ]));
    expect(decodedCalls.some((url) => url.includes("A1:I1000"))).toBe(false);
    expect(decodedCalls.some((url) => url.includes("A1:U1000"))).toBe(false);
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
  }, 15000);

  test("adds targeted Float task and people evidence for named scenarios", async () => {
    const { buildLiveSourceSnapshot } = await loadLiveSourceSnapshotModule();
    const fetchCalls: string[] = [];
    const fetchImpl = async (url: string) => {
      fetchCalls.push(url);

      if (url.includes("/values/")) {
        return ok({ values: [["Project"], ["UCS04787"]] });
      }

      if (url.endsWith("/projects")) {
        return ok({
          projects: [
            {
              project_id: 10480262,
              project_code: "UCS04154",
              name: "UCS04154 Auto Linked"
            },
            {
              id: 4787,
              project_code: "UCS04787",
              name: "UCS04787 Float Scenario"
            }
          ]
        });
      }

      if (url.includes("/tasks")) {
        return ok({
          data: [
            {
              task_id: 83,
              project_id: 4787,
              person_id: 501,
              name: "Design allocation"
            }
          ]
        });
      }

      if (url.includes("/people")) {
        return ok([
          {
            people_id: 501,
            name: "Yunni Float Person"
          }
        ]);
      }

      return ok({ sheets: [{ properties: { title: "Sheet1" } }] });
    };

    const { snapshot, summary } = await buildLiveSourceSnapshot({
      env,
      fetchImpl,
      now: "2026-05-21T00:00:00.000Z",
      maxRows: 10,
      floatScenarioCodes: ["UCS04787", "UCS05186", "PCS00250", "BT"],
      floatProjectIds: ["10480262"]
    });

    const floatRows = snapshot.sources.find((sourceRow) => sourceRow.source === "float")?.rows ?? [];

    expect(summary.sourceRows.float).toBe(5);
    expect(floatRows.map((row) => row.raw?.objectType)).toEqual([
      "project",
      "project",
      "task",
      "person",
      "target_manifest"
    ]);
    expect(floatRows.map((row) => row.identity?.stableSourceRowKey)).toContain("float:tasks:83");
    expect(floatRows.map((row) => row.identity?.stableSourceRowKey)).toContain("float:people:501");
    expect(floatRows.at(-1)?.raw).toMatchObject({
      objectType: "target_manifest",
      requestedScenarioCodes: ["UCS04787", "UCS05186", "PCS00250", "BT"],
      requestedProjectIds: ["10480262"],
      resolvedProjectIds: ["4787", "10480262"],
      resolvedScenarios: [
        {
          scenarioCode: "UCS04787",
          floatProjectId: "4787",
          sourceStableSourceRowKey: "float:projects:4787",
          sourceObjectId: "4787"
        }
      ],
      unresolvedScenarioCodes: ["UCS05186", "PCS00250", "BT"]
    });
    expect(buildFloatTargetManifestEvidenceFromSnapshot(snapshot)?.resolvedScenarios).toEqual([
      {
        scenarioCode: "UCS04787",
        floatProjectId: "4787",
        sourceStableSourceRowKey: "float:projects:4787",
        sourceObjectId: "4787"
      }
    ]);
    expect(fetchCalls.some((url) => url.includes("/tasks?project_id=4787&start_date=2026-01-01&end_date=2027-12-31"))).toBe(true);
    expect(fetchCalls.some((url) => url.includes("/allocations"))).toBe(false);
    expect(fetchCalls.some((url) => url.endsWith("/people"))).toBe(true);
  });

  test("does not pull broad Float people rows when targeted task evidence has no person reference", async () => {
    const { buildLiveSourceSnapshot } = await loadLiveSourceSnapshotModule();
    const fetchCalls: string[] = [];
    const fetchImpl = async (url: string) => {
      fetchCalls.push(url);

      if (url.includes("/values/")) {
        return ok({ values: [["Project"], ["UCS04787"]] });
      }

      if (url.endsWith("/projects")) {
        return ok({
          projects: [
            {
              id: 4787,
              project_code: "UCS04787",
              name: "UCS04787 Float Scenario"
            }
          ]
        });
      }

      if (url.includes("/tasks")) {
        return ok({
          data: [
            {
              task_id: 83,
              project_id: 4787,
              name: "Design allocation"
            }
          ]
        });
      }

      if (url.includes("/allocations")) {
        return ok({ allocations: [] });
      }

      if (url.includes("/people")) {
        return ok([{ people_id: 501, name: "Unrelated Person" }]);
      }

      return ok({ sheets: [{ properties: { title: "Sheet1" } }] });
    };

    const { snapshot } = await buildLiveSourceSnapshot({
      env,
      fetchImpl,
      now: "2026-05-21T00:00:00.000Z",
      maxRows: 10,
      floatScenarioCodes: ["UCS04787"]
    });

    const floatRows = snapshot.sources.find((sourceRow) => sourceRow.source === "float")?.rows ?? [];

    expect(floatRows.map((row) => row.raw?.objectType)).toEqual(["project", "task", "target_manifest"]);
    expect(fetchCalls.some((url) => url.endsWith("/people"))).toBe(false);
  });

  test("resolves targeted Float scenario codes beyond the first project page", async () => {
    const { buildLiveSourceSnapshot } = await loadLiveSourceSnapshotModule();
    const fetchCalls: string[] = [];
    const fetchImpl = async (url: string) => {
      fetchCalls.push(url);

      if (url.includes("/values/")) {
        return ok({ values: [["Project"], ["UCS04787"]] });
      }

      if (url.endsWith("/projects")) {
        return ok({
          projects: [
            {
              project_id: 10480262,
              project_code: "UCS04154",
              name: "UCS04154 Auto Linked"
            }
          ]
        });
      }

      if (url.includes("/projects?project_code=UCS04787")) {
        return ok([
          {
            project_id: 4787,
            project_code: "UCS04787",
            name: "UCS04787 Float Scenario"
          }
        ]);
      }

      if (url.includes("/tasks")) {
        return ok({ data: [] });
      }

      return ok({ sheets: [{ properties: { title: "Sheet1" } }] });
    };

    const { snapshot } = await buildLiveSourceSnapshot({
      env,
      fetchImpl,
      now: "2026-05-21T00:00:00.000Z",
      maxRows: 10,
      floatScenarioCodes: ["UCS04787"]
    });

    const floatRows = snapshot.sources.find((sourceRow) => sourceRow.source === "float")?.rows ?? [];

    expect(floatRows.map((row) => row.identity?.stableSourceRowKey)).toContain("float:projects:4787");
    expect(floatRows.at(-1)?.raw).toMatchObject({
      objectType: "target_manifest",
      requestedScenarioCodes: ["UCS04787"],
      resolvedProjectIds: ["4787"],
      unresolvedScenarioCodes: []
    });
    expect(fetchCalls.some((url) => url.includes("/projects?project_code=UCS04787"))).toBe(true);
    expect(fetchCalls.some((url) => url.includes("/tasks?project_id=4787"))).toBe(true);
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

function ok(payload: unknown, headerValues: Record<string, string> = {}) {
  return {
    ok: true,
    status: 200,
    headers: {
      get(key: string) {
        return headerValues[key] ?? null;
      }
    },
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
