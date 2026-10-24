/**
 * Creates one demo user per role and prints a one-time login link for each,
 * so every role can be tried without a real inbox (M0 acceptance).
 *
 *   node --env-file=.env.local scripts/dev-role-users.ts
 *
 * Needs SUPABASE_SECRET_KEY and HFA_ALLOW_DEV_USERS=true. Never run against production.
 */
import { createClient } from "@supabase/supabase-js";

const ROLES = ["admin", "rescue_partner", "vet_partner", "foster", "volunteer", "adopter", "sponsor"] as const;
const DEMO_ORGS = {
  rescue_partner: { type: "rescue", slug: "demo-nhom-cuu-ho", name: "Nhóm cứu hộ Diên Hồng" },
  vet_partner: { type: "vet", slug: "demo-phong-kham", name: "Phòng khám thú y đối tác" },
} as const;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

if (process.env.HFA_ALLOW_DEV_USERS !== "true") {
  console.error("Refusing to run: set HFA_ALLOW_DEV_USERS=true (local or staging projects only).");
  process.exit(1);
}
if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

async function ensureUser(email: string) {
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.data.user) return created.data.user.id;
  // Already exists: find it.
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const found = data.users.find((u) => u.email === email);
  if (!found) throw created.error ?? new Error(`could not create ${email}`);
  return found.id;
}

for (const role of ROLES) {
  const email = `${role.replace("_", "-")}@demo.homeforall.test`;
  const userId = await ensureUser(email);

  await admin.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });

  if (role === "rescue_partner" || role === "vet_partner") {
    const org = DEMO_ORGS[role];
    const { data, error } = await admin
      .from("organizations")
      .upsert(
        { ...org, verification_status: "verified", verified_at: new Date().toISOString(), is_demo: true },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (error) throw error;
    await admin
      .from("org_members")
      .upsert({ org_id: data.id, user_id: userId, member_role: "owner" }, { onConflict: "org_id,user_id" });
  }

  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw link.error;
  const login = new URL("/auth/confirm", site);
  login.searchParams.set("token_hash", link.data.properties.hashed_token);
  login.searchParams.set("type", "magiclink");
  login.searchParams.set("next", "/dashboard");
  console.log(`${role.padEnd(15)} ${email}\n  ${login}\n`);
}

console.log("Links are single-use and expire (default 1 hour). Re-run to get fresh ones.");
