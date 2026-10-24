import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import vi from "../messages/vi.json";

const keys = (o: object, prefix = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

describe("messages", () => {
  it("vi and en have exactly the same keys", () => {
    expect(keys(en).sort()).toEqual(keys(vi).sort());
  });

  it("no string is empty", () => {
    const empty = (o: object, p = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        v && typeof v === "object" ? empty(v, `${p}${k}.`) : String(v).trim() === "" ? [`${p}${k}`] : [],
      );
    expect([...empty(vi), ...empty(en)]).toEqual([]);
  });
});
