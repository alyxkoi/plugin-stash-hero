import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Links any guest orders placed with the signed-in user's (verified) email
 * address to their account. Runs entirely server-side: the underlying
 * `claim_my_orders` routine is SECURITY DEFINER, reads the caller's identity
 * from the JWT, and refuses to link anything for an unverified email.
 */
export const claimMyOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ claimed: number }> => {
    const { supabase } = context as any;
    const { data, error } = await supabase.rpc("claim_my_orders");
    if (error) {
      console.error("[claim-orders]", error.message);
      return { claimed: 0 };
    }
    return { claimed: Number(data ?? 0) };
  });
