import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const supabaseEnv = getSupabaseEnv();

  if (!supabaseEnv) {
    return null;
  }

  return createBrowserClient(supabaseEnv.url, supabaseEnv.anonKey);
}
