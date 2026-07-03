import { describe, expect, test } from "vitest";
import { checkProjectIsolation } from "../../scripts/check-project-isolation";

describe("LCS-P1-H02 project isolation guard", () => {
  test("repository isolation scan passes from the fixed local workspace", () => {
    expect(checkProjectIsolation()).toEqual([]);
  });
});
