import { describe, test } from "vitest";

describe("Law 6: raw rows are evidence, not automatic totals", () => {
  test.todo("does not sum CLIENT SUMMARY total rows as detail rows");
  test.todo("does not use V-tab detail rows as totals without additive proof");
  test.todo("does not double count duplicated role sections");
  test.todo("rejects raw parser rows as reportable totals without additive metadata");
});
