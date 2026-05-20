import { describe, test } from "vitest";

describe("Chat investigation agent", () => {
  test.todo("rejects trap prompts that require unsupported claims");
  test.todo("surfaces tool errors in the investigation evidence");
  test.todo("reports unsupported checks as unsupported, not zero");
  test.todo("returns Needs Codex for tasks outside chat's read-only evidence boundary");
});
