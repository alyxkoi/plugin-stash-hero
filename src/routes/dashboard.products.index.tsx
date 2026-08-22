import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  ChargedPanel,
  DashboardShell,
  DashCard,
  DomainChip,
  StatusBadge,
} from "@/components/DashboardShell";
import {
  productCategories,
  formatMoney,
  relativeTime,
  type ProductStatus,
} from "@/lib/dashboard-mock";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Edit3, Archive, Trash2, X, Check, Grid2X2, List } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "all").default("all"),
  status: fallback(z.string(), "all").default("all"),
  page: fallback(z.number().int(), 1).default(1),
});

export const Route = createFileRoute("/dashboard/products/")({
  head: () => ({ meta: [{ title: "Products — Plugin Warehouse" }] }),
  validateSearch: zodValidator(searchSchema),
  component: ProductsPage,
});

const SCROLL_KEY = "dashboard-products:scroll";

type Row = {
  id: string;
  slug: string;
  name: string;
  maker: string;
  category: string;
  price: number;
  compare_at_price: number | null;
  status: ProductStatus;
  cover_url: string | null;
  cover_gradient: string | null;
  updated_at: string;
  supports_windows: boolean;
  supports_mac: boolean;
  is_free: boolean | null;
  file_size: string | null;
};

type ProductUpdatePatch = Partial<Omit<Row, "is_free">> & { is_free?: boolean };

