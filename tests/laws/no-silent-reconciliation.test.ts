import { describe, test } from "vitest";

describe("Law 2: the dashboard spots mistakes, it does not correct them", () => {
  test.todo("preserves CLIENT SUMMARY and V-tab values when they disagree");
  test.todo("classifies production status collisions without choosing a winner silently");
  test.todo("surfaces duplicate Float jobs without merging them");
  test.todo("surfaces duplicate fee tracker jobs as conflict evidence");
  test.todo("surfaces cross-office duplicate jobs as scoped conflicts");
});
