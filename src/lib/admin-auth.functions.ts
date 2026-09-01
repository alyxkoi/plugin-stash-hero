import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

/**
 * Same-origin admin check. Used as a fallback when the browser's direct
 * request to the database host fails (Safari/iOS "Load failed", content
 * blockers, flaky networks) — the sign-in itself succeeded, so the admin gate
 * must not hard-fail on a single transient fetch error.
 */
export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { isAdmin: !!data };
  });

/**
 * Same-origin admin sign-in fallback. Some browsers (Safari/iOS with tracking
 * protection, corporate networks, ad blockers) block the direct request to the
 * auth host, which surfaces as "Load failed" with no server-side trace. This
 * performs the password grant from our own origin instead and returns the
 * session for the client to adopt. Sessions are only returned for admins.
 */
export const adminPasswordSignIn = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; password: string }) => {
    const email = String(input?.email ?? "").trim().toLowerCase();
    const password = String(input?.password ?? "");
    if (!email || !password) throw new Error("Email and password are required.");
    return { email, password };
  })
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: auth, error } = await client.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error || !auth?.session || !auth.user) {
      return {
        ok: false as const,
        reason: /invalid login credentials/i.test(error?.message ?? "")
          ? ("credentials" as const)
          : ("error" as const),
        message: error?.message ?? "Sign-in didn't complete.",
      };
    }

    const scoped = createClient<Database>(url, key, {
      global: { headers: { Authorization: `Bearer ${auth.session.access_token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: roleRow } = await scoped
      .from("user_roles")
      .select("role")
      .eq("user_id", auth.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) return { ok: false as const, reason: "not_admin" as const };

    return {
      ok: true as const,
      access_token: auth.session.access_token,
      refresh_token: auth.session.refresh_token,
    };
  });
