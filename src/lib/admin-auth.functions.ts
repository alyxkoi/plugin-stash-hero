import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Same-origin admin check. Used as a fallback when the browser's direct
 * request to the database host fails (Safari/iOS "Load failed", blocked
 * third-party requests, flaky networks) — the sign-in itself succeeded, so
 * the admin gate must not hard-fail on a single transient fetch error.
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
