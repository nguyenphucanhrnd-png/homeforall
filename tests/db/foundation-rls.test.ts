import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { as, asCommitted, createTestDb, createUser } from "./harness";

let db: PGlite;
let admin: string;
let owner: string;
let stranger: string;
let pendingOrgId: string;
let verifiedOrgId: string;

beforeAll(async () => {
  db = await createTestDb();
  admin = await createUser(db, "admin@demo.test", ["admin"]);
  owner = await createUser(db, "owner@demo.test");
  stranger = await createUser(db, "stranger@demo.test");

  pendingOrgId = await asCommitted(db, { role: "authenticated", userId: owner }, async (tx) => {
    const { rows } = await tx.query<{ id: string }>(
      `insert into public.organizations (type, slug, name, created_by)
       values ('rescue', 'nhom-cuu-ho-demo', '[Demo] Nhóm cứu hộ', $1) returning id`,
      [owner],
    );
    return rows[0].id;
  });

  const { rows } = await db.query<{ id: string }>(
    `insert into public.organizations (type, slug, name, verification_status, verified_at, is_demo)
     values ('vet', 'phong-kham-demo', '[Demo] Phòng khám', 'verified', now(), true) returning id`,
  );
  verifiedOrgId = rows[0].id;
}, 60_000);

describe("new-user bootstrap", () => {
  it("creates a profile and the adopter role", async () => {
    const roles = await db.query<{ role: string }>("select role from public.user_roles where user_id = $1", [
      stranger,
    ]);
    expect(roles.rows.map((r) => r.role)).toEqual(["adopter"]);
    const profile = await db.query("select 1 from public.profiles where id = $1", [stranger]);
    expect(profile.rows).toHaveLength(1);
  });
});

describe("anonymous visitors", () => {
  it("see only verified organisations", async () => {
    const ids = await as(db, { role: "anon" }, async (tx) =>
      (await tx.query<{ id: string }>("select id from public.organizations")).rows.map((r) => r.id),
    );
    expect(ids).toEqual([verifiedOrgId]);
  });

  it("cannot read profiles, roles or the audit log", async () => {
    for (const table of ["profiles", "user_roles", "audit_log"]) {
      await expect(
        as(db, { role: "anon" }, (tx) => tx.query(`select * from public.${table}`)),
      ).rejects.toThrow(/permission denied/);
    }
  });

  it("can read feature flags, and the public report form is off", async () => {
    const flag = await as(db, { role: "anon" }, async (tx) =>
      (await tx.query<{ enabled: boolean }>("select enabled from public.feature_flags where key = 'FEATURE_PUBLIC_REPORT'"))
        .rows[0],
    );
    expect(flag.enabled).toBe(false);
  });
});

describe("roles", () => {
  it("a user cannot grant themselves admin", async () => {
    await expect(
      as(db, { role: "authenticated", userId: stranger }, (tx) =>
        tx.query("insert into public.user_roles (user_id, role) values ($1, 'admin')", [stranger]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("a user sees only their own roles", async () => {
    const rows = await as(db, { role: "authenticated", userId: stranger }, async (tx) =>
      (await tx.query<{ user_id: string }>("select user_id from public.user_roles")).rows,
    );
    expect(rows.every((r) => r.user_id === stranger)).toBe(true);
  });

  it("an admin can grant a role", async () => {
    const count = await as(db, { role: "authenticated", userId: admin }, async (tx) => {
      await tx.query("insert into public.user_roles (user_id, role) values ($1, 'volunteer')", [stranger]);
      return (await tx.query("select 1 from public.user_roles where user_id = $1", [stranger])).rows.length;
    });
    expect(count).toBe(2);
  });
});

describe("partner onboarding (R1 skeleton)", () => {
  it("the applicant becomes owner and can see their pending organisation", async () => {
    const rows = await as(db, { role: "authenticated", userId: owner }, async (tx) =>
      (await tx.query<{ verification_status: string }>("select verification_status from public.organizations where id = $1", [pendingOrgId])).rows,
    );
    expect(rows).toEqual([{ verification_status: "pending" }]);
    const member = await db.query<{ member_role: string }>(
      "select member_role from public.org_members where org_id = $1 and user_id = $2",
      [pendingOrgId, owner],
    );
    expect(member.rows[0]?.member_role).toBe("owner");
  });

  it("other users cannot see a pending organisation", async () => {
    const rows = await as(db, { role: "authenticated", userId: stranger }, async (tx) =>
      (await tx.query("select id from public.organizations where id = $1", [pendingOrgId])).rows,
    );
    expect(rows).toHaveLength(0);
  });

  it("an applicant cannot create an already-verified organisation", async () => {
    await expect(
      as(db, { role: "authenticated", userId: stranger }, (tx) =>
        tx.query(
          `insert into public.organizations (type, slug, name, created_by, verification_status)
           values ('rescue', 'tu-xac-minh', 'Self verified', $1, 'verified')`,
          [stranger],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("the owner cannot verify their own organisation", async () => {
    await expect(
      as(db, { role: "authenticated", userId: owner }, (tx) =>
        tx.query("update public.organizations set verification_status = 'verified' where id = $1", [pendingOrgId]),
      ),
    ).rejects.toThrow(/admin-only/);
  });

  it("the owner can set capacity, which stamps capacity_updated_at", async () => {
    const row = await as(db, { role: "authenticated", userId: owner }, async (tx) =>
      (
        await tx.query<{ capacity_updated_at: Date | null }>(
          "update public.organizations set capacity_status = 'nearly_full' where id = $1 returning capacity_updated_at",
          [pendingOrgId],
        )
      ).rows[0],
    );
    expect(row.capacity_updated_at).not.toBeNull();
  });

  it("a stranger cannot edit someone else's organisation", async () => {
    const affected = await as(db, { role: "authenticated", userId: stranger }, async (tx) =>
      (await tx.query("update public.organizations set name = 'Hijacked' where id = $1", [pendingOrgId])).affectedRows,
    );
    expect(affected).toBe(0);
  });

  it("an admin can verify, and the change is audited", async () => {
    const audit = await as(db, { role: "authenticated", userId: admin }, async (tx) => {
      await tx.query(
        "update public.organizations set verification_status = 'verified', verified_at = now(), verified_by = $2 where id = $1",
        [pendingOrgId, admin],
      );
      return (
        await tx.query<{ action: string; actor_id: string }>(
          "select action, actor_id from public.audit_log where entity_id = $1 order by id desc limit 1",
          [pendingOrgId],
        )
      ).rows[0];
    });
    expect(audit).toEqual({ action: "update", actor_id: admin });
  });

  it("non-admins cannot read the audit log", async () => {
    const rows = await as(db, { role: "authenticated", userId: owner }, async (tx) =>
      (await tx.query("select * from public.audit_log")).rows,
    );
    expect(rows).toHaveLength(0);
  });
});
