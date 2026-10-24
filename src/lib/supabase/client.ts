import { createBrowserClient } from "@supabase/ssr";
import { supabaseCredentials } from "@/lib/env";

export function createClient() {
  const { url, key } = supabaseCredentials();
  return createBrowserClient(url, key);
}
