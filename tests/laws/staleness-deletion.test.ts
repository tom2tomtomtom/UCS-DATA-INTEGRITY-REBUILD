import { describe, test } from "vitest";

describe("Staleness and deletion policy", () => {
  test.todo("does not treat failed source batches as fresh truth");
  test.todo("marks partial batches without deleting previous evidence silently");
  test.todo("surfaces missing Float tasks as stale or deleted evidence");
  test.todo("records repaired sheet state without erasing prior warning history");
});
