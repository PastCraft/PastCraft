"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ExternalLink,
  Film,
  Globe2,
  History,
  LayoutDashboard,
  LogOut,
  Orbit,
  Settings,
  Share2,
} from "lucide-react";
import type { AuthenticatedAdmin } from "@/lib/auth/admin";

interface AdminShellProps {
  admin: AuthenticatedAdmin;
  children: React.ReactNode;
}

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/locations", label: "Locations", icon: Globe2 },
  { href: "/admin/history", label: "History Timeline", icon: History },
  { href: "/admin/social-links", label: "Social Links", icon: Share2 },
  { href: "/admin/youtube", label: "YouTube Media", icon: Film },
  { href: "/admin/settings", label: "Website Settings", icon: Settings },
];

export function AdminShell({ admin, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#02050e] text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="border-b border-slate-800/90 bg-slate-950/75 p-4 sm:p-6 lg:min-h-screen lg:w-68 lg:shrink-0 lg:border-r lg:border-b-0">
          <div className="flex flex-wrap items-center justify-between gap-3 lg:block">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-400/35 bg-sky-500/15 text-sky-300">
                <Orbit className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-display text-sm font-semibold text-white">
                  PastCraft Admin
                </p>
                <p className="text-[11px] capitalize text-sky-300">
                  {admin.role} access
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:mt-5">
              <Link
                href="/"
                target="_blank"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:border-sky-400/40 hover:text-white lg:w-full lg:justify-center"
              >
                <span>Public Website</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:border-rose-400/40 hover:text-rose-200 lg:hidden"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          <nav
            aria-label="Admin sections"
            className="mt-5 flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible"
          >
            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-medium transition ${
                    isActive
                      ? "border border-sky-400/45 bg-sky-500/20 text-sky-100"
                      : "border border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 hidden border-t border-slate-800/90 pt-5 lg:block">
            {admin.email && (
              <p className="truncate text-xs text-slate-400" title={admin.email}>
                {admin.email}
              </p>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-rose-400/40 hover:text-rose-200"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 p-4 sm:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
