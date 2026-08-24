import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  adminReady: boolean;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminReady, setAdminReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let hasCheckedIdentity = false;
    let lastCheckedUid: string | null | undefined = undefined;

    const checkAdmin = (uid: string | undefined) => {
      // Skip re-check if user identity hasn't changed (prevents flicker on
      // TOKEN_REFRESHED / window refocus events).
      if (hasCheckedIdentity && uid === lastCheckedUid) return;
      hasCheckedIdentity = true;
      lastCheckedUid = uid ?? null;
      setAdminReady(false);
      if (!uid) { setIsAdmin(false); setAdminReady(true); return; }
      // defer to avoid auth callback deadlock
      setTimeout(async () => {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!data);
        setAdminReady(true);
      }, 0);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // Ignore silent token refreshes and user metadata updates — they must
      // not remount gated views or reset form state.
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
        setSession(s);
        return;
      }
      setSession(s);
      checkAdmin(s?.user?.id);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      checkAdmin(data.session?.user?.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { user: session?.user ?? null, session, isAdmin, adminReady, loading };
}

export async function signOut() {
  await supabase.auth.signOut();
}
