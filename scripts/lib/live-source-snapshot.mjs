import { createSign } from "node:crypto";

const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_URL = "https://sheets.googleapis.com/v4/spreadsheets";
const FLOAT_API_URL = "https://api.float.com/v3";
const FLOAT_PER_PAGE = 200;

const REQUIRED_SOURCES = ["fee_sheet", "pipeline", "production_revenue", "float"];

export async function buildLiveSourceSnapshot({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = new Date().toISOString(),
  maxRows = 100,
  floatScenarioCodes = parseList(env.FLOAT_EVIDENCE_SCENARIO_CODES),
  floatProjectIds = parseList(env.FLOAT_EVIDENCE_PROJECT_IDS),
  includeLinkedFeeSheets = env.FEE_SHEET_INCLUDE_LINKED === "1",
  linkedFeeSheetLimit = env.FEE_SHEET_LINKED_LIMIT === "all"
    ? "all"
    : parsePositiveInt(env.FEE_SHEET_LINKED_LIMIT)
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
        : sheetRanges(["LDN", "UCX", "USA"], "A", "I", maxRows),
      collectAllRanges: true,
      includeCellMetadata: true,
      linkedSheetOptions: includeLinkedFeeSheets
        ? { limit: linkedFeeSheetLimit ?? maxRows }
        : undefined,
      maxRows
    }),
    readSheetSource({
      env,
      fetchImpl,
      googleAccessToken,
      source: "pipeline",
      sourceLabel: "Pipeline",
      spreadsheetId: requiredEnv(env, "PIPELINE_SHEET_ID"),
      preferredRanges: env.PIPELINE_SNAPSHOT_RANGE ? [env.PIPELINE_SNAPSHOT_RANGE] : sheetRanges(["Sheet1"], "A", "U", maxRows),
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
        : sheetRanges(["PRODUCTION ONLY", "Sheet1"], "A", "U", maxRows),
      maxRows
    })
  ]);
  const floatSource = await readFloatSource({
    env,
    fetchImpl,
    now,
    maxRows,
    floatScenarioCodes,
    floatProjectIds
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
  collectAllRanges = false,
  includeCellMetadata = false,
  linkedSheetOptions,
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
  const collectedRows = [];
  const collectedRanges = [];
  for (const range of ranges) {
    try {
      const rows = includeCellMetadata
        ? await fetchSheetRowsWithCellMetadata({
          fetchImpl,
          googleAccessToken,
          spreadsheetId,
          range,
          source,
          maxRows
        })
        : [];
      const values = rows.length > 0 ? [] : await fetchSheetValues({
        fetchImpl,
        googleAccessToken,
        spreadsheetId,
        range
      });
      const snapshotRows = rows.length > 0 ? rows : valuesToSnapshotRows({
        source,
        spreadsheetId,
        range,
        values,
        maxRows
      });

      if (snapshotRows.length > 0) {
        if (collectAllRanges) {
          collectedRows.push(...snapshotRows);
          collectedRanges.push(range);
          continue;
        }

        return {
          source,
          mode: "read_only_live",
          sourceLabel,
          sourceVersion: `range:${range}`,
          rows: snapshotRows
        };
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (collectAllRanges && collectedRows.length > 0) {
    const linkedRows = linkedSheetOptions
      ? await readLinkedFeeSheetRows({
        fetchImpl,
        googleAccessToken,
        parentRows: collectedRows,
        limit: linkedSheetOptions.limit,
        maxRows
      })
      : [];

    return {
      source,
      mode: "read_only_live",
      sourceLabel,
      sourceVersion: `ranges:${collectedRanges.join(",")}${linkedRows.length > 0 ? " + linked fee sheets" : ""}`,
      rows: [...collectedRows, ...linkedRows]
    };
  }

  throw new Error(`${sourceLabel} source snapshot produced no rows. ${errors.join(" ")}`.trim());
}

async function readLinkedFeeSheetRows({
  fetchImpl,
  googleAccessToken,
  parentRows,
  limit,
  maxRows
}) {
  const links = collectLinkedFeeSheetLinks(parentRows, limit);
  const rows = [];

  for (const link of links) {
    const tabTitles = await linkedFeeSheetTabTitles({
      fetchImpl,
      googleAccessToken,
      spreadsheetId: link.feeSheetSpreadsheetId
    });

    for (const tabTitle of tabTitles) {
      const linkedRows = await fetchSheetRowsWithCellMetadata({
        fetchImpl,
        googleAccessToken,
        spreadsheetId: link.feeSheetSpreadsheetId,
        range: rangeFor(tabTitle, "A", "AZ", maxRows),
        source: "fee_sheet",
        maxRows
      });

      rows.push(...linkedRows.map((row) => annotateLinkedFeeSheetRow(row, link)));
    }
  }

  return rows;
}

function collectLinkedFeeSheetLinks(parentRows, limit) {
  const links = [];
  const seen = new Set();

  for (const row of parentRows) {
    const raw = asRecord(row.raw);
    const cells = Array.isArray(raw.cells) ? raw.cells.map((cell) => String(cell ?? "")) : [];
    const cellLinks = Array.isArray(raw.cellLinks) ? raw.cellLinks : [];

    for (const cellLink of cellLinks) {
      const link = asRecord(cellLink);
      const uri = typeof link.uri === "string" ? link.uri : "";
      const feeSheetSpreadsheetId = spreadsheetIdFromGoogleSheetsUrl(uri);

      if (!feeSheetSpreadsheetId || seen.has(feeSheetSpreadsheetId)) continue;

      seen.add(feeSheetSpreadsheetId);
      links.push({
        feeTrackerStableSourceRowKey: row.identity?.stableSourceRowKey,
        feeTrackerSourceDocumentId: row.identity?.sourceDocumentId,
        feeTrackerSourceTab: row.identity?.sourceTab,
        feeTrackerSourceRowNumber: row.identity?.sourceRowNumber,
        feeTrackerOffice: row.identity?.sourceTab,
        feeTrackerClient: cells[1],
        feeTrackerJobNumber: cells[2],
        feeTrackerProjectName: cells[3],
        feeTrackerLinkDisplayValue: link.displayValue,
        feeSheetSpreadsheetId,
        feeSheetUrl: uri
      });

      if (limit !== "all" && links.length >= limit) {
        return links;
      }
    }
  }

  return links;
}

async function linkedFeeSheetTabTitles({ fetchImpl, googleAccessToken, spreadsheetId }) {
  const metadata = await fetchJson(fetchImpl, `${GOOGLE_SHEETS_URL}/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties(title,index)`, {
    headers: {
      Authorization: `Bearer ${googleAccessToken}`
    }
  });
  const tabs = (Array.isArray(metadata.sheets) ? metadata.sheets : [])
    .map((sheet) => asRecord(sheet).properties)
    .map(asRecord)
    .filter((properties) => typeof properties.title === "string")
    .sort((left, right) => numericIndex(left.index) - numericIndex(right.index));
  const selected = [];
  const firstTabTitle = tabs[0]?.title;

  if (typeof firstTabTitle === "string") {
    selected.push(firstTabTitle);
  }

  for (const tab of tabs) {
    const title = String(tab.title);
    const normalised = title.trim().toUpperCase();

    if (normalised === "CLIENT SUMMARY" || /^V\d+/i.test(title.trim())) {
      addUnique(selected, title);
    }
  }

  return selected;
}

function annotateLinkedFeeSheetRow(row, link) {
  return {
    ...row,
    raw: {
      ...asRecord(row.raw),
      linkedFeeSheet: link
    }
  };
}

function spreadsheetIdFromGoogleSheetsUrl(uri) {
  const match = uri.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);

  return match?.[1];
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

  return [rangeFor(title, "A", "Z", maxRows)];
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

async function fetchSheetRowsWithCellMetadata({
  fetchImpl,
  googleAccessToken,
  spreadsheetId,
  range,
  source,
  maxRows
}) {
  const fields = [
    "sheets(properties(title),data(startRow,startColumn,rowData(values(",
    "formattedValue,effectiveValue,userEnteredValue,hyperlink,userEnteredFormat/textFormat/link/uri,textFormatRuns(format/link/uri)",
    "))))"
  ].join("");
  const searchParams = new URLSearchParams({
    ranges: range,
    includeGridData: "true",
    fields
  });
  const url = `${GOOGLE_SHEETS_URL}/${encodeURIComponent(spreadsheetId)}?${searchParams.toString()}`;
  const payload = await fetchJson(fetchImpl, url, {
    headers: {
      Authorization: `Bearer ${googleAccessToken}`
    }
  });

  return gridDataToSnapshotRows({
    source,
    spreadsheetId,
    range,
    payload,
    maxRows
  });
}

function valuesToSnapshotRows({ source, spreadsheetId, range, values, maxRows }) {
  const tab = sourceTabFromRange(range);

  return limitRows(values, maxRows).flatMap((cells, index) => {
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

function gridDataToSnapshotRows({ source, spreadsheetId, range, payload, maxRows }) {
  const tab = sourceTabFromRange(range);
  const sheets = Array.isArray(payload?.sheets) ? payload.sheets : [];
  const sheet = sheets.find((candidate) => candidate?.properties?.title === tab) ?? sheets[0];
  const dataBlocks = Array.isArray(sheet?.data) ? sheet.data : [];
  const rows = [];

  for (const dataBlock of dataBlocks) {
    const rowData = Array.isArray(dataBlock?.rowData) ? dataBlock.rowData : [];
    const startRow = Number.isInteger(dataBlock?.startRow) ? dataBlock.startRow : 0;

    for (let index = 0; index < rowData.length; index += 1) {
      if (maxRows !== "all" && rows.length >= maxRows) return rows;

      const values = Array.isArray(rowData[index]?.values) ? rowData[index].values : [];
      const cells = trimTrailingEmptyCells(values.map(cellDisplayValue));

      if (cells.every((cell) => String(cell ?? "").trim() === "")) {
        continue;
      }

      const sourceRowNumber = startRow + index + 1;
      const cellLinks = extractCellLinks(values, cells);
      const raw = {
        source,
        rowNumber: sourceRowNumber,
        cells,
        ...(cellLinks.length > 0 ? { cellLinks } : {})
      };

      rows.push({
        identity: {
          stableSourceRowKey: `${spreadsheetId}:${tab}:${sourceRowNumber}`,
          sourceDocumentId: spreadsheetId,
          sourceTab: tab,
          sourceRowNumber
        },
        raw
      });
    }
  }

  return rows;
}

function cellDisplayValue(cell) {
  const record = asRecord(cell);

  return String(
    record.formattedValue ??
    scalarCellValue(record.effectiveValue) ??
    scalarCellValue(record.userEnteredValue) ??
    ""
  );
}

function scalarCellValue(value) {
  const record = asRecord(value);

  return record.stringValue ?? record.numberValue ?? record.boolValue ?? record.formulaValue;
}

function trimTrailingEmptyCells(cells) {
  let end = cells.length;

  while (end > 0 && String(cells[end - 1] ?? "").trim() === "") {
    end -= 1;
  }

  return cells.slice(0, end);
}

function extractCellLinks(values, cells) {
  const links = [];

  for (let index = 0; index < values.length; index += 1) {
    const cell = asRecord(values[index]);
    const link = linkForCell(cell);

    if (!link) continue;

    links.push({
      columnIndex: index + 1,
      columnLetter: columnLetter(index + 1),
      displayValue: cells[index] ?? cellDisplayValue(cell),
      uri: link.uri,
      linkSource: link.source
    });
  }

  return links;
}

function linkForCell(cell) {
  if (typeof cell.hyperlink === "string" && cell.hyperlink.trim() !== "") {
    return { uri: cell.hyperlink.trim(), source: "hyperlink" };
  }

  const formula = asRecord(cell.userEnteredValue).formulaValue;
  const formulaLink = typeof formula === "string" ? hyperlinkFormulaUri(formula) : undefined;
  if (formulaLink) {
    return { uri: formulaLink, source: "formula" };
  }

  const formatLink = asRecord(asRecord(asRecord(cell.userEnteredFormat).textFormat).link).uri;
  if (typeof formatLink === "string" && formatLink.trim() !== "") {
    return { uri: formatLink.trim(), source: "user_entered_format" };
  }

  const textFormatRuns = Array.isArray(cell.textFormatRuns) ? cell.textFormatRuns : [];
  for (const run of textFormatRuns) {
    const uri = asRecord(asRecord(run).format).link?.uri;
    if (typeof uri === "string" && uri.trim() !== "") {
      return { uri: uri.trim(), source: "text_format_run" };
    }
  }

  return undefined;
}

function hyperlinkFormulaUri(formula) {
  const match = formula.match(/^\s*=\s*HYPERLINK\s*\(\s*"([^"]+)"/i);

  return match?.[1]?.trim();
}

function columnLetter(columnIndex) {
  let value = columnIndex;
  let label = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
}

async function readFloatSource({ env, fetchImpl, now, maxRows, floatScenarioCodes = [], floatProjectIds = [] }) {
  const apiKey = requiredEnv(env, "FLOAT_API_KEY");

  if (maxRows === "all") {
    return readFullFloatSource({
      env,
      fetchImpl,
      now,
      apiKey,
      floatScenarioCodes,
      floatProjectIds
    });
  }

  const projects = await fetchJson(fetchImpl, `${FLOAT_API_URL}/projects`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    }
  });
  const projectRecords = asArray(projects, "projects");
  const rows = limitRows(projectRecords, maxRows).map((project, index) => floatProjectRow(asRecord(project), index));

  const targetManifest = await resolveFloatTargets({
    projectRecords,
    floatScenarioCodes,
    floatProjectIds,
    fetchImpl,
    apiKey
  });
  addTargetProjectRows(rows, targetManifest.resolvedProjectRecords, maxRows);

  if (targetManifest.resolvedProjectIds.length > 0) {
    const targetedRows = await readTargetedFloatRows({
      fetchImpl,
      apiKey,
      projectIds: targetManifest.resolvedProjectIds,
      taskWindow: resolveFloatTaskWindow(env, now),
      maxRows
    });

    rows.push(...targetedRows);
    rows.push(floatTargetManifestRow(targetManifest));
  }

  if (rows.length === 0) {
    throw new Error("Float source snapshot produced no project rows.");
  }

  return {
    source: "float",
    mode: "read_only_live",
    sourceLabel: targetManifest.resolvedProjectIds.length > 0 ? "Float API targeted evidence" : "Float Projects API",
    sourceVersion:
      targetManifest.resolvedProjectIds.length > 0
        ? "GET /v3/projects + targeted tasks/people"
        : "GET /v3/projects",
    rows
  };
}

async function readFullFloatSource({ env, fetchImpl, now, apiKey, floatScenarioCodes, floatProjectIds }) {
  const taskWindow = resolveFloatTaskWindow(env, now);
  const [projectRecords, taskRecords, peopleRecords] = await Promise.all([
    fetchFloatCollection({ fetchImpl, apiKey, endpoint: "/projects", collectionName: "projects" }),
    fetchFloatCollection({
      fetchImpl,
      apiKey,
      endpoint: "/tasks",
      collectionName: "tasks",
      params: {
        start_date: taskWindow.startDate,
        end_date: taskWindow.endDate
      }
    }),
    fetchFloatCollection({ fetchImpl, apiKey, endpoint: "/people", collectionName: "people" })
  ]);
  const targetManifest = await resolveFloatTargets({
    projectRecords,
    floatScenarioCodes,
    floatProjectIds,
    fetchImpl,
    apiKey
  });
  const rows = [
    ...floatRowsFor("project", "projects", projectRecords, "all"),
    ...floatRowsFor("task", "tasks", taskRecords, "all"),
    ...floatRowsFor("person", "people", peopleRecords, "all"),
    floatTargetManifestRow(targetManifest)
  ];

  if (rows.length === 1) {
    throw new Error("Float source snapshot produced no project, task, or people rows.");
  }

  return {
    source: "float",
    mode: "read_only_live",
    sourceLabel: "Float API full evidence",
    sourceVersion: "GET /v3/projects + /v3/tasks + /v3/people",
    rows
  };
}

async function readTargetedFloatRows({ fetchImpl, apiKey, projectIds, taskWindow, maxRows }) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
  const taskRows = [];

  for (const projectId of projectIds) {
    const params = new URLSearchParams({
      project_id: projectId,
      start_date: taskWindow.startDate,
      end_date: taskWindow.endDate
    });
    const tasks = await fetchJson(fetchImpl, `${FLOAT_API_URL}/tasks?${params.toString()}`, { headers });

    taskRows.push(...floatRowsFor("task", "tasks", asArray(tasks, "tasks"), maxRows));
  }

  const targetedPersonIds = collectPersonIds(taskRows);
  const peopleRows = targetedPersonIds.size === 0
    ? []
    : floatRowsFor("person", "people", asArray(await fetchJson(fetchImpl, `${FLOAT_API_URL}/people`, { headers }), "people"), maxRows)
        .filter((row) => targetedPersonIds.has(String(row.identity.sourceObjectId)));

  return [...dedupeRows(taskRows), ...dedupeRows(peopleRows)];
}

async function fetchFloatCollection({ fetchImpl, apiKey, endpoint, collectionName, params = {} }) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
  const rows = [];
  let page = 1;
  let totalPages = 1;

  do {
    const searchParams = new URLSearchParams({
      "per-page": String(FLOAT_PER_PAGE),
      page: String(page),
      ...params
    });
    const response = await fetchImpl(`${FLOAT_API_URL}${endpoint}?${searchParams.toString()}`, { headers });

    if (!response.ok) {
      throw new Error(`Read-only fetch failed with ${response.status} for ${safeUrl(`${FLOAT_API_URL}${endpoint}`)}.`);
    }

    totalPages = parsePositiveInt(response.headers?.get?.("x-pagination-page-count")) ?? 1;
    rows.push(...asArray(await response.json(), collectionName));
    page += 1;
  } while (page <= totalPages);

  return rows;
}

function floatRowsFor(objectType, collectionName, values, maxRows) {
  return limitRows(values, maxRows).map((value, index) => {
    const record = asRecord(value);
    const sourceObjectId = sourceObjectIdFor(objectType, record, index);

    return {
      identity: {
        stableSourceRowKey: `float:${collectionName}:${sourceObjectId}`,
        sourceObjectId
      },
      raw: {
        objectType,
        ...record
      }
    };
  });
}

async function resolveFloatTargets({ projectRecords, floatScenarioCodes, floatProjectIds, fetchImpl, apiKey }) {
  const requestedScenarioCodes = normalizeList(floatScenarioCodes);
  const requestedProjectIds = normalizeList(floatProjectIds);
  const matchedScenarioCodes = new Set();
  const resolvedProjectIds = [];
  const resolvedScenarios = [];
  const resolvedProjectRecords = [];
  const resolutionErrors = [];

  for (const code of requestedScenarioCodes) {
    let match = projectRecords.find((project) => projectMatchesScenario(asRecord(project), code));
    if (!match) {
      const remoteCandidates = await fetchProjectCandidatesByCode({ fetchImpl, apiKey, code, resolutionErrors });
      match = remoteCandidates.find((project) => projectMatchesScenario(asRecord(project), code));
    }

    if (match) {
      const projectRecord = asRecord(match);
      const floatProjectId = sourceObjectIdFor("project", projectRecord, 0);
      matchedScenarioCodes.add(code);
      addUnique(resolvedProjectIds, floatProjectId);
      resolvedScenarios.push({
        scenarioCode: code,
        floatProjectId,
        sourceStableSourceRowKey: `float:projects:${floatProjectId}`,
        sourceObjectId: floatProjectId
      });
      addUniqueProjectRecord(resolvedProjectRecords, projectRecord);
    }
  }

  for (const projectId of requestedProjectIds) {
    addUnique(resolvedProjectIds, projectId);
  }

  return {
    requestedScenarioCodes,
    requestedProjectIds,
    resolvedProjectRecords,
    resolvedProjectIds,
    resolvedScenarios,
    unresolvedScenarioCodes: requestedScenarioCodes.filter((code) => !matchedScenarioCodes.has(code)),
    resolutionErrors
  };
}

async function fetchProjectCandidatesByCode({ fetchImpl, apiKey, code, resolutionErrors }) {
  const params = new URLSearchParams({
    project_code: code,
    "per-page": "10",
    page: "1"
  });

  try {
    const response = await fetchJson(fetchImpl, `${FLOAT_API_URL}/projects?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    return asArray(response, "projects");
  } catch (error) {
    resolutionErrors.push({
      scenarioCode: code,
      message: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}

function projectMatchesScenario(project, scenarioCode) {
  const needle = scenarioCode.toLowerCase();
  const searchable = [
    project.project_code,
    project.code,
    project.name,
    project.project_name,
    project.client,
    project.client_name
  ];

  return searchable.some((value) => String(value ?? "").toLowerCase().includes(needle));
}

function floatTargetManifestRow(targetManifest) {
  const { resolvedProjectRecords: _resolvedProjectRecords, ...manifest } = targetManifest;

  return {
    identity: {
      stableSourceRowKey: "float:target-manifest",
      sourceObjectId: "target_manifest"
    },
    raw: {
      objectType: "target_manifest",
      ...manifest
    }
  };
}

function floatProjectRow(projectRecord, index) {
  const sourceObjectId = sourceObjectIdFor("project", projectRecord, index);

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
}

function addTargetProjectRows(rows, projectRecords, maxRows) {
  const existingKeys = new Set(rows.map((row) => row.identity.stableSourceRowKey));
  let added = 0;

  for (const projectRecord of projectRecords) {
    const row = floatProjectRow(projectRecord, added);
    if (!existingKeys.has(row.identity.stableSourceRowKey)) {
      rows.push(row);
      existingKeys.add(row.identity.stableSourceRowKey);
      added += 1;
    }

    if (maxRows !== "all" && added >= maxRows) return;
  }
}

function resolveFloatTaskWindow(env, now) {
  const startDate = env.FLOAT_EVIDENCE_START_DATE;
  const endDate = env.FLOAT_EVIDENCE_END_DATE;

  if (typeof startDate === "string" && startDate.trim() !== "" && typeof endDate === "string" && endDate.trim() !== "") {
    return {
      startDate: startDate.trim(),
      endDate: endDate.trim()
    };
  }

  const year = new Date(now).getUTCFullYear();

  return {
    startDate: `${year}-01-01`,
    endDate: `${year + 1}-12-31`
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

function asArray(value, collectionName) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.[collectionName])) return value[collectionName];
  return [];
}

function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function sourceObjectIdFor(objectType, record, index) {
  const candidates = {
    project: [record.project_id, record.projectId, record.id],
    task: [record.task_id, record.taskId, record.id],
    allocation: [record.allocation_id, record.allocationId, record.id],
    person: [record.people_id, record.person_id, record.peopleId, record.personId, record.id]
  }[objectType] ?? [record.id];
  const sourceObjectId = candidates.find((value) => value !== undefined && value !== null && String(value).trim() !== "");

  return String(sourceObjectId ?? `float-${objectType}-${index + 1}`);
}

function parsePositiveInt(value) {
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function numericIndex(value) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function collectPersonIds(rows) {
  const ids = new Set();

  rows.forEach((row) => {
    [
      row.raw.person_id,
      row.raw.people_id,
      row.raw.personId,
      row.raw.peopleId,
      row.raw.person_ids,
      row.raw.people_ids,
      row.raw.personIds,
      row.raw.peopleIds,
      row.raw.person,
      row.raw.people
    ].forEach((value) => addPersonIds(ids, value));
  });

  return ids;
}

function addPersonIds(ids, value) {
  if (value === undefined || value === null || value === "") return;

  if (Array.isArray(value)) {
    value.forEach((item) => addPersonIds(ids, item));
    return;
  }

  if (typeof value === "object") {
    const record = asRecord(value);
    addPersonIds(ids, record.people_id ?? record.person_id ?? record.peopleId ?? record.personId ?? record.id);
    return;
  }

  ids.add(String(value));
}

function dedupeRows(rows) {
  const seen = new Set();

  return rows.filter((row) => {
    const key = row.identity.stableSourceRowKey;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function addUnique(values, value) {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function addUniqueProjectRecord(values, record) {
  const id = sourceObjectIdFor("project", record, values.length);
  if (!values.some((value) => sourceObjectIdFor("project", value, 0) === id)) {
    values.push(record);
  }
}

function parseList(value) {
  if (typeof value !== "string") return [];
  return normalizeList(value.split(","));
}

function normalizeList(values) {
  return values.map((value) => String(value).trim()).filter((value) => value !== "");
}

function sourceTabFromRange(range) {
  const tab = range.split("!")[0] ?? range;

  return tab.replace(/^'|'$/g, "").replace(/''/g, "'");
}

function quoteSheetName(title) {
  return `'${title.replace(/'/g, "''")}'`;
}

function sheetRanges(tabs, startColumn, endColumn, maxRows) {
  return tabs.map((tab) => rangeFor(tab, startColumn, endColumn, maxRows));
}

function rangeFor(tab, startColumn, endColumn, maxRows) {
  const quotedTab = quoteSheetName(tab);

  return maxRows === "all"
    ? `${quotedTab}!${startColumn}:${endColumn}`
    : `${tab}!${startColumn}1:${endColumn}${maxRows}`;
}

function limitRows(values, maxRows) {
  return maxRows === "all" ? values : values.slice(0, maxRows);
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