async function fetchProducts(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,slug,name,maker,category,price,compare_at_price,status,cover_url,cover_gradient,updated_at,supports_windows,supports_mac,is_free,file_size",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

function ProductsPage() {
  const queryClient = useQueryClient();
  const {
    data: products = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["dashboard-products"],
    queryFn: fetchProducts,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (prev) => prev,
  });

  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const q = search.q;
  const cat = search.cat;
  const status = search.status as "all" | ProductStatus | "freebies";
  const page = search.page;

  const setSearchParam = (
    patch: Partial<{ q: string; cat: string; status: string; page: number }>,
  ) => {
    navigate({ search: (prev: any) => ({ ...prev, ...patch }), replace: true });
  };
  const setQ = (v: string) => setSearchParam({ q: v, page: 1 });
  const setCat = (v: string) => setSearchParam({ cat: v, page: 1 });
  const setStatus = (v: string) => setSearchParam({ status: v, page: 1 });
  const setPage = (updater: number | ((p: number) => number)) => {
    const next = typeof updater === "function" ? (updater as (p: number) => number)(page) : updater;
    setSearchParam({ page: next });
  };

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCats, setShowCats] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<null | "delete" | "archive">(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [view, setView] = useState<"table" | "grid">("table");

  // Params passed through to the edit page so Save/Back can return here intact.
  const editSearch = { q, cat, status, page } as const;

  // Preserve scroll position across product-edit navigation.
  useEffect(() => {
    const raw = sessionStorage.getItem(SCROLL_KEY);
    if (raw) {
      const y = parseInt(raw, 10);
      if (!isNaN(y)) requestAnimationFrame(() => window.scrollTo(0, y));
      sessionStorage.removeItem(SCROLL_KEY);
    }
  }, []);

  const rememberScroll = () => sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));

  async function updateProduct(id: string, patch: ProductUpdatePatch, prev: Row) {
    const normalizedPatch: ProductUpdatePatch = { ...patch };
    if (Object.prototype.hasOwnProperty.call(normalizedPatch, "price")) {
      normalizedPatch.is_free = Number(normalizedPatch.price) === 0;
      if (normalizedPatch.is_free) normalizedPatch.compare_at_price = null;
    }
    // Optimistic update
    queryClient.setQueryData<Row[]>(["dashboard-products"], (rows) =>
      (rows ?? []).map((r) => (r.id === id ? { ...r, ...normalizedPatch } : r)),
    );
    const { error } = await supabase.from("products").update(normalizedPatch).eq("id", id);
    if (error) {
      queryClient.setQueryData<Row[]>(["dashboard-products"], (rows) =>
        (rows ?? []).map((r) => (r.id === id ? prev : r)),
      );
      toast.error(`Save failed: ${error.message}`);
      return false;
    }
    setSavedId(id);
    setTimeout(() => setSavedId((s) => (s === id ? null : s)), 1200);
    return true;
  }

  async function bulkArchive() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBulkBusy(true);
    const { error } = await supabase.from("products").update({ status: "archived" }).in("id", ids);
    setBulkBusy(false);
    setBulkConfirm(null);
    if (error) {
      toast.error(`Archive failed: ${error.message}`);
      return;
    }
    toast.success(`Archived ${ids.length} product${ids.length === 1 ? "" : "s"}.`);
    setSelected(new Set());
    await queryClient.invalidateQueries({ queryKey: ["dashboard-products"] });
  }

  async function bulkUpdate(patch: ProductUpdatePatch, successLabel: string) {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBulkBusy(true);
    const { error } = await supabase.from("products").update(patch).in("id", ids);
    setBulkBusy(false);
    if (error) return toast.error(`${successLabel} failed: ${error.message}`);
    toast.success(`${successLabel} ${ids.length} product${ids.length === 1 ? "" : "s"}.`);
    setSelected(new Set());
    await queryClient.invalidateQueries({ queryKey: ["dashboard-products"] });
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      // 1. Gather every R2 object attached to these products before nuking DB rows.
      const paths: string[] = [];
      const targets = products.filter((p) => selected.has(p.id));
      for (const p of targets) if (p.cover_url) paths.push(p.cover_url);
      const { data: files } = await supabase
        .from("product_files")
        .select("product_id, zip_url")
        .in("product_id", ids);
      for (const r of (files ?? []) as Array<{ zip_url: string | null }>) {
        if (r.zip_url) paths.push(r.zip_url);
      }

      // 2. Delete products (product_files cascade via FK).
      const { error, data: deleted } = await supabase
        .from("products")
        .delete()
        .in("id", ids)
        .select("id, name");
      if (error) {
        toast.error(`Delete failed: ${error.message}`);
        return;
      }

      const deletedIds = new Set((deleted ?? []).map((d: any) => d.id));
      const failed = targets.filter((p) => !deletedIds.has(p.id));

      // 3. Clean R2 objects (best effort).
      if (paths.length) {
        try {
          await supabase.functions.invoke("r2-delete-objects", { body: { paths } });
        } catch (e) {
          console.warn("R2 delete threw:", e);
        }
      }

      if (failed.length) {
        toast.error(`Couldn't delete: ${failed.map((f) => f.name).join(", ")}`);
      } else {
        toast.success(`Deleted ${ids.length} product${ids.length === 1 ? "" : "s"}.`);
      }
      setSelected(new Set());
      await queryClient.invalidateQueries({ queryKey: ["dashboard-products"] });
    } finally {
      setBulkBusy(false);
      setBulkConfirm(null);
    }
  }

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const freebie = p.is_free || Number(p.price) === 0;
        if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
        if (cat === "freebies") {
          if (!freebie) return false;
        } else if (cat !== "all" && p.category !== cat) return false;
        if (status === "freebies") {
          if (!freebie) return false;
        } else if (status !== "all" && p.status !== status) return false;
        return true;
      }),
    [products, q, cat, status],
  );

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const publishedCount = products.filter((product) => product.status === "published").length;
  const discounted = products.filter(
    (product) => Number(product.compare_at_price || 0) > Number(product.price),
  );
  const averageDiscount = discounted.length
    ? (discounted.reduce(
        (sum, product) => sum + (1 - Number(product.price) / Number(product.compare_at_price)),
        0,
      ) /
        discounted.length) *
      100
    : 0;
  const storageBytes = products.reduce((sum, product) => sum + parseFileSize(product.file_size), 0);

  return (
    <DashboardShell
      title="Products"
      action={
        <Link
          to="/dashboard/products/new"
          className="btn-primary !text-xs !py-2 !px-4 inline-flex items-center gap-1.5"
        >
          <Plus size={14} /> Add product
        </Link>
      }
    >
      <ChargedPanel
        domain="catalog"
        material="solid"
        silhouette="offset"
        title="Catalog"
        className="dash-short-charge mb-6"
      >
        <div className="dash-catalog-horizon">
          <div className="dash-hero-value">{products.length.toLocaleString()}</div>
          <div className="dash-catalog-spines" role="img" aria-label={`${publishedCount} published products in the catalog`}>
            {products.slice(0, 14).map((product, index) => (
              <span
                key={product.id}
                className={product.status === "published" ? "is-live" : ""}
                style={{
                  background: product.cover_url
                    ? `url(${product.cover_url}) center/cover`
                    : product.cover_gradient || "linear-gradient(145deg,#4B3FE8,#181434)",
                  "--spine-rise": `${18 + ((index * 23) % 54)}px`,
                } as CSSProperties}
                title={product.name}
              />
            ))}
          </div>
        </div>
        <div className="dash-charged-stat-grid">
          <CatalogStat label="Published" value={publishedCount.toLocaleString()} />
          <CatalogStat label="Average discount" value={`${Math.round(averageDiscount)}%`} />
          <div className="dash-charged-stat">
            <div className="dash-charged-stat-label">Storage used</div>
            <div className="dash-charged-stat-value">{formatBytes(storageBytes)}</div>
          </div>
        </div>
      </ChargedPanel>

      {/* Compact control area: full-width search, then one aligned row of
          equal-height secondary controls (wraps on narrow screens). */}
      <div className="mb-4 space-y-2.5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search plugins"
            className="w-full h-10 bg-white/5 border border-white/15 rounded-lg pl-9 pr-3 text-sm text-white outline-none focus:border-[var(--accent-red)]"
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 [&_select]:h-10 [&_select]:w-full [&_select]:rounded-lg">
          <Select
            label="Product category"
            value={cat}
            onChange={(v) => {
              setCat(v);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All categories" },
              ...productCategories.map((c) => ({
                value: c,
                label: c.charAt(0).toUpperCase() + c.slice(1),
              })),
            ]}
          />
          <Select
            label="Product status"
            value={status}
            onChange={(v) => {
              setStatus(v as any);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All status" },
              { value: "published", label: "Published" },
              { value: "draft", label: "Draft" },
              { value: "archived", label: "Archived" },
              { value: "freebies", label: "Freebies (free)" },
            ]}
          />
          <button onClick={() => refetch()} className="btn-ghost !h-10 !text-xs !py-0 !px-3 w-full">
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
          <button
            onClick={() => setShowCats(true)}
            className="btn-ghost !h-10 !text-xs !py-0 !px-3 w-full"
          >
            Manage categories
          </button>
          <div className="dash-view-toggle" role="group" aria-label="Product view">
            <button
              type="button"
              onClick={() => setView("table")}
              aria-pressed={view === "table"}
              aria-label="Table view"
            >
              <List size={16} />
            </button>
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              aria-label="Grid view"
            >
              <Grid2X2 size={15} />
            </button>
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="dash-bulk-bar">
          <div className="flex items-center gap-3 w-full">
            <span className="text-xs font-mono text-white/70">{selected.size} selected</span>
            <button
              onClick={() => bulkUpdate({ status: "published" }, "Published")}
              disabled={bulkBusy}
              className="btn-ghost !text-xs !py-1.5 !px-3 disabled:opacity-50"
            >
              Publish
            </button>
            <button
              onClick={() => bulkUpdate({ status: "draft" }, "Unpublished")}
              disabled={bulkBusy}
              className="btn-ghost !text-xs !py-1.5 !px-3 disabled:opacity-50"
            >
              Unpublish
            </button>
            <select
              value=""
              disabled={bulkBusy}
              onChange={(event) => {
                if (event.target.value)
                  bulkUpdate({ category: event.target.value }, "Updated category for");
              }}
              aria-label="Set category for selected products"
              className="!min-h-9 !w-auto !text-xs"
            >
              <option value="">Set category</option>
              {productCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              value=""
              disabled={bulkBusy}
              onChange={(event) => {
                if (event.target.value === "windows")
                  bulkUpdate({ supports_windows: true, supports_mac: false }, "Set platform on");
                if (event.target.value === "mac")
                  bulkUpdate({ supports_windows: false, supports_mac: true }, "Set platform on");
                if (event.target.value === "both")
                  bulkUpdate({ supports_windows: true, supports_mac: true }, "Set platform on");
              }}
              aria-label="Set platform for selected products"
              className="!min-h-9 !w-auto !text-xs"
            >
              <option value="">Set platform</option>
              <option value="windows">Windows</option>
              <option value="mac">Mac</option>
              <option value="both">Windows + Mac</option>
            </select>
            <button
              onClick={() => setBulkConfirm("archive")}
              disabled={bulkBusy}
              className="btn-ghost !text-xs !py-1.5 !px-3 disabled:opacity-50"
            >
              Archive selected
            </button>
            <button
              onClick={() => setBulkConfirm("delete")}
              disabled={bulkBusy}
              className="btn-ghost !text-xs !py-1.5 !px-3 !border-[var(--accent-red)]/40 !text-[var(--accent-red-glow)] disabled:opacity-50"
            >
              Delete selected
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto text-white/40 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <DashCard>
        {error && (
          <div className="text-sm text-[var(--accent-red-glow)] py-6 text-center">
            Couldn't load products: {(error as Error).message}
          </div>
        )}
        {isLoading && !products.length && (
          <div className="text-sm text-white/50 py-10 text-center font-mono">Loading…</div>
        )}
        {!isLoading && !products.length && !error && (
          <div className="text-sm text-white/50 py-10 text-center">
            No products yet.{" "}
            <Link
              to="/dashboard/products/new"
              className="text-[var(--accent-red-glow)] hover:underline"
            >
              Add your first plugin →
            </Link>
          </div>
        )}
        {products.length > 0 && view === "table" && (
          <div className="dash-desktop-table overflow-x-auto -mx-5 -my-5">
            <table className="min-w-[1060px]">
              <thead className="text-[10px] uppercase tracking-wider text-white/40">
                <tr>
                  <th className="px-2 py-2 w-8"></th>
                  <th className="px-2 py-2 w-12"></th>
                  <th className="text-left px-2 py-2">Name</th>
                  <th className="text-left px-2 py-2">Category</th>
                  <th className="text-left px-2 py-2">OS</th>
                  <th className="text-right px-2 py-2">Price</th>
                  <th className="text-left px-2 py-2">Status</th>
                  <th className="text-right px-2 py-2">Updated</th>
                  <th className="text-right px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-t border-white/5 hover:bg-white/[0.03] transition-colors ${savedId === p.id ? "bg-emerald-500/10" : ""}`}
                  >
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p.id)}
                        className="accent-[var(--accent-red)]"
                      />
                    </td>
                    <td className="px-2 py-2">
                      {p.cover_url ? (
                        <img
                          src={p.cover_url}
                          alt=""
                          className="w-11 h-11 rounded-[var(--r-element)] object-cover"
                        />
                      ) : (
                        <div
                          className="w-11 h-11 rounded-[var(--r-element)]"
                          style={{
                            background:
                              p.cover_gradient || "linear-gradient(135deg,#3a0a4a,#7b0a5a)",
                          }}
                        />
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <Link
                          to={"/dashboard/products/$id" as any}
                          params={{ id: p.id } as any}
                          search={editSearch as any}
                          onClick={rememberScroll}
                          className="text-sm hover:text-[var(--accent-red-glow)]"
                        >
                          {p.name}
                        </Link>
                        {(p.is_free || Number(p.price) === 0) && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 tracking-wider">
                            FREE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <CategoryCell
                        product={p}
                        onSave={(v) => updateProduct(p.id, { category: v }, p)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      {p.category === "libraries" ? (
                        <DomainChip domain="neutral">Library</DomainChip>
                      ) : (
                        <OsCell
                          product={p}
                          onSave={(win, mac) =>
                            updateProduct(p.id, { supports_windows: win, supports_mac: mac }, p)
                          }
                        />
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <PriceCell
                        product={p}
                        onSave={(price, cmp) =>
                          updateProduct(p.id, { price, compare_at_price: cmp }, p)
                        }
                        justSaved={savedId === p.id}
                      />
                      {discountPercent(p) > 0 && (
                        <DomainChip domain="promo" className="ml-1">
                          -{discountPercent(p)}%
                        </DomainChip>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-[10px] text-white/50">
                      {relativeTime(p.updated_at)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <Link
                          to={"/dashboard/products/$id" as any}
                          params={{ id: p.id } as any}
                          search={editSearch as any}
                          onClick={rememberScroll}
                          className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white"
                        >
                          <Edit3 size={13} />
                        </Link>
                        <button className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white">
                          <Archive size={13} />
                        </button>
                        <button className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-[var(--accent-red-glow)]">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {products.length > 0 && view === "table" && (
          <ul className="dash-mobile-list -mx-4 -my-4">
            {paged.map((product) => (
              <li key={product.id} className="border-b border-[var(--border)] last:border-b-0">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
                  <label className="dash-mobile-check-target">
                    <input
                      type="checkbox"
                      checked={selected.has(product.id)}
                      onChange={() => toggle(product.id)}
                      aria-label={`Select ${product.name}`}
                      className="accent-[var(--c-catalog)]"
                    />
                  </label>
                  <Link
                    to={"/dashboard/products/$id" as any}
                    params={{ id: product.id } as any}
                    search={editSearch as any}
                    onClick={rememberScroll}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <ProductThumb product={product} />
                    <span className="min-w-0">
                      <span className="dash-fade-tail block text-sm font-semibold text-white">
                        {product.name}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        <DomainChip domain="catalog">{product.category}</DomainChip>
                        <OsSummary product={product} />
                      </span>
                    </span>
                  </Link>
                  <span className="text-right">
                    <span className="block font-mono text-sm text-[var(--c-money)]">
                      {formatMoney(product.price)}
                    </span>
                    {product.compare_at_price && product.compare_at_price > product.price && (
                      <span className="block font-mono text-[10px] text-[var(--text-disabled)] line-through">
                        {formatMoney(product.compare_at_price)}
                      </span>
                    )}
                    <span className="mt-1 block">
                      <StatusBadge status={product.status} />
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {products.length > 0 && view === "grid" && (
          <div className="dash-product-grid">
            {paged.map((product) => (
              <article key={product.id} className="dash-product-card">
                <div className="dash-product-card-media">
                  {product.cover_url ? (
                    <img src={product.cover_url} alt="" />
                  ) : (
                    <span
                      style={{
                        background:
                          product.cover_gradient || "linear-gradient(135deg,#2D1450,#0C6E92)",
                      }}
                    />
                  )}
                  <input
                    type="checkbox"
                    checked={selected.has(product.id)}
                    onChange={() => toggle(product.id)}
                    aria-label={`Select ${product.name}`}
                  />
                </div>
                <div className="dash-product-card-body">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      to={"/dashboard/products/$id" as any}
                      params={{ id: product.id } as any}
                      search={editSearch as any}
                      onClick={rememberScroll}
                      className="dash-fade-tail min-w-0 font-semibold text-white hover:text-[var(--c-catalog)]"
                    >
                      {product.name}
                    </Link>
                    <StatusBadge status={product.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <DomainChip domain="catalog">{product.category}</DomainChip>
                    <OsSummary product={product} />
                    {discountPercent(product) > 0 && (
                      <DomainChip domain="promo">-{discountPercent(product)}%</DomainChip>
                    )}
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <span className="font-mono text-lg text-[var(--c-money)]">
                      {formatMoney(product.price)}
                    </span>
                    <Link
                      to={"/dashboard/products/$id" as any}
                      params={{ id: product.id } as any}
                      search={editSearch as any}
                      onClick={rememberScroll}
                      className="btn-ghost !min-h-9 !px-3 !text-xs inline-flex items-center gap-1.5"
                    >
                      <Edit3 size={13} /> Edit
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="dash-table-footer">
            <span>{filtered.length} products</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-2 py-1 rounded hover:bg-white/5 disabled:opacity-30"
              >
                Prev
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2 py-1 rounded hover:bg-white/5 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </DashCard>

      {showCats && <CategoriesModal onClose={() => setShowCats(false)} />}

      <AlertDialog
        open={!!bulkConfirm}
        onOpenChange={(open) => {
          if (!open && !bulkBusy) setBulkConfirm(null);
        }}
      >
        <AlertDialogContent className="dashboard-dialog max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkConfirm === "delete"
                ? `Delete ${selected.size} product${selected.size === 1 ? "" : "s"}?`
                : `Archive ${selected.size} product${selected.size === 1 ? "" : "s"}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkConfirm === "delete"
                ? "This can't be undone. Products and their plugin files and cover images will be permanently removed from storage."
                : "Archived products stay in the database but are hidden from the storefront. You can restore them later."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkBusy}
              className={bulkConfirm === "delete" ? "dash-danger-button !bg-transparent" : ""}
              onClick={(event) => {
                event.preventDefault();
                void (bulkConfirm === "delete" ? bulkDelete() : bulkArchive());
              }}
            >
              {bulkBusy ? "Working…" : bulkConfirm === "delete" ? "Delete" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}

function CatalogStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="dash-charged-stat">
      <div className="dash-charged-stat-label">{label}</div>
      <div className="dash-charged-stat-value">{value}</div>
    </div>
  );
}

function ProductThumb({ product }: { product: Row }) {
  return product.cover_url ? (
    <img
      src={product.cover_url}
      alt=""
      className="h-11 w-11 shrink-0 rounded-[var(--r-element)] object-cover"
    />
  ) : (
    <span
      className="h-11 w-11 shrink-0 rounded-[var(--r-element)]"
      style={{ background: product.cover_gradient || "linear-gradient(135deg,#2D1450,#0C6E92)" }}
    />
  );
}

function OsSummary({ product }: { product: Row }) {
  if (product.category === "libraries") return <DomainChip domain="neutral">Library</DomainChip>;
  if (!product.supports_windows && !product.supports_mac)
    return (
      <span className="dash-status" data-tone="warning">
        Not set
      </span>
    );
  return (
    <>
      {product.supports_windows && <DomainChip domain="volume">Win</DomainChip>}
      {product.supports_mac && <DomainChip domain="catalog">Mac</DomainChip>}
    </>
  );
}

function discountPercent(product: Row) {
  const compare = Number(product.compare_at_price || 0);
  return compare > Number(product.price)
    ? Math.round((1 - Number(product.price) / compare) * 100)
    : 0;
}

function parseFileSize(value: string | null) {
  if (!value) return 0;
  const normalized = value.trim().toUpperCase();
  const numeric = Number.parseFloat(normalized.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric)) return 0;
  if (normalized.includes("TB")) return numeric * 1024 ** 4;
  if (normalized.includes("GB")) return numeric * 1024 ** 3;
  if (normalized.includes("MB")) return numeric * 1024 ** 2;
  if (normalized.includes("KB")) return numeric * 1024;
  return numeric;
}

function formatBytes(value: number) {
  if (!value) return "0 B";
  if (value >= 1024 ** 4) return `${(value / 1024 ** 4).toFixed(1)} TB`;
  if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)} GB`;
  if (value >= 1024 ** 2) return `${Math.round(value / 1024 ** 2)} MB`;
  return `${Math.round(value / 1024)} KB`;
}

// ---------- Inline edit cells ----------

function useOutsideClose(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
}

function OsCell({
  product,
  onSave,
}: {
  product: Row;
  onSave: (win: boolean, mac: boolean) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const set = async (win: boolean, mac: boolean) => {
    if (!win && !mac) return; // require at least one
    await onSave(win, mac);
    setOpen(false);
  };
  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex gap-1 rounded hover:bg-white/5 px-1 py-0.5 cursor-pointer"
      >
        {product.supports_windows && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-sky-200">
            Win
          </span>
        )}
        {product.supports_mac && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-fuchsia-500/15 border border-fuchsia-500/40 text-fuchsia-200">
            Mac
          </span>
        )}
        {!product.supports_windows && !product.supports_mac && (
          <span className="dash-status" data-tone="warning">
            Not set
          </span>
        )}
      </button>
      {open && (
        <div className="absolute z-40 top-full mt-1 left-0 w-44 glass-card p-2 shadow-2xl">
          <div className="relative z-10 space-y-1">
            <button
              onClick={() => set(true, false)}
              className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-white/10 flex items-center justify-between"
            >
              Windows only{" "}
              {product.supports_windows && !product.supports_mac && <Check size={12} />}
            </button>
            <button
              onClick={() => set(false, true)}
              className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-white/10 flex items-center justify-between"
            >
              Mac only {!product.supports_windows && product.supports_mac && <Check size={12} />}
            </button>
            <button
              onClick={() => set(true, true)}
              className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-white/10 flex items-center justify-between"
            >
              Both {product.supports_windows && product.supports_mac && <Check size={12} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryCell({
  product,
  onSave,
}: {
  product: Row;
  onSave: (v: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const pick = async (v: string) => {
    await onSave(v);
    setOpen(false);
  };
  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-block text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer"
      >
        {product.category}
      </button>
      {open && (
        <div className="absolute z-40 top-full mt-1 left-0 w-44 glass-card p-1 shadow-2xl max-h-64 overflow-y-auto">
          <div className="relative z-10">
            {productCategories.map((c) => (
              <button
                key={c}
                onClick={() => pick(c)}
                className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-white/10 flex items-center justify-between"
              >
                <span className="capitalize">{c}</span>
                {product.category === c && <Check size={12} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PriceCell({
  product,
  onSave,
  justSaved,
}: {
  product: Row;
  onSave: (price: number, cmp: number | null) => Promise<boolean>;
  justSaved: boolean;
}) {
  const [editing, setEditing] = useState<"price" | "cmp" | null>(null);
  const [val, setVal] = useState("");

  const startEdit = (which: "price" | "cmp") => {
    setEditing(which);
    setVal(
      which === "price"
        ? String(product.price)
        : product.compare_at_price
          ? String(product.compare_at_price)
          : "",
    );
  };

  const commit = async () => {
    if (!editing) return;
    const trimmed = val.trim();
    if (editing === "price") {
      const n = parseFloat(trimmed);
      if (!isFinite(n) || n < 0) {
        toast.error("Enter a valid price");
        setEditing(null);
        return;
      }
      if (n !== product.price) await onSave(n, product.compare_at_price);
    } else {
      const n = trimmed === "" ? null : parseFloat(trimmed);
      if (n !== null && (!isFinite(n) || n < 0)) {
        toast.error("Enter a valid compare-at price");
        setEditing(null);
        return;
      }
      if (n !== product.compare_at_price) await onSave(product.price, n);
    }
    setEditing(null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditing(null);
    }
  };

  return (
    <div className="inline-flex items-center gap-1 font-mono text-xs justify-end">
      {editing === "price" ? (
        <PriceInput value={val} setVal={setVal} onBlur={commit} onKeyDown={onKeyDown} />
      ) : (
        <button
          onClick={() => startEdit("price")}
          className={`px-1 py-0.5 rounded hover:bg-white/10 ${product.compare_at_price && product.compare_at_price > product.price ? "text-[var(--accent-red-glow)]" : ""}`}
        >
          {formatMoney(product.price)}
        </button>
      )}
      {editing === "cmp" ? (
        <PriceInput
          value={val}
          setVal={setVal}
          onBlur={commit}
          onKeyDown={onKeyDown}
          placeholder="—"
        />
      ) : (
        <button
          onClick={() => startEdit("cmp")}
          className="px-1 py-0.5 rounded hover:bg-white/10 text-white/40"
        >
          {product.compare_at_price ? (
            <span className="line-through">{formatMoney(product.compare_at_price)}</span>
          ) : (
            <span className="text-white/20">+cmp</span>
          )}
        </button>
      )}
      {justSaved && <Check size={12} className="text-emerald-400" />}
    </div>
  );
}

function PriceInput({
  value,
  setVal,
  onBlur,
  onKeyDown,
  placeholder,
}: {
  value: string;
  setVal: (v: string) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <div className="inline-flex items-center bg-white/10 border border-[var(--accent-red)]/60 rounded px-1 py-0.5">
      <span className="text-white/50 mr-0.5">$</span>
      <input
        ref={ref}
        value={value}
        onChange={(e) => setVal(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        inputMode="decimal"
        className="w-16 bg-transparent outline-none text-xs text-white text-right"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[var(--accent-red)]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#1F0540]">
          {o.label}
        </option>
      ))}
    </select>
  );
}

function CategoriesModal({ onClose }: { onClose: () => void }) {
  const [cats, setCats] = useState(productCategories);
  const [newCat, setNewCat] = useState("");
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="dashboard-dialog max-w-md">
        <DialogTitle className="font-display text-lg">Manage categories</DialogTitle>
        <DialogDescription className="sr-only">
          Add, rename, or remove product categories.
        </DialogDescription>
        <div className="mt-4">
          <ul className="space-y-2 mb-4">
            {cats.map((c) => (
              <li key={c} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                <input defaultValue={c} className="flex-1 bg-transparent outline-none text-sm" />
                <button
                  onClick={() => setCats((cs) => cs.filter((x) => x !== c))}
                  className="text-white/40 hover:text-[var(--accent-red-glow)]"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 mb-4">
            <input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder="New category"
              className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--accent-red)]"
            />
            <button
              onClick={() => {
                if (newCat) {
                  setCats([...cats, newCat]);
                  setNewCat("");
                }
              }}
              className="btn-ghost !text-xs !py-2 !px-3"
            >
              Add
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="btn-ghost !text-xs !py-2 !px-3">
              Cancel
            </button>
            <button onClick={onClose} className="btn-primary !text-xs !py-2 !px-4">
              Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
