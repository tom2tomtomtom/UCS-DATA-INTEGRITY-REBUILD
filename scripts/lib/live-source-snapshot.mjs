import { createSign } from "node:crypto";

const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_URL = "https://sheets.googleapis.com/v4/spreadsheets";
const FLOAT_API_URL = "https://api.float.com/v3";

const REQUIRED_SOURCES = ["fee_sheet", "pipeline", "production_revenue", "float"];

export async function buildLiveSourceSnapshot({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = new Date().toISOString(),
  maxRows = 100
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("buildLiveSourceSnapshot requires fetch.");
  }

  const googleAccessToken = await getGoogleAccessToken({ env, fetchImpl, now });
  const sheetSources = await Promise.all([
    readSheetSource({
      env,
      fetchImpl,
      googleAccessToken,
      source: "fee_sheet",
      sourceLabel: "Fee Tracker",
      spreadsheetId: requiredEnv(env, "FEE_TRACKER_SPREADSHEET_ID"),
      preferredRanges: env.FEE_TRACKER_SNAPSHOT_RANGE
        ? [env.FEE_TRACKER_SNAPSHOT_RANGE]
        : ["LDN!A1:I1000", "UCX!A1:I1000", "USA!A1:I1000"],
      maxRows
    }),
    readSheetSource({
      env,
      fetchImpl,
      googleAccessToken,
      source: "pipeline",
      sourceLabel: "Pipeline",
      spreadsheetId: requiredEnv(env, "PIPELINE_SHEET_ID"),
      preferredRanges: env.PIPELINE_SNAPSHOT_RANGE ? [env.PIPELINE_SNAPSHOT_RANGE] : ["Sheet1!A1:U1000"],
      maxRows
    }),
    readSheetSource({
      env,
      fetchImpl,
      googleAccessToken,
      source: "production_revenue",
      sourceLabel: "Production Revenue",
      spreadsheetId: requiredEnv(env, "PRODUCTION_REVENUE_SHEET_ID"),
      preferredRanges: env.PRODUCTION_REVENUE_SNAPSHOT_RANGE
        ? [env.PRODUCTION_REVENUE_SNAPSHOT_RANGE]
        : ["PRODUCTION ONLY!A1:U1000", "Sheet1!A1:U1000"],
      maxRows
    })
  ]);
  const floatSource = await readFloatSource({
    env,
    fetchImpl,
    maxRows
  });

  const sources = [...sheetSources, floatSource];
  const snapshot = {
    snapshotId: `phase10-live-${safeTimestamp(now)}`,
    capturedAt: now,
    readOnly: true,
    sources
  };

  return {
    snapshot,
    summary: summarizeSnapshot(snapshot)
  };
}

export function summarizeSnapshot(snapshot) {
  const sourceRows = Object.fromEntries(
    REQUIRED_SOURCES.map((source) => [
      source,
      (snapshot.sources ?? []).find((candidate) => candidate.source === source)?.rows?.length ?? 0
    ])
  );

  return {
    snapshotId: snapshot.snapshotId,
    capturedAt: snapshot.capturedAt,
    readOnly: snapshot.readOnly === true,
    sourceRows,
    ready: REQUIRED_SOURCES.every((source) => sourceRows[source] > 0)
  };
}

