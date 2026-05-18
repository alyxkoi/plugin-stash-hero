import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { orders } from "@/lib/account-data";
import { OrderCard } from "./account.orders";

export const Route = createFileRoute("/account/orders/$id")({
  head: ({ params }) => ({ meta: [{ title: `Order #${params.id} — Plugin Warehouse` }] }),
  loader: ({ params }) => {
    const order = orders.find(o => o.id === params.id);
    if (!order) throw notFound();
    return { order };
  },
  component: SingleOrder,
  notFoundComponent: () => (
    <div className="p-12 text-center">
      <h2 className="font-black text-3xl mb-4">ORDER NOT FOUND.</h2>
      <Link to="/account/orders" className="btn-ghost">← BACK TO ORDERS</Link>
    </div>
  ),
});

function SingleOrder() {
  const { order } = Route.useLoaderData();
  return (
    <div className="space-y-6 print:bg-white print:text-black">
      <Link to="/account/orders" className="inline-flex items-center gap-2 font-mono text-xs tracking-wider text-white/65 hover:text-white print:hidden">
        <ArrowLeft className="w-3 h-3" /> BACK TO ALL ORDERS
      </Link>
      <header>
        <div className="font-mono text-xs tracking-[0.18em] text-[var(--accent-red-glow)] mb-2">// ORDER RECEIPT</div>
        <h1 className="font-black text-[clamp(2rem,4vw,3.5rem)] leading-tight tracking-tight chrome-text">#{order.id}</h1>
      </header>
      <OrderCard order={order} defaultOpen />
      <div className="glass-card p-5 md:p-6 print:hidden">
        <div className="chromatic-edge" /><div className="relative z-10">
          <div className="font-mono text-[11px] tracking-[0.14em] text-white/55 mb-3">// EMAIL THIS RECEIPT</div>
          <form className="flex flex-col sm:flex-row gap-3" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="someone@email.com" className="input-glass !rounded-full flex-1" />
            <button className="btn-primary !text-xs sm:w-auto">SEND</button>
          </form>
        </div>
      </div>
    </div>
  );
}
