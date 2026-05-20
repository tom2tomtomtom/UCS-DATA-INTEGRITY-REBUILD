import { describe, test } from "vitest";

describe("Warning lifecycle policy", () => {
  test.todo("keeps acknowledged warnings visible as acknowledged");
  test.todo("keeps source-fixed pending-refresh warnings visible until refreshed evidence exists");
  test.todo("resolves warnings only when source evidence proves the conflict is gone");
});
