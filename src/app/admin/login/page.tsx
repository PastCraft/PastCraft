import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { verifyAdminSession } from "@/lib/auth/admin";
import { getPublicSupabaseConfig } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const verification = await verifyAdminSession();
  if (verification.authorized) {
    redirect("/admin");
  }

  const params = await searchParams;
  const supabaseConfigured = Boolean(getPublicSupabaseConfig());

  return (
    <AdminLoginForm
      supabaseConfigured={supabaseConfigured}
      initialReason={params.reason ?? null}
    />
  );
}
