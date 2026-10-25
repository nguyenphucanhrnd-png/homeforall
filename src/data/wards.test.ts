import { describe, expect, it } from "vitest";
import { buildDemoPets } from "@/lib/pets/demo-data";
import { filterPets, parsePetFilters } from "@/lib/pets/filter";
import { foldVi, HCMC_WARDS, UNKNOWN_WARD, WARD_SLUGS } from "./wards";

describe("ward list", () => {
  it("has 86 wards in Vietnamese alphabetical order", () => {
    expect(HCMC_WARDS).toHaveLength(86);
    expect(HCMC_WARDS.slice(0, 6).map((w) => w.name)).toEqual([
      "An Khánh",
      "An Lạc",
      "An Lạc A",
      "An Lợi Đông",
      "An Phú",
      "An Phú Đông",
    ]);
  });

  it("keeps Tân Quy and Tân Quý apart", () => {
    expect(HCMC_WARDS.find((w) => w.slug === "tan-quy")?.name).toBe("Tân Quy");
    expect(HCMC_WARDS.find((w) => w.slug === "tan-quy-2")?.name).toBe("Tân Quý");
  });

  it("searches without accents", () => {
    const hits = HCMC_WARDS.filter((w) => foldVi(w.name).includes(foldVi("binh trung")));
    expect(hits.map((w) => w.name)).toContain("Bình Trưng Đông");
    expect(foldVi("Đa Kao")).toBe("da kao");
  });
});

describe("ward filter", () => {
  const now = new Date("2026-11-20T10:00:00+07:00");
  const pets = buildDemoPets(now);

  it("parses ?ward=a,b and drops unknown slugs", () => {
    expect(parsePetFilters({ ward: "an-khanh,an-phu,nowhere" }).ward).toEqual(["an-khanh", "an-phu"]);
    expect(parsePetFilters({ ward: ["phu-my", "an-phu"] }).ward).toEqual(["phu-my", "an-phu"]);
  });

  it("is OR within the group and AND with other filters", () => {
    const either = filterPets(pets, parsePetFilters({ ward: "phu-my,an-khanh" }), now);
    expect(either.length).toBeGreaterThan(0);
    expect(either.every((p) => p.ward === "phu-my")).toBe(true);
    const dogs = filterPets(pets, parsePetFilters({ ward: "phu-my", species: "dog" }), now);
    expect(dogs.every((p) => p.ward === "phu-my" && p.species === "dog")).toBe(true);
  });

  it("never drops a pet: every ward is on the list or 'chưa rõ'", () => {
    expect(pets).toHaveLength(12);
    expect(pets.every((p) => WARD_SLUGS.has(p.ward) || p.ward === UNKNOWN_WARD)).toBe(true);
  });
});
