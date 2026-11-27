import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { verifyAdminSession } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const verification = await verifyAdminSession();

  if (!verification.authorized) {
    const reasonParam =
      verification.status === 403
        ? `?reason=${encodeURIComponent(verification.reason)}`
        : "";
    redirect(`/admin/login${reasonParam}`);
  }

  return <AdminShell admin={verification.admin}>{children}</AdminShell>;
}
