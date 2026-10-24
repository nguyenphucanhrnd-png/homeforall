import { describe, expect, it } from "vitest";
import { dashboardPathFor, dashboardRole, isAppRole, safeNextPath } from "./roles";

describe("dashboardPathFor", () => {
  it("prefers the most privileged dashboard", () => {
    expect(dashboardPathFor(["adopter", "admin"])).toBe("/admin");
    expect(dashboardPathFor(["adopter", "rescue_partner"])).toBe("/dashboard/rescue");
  });
  it("sends volunteers and fosters to the same dashboard", () => {
    expect(dashboardPathFor(["volunteer"])).toBe(dashboardPathFor(["foster"]));
  });
  it("falls back to the adopter dashboard", () => {
    expect(dashboardPathFor([])).toBe("/dashboard/adopter");
  });
  it("maps paths back to roles", () => {
    expect(dashboardRole("/dashboard/foster")).toEqual(["foster", "volunteer"]);
  });
});

describe("isAppRole", () => {
  it("accepts known roles only", () => {
    expect(isAppRole("vet_partner")).toBe(true);
    expect(isAppRole("superuser")).toBe(false);
    expect(isAppRole(undefined)).toBe(false);
  });
});

describe("safeNextPath", () => {
  it.each([
    ["/vi/dashboard", "/vi/dashboard"],
    ["//evil.com", "/"],
    ["/\\evil.com", "/"],
    ["https://evil.com", "/"],
    ["", "/"],
    [null, "/"],
  ])("%s → %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});
