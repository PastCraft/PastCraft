import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getPublicSupabaseConfig, getServiceRoleKey } from "@/lib/env";

export async function createSupabaseServerClient() {
  const config = getPublicSupabaseConfig();
  if (!config) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component render where setting cookies is a no-op
        }
      },
    },
  });
}

export function createSupabaseServiceClient() {
  const config = getPublicSupabaseConfig();
  const serviceKey = getServiceRoleKey();
  if (!config || !serviceKey) {
    return null;
  }

  return createClient(config.url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
