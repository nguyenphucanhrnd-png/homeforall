import { PGlite, type Transaction } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Minimal stand-in for the parts of Supabase our migrations depend on:
 * the anon/authenticated/service_role roles, auth.users and auth.uid().
 * Lets RLS policies run against real Postgres in-process (no Docker).
 */
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
`;

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

export async function createTestDb() {
  const db = new PGlite({ extensions: { citext } });
  await db.exec(SUPABASE_STUB);
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  return db;
}

export async function createUser(db: PGlite, email: string, roles: string[] = []) {
  const { rows } = await db.query<{ id: string }>(
    "insert into auth.users (email) values ($1) returning id",
    [email],
  );
  const id = rows[0].id;
  for (const role of roles) {
    await db.query("insert into public.user_roles (user_id, role) values ($1, $2)", [id, role]);
  }
  return id;
}

type Who = { role: "anon" } | { role: "authenticated"; userId: string };

/** Runs `fn` as an API caller would, then rolls back so tests stay isolated. */
export async function as<T>(db: PGlite, who: Who, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  let result: T;
  const rollback = new Error("rollback");
  try {
    await db.transaction(async (tx) => {
      await tx.query(`set local role ${who.role}`);
      if (who.role === "authenticated") {
        await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [who.userId]);
      }
      result = await fn(tx);
      throw rollback;
    });
  } catch (e) {
    if (e !== rollback) throw e;
  }
  return result!;
}

/** Like `as`, but commits: for setup steps that must persist. */
export async function asCommitted<T>(db: PGlite, who: Who, fn: (tx: Transaction) => Promise<T>) {
  return db.transaction(async (tx) => {
    await tx.query(`set local role ${who.role}`);
    if (who.role === "authenticated") {
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [who.userId]);
    }
    return fn(tx);
  });
}
