import { describe, expect, it } from "vitest";
import { interestSchema } from "./interest-schema";

const valid = {
  petCode: "HFA-0001",
  name: "Nguyễn Thị Linh",
  contactMethod: "zalo",
  contactValue: "0901 234 567",
  ward: "Phường Diên Hồng",
  experience: "none",
  consent: true,
};
const issues = (input: object) =>
  interestSchema.safeParse(input).error?.issues.map((i) => `${String(i.path[0])}:${i.message}`) ?? [];

describe("interestSchema", () => {
  it("accepts a complete Zalo request", () => {
    expect(issues(valid)).toEqual([]);
  });
  it("accepts +84 numbers and email when chosen", () => {
    expect(issues({ ...valid, contactValue: "+84901234567" })).toEqual([]);
    expect(issues({ ...valid, contactMethod: "email", contactValue: "linh@gmail.com" })).toEqual([]);
  });
  it("requires explicit consent", () => {
    expect(issues({ ...valid, consent: false })).toEqual(["consent:consent"]);
  });
  it("reports a bad phone number even while other fields are empty", () => {
    expect(issues({ petCode: "HFA-0001", contactMethod: "zalo", contactValue: "12345" })).toContain(
      "contactValue:phone",
    );
  });
  it("validates email format only for the email method", () => {
    expect(issues({ ...valid, contactMethod: "email", contactValue: "0901234567" })).toEqual(["contactValue:email"]);
  });
});
