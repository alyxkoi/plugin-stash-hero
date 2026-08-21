import {
  ReactNode,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  ChevronDown,
  ExternalLink,
  Gift,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MoreHorizontal,
  Package,
  Search,
  Settings,
  ShoppingBag,
  Tag,
  Users,
} from "lucide-react";
import logo from "@/assets/logo-dashboard.webp";
import { useAuth, signOut } from "@/hooks/useAuth";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export type DashboardDomain = "money" | "volume" | "people" | "catalog" | "promo" | "neutral";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  domain: DashboardDomain;
  exact?: boolean;
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Operations",
    items: [
      { to: "/dashboard", label: "Overview", icon: LayoutDashboard, domain: "money", exact: true },
      { to: "/dashboard/orders", label: "Orders", icon: ShoppingBag, domain: "volume" },
      { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3, domain: "money" },
    ],
  },
  {
    label: "Audience",
    items: [
      { to: "/dashboard/customers", label: "Customers", icon: Users, domain: "people" },
      { to: "/dashboard/perks", label: "Perks", icon: Gift, domain: "people" },
    ],
  },
  {
    label: "Catalog",
    items: [{ to: "/dashboard/products", label: "Products", icon: Package, domain: "catalog" }],
  },
  {
    label: "Growth",
    items: [
      { to: "/dashboard/sales", label: "Sales", icon: Tag, domain: "promo" },
      { to: "/dashboard/marketing", label: "Marketing", icon: Megaphone, domain: "promo" },
    ],
  },
];

const SETTINGS_ITEM: NavItem = {
  to: "/dashboard/settings",
  label: "Settings",
  icon: Settings,
  domain: "neutral",
};

const NAV = [...NAV_GROUPS.flatMap((group) => group.items), SETTINGS_ITEM];
const MOBILE_NAV = NAV.filter((item) =>
  ["Overview", "Orders", "Products", "Customers"].includes(item.label),
);
const MORE_NAV = NAV.filter((item) => !MOBILE_NAV.includes(item));

const DOMAIN_COLOR: Record<DashboardDomain, string> = {
  money: "var(--c-money)",
  volume: "var(--c-volume)",
  people: "var(--c-people)",
  catalog: "var(--c-catalog)",
  promo: "var(--c-promo)",
  neutral: "var(--text-tertiary)",
};