async function readSheetSource({
  env,
  fetchImpl,
  googleAccessToken,
  source,
  sourceLabel,
  spreadsheetId,
  preferredRanges,
  maxRows
}) {
  const ranges = await resolveRanges({
    fetchImpl,
    googleAccessToken,
    spreadsheetId,
    preferredRanges,
    maxRows
  });

  const errors = [];
  for (const range of ranges) {
    try {
      const values = await fetchSheetValues({
        fetchImpl,
        googleAccessToken,
        spreadsheetId,
        range
      });
      const rows = valuesToSnapshotRows({
        source,
        spreadsheetId,
        range,
        values,
        maxRows
      });

      if (rows.length > 0) {
        return {
          source,
          mode: "read_only_live",
          sourceLabel,
          sourceVersion: `range:${range}`,
          rows
        };
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(`${sourceLabel} source snapshot produced no rows. ${errors.join(" ")}`.trim());
}

async function resolveRanges({
  fetchImpl,
  googleAccessToken,
  spreadsheetId,
  preferredRanges,
  maxRows
}) {
  if (preferredRanges.length > 0) {
    return preferredRanges;
  }

  const metadata = await fetchJson(fetchImpl, `${GOOGLE_SHEETS_URL}/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties.title`, {
    headers: {
      Authorization: `Bearer ${googleAccessToken}`
    }
  });
  const title = metadata.sheets?.[0]?.properties?.title;

  if (typeof title !== "string" || title.trim() === "") {
    throw new Error(`No readable tabs found for sheet ${spreadsheetId}.`);
  }

  return [`${quoteSheetName(title)}!A1:Z${maxRows}`];
}

async function fetchSheetValues({ fetchImpl, googleAccessToken, spreadsheetId, range }) {
  const encodedRange = encodeURIComponent(range);
  const url = `${GOOGLE_SHEETS_URL}/${encodeURIComponent(spreadsheetId)}/values/${encodedRange}`;
  const payload = await fetchJson(fetchImpl, url, {
    headers: {
      Authorization: `Bearer ${googleAccessToken}`
    }
  });

  return Array.isArray(payload.values) ? payload.values : [];
}

function valuesToSnapshotRows({ source, spreadsheetId, range, values, maxRows }) {
  const tab = sourceTabFromRange(range);

  return values.slice(0, maxRows).flatMap((cells, index) => {
    if (!Array.isArray(cells) || cells.every((cell) => String(cell ?? "").trim() === "")) {
      return [];
    }

    const sourceRowNumber = index + 1;

    return [
      {
        identity: {
          stableSourceRowKey: `${spreadsheetId}:${tab}:${sourceRowNumber}`,
          sourceDocumentId: spreadsheetId,
          sourceTab: tab,
          sourceRowNumber
        },
        raw: {
          source,
          rowNumber: sourceRowNumber,
          cells
        }
      }
    ];
  });
}

async function readFloatSource({ env, fetchImpl, maxRows }) {
  const apiKey = requiredEnv(env, "FLOAT_API_KEY");
  const projects = await fetchJson(fetchImpl, `${FLOAT_API_URL}/projects`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    }
  });
  const rows = asArray(projects).slice(0, maxRows).map((project, index) => {
    const projectRecord = asRecord(project);
    const sourceObjectId = String(projectRecord.project_id ?? projectRecord.id ?? `float-project-${index + 1}`);

    return {
      identity: {
        stableSourceRowKey: `float:projects:${sourceObjectId}`,
        sourceObjectId
      },
      raw: {
        objectType: "project",
        ...projectRecord
      }
    };
  });

  if (rows.length === 0) {
    throw new Error("Float source snapshot produced no project rows.");
  }

  return {
    source: "float",
    mode: "read_only_live",
    sourceLabel: "Float Projects API",
    sourceVersion: "GET /v3/projects",
    rows
  };
}

async function getGoogleAccessToken({ env, fetchImpl, now }) {
  if (env.GOOGLE_ACCESS_TOKEN && env.GOOGLE_ACCESS_TOKEN.trim() !== "") {
    return env.GOOGLE_ACCESS_TOKEN;
  }

  const serviceAccount = parseServiceAccountKey(requiredEnv(env, "GOOGLE_SERVICE_ACCOUNT_KEY"));
  const issuedAt = Math.floor(new Date(now).getTime() / 1000);
  const assertion = signJwt({
    header: {
      alg: "RS256",
      typ: "JWT"
    },
    claim: {
      iss: serviceAccount.client_email,
      scope: GOOGLE_SHEETS_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + 3600,
      ...(env.GOOGLE_IMPERSONATE_EMAIL && env.GOOGLE_IMPERSONATE_EMAIL.trim() !== ""
        ? { sub: env.GOOGLE_IMPERSONATE_EMAIL }
        : {})
    },
    privateKey: serviceAccount.private_key
  });
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion
  });
  const token = await fetchJson(fetchImpl, GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (typeof token.access_token !== "string" || token.access_token.trim() === "") {
    throw new Error("Google token response did not contain access_token.");
  }

  return token.access_token;
}

function parseServiceAccountKey(value) {
  const parsed = parseServiceAccountJson(value);

  if (typeof parsed.client_email !== "string" || typeof parsed.private_key !== "string") {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is missing client_email or private_key.");
  }

  return parsed;
}

function parseServiceAccountJson(value) {
  const trimmed = value.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    try {
      return JSON.parse(Buffer.from(trimmed, "base64").toString("utf8"));
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY must be JSON or base64-encoded JSON.");
    }
  }
}

function signJwt({ header, claim, privateKey }) {
  const signingInput = `${base64UrlJson(header)}.${base64UrlJson(claim)}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(privateKey);

  return `${signingInput}.${base64Url(signature)}`;
}

async function fetchJson(fetchImpl, url, init) {
  const response = await fetchImpl(url, init);

  if (!response.ok) {
    throw new Error(`Read-only fetch failed with ${response.status} for ${safeUrl(url)}.`);
  }

  return response.json();
}

function requiredEnv(env, key) {
  const value = env[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.projects)) return value.projects;
  return [];
}

function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function sourceTabFromRange(range) {
  const tab = range.split("!")[0] ?? range;

  return tab.replace(/^'|'$/g, "").replace(/''/g, "'");
}

function quoteSheetName(title) {
  return `'${title.replace(/'/g, "''")}'`;
}

function safeTimestamp(value) {
  return value.replace(/[^0-9A-Za-z]+/g, "-").replace(/^-|-$/g, "");
}

function base64UrlJson(value) {
  return base64Url(Buffer.from(JSON.stringify(value), "utf8"));
}

function base64Url(buffer) {
  return buffer.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function safeUrl(url) {
  return String(url).replace(/key=[^&]+/g, "key=[redacted]");
}
