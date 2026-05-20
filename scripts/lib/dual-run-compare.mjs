export function compareDualRunSnapshots(input) {
  if (input.oldDashboard.comparisonOnly !== true) {
    throw new Error("Old dashboard lane must be comparison evidence only.");
  }
  assertLaneScope("Source snapshot", input.scope, input.sourceSnapshot.scope);
  assertLaneScope("New display", input.scope, input.newDisplay.scope);
  assertLaneScope("Old dashboard", input.scope, input.oldDashboard.scope);

  const tolerance = input.tolerance ?? 0.01;
  const rowKeys = new Set([
    ...(input.sourceSnapshot.rows ?? []).map(rowGroupKey),
    ...(input.newDisplay.rows ?? []).map(rowGroupKey),
    ...(input.oldDashboard.rows ?? []).map(rowGroupKey)
  ]);
  const differences = [];

  for (const key of rowKeys) {
    const sourceRows = input.sourceSnapshot.rows.filter((row) => rowGroupKey(row) === key);
    const newRows = input.newDisplay.rows.filter((row) => rowGroupKey(row) === key);
    const oldRows = input.oldDashboard.rows.filter((row) => rowGroupKey(row) === key);
    const metric = metricForKey(key, [...sourceRows, ...newRows, ...oldRows]);
    const comparisonKey = comparisonKeyForRows(key, [...sourceRows, ...newRows, ...oldRows]);
    const sourceValue = sumRows(sourceRows);
    const newValue = sumRows(newRows);
    const oldValue = sumRows(oldRows);
    const sourceWarnings = warningsFor(sourceRows);

    if (sourceWarnings.length === 0 && valuesEqual(sourceValue, newValue, tolerance) && valuesEqual(newValue, oldValue, tolerance)) {
      continue;
    }

    const classification = classifyDifference({
      sourceValue,
      newValue,
      oldValue,
      sourceWarnings,
      newWarnings: warningsFor(newRows),
      tolerance
    });

    differences.push({
      metric,
      comparisonKey,
      classification,
      oldValue,
      newValue,
      sourceValue,
      sourceWarnings,
      message: messageFor(classification, metric, comparisonKey, { sourceValue, newValue, oldValue })
    });
  }

  return {
    status: statusForDifferences(differences),
    scope: pruneScope(input.scope),
    differences,
    warnings: differences.some((difference) => difference.sourceWarnings.length > 0)
      ? ["source_snapshot_has_open_warnings"]
      : []
  };
}

function classifyDifference(input) {
  if (input.sourceValue !== null && input.newValue === null) {
    return "new_bug";
  }

  if (input.sourceWarnings.length > 0 && valuesEqual(input.newValue, input.oldValue, input.tolerance)) {
    return "source_issue";
  }

  if (valuesEqual(input.sourceValue, input.newValue, input.tolerance) && !valuesEqual(input.sourceValue, input.oldValue, input.tolerance)) {
    return "old_bug";
  }

  if (valuesEqual(input.sourceValue, input.oldValue, input.tolerance) && !valuesEqual(input.sourceValue, input.newValue, input.tolerance)) {
    return "new_bug";
  }

  if (input.newWarnings.includes("intentional_change")) {
    return "intentional_change";
  }

  return "unresolved";
}

function messageFor(classification, metric, comparisonKey, values) {
  if (classification === "new_bug" && values.sourceValue !== null && values.newValue === null) {
    return `${metric} row ${comparisonKey} is missing from the new display contract.`;
  }

  if (classification === "unresolved") {
    return `${metric} row ${comparisonKey} is unresolved because all lanes disagree: source=${values.sourceValue}, new=${values.newValue}, old=${values.oldValue}.`;
  }

  if (classification === "source_issue") {
    return `${metric} differs because source evidence carries an open warning.`;
  }

  if (classification === "old_bug") {
    return `${metric} differs only in the old dashboard comparison lane.`;
  }

  if (classification === "new_bug") {
    return `${metric} differs in the new display contract while old and source agree.`;
  }

  return `${metric} differs by an explicitly marked intentional change.`;
}

function sumRows(rows) {
  if (rows.length === 0) return null;
  if (rows.some((row) => row.value === null)) return null;
  return rows.reduce((sum, row) => sum + row.value, 0);
}

function rowGroupKey(row) {
  return `${row.metric}:${row.comparisonKey ?? row.id}`;
}

function rowComparisonKey(row) {
  return row.comparisonKey ?? row.id;
}

function comparisonKeyForRows(key, rows) {
  const firstRow = rows[0];
  if (firstRow !== undefined) return rowComparisonKey(firstRow);
  return key.includes(":") ? key.split(":").slice(1).join(":") : key;
}

function metricForKey(key, rows) {
  const firstRow = rows[0];
  if (firstRow !== undefined) return firstRow.metric;
  return key.split(":")[0];
}

function statusForDifferences(differences) {
  if (differences.length === 0) return "pass";
  if (differences.some((difference) => difference.classification === "new_bug" || difference.classification === "unresolved")) {
    return "fail";
  }
  return "warn";
}

function assertLaneScope(label, scope, laneScope) {
  if (laneScope === undefined) return;
  if (JSON.stringify(normalizeScope(laneScope)) !== JSON.stringify(normalizeScope(scope))) {
    throw new Error(`${label} lane scope must match the comparison scope.`);
  }
}

function normalizeScope(scope) {
  return JSON.parse(JSON.stringify(pruneScope(scope)));
}

function pruneScope(scope) {
  return Object.fromEntries(
    Object.entries(scope)
      .filter(([, value]) => value !== undefined)
      .filter(([key]) => [
        "office",
        "from",
        "to",
        "department",
        "role",
        "client",
        "search",
        "jobNumber",
        "floatProjectId"
      ].includes(key))
      .sort(([a], [b]) => a.localeCompare(b))
  );
}

function valuesEqual(a, b, tolerance) {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) <= tolerance;
}

function warningsFor(rows) {
  return rows.flatMap((row) => row.warnings ?? []);
}
