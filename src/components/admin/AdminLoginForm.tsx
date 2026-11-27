"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Lock, Orbit } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface AdminLoginFormProps {
  supabaseConfigured: boolean;
  initialReason?: string | null;
}

export function AdminLoginForm({
  supabaseConfigured,
  initialReason,
}: AdminLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialReason ?? null
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setErrorMessage(
        "Supabase credentials are not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local to sign in."
      );
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setErrorMessage("Unable to complete sign-in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#02050e] px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 25%, rgba(56, 189, 248, 0.12) 0%, rgba(5, 11, 26, 0.9) 55%, #02050e 100%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 transition hover:text-sky-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Return to Public Website</span>
        </Link>

        <div className="mt-6 glass-panel rounded-3xl p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-400/35 bg-sky-500/15 text-sky-300">
              <Orbit className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-display text-xl font-semibold text-white">
                Administrator Sign In
              </h1>
              <p className="text-xs text-slate-400">
                PastCraft Control Center
              </p>
            </div>
          </div>

          {!supabaseConfigured && (
            <div
              role="status"
              className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-100"
            >
              <p className="font-semibold text-amber-200">
                Supabase Auth Not Configured
              </p>
              <p className="mt-1 text-amber-100/85">
                Configure <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> in{" "}
                <code>.env.local</code> and add your user UUID to{" "}
                <code>public.admin_users</code> to access administrative
                controls.
              </p>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-2xl border border-rose-400/35 bg-rose-500/10 p-3.5 text-xs text-rose-200"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-rose-300"
                aria-hidden="true"
              />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-medium text-slate-300"
              >
                Administrator Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pastcraft.org"
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/85 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-medium text-slate-300"
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/85 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-sky-400/50 bg-sky-500/25 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400/35 disabled:opacity-50"
            >
              <Lock className="h-4 w-4 text-sky-200" aria-hidden="true" />
              <span>{submitting ? "Verifying Access..." : "Sign In to Admin"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
