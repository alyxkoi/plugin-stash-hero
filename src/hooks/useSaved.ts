import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Product } from "@/lib/mock-data";

const KEY = (uid: string | undefined) => ["saved-ids", uid ?? "anon"];

export function useSavedIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEY(user?.id),
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("saved_items")
        .select("product_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.product_id as string));
    },
  });
}

export function useToggleSaved() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (product: Product) => {
      if (!user) {
        toast("Log in to save products.", {
          action: { label: "Log in", onClick: () => navigate({ to: "/login" }) },
        });
        navigate({ to: "/login" });
        return { skipped: true as const };
      }
      if (!product.id) throw new Error("Missing product id");

      const currentIds = qc.getQueryData<Set<string>>(KEY(user.id));
      const alreadySaved = currentIds?.has(product.id) ?? false;

      if (alreadySaved) {
        const { error } = await supabase
          .from("saved_items")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", product.id);
        if (error) throw error;
        return { removed: true as const, product };
      } else {
        const { error } = await supabase
          .from("saved_items")
          .insert({ user_id: user.id, product_id: product.id, price_at_save: product.price });
        if (error) throw error;
        return { added: true as const, product };
      }
    },
    onSuccess: (res) => {
      if (!res || "skipped" in res) return;
      qc.invalidateQueries({ queryKey: KEY(user?.id) });
      qc.invalidateQueries({ queryKey: ["saved-products", user?.id] });
      if ("added" in res) {
        toast(`Added ${res.product.name} to your saved`, { duration: 2000 });
      } else {
        toast("Removed from saved", { duration: 1500 });
      }
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't update saved"),
  });
}
