import { NextResponse } from "next/server";
import { getPublicSupabaseConfig } from "@/lib/env";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import type { AdminRole } from "@/types/community";
import { checkSlidingWindowRateLimit } from "./rate-limit";

export interface AuthenticatedAdmin {
  userId: string;
  email: string | null;
  role: AdminRole;
}

export type AdminVerificationResult =
  | {
      authorized: true;
      admin: AuthenticatedAdmin;
    }
  | {
      authorized: false;
      status: 401 | 403 | 503;
      reason: string;
    };

type AuthVerifierFn = () => Promise<AdminVerificationResult>;

let verifierOverride: AuthVerifierFn | null = null;

/**
 * Allows injecting an explicit auth verifier in unit/integration tests.
 */
export function setAdminVerifierOverride(fn: AuthVerifierFn | null): void {
  verifierOverride = fn;
}

/**
 * Verifies that the current request belongs to an authenticated Supabase user
 * listed in `public.admin_users` with role owner/admin/editor.
 */
export async function verifyAdminSession(): Promise<AdminVerificationResult> {
  if (verifierOverride) {
    return verifierOverride();
  }

  if (!getPublicSupabaseConfig()) {
    return {
      authorized: false,
      status: 401,
      reason:
        "Administrator authentication is unavailable until Supabase credentials are configured.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return {
        authorized: false,
        status: 401,
        reason: "Authentication required.",
      };
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        authorized: false,
        status: 401,
        reason: "Authentication required.",
      };
    }

    // Check admin_users authorization table using service role (if available) or user's RLS policy
    const roleClient = createSupabaseServiceClient() ?? supabase;
    const { data: adminRecord, error: roleError } = await roleClient
      .from("admin_users")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError || !adminRecord) {
      return {
        authorized: false,
        status: 403,
        reason: "Forbidden: your account does not have administrator permissions.",
      };
    }

    const role = adminRecord.role as AdminRole;
    if (!["owner", "admin", "editor"].includes(role)) {
      return {
        authorized: false,
        status: 403,
        reason: "Forbidden: invalid administrator role.",
      };
    }

    return {
      authorized: true,
      admin: {
        userId: user.id,
        email: user.email ?? null,
        role,
      },
    };
  } catch {
    return {
      authorized: false,
      status: 401,
      reason: "Unable to verify administrator session.",
    };
  }
}

const RATE_LIMITS: Record<"read" | "write" | "upload", number> = {
  read: 120,
  write: 60,
  upload: 20,
};

export async function requireAdminApi(options?: {
  scope?: "read" | "write" | "upload";
}): Promise<
  | { ok: true; admin: AuthenticatedAdmin }
  | { ok: false; response: NextResponse }
> {
  const verification = await verifyAdminSession();
  if (!verification.authorized) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: verification.reason },
        { status: verification.status }
      ),
    };
  }

  const scope = options?.scope ?? "read";
  const rateCheck = checkSlidingWindowRateLimit(
    `admin:${scope}:${verification.admin.userId}`,
    RATE_LIMITS[scope],
    60_000
  );
  if (!rateCheck.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Too many administrative requests. Please slow down." },
        {
          status: 429,
          headers: { "Retry-After": String(rateCheck.retryAfterSeconds) },
        }
      ),
    };
  }

  return {
    ok: true,
    admin: verification.admin,
  };
}
