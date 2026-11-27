// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getPublicSupabaseConfig,
  getRuntimeEnvStatus,
  getServiceRoleKey,
} from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

describe("Supabase Publishable & Secret Environment Configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("reads NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY and creates Supabase clients", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://izoqsuaqasnwjlqhwbmf.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      "sb_publishable_aybv5jEm__vypdT8htQ6MQ_reHE2nU4";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test_only_placeholder_value";

    const pub = getPublicSupabaseConfig();
    expect(pub).toEqual({
      url: "https://izoqsuaqasnwjlqhwbmf.supabase.co",
      anonKey: "sb_publishable_aybv5jEm__vypdT8htQ6MQ_reHE2nU4",
    });
    expect(getServiceRoleKey()).toBe("sb_secret_test_only_placeholder_value");

    const status = getRuntimeEnvStatus();
    expect(status.hasSupabasePublic).toBe(true);
    expect(status.hasSupabaseServiceRole).toBe(true);

    const browserClient = createSupabaseBrowserClient();
    const serviceClient = createSupabaseServiceClient();
    expect(browserClient).not.toBeNull();
    expect(serviceClient).not.toBeNull();
  });

  it("retains backward-compatible fallback to ANON_KEY and SERVICE_ROLE_KEY", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://izoqsuaqasnwjlqhwbmf.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "legacy-service-role-key";

    expect(getPublicSupabaseConfig()).toEqual({
      url: "https://izoqsuaqasnwjlqhwbmf.supabase.co",
      anonKey: "legacy-anon-key",
    });
    expect(getServiceRoleKey()).toBe("legacy-service-role-key");
  });
});
