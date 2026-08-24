import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, X, Gift, FileText, HelpCircle, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getMyStoreCredit, type CreditSnapshot } from "@/lib/store-credit.functions";
import { ProductArtwork } from "@/components/ProductArtwork";

const INSTALL_GUIDE_URL =
  "https://thepluginwarehousefiles.com/other%20files/the_plugin_warehouse_installation_guide.pdf";

export const Route = createFileRoute("/account/")({
  head: () => ({
    meta: [
      { title: "Account Overview — Plugin Warehouse" },
      { name: "description", content: "Your Plugin Warehouse library, orders and store credit in one place." },
    ],
  }),
  component: OverviewPage,
});

type LastOrder = { id: string; number: string; total: number; created_at: string };

type LibItem = {
  product_id: string;
  name: string;
  cover_url: string | null;
  cover_gradient: string | null;
  obtained_at: string;
  is_gift: boolean;
};

function OverviewPage() {
  const { user, loading } = useAuth();
  const [ready, setReady] = useState(false);
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const [library, setLibrary] = useState<LibItem[]>([]);
  const [updatedIds, setUpdatedIds] = useState<Set<string>>(new Set());
  const [giftIds, setGiftIds] = useState<Set<string>>(new Set());
  const [credit, setCredit] = useState<CreditSnapshot | null>(null);
  const [showCredit, setShowCredit] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;

    const { data: orders } = await supabase
      .from("orders")
      .select("id, number, total, created_at, order_items(product_id, name, cover_gradient, cover_url)")
      .eq("user_id", user.id)
      // Fully refunded orders no longer entitle the customer to the files.
      .in("status", ["completed", "partial"])
      .order("created_at", { ascending: false });

    const list = (orders ?? []) as any[];
    if (list.length > 0) {
      const o = list[0];
      setLastOrder({ id: o.id, number: o.number, total: Number(o.total), created_at: o.created_at });
    } else {
      setLastOrder(null);
    }

    const map = new Map<string, LibItem>();
    for (const o of list) {
      for (const it of (o.order_items ?? [])) {
        if (!it.product_id) continue;
        const existing = map.get(it.product_id);
        if (!existing) {
          map.set(it.product_id, {
            product_id: it.product_id,
            name: it.name,
            cover_url: it.cover_url,
            cover_gradient: it.cover_gradient,
            obtained_at: o.created_at,
            is_gift: false,
          });
        } else if (new Date(o.created_at) > new Date(existing.obtained_at)) {
          existing.obtained_at = o.created_at;
        }
      }
    }

    const { data: grants } = await supabase
      .from("plugin_grants")
      .select("product_id, granted_at, acknowledged_at, products(name, cover_url, cover_gradient)")
      .eq("customer_id", user.id)
      .is("revoked_at", null);

    const unseenGifts = new Set<string>();
    for (const g of (grants ?? []) as any[]) {
      if (!g.product_id) continue;
      if (!g.acknowledged_at) unseenGifts.add(g.product_id);
      if (!map.has(g.product_id)) {
        map.set(g.product_id, {
          product_id: g.product_id,
          name: g.products?.name ?? "Plugin",
          cover_url: g.products?.cover_url ?? null,
          cover_gradient: g.products?.cover_gradient ?? null,
          obtained_at: g.granted_at,
          is_gift: true,
        });
      }
    }
    setGiftIds(unseenGifts);

    // Live name + cover from products so admin renames show immediately.
    const ids = Array.from(map.keys());
    if (ids.length) {
      const { data: live } = await supabase
        .from("products").select("id, name, cover_url, cover_gradient").in("id", ids);
      for (const p of (live ?? []) as any[]) {
        const owned = map.get(p.id);
        if (!owned) continue;
        owned.name = p.name ?? owned.name;
        owned.cover_url = p.cover_url ?? owned.cover_url;
        owned.cover_gradient = p.cover_gradient ?? owned.cover_gradient;
      }
    }
    setLibrary(Array.from(map.values()));

    const { data: upd } = await (supabase as any).rpc("get_my_product_file_updates");
    const u = new Set<string>();
    for (const r of (upd ?? []) as Array<{ product_id: string; file_updated_at: string; acknowledged_at: string | null }>) {
      if (!r.acknowledged_at || new Date(r.file_updated_at) > new Date(r.acknowledged_at)) u.add(r.product_id);
    }
    setUpdatedIds(u);

    setReady(true);
    try {
      setCredit(await getMyStoreCredit());
    } catch (e) {
      console.warn("[account] store credit load failed", e);
    }
  }, [user]);

  useEffect(() => {
    if (loading || !user) return;
    load();
  }, [user, loading, load]);

  // Silent grants and credit land live while the portal is open.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`account-overview-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "store_credit_ledger", filter: `customer_id=eq.${user.id}` },
        () => { load(); })
      .on("postgres_changes",
        { event: "*", schema: "public", table: "plugin_grants", filter: `customer_id=eq.${user.id}` },
        () => { load(); })
      .subscribe((status) => {
        // Realtime hiccups stay silent — they must never surface as page errors.
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") console.warn("[realtime]", status);
      });
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  const featured = useMemo(() => {
    const score = (p: LibItem) => (updatedIds.has(p.product_id) || giftIds.has(p.product_id) ? 0 : 1);
    return [...library]
      .sort((a, b) => score(a) - score(b) || +new Date(b.obtained_at) - +new Date(a.obtained_at))
      .slice(0, 4);
  }, [library, updatedIds, giftIds]);

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleString("en-US", { month: "long", year: "numeric" })
    : null;

  if (!ready) return <div className="p-8 text-white/60">Loading…</div>;

  const email = user?.email ?? "";
  const creditCents = credit?.balance_cents ?? 0;

  return (
    <div className="space-y-12 md:space-y-16 pb-4">
      {/* IDENTITY */}
      <header>
        <div className="label-mini text-[#C9BEDD] mb-2">WELCOME BACK</div>
        <h1 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-[0.95] tracking-tight break-words">
          {email.split("@")[0].toUpperCase()}
        </h1>
        <p className="mt-3 text-[13px] text-[#B8ACCC] break-words">
          {email}
          {memberSince && <><span className="text-white/25 mx-2">·</span>Member since {memberSince}</>}
        </p>
      </header>

      {/* LIBRARY */}
      <section>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 mb-5">
          <h2 className="font-display text-2xl md:text-3xl tracking-wide truncate">YOUR LIBRARY</h2>
          <Link
            to="/account/plugins"
            className="shrink-0 font-mono text-[11px] tracking-[0.16em] text-[#C9BEDD] hover:text-white transition"
          >
            VIEW ALL →
          </Link>
        </div>

        {featured.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <div className="chromatic-edge" />
            <div className="relative z-10">
              <p className="text-[#C9BEDD] mb-6">Nothing in the vault yet.</p>
              <Link to="/shop" className="btn-primary">Browse plugins →</Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.map((p) => (
              <Link key={p.product_id} to="/account/plugins" className="group block min-w-0">
                <ProductArtwork src={p.cover_url} name={p.name} gradient={p.cover_gradient ?? undefined} className="aspect-[4/3] group-hover:border-[#FA1265]/50 transition">
                  <div className="absolute top-2 left-2 flex flex-col items-start gap-1.5">
                    {updatedIds.has(p.product_id) && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FF003C]/25 border border-[#FF003C]/60 text-white font-mono text-[9px] tracking-[0.18em] font-bold backdrop-blur">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF003C] shadow-[0_0_6px_#FF003C]" />
                        UPDATED
                      </span>
                    )}
                    {giftIds.has(p.product_id) && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/90 border border-white text-black font-mono text-[9px] tracking-[0.18em] font-bold backdrop-blur">
                        <Gift className="w-2.5 h-2.5" strokeWidth={2.4} />
                        GIFT
                      </span>
                    )}
                  </div>
                </ProductArtwork>
                <div className="mt-2 text-[13px] font-bold leading-tight line-clamp-2">{p.name}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* CARDS */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {lastOrder && (
          <Link
            to="/account/orders"
            className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF003C] transition hover:-translate-y-0.5"
          >
            <BigCard label="LAST ORDER" arrow>
              <div className="font-black text-3xl md:text-4xl leading-none break-words">{lastOrder.number}</div>
              <div className="mt-4 font-mono text-[11px] tracking-wider text-[#B8ACCC]">
                {new Date(lastOrder.created_at)
                  .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  .toUpperCase()}
                <span className="text-white/25 mx-2">·</span>
                ${lastOrder.total.toFixed(2)}
              </div>
            </BigCard>
          </Link>
        )}

        <button
          type="button"
          onClick={() => setShowCredit(true)}
          className="block w-full text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF003C] transition hover:-translate-y-0.5"
        >
          <BigCard label="STORE CREDIT" arrow accent={creditCents > 0} dim={creditCents === 0}>
            <div className={`font-black text-4xl md:text-5xl leading-none ${creditCents > 0 ? "text-[#FF6A88]" : "text-white/70"}`}>
              ${(creditCents / 100).toFixed(2)}
            </div>
          </BigCard>
        </button>
      </section>

      {/* CLOSING STRIP */}
      <section className="glass-card glass-card--subtle p-4 md:p-5">
        <div className="chromatic-edge" />
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
          <StripLink href={INSTALL_GUIDE_URL} icon={<FileText className="w-4 h-4" strokeWidth={1.7} />}>
            Installation Guide (PDF)
          </StripLink>
          <StripLink href="https://www.thepluginwarehouse.com/faq" icon={<HelpCircle className="w-4 h-4" strokeWidth={1.7} />}>
            FAQ
          </StripLink>
          <StripLink href="https://www.thepluginwarehouse.com/contact-us" icon={<Mail className="w-4 h-4" strokeWidth={1.7} />}>
            Contact Us
          </StripLink>
        </div>
      </section>

      {showCredit && (
        <div
          className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
          onClick={() => setShowCredit(false)}
        >
          <div
            className="glass-card glass-card--heavy w-full md:max-w-lg max-h-[85vh] overflow-y-auto p-6 relative rounded-t-2xl md:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
          >
            <button
              onClick={() => setShowCredit(false)}
              aria-label="Close"
              className="absolute top-4 right-4 w-10 h-10 inline-flex items-center justify-center rounded-full border border-white/15 text-[#C9BEDD]"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="label-mini text-[#C9BEDD] mb-1">STORE CREDIT</div>
            <div className="font-black text-3xl mb-5">${(creditCents / 100).toFixed(2)}</div>
            {(credit?.entries.length ?? 0) === 0 ? (
              <p className="text-[#B8ACCC] text-sm">No credit activity yet.</p>
            ) : (
              <ul className="space-y-2">
                {credit!.entries.map((e) => (
                  <li key={e.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-[#B8ACCC]">
                        {new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <span className={`font-mono text-sm ${e.amount_cents < 0 ? "text-[#FF6A88]" : "text-emerald-300"}`}>
                        {e.amount_cents > 0 ? "+" : "−"}${(Math.abs(e.amount_cents) / 100).toFixed(2)}
                      </span>
                    </div>
                    {e.reason && <div className="text-sm text-white/85 mt-1">{e.reason}</div>}
                    <div className="font-mono text-[10px] text-[#B8ACCC] mt-1">
                      BALANCE ${(e.balance_after_cents / 100).toFixed(2)}
                      {e.order_number && <> · {e.order_number}</>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BigCard({
  label, children, arrow, accent, dim,
}: {
  label: string;
  children: React.ReactNode;
  arrow?: boolean;
  accent?: boolean;
  dim?: boolean;
}) {
  return (
    <div
      className={`glass-card p-6 md:p-8 h-full relative overflow-hidden group ${dim ? "opacity-60" : ""}`}
      style={accent ? { borderColor: "rgba(255,0,60,0.55)", boxShadow: "0 0 32px rgba(255,0,60,0.22)" } : undefined}
    >
      <div className="chromatic-edge" />
      <div className="glass-noise" />
      {!dim && (
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF003C] to-transparent opacity-70" />
      )}
      <div className="relative z-10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 mb-7">
          <span className="label-mini text-[#B8ACCC] truncate">{label}</span>
          {arrow && (
            <ArrowUpRight
              className="w-4 h-4 shrink-0 text-white/40 group-hover:text-[#FF003C] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition"
              strokeWidth={1.8}
            />
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

function StripLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2.5 min-h-[44px] px-2 rounded-lg text-[#B8ACCC] hover:text-white transition min-w-0"
    >
      <span className="shrink-0 text-[#C9BEDD]">{icon}</span>
      <span className="font-mono text-[11px] tracking-[0.12em] uppercase truncate">{children}</span>
    </a>
  );
}
