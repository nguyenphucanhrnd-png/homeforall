import { describe, expect, it } from "vitest";
import { buildDemoPets } from "./demo-data";
import { coreCareProgress, filterPets, isStale, parsePetFilters } from "./filter";

const now = new Date("2026-11-20T10:00:00+07:00");
const pets = buildDemoPets(now);
const codes = (params: Record<string, string | string[]>) =>
  filterPets(pets, parsePetFilters(params), now).map((p) => p.code);

describe("parsePetFilters", () => {
  it("drops unknown values instead of failing", () => {
    const f = parsePetFilters({ species: ["cat", "unicorn"], age: "ancient", sort: "random" });
    expect(f.species).toEqual(["cat"]);
    expect(f.age).toEqual([]);
    expect(f.sort).toBe("updated");
  });
});

describe("filterPets", () => {
  it("lists only browsable statuses", () => {
    expect(codes({})).toHaveLength(pets.length);
    const all = filterPets(pets.map((p, i) => (i === 0 ? { ...p, status: "adopted" as const } : p)), parsePetFilters({}), now);
    expect(all.map((p) => p.code)).not.toContain("HFA-0001");
  });

  it("filters by species and ward together", () => {
    const result = filterPets(pets, parsePetFilters({ species: "dog", ward: "phu-my" }), now);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => p.species === "dog" && p.ward === "phu-my")).toBe(true);
  });

  it("good-with requires every selected companion", () => {
    const result = filterPets(pets, parsePetFilters({ good: ["kids", "cats"] }), now);
    expect(result.every((p) => p.goodWith.includes("kids") && p.goodWith.includes("cats"))).toBe(true);
  });

  it("vaccinated means core vaccine and rabies are both done", () => {
    expect(codes({ vaccinated: "1" })).not.toContain("HFA-0008"); // rabies planned
    expect(codes({ vaccinated: "1" })).toContain("HFA-0001");
  });

  it("ranks stale listings last, whatever the sort", () => {
    for (const sort of ["updated", "newest"]) {
      const list = filterPets(pets, parsePetFilters({ sort }), now);
      const firstStale = list.findIndex((p) => isStale(p, now));
      expect(firstStale).toBeGreaterThan(0);
      expect(list.slice(firstStale).every((p) => isStale(p, now))).toBe(true);
    }
  });

  it("sorts fresh listings by last confirmation by default", () => {
    expect(codes({})[0]).toBe("HFA-0005"); // confirmed today
  });
});

describe("coreCareProgress", () => {
  it("counts only completed core steps", () => {
    const mit = pets.find((p) => p.code === "HFA-0001")!;
    expect(coreCareProgress(mit)).toEqual({ done: 3, total: 4 });
  });
});