interface Props {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

type DashboardChrome = { setPage: (title: string, action?: ReactNode) => void };
const DashboardChromeContext = createContext<DashboardChrome | null>(null);
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function DashboardShell({ title, action, children }: Props) {
  const nestedChrome = useContext(DashboardChromeContext);
  const actionSig = useMemo(() => getActionSignature(action), [action]);

  useBrowserLayoutEffect(() => {
    nestedChrome?.setPage(title, action);
  }, [nestedChrome, title, actionSig]);

  if (nestedChrome) return <>{children}</>;
  return (
    <DashboardChromeRoot initialTitle={title} initialAction={action}>
      {children}
    </DashboardChromeRoot>
  );
}

function DashboardChromeRoot({
  initialTitle,
  initialAction,
  children,
}: {
  initialTitle: string;
  initialAction?: ReactNode;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const namePart = email.split("@")[0] || "Admin";
  const name = namePart
    .split(/[._-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const [accountOpen, setAccountOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [page, setPageState] = useState<{ title: string; action?: ReactNode }>({
    title: initialTitle,
    action: initialAction,
  });
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const reduceMotion = useReducedMotion();
  const mainRef = useRef<HTMLElement>(null);

  const effectivePath = pathname.startsWith("/dashboard/campaign-links")
    ? "/dashboard/analytics"
    : pathname;
  const activeItem = NAV.find((item) => isNavActive(item, effectivePath)) ?? NAV[0];
  const domain = activeItem.domain;
  const routeTitle = activeItem.label;
  const displayTitle = page.title === initialTitle ? routeTitle : page.title;
  const isMoreActive = MORE_NAV.some((item) => isNavActive(item, effectivePath));

  const setPage = useCallback((nextTitle: string, nextAction?: ReactNode) => {
    setPageState({ title: nextTitle, action: nextAction });
  }, []);
  const chrome = useMemo(() => ({ setPage }), [setPage]);

  useEffect(() => {
    document.body.classList.add("dashboard-active");
    return () => document.body.classList.remove("dashboard-active");
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    setAccountOpen(false);
    setMoreOpen(false);
    window.requestAnimationFrame(() => mainRef.current?.focus({ preventScroll: true }));
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const logout = async () => {
    await signOut();
    navigate({ to: "/dashboard/login" as any });
  };

  return (
    <div
      className="dashboard-scope"
      data-domain={domain}
      style={{ "--section-color": DOMAIN_COLOR[domain] } as React.CSSProperties}
    >
      <DesktopRail
        effectivePath={effectivePath}
        onSearch={() => setPaletteOpen(true)}
        onLogout={logout}
      />

      <div className="dashboard-column">
        <header className="dash-page-header">
          <div className="dash-page-title-wrap">
            <span className="dash-page-accent" aria-hidden="true" />
            <h1 className="dash-page-title">{displayTitle}</h1>
          </div>

          <div className="dash-page-header-actions">
            {page.action}
            <button
              type="button"
              className="dash-command-trigger"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette"
            >
              <Search size={16} strokeWidth={1.8} />
              <span>Search</span>
              <kbd>
                {typeof navigator !== "undefined" && /Mac/.test(navigator.platform)
                  ? "⌘K"
                  : "Ctrl K"}
              </kbd>
            </button>

            <div className="dash-account-wrap">
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                className="dash-account-chip"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
              >
                <span className="dash-avatar" aria-hidden="true">
                  {initials(name, email)}
                </span>
                <span className="dash-account-name">{name}</span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              {accountOpen && (
                <div className="dash-account-menu" role="menu">
                  <Link
                    to="/dashboard/settings"
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                  >
                    Settings
                  </Link>
                  <button type="button" role="menuitem" onClick={logout}>
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main ref={mainRef} id="dashboard-main" tabIndex={-1} className="dashboard-main">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              className="dash-page"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
            >
              <SectionErrorBoundary resetKey={pathname}>
                <DashboardChromeContext.Provider value={chrome}>
                  {children}
                </DashboardChromeContext.Provider>
              </SectionErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <MobileBottomNav
        effectivePath={effectivePath}
        domain={domain}
        isMoreActive={isMoreActive}
        onMore={() => setMoreOpen(true)}
      />

      <MoreSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        effectivePath={effectivePath}
        onLogout={logout}
      />
      <DashboardCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

function DesktopRail({
  effectivePath,
  onSearch,
  onLogout,
}: {
  effectivePath: string;
  onSearch: () => void;
  onLogout: () => void;
}) {
  return (
    <aside className="dash-rail" aria-label="Dashboard sidebar">
      <Link to="/dashboard" className="dash-logo-block">
        <img src={logo} alt="Plugin Warehouse" width={420} height={120} />
        <span>Dashboard</span>
      </Link>

      <button type="button" className="dash-rail-search" onClick={onSearch}>
        <Search size={16} strokeWidth={1.8} />
        <span>Search anything</span>
        <kbd>Ctrl K</kbd>
      </button>

      <nav className="dash-rail-nav" aria-label="Dashboard navigation">
        {NAV_GROUPS.map((group) => (
          <div className="dash-nav-group" key={group.label}>
            <div className="dash-nav-group-label">{group.label}</div>
            <div className="dash-nav-group-items">
              {group.items.map((item) => (
                <NavLink key={item.to} item={item} active={isNavActive(item, effectivePath)} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="dash-rail-footer">
        <NavLink item={SETTINGS_ITEM} active={isNavActive(SETTINGS_ITEM, effectivePath)} />
        <a href="/" target="_blank" rel="noreferrer" className="dash-nav-link">
          <ExternalLink size={20} strokeWidth={1.5} />
          <span>View storefront</span>
        </a>
        <button type="button" onClick={onLogout} className="dash-nav-link">
          <LogOut size={20} strokeWidth={1.5} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to as any}
      className={`dash-nav-link ${active ? "is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      style={{ "--item-color": DOMAIN_COLOR[item.domain] } as React.CSSProperties}
    >
      {active && (
        <motion.span
          layoutId="dashboard-nav-blob"
          className="dash-nav-blob"
          aria-hidden="true"
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
        />
      )}
      <Icon size={20} strokeWidth={1.5} />
      <span>{item.label}</span>
    </Link>
  );
}

function MobileBottomNav({
  effectivePath,
  domain,
  isMoreActive,
  onMore,
}: {
  effectivePath: string;
  domain: DashboardDomain;
  isMoreActive: boolean;
  onMore: () => void;
}) {
  return (
    <nav className="dash-bottom-nav" aria-label="Dashboard navigation">
      {MOBILE_NAV.map((item) => {
        const active = isNavActive(item, effectivePath);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to as any}
            className={`dash-bottom-link ${active ? "is-active" : ""}`}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            style={{ "--item-color": DOMAIN_COLOR[item.domain] } as React.CSSProperties}
          >
            {active && (
              <motion.span
                layoutId="dashboard-mobile-nav-blob"
                className="dash-bottom-blob"
                aria-hidden="true"
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
              />
            )}
            <Icon size={21} strokeWidth={1.6} />
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMore}
        className={`dash-bottom-link ${isMoreActive ? "is-active" : ""}`}
        aria-label="More dashboard pages"
        aria-current={isMoreActive ? "page" : undefined}
        style={
          { "--item-color": DOMAIN_COLOR[isMoreActive ? domain : "neutral"] } as React.CSSProperties
        }
      >
        {isMoreActive && (
          <motion.span
            layoutId="dashboard-mobile-nav-blob"
            className="dash-bottom-blob"
            aria-hidden="true"
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          />
        )}
        <MoreHorizontal size={22} strokeWidth={1.6} />
      </button>
    </nav>
  );
}

function MoreSheet({
  open,
  onOpenChange,
  effectivePath,
  onLogout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  effectivePath: string;
  onLogout: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dashboard-more-sheet">
        <DialogTitle className="dash-panel-title">More</DialogTitle>
        <DialogDescription className="sr-only">Additional dashboard destinations</DialogDescription>
        <div className="dash-more-grid">
          {MORE_NAV.map((item) => {
            const active = isNavActive(item, effectivePath);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as any}
                onClick={() => onOpenChange(false)}
                className={`dash-more-link ${active ? "is-active" : ""}`}
                aria-current={active ? "page" : undefined}
                style={{ "--item-color": DOMAIN_COLOR[item.domain] } as React.CSSProperties}
              >
                <Icon size={20} strokeWidth={1.6} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <a href="/" target="_blank" rel="noreferrer" className="dash-more-link">
            <ExternalLink size={20} strokeWidth={1.6} />
            <span>View storefront</span>
          </a>
          <button type="button" onClick={onLogout} className="dash-more-link dash-more-logout">
            <LogOut size={20} strokeWidth={1.6} />
            <span>Log out</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DashboardCommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    {
      type: "Order" | "Product" | "Customer";
      id: string;
      label: string;
      meta: string;
      to: string;
    }[]
  >([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }
    const cleaned = query.trim().replace(/[^a-zA-Z0-9@._\-\s]/g, "");
    if (cleaned.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const pattern = `%${cleaned}%`;
      const [ordersRes, productsRes, customersRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, number, customer_name, guest_email")
          .or(`number.ilike.${pattern},customer_name.ilike.${pattern},guest_email.ilike.${pattern}`)
          .limit(5),
        supabase
          .from("products")
          .select("id, name, slug")
          .or(`name.ilike.${pattern},slug.ilike.${pattern}`)
          .limit(5),
        supabase
          .from("customers")
          .select("id, name, email")
          .or(`name.ilike.${pattern},email.ilike.${pattern}`)
          .limit(5),
      ]);
      if (cancelled) return;
      setResults([
        ...(ordersRes.data ?? []).map((order) => ({
          type: "Order" as const,
          id: order.id,
          label: order.number,
          meta: order.customer_name || order.guest_email || "Guest",
          to: `/dashboard/orders/${order.id}`,
        })),
        ...(productsRes.data ?? []).map((product) => ({
          type: "Product" as const,
          id: product.id,
          label: product.name,
          meta: product.slug,
          to: `/dashboard/products/${product.id}`,
        })),
        ...(customersRes.data ?? []).map((customer) => ({
          type: "Customer" as const,
          id: customer.id,
          label: customer.name || customer.email,
          meta: customer.email,
          to: `/dashboard/customers/${customer.id}`,
        })),
      ]);
      setSearching(false);
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  const run = (to: string) => {
    onOpenChange(false);
    navigate({ to: to as any });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search orders, products, customers, or pages…"
      />
      <CommandList>
        <CommandEmpty>
          {searching ? "Searching…" : "No matching page, record, or action."}
        </CommandEmpty>
        {results.length > 0 && (
          <CommandGroup heading="Search results">
            {results.map((result) => (
              <CommandItem
                key={`${result.type}-${result.id}`}
                value={`${result.type} ${result.label} ${result.meta}`}
                onSelect={() => run(result.to)}
              >
                {result.type === "Order" ? (
                  <ShoppingBag />
                ) : result.type === "Product" ? (
                  <Package />
                ) : (
                  <Users />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{result.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {result.meta}
                  </span>
                </span>
                <CommandShortcut>{result.type}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.length > 0 && <CommandSeparator />}
        <CommandGroup heading="Pages">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem key={item.to} value={`${item.label} page`} onSelect={() => run(item.to)}>
                <Icon />
                <span>{item.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick actions">
          <CommandItem value="add new product" onSelect={() => run("/dashboard/products/new")}>
            <Package />
            <span>Add product</span>
            <CommandShortcut>Catalog</CommandShortcut>
          </CommandItem>
          <CommandItem value="create new sale" onSelect={() => run("/dashboard/sales/new")}>
            <Tag />
            <span>New sale</span>
            <CommandShortcut>Growth</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="generate discount code"
            onSelect={() => run("/dashboard/marketing?tab=codes")}
          >
            <Megaphone />
            <span>Generate code</span>
            <CommandShortcut>Growth</CommandShortcut>
          </CommandItem>
          <CommandItem value="grant plugin perk" onSelect={() => run("/dashboard/perks")}>
            <Gift />
            <span>Grant plugin</span>
            <CommandShortcut>Audience</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

function isNavActive(item: NavItem, path: string) {
  return item.exact ? path === item.to : path === item.to || path.startsWith(`${item.to}/`);
}

function initials(name: string, email: string) {
  return (name || email || "Admin")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getActionSignature(action: ReactNode): string {
  if (!action) return "";
  if (typeof action === "string" || typeof action === "number") return String(action);
  if (Array.isArray(action)) return action.map(getActionSignature).join("|");
  if (!isValidElement(action)) return "node";
  const type =
    typeof action.type === "string"
      ? action.type
      : (action.type as any).displayName || (action.type as any).name || "component";
  const props = action.props as Record<string, unknown>;
  const primitiveProps = Object.entries(props)
    .filter(
      ([key, value]) =>
        key !== "children" && ["string", "number", "boolean"].includes(typeof value),
    )
    .map(([key, value]) => `${key}:${String(value)}`)
    .join(",");
  return `${type}(${primitiveProps})[${getActionSignature(props.children as ReactNode)}]`;
}

export function DashCard({
  children,
  className = "",
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className={`dash-panel ${className}`}>
      {(title || action) && (
        <header className="dash-panel-header">
          {title && <h2 className="dash-panel-title">{title}</h2>}
          {action && <div className="dash-panel-action">{action}</div>}
        </header>
      )}
      <div className="dash-panel-body">{children}</div>
    </section>
  );
}

export function ChargedPanel({
  children,
  className = "",
  domain,
  anchor = "top-right",
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  domain: Exclude<DashboardDomain, "neutral">;
  anchor?: "top-right" | "top-left";
  title?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className={`dash-charged dash-charged-${domain} dash-charged-${anchor} ${className}`}>
      {(title || action) && (
        <header className="dash-charged-header">
          {title && <h2 className="dash-charged-title">{title}</h2>}
          {action && <div>{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  delta,
  deltaPositive,
  comparison,
  domain = "money",
}: {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  comparison?: string;
  domain?: DashboardDomain;
}) {
  const direction = deltaPositive == null ? "neutral" : deltaPositive ? "positive" : "negative";
  return (
    <article className="dash-stat" data-domain={domain}>
      <div className="dash-stat-label">{label}</div>
      <div className="dash-stat-line">
        <div className="dash-stat-value">{value}</div>
        {delta && (
          <span className="dash-delta" data-direction={direction}>
            {direction === "positive" ? "↑" : direction === "negative" ? "↓" : "→"} {delta}
          </span>
        )}
      </div>
      {comparison && <div className="dash-stat-comparison">{comparison}</div>}
    </article>
  );
}

export function DashboardSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-6" aria-label="Loading dashboard layout" aria-busy="true">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="dash-stat space-y-3">
            <div className="skeleton-line w-24 h-3" />
            <div className="skeleton-line w-28 h-7" />
            <div className="skeleton-line w-20 h-3" />
          </div>
        ))}
      </div>
      <div className="dash-panel">
        <div className="dash-panel-body space-y-4">
          <div className="skeleton-line w-36 h-4" />
          <div className="skeleton-block h-64" />
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = ["completed", "active", "published", "connected", "live", "paid"].includes(
    normalized,
  )
    ? "positive"
    : ["pending", "scheduled", "partial", "expiring", "warning"].includes(normalized)
      ? "warning"
      : ["refunded", "failed", "disconnected", "error", "banned"].includes(normalized)
        ? "danger"
        : "neutral";
  return (
    <span className="dash-status" data-tone={tone}>
      {status}
    </span>
  );
}

export function DomainChip({
  children,
  domain = "neutral",
  className = "",
}: {
  children: ReactNode;
  domain?: DashboardDomain;
  className?: string;
}) {
  return (
    <span className={`dash-chip ${className}`} data-domain={domain}>
      {children}
    </span>
  );
}

export function RangeControl<T extends string>({
  value,
  onChange,
  options,
  label = "Date range",
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string; title?: string }[];
  label?: string;
}) {
  return (
    <div className="dash-range-control">
      <select
        className="dash-range-select"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="dash-segmented dash-range-buttons" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            title={option.title}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="dash-empty">
      <p>{children}</p>
      {action}
    </div>
  );
}

export { Outlet };
