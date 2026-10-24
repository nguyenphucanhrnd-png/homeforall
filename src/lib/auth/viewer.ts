import "server-only";
import { connection } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isAppRole, type AppRole } from "./roles";

export type Viewer = {
  id: string;
  email: string | null;
  roles: AppRole[];
};

/** The signed-in user and their roles, or null for anonymous visitors. */
export async function getViewer(): Promise<Viewer | null> {
  await connection(); // always per-request, even before Supabase is configured
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  const { data: rows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.claims.sub);

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
    roles: (rows ?? []).map((r) => r.role).filter(isAppRole),
  };
}
