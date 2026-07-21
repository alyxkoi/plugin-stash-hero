import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, CalendarDays, Library, ArrowUpRight } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/account/")({
  head: () => ({ meta: [{ title: "Account Overview — Plugin Warehouse" }] }),
  component: OverviewPage,
});

type LastOrder = {
  id: string;
  number: string;
  total: number;
  created_at: string;
  item_count: number;
};

function OverviewPage() {
  const { user, loading } = useAuth();
  const [ready, setReady] = useState(false);
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const [pluginsOwned, setPluginsOwned] = useState(0);

  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, number, total, created_at, order_items(product_id)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const list = (orders ?? []) as Array<{
        id: string; number: string; total: number; created_at: string;
        order_items: Array<{ product_id: string | null }>;
      }>;

      if (list.length > 0) {
        const o = list[0];
        setLastOrder({
          id: o.id, number: o.number, total: Number(o.total),
          created_at: o.created_at, item_count: o.order_items?.length ?? 0,
        });
      }
      const owned = new Set<string>();
      for (const o of list) for (const it of (o.order_items ?? [])) if (it.product_id) owned.add(it.product_id);
      setPluginsOwned(owned.size);
      setReady(true);
    })();
  }, [user, loading]);

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleString("en-US", { month: "long", year: "numeric" })
    : "—";

  if (!ready) return <div className="p-8 text-white/60">Loading…</div>;

  const email = user?.email ?? "";

  return (
    <div className="space-y-8">
      <header>
        <div className="label-mini text-[#C9BEDD] mb-2">WELCOME BACK</div>
        <h1 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-[0.95] tracking-tight">
          {email.split("@")[0].toUpperCase()}
        </h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Last Order */}
        <StatBox
          to={lastOrder ? "/account/orders" : undefined}
          icon={<Package className="w-4 h-4" strokeWidth={1.8} />}
          label="LAST ORDER"
        >
          {lastOrder ? (
            <>
              <div className="font-black text-2xl md:text-3xl leading-none">
                {lastOrder.number}
              </div>
              <div className="mt-3 font-mono text-[11px] tracking-wider text-[#B8ACCC]">
                {new Date(lastOrder.created_at)
                  .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  .toUpperCase()}
                <span className="text-white/25 mx-2">·</span>
                {lastOrder.item_count} PLUGIN{lastOrder.item_count !== 1 ? "S" : ""}
                <span className="text-white/25 mx-2">·</span>
                ${lastOrder.total.toFixed(2)}
              </div>
            </>
          ) : (
            <>
              <div className="font-black text-2xl md:text-3xl leading-none text-white/60">—</div>
              <div className="mt-3 font-mono text-[11px] tracking-wider text-[#B8ACCC]">
                NO ORDERS YET
              </div>
            </>
          )}
        </StatBox>

        {/* Member Since */}
        <StatBox
          icon={<CalendarDays className="w-4 h-4" strokeWidth={1.8} />}
          label="MEMBER SINCE"
        >
          <div className="font-black text-2xl md:text-3xl leading-none">
            {memberSince}
          </div>
          <div className="mt-3 font-mono text-[11px] tracking-wider text-[#B8ACCC]">
            {email}
          </div>
        </StatBox>

        {/* Plugins Owned */}
        <StatBox
          to="/account/plugins"
          icon={<Library className="w-4 h-4" strokeWidth={1.8} />}
          label="PLUGINS OWNED"
        >
          <div className="font-black text-4xl md:text-5xl leading-none">
            {pluginsOwned}
          </div>
          <div className="mt-3 font-mono text-[11px] tracking-wider text-[#B8ACCC]">
            {pluginsOwned === 0 ? "YOUR LIBRARY AWAITS" : "IN YOUR LIBRARY"}
          </div>
        </StatBox>
      </div>

      {pluginsOwned === 0 && (
        <GlassCard className="p-8 text-center">
          <h2 className="font-display text-2xl md:text-3xl tracking-wide mb-2">
            NOTHING IN THE VAULT YET.
          </h2>
          <p className="text-[#C9BEDD] mb-6">Grab your first plugin and it'll show up here.</p>
          <Link to="/shop" className="btn-primary">BROWSE THE WAREHOUSE →</Link>
        </GlassCard>
      )}
    </div>
  );
}

function StatBox({
  to, icon, label, children,
}: {
  to?: string;
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  const inner = (
    <div className="glass-card p-5 md:p-6 h-full relative overflow-hidden group">
      <div className="chromatic-edge" />
      <div className="glass-noise" />
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF003C] to-transparent opacity-70" />
      <div className="relative z-10 h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="inline-flex items-center gap-2 label-mini text-[#C9BEDD]">
            <span className="w-6 h-6 rounded-full bg-[#FF003C]/12 border border-[#FF003C]/40 inline-flex items-center justify-center text-[#FF6A88]">
              {icon}
            </span>
            {label}
          </div>
          {to && (
            <ArrowUpRight
              className="w-4 h-4 text-white/40 group-hover:text-[#FF003C] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition"
              strokeWidth={1.8}
            />
          )}
        </div>
        {children}
      </div>
    </div>
  );
  if (!to) return inner;
  return (
    <Link
      to={to}
      className="block transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF003C] rounded-2xl"
    >
      {inner}
    </Link>
  );
}
