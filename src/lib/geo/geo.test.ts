import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  contains,
  distanceBand,
  haversine,
  mulberry32,
  nearest,
  normalizeVi,
  offset,
  parseCsv,
  resolveWard,
  streetOf,
  type Polygonal,
} from "./geo";

const BEN_THANH = { lat: 10.7725, lng: 106.698 };

describe("geo", () => {
  it("haversine ≈ 1 km for a 1 km offset in any direction", () => {
    for (const bearing of [0, 90, 180, 270, 45]) {
      expect(haversine(BEN_THANH, offset(BEN_THANH, 1000, bearing))).toBeCloseTo(1000, 0);
    }
  });

  it("distance bands never reveal exact metres", () => {
    expect(distanceBand(200)).toBe("lt1");
    expect(distanceBand(1500)).toBe("1to2");
    expect(distanceBand(3999)).toBe("2to4");
    expect(distanceBand(7000)).toBe("4to8");
    expect(distanceBand(20000)).toBe("gt8");
  });

  it("nearest returns k items sorted by distance", () => {
    const items = [0, 3000, 1000, 2000].map((m, i) => ({ id: `s${i}`, ...offset(BEN_THANH, m, 90) }));
    expect(nearest(items, BEN_THANH, 3).map((n) => n.item.id)).toEqual(["s0", "s2", "s3"]);
  });

  it("point-in-polygon respects holes", () => {
    const square: Polygonal = {
      type: "Polygon",
      coordinates: [
        [[106.6, 10.7], [106.8, 10.7], [106.8, 10.9], [106.6, 10.9], [106.6, 10.7]],
        [[106.69, 10.79], [106.71, 10.79], [106.71, 10.81], [106.69, 10.81], [106.69, 10.79]],
      ],
    };
    expect(contains(square, { lat: 10.75, lng: 106.65 })).toBe(true);
    expect(contains(square, { lat: 10.8, lng: 106.7 })).toBe(false); // in the hole
    expect(contains(square, { lat: 11, lng: 106.65 })).toBe(false);
  });

  it("resolveWard: polygon first, else nearest centroid within 3 km (approximate), else null", () => {
    const poly: Polygonal = { type: "Polygon", coordinates: [[[106.6, 10.7], [106.65, 10.7], [106.65, 10.75], [106.6, 10.75], [106.6, 10.7]]] };
    const wards = [
      { slug: "a", name: "A", centroid: { lat: 10.725, lng: 106.625 }, polygon: poly },
      { slug: "b", name: "B", centroid: BEN_THANH },
    ];
    expect(resolveWard({ lat: 10.72, lng: 106.62 }, wards)).toEqual({ ward: wards[0], approximate: false });
    expect(resolveWard(offset(BEN_THANH, 1500, 10), wards)).toEqual({ ward: wards[1], approximate: true });
    expect(resolveWard({ lat: 11.5, lng: 107.5 }, wards)).toBeNull();
  });

  it("mulberry32 is deterministic", () => {
    const a = mulberry32(2026);
    const b = mulberry32(2026);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("streetOf strips house numbers and prefixes", () => {
    expect(streetOf("219 Nguyễn Trãi")).toBe("nguyen trai");
    expect(streetOf("99 đường 3 tháng 2")).toBe("3 thang 2");
    expect(streetOf("38-40-42 Nguyễn Thị Thập")).toBe("nguyen thi thap");
    expect(streetOf("U50 Nguyễn Hữu Hào")).toBe("nguyen huu hao");
    expect(streetOf("27 Đường số 1, KDC Tân Phong")).toBe("so 1");
    expect(normalizeVi("Đặng Dung")).toBe("dang dung");
  });

  it("parses the team's vet CSV (BOM, quoted commas): 42 rows, no invented columns", () => {
    const rows = parseCsv(readFileSync(join(process.cwd(), "design-refs/data/vet_clinics.csv"), "utf8"));
    expect(rows).toHaveLength(42);
    expect(Object.keys(rows[0])).toEqual(["id", "name", "kind", "address_raw", "legacy_area", "multi_branch", "note"]);
    expect(rows.find((r) => r.id === "6")!.address_raw).toBe("Khu phố 6, Linh Trung");
    expect(rows.filter((r) => r.kind === "state_station")).toHaveLength(16);
  });
});
