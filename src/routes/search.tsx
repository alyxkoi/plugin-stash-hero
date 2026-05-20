import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { products } from "@/lib/mock-data";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: (s.q as string) || "" }),
  head: () => ({ meta: [{ title: "Search — Plugin Warehouse" }] }),
  component: Search,
});

function Search() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [val, setVal] = useState(q);
  useEffect(() => setVal(q), [q]);

  const results = products.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.maker.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="px-4 md:px-12 py-12">
      <div className="font-mono text-xs tracking-[0.2em] text-[var(--accent-red-glow)] mb-3">HUNT MODE</div>
      <h1 className="font-black chrome-text mb-6" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>SEARCH.</h1>
      <form onSubmit={(e) => { e.preventDefault(); navigate({ to: "/search", search: { q: val } }); }} className="mb-8 max-w-xl">
        <input className="input-glass" placeholder="What are you hunting?" value={val} onChange={(e) => setVal(e.target.value)} autoFocus />
      </form>

      <div className="font-mono text-sm text-white/60 mb-6">{results.length} {results.length === 1 ? "result" : "results"} {q && `for "${q}"`}</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {results.map((p) => <ProductCard key={p.slug} product={p} />)}
      </div>
    </div>
  );
}
