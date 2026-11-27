import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseConfig } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const config = getPublicSupabaseConfig();
  if (!config) {
    return null;
  }
  return createBrowserClient(config.url, config.anonKey);
}
