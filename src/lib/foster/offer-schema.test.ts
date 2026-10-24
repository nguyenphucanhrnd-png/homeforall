import { describe, expect, it } from "vitest";
import { fosterOfferSchema } from "./offer-schema";

const valid = {
  species: "cat",
  sizes: ["small"],
  duration: "2to8w",
  ward: "Phường Phú Mỹ",
  from: "2026-11-20",
  contact: "0901234567",
  consent: true,
};
const fields = (input: object) =>
  fosterOfferSchema.safeParse(input).error?.issues.map((i) => String(i.path[0])) ?? [];

describe("fosterOfferSchema (journey F1)", () => {
  it("accepts a complete offer with a phone or an email", () => {
    expect(fields(valid)).toEqual([]);
    expect(fields({ ...valid, contact: "mai@gmail.com" })).toEqual([]);
  });
  it("needs at least one size and explicit consent", () => {
    expect(fields({ ...valid, sizes: [] })).toEqual(["sizes"]);
    expect(fields({ ...valid, consent: false })).toEqual(["consent"]);
  });
  it("rejects a contact that is neither a VN phone nor an email", () => {
    expect(fields({ ...valid, contact: "12345" })).toEqual(["contact"]);
  });
});
