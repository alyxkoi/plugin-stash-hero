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
  Package,
  Settings,
  ShoppingBag,
  Tag,
  Users,
} from "lucide-react";
import logo from "@/assets/logo-dashboard.webp";
import { useAuth, signOut } from "@/hooks/useAuth";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

export type DashboardDomain = "money" | "volume" | "people" | "catalog" | "promo" | "neutral";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  domain: DashboardDomain;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, domain: "money", exact: true },
  { to: "/dashboard/orders", label: "Orders", icon: ShoppingBag, domain: "volume" },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3, domain: "money" },
  { to: "/dashboard/customers", label: "Customers", icon: Users, domain: "people" },
  { to: "/dashboard/products", label: "Products", icon: Package, domain: "catalog" },
  { to: "/dashboard/perks", label: "Perks", icon: Gift, domain: "people" },
  { to: "/dashboard/sales", label: "Sales", icon: Tag, domain: "promo" },
  { to: "/dashboard/marketing", label: "Marketing", icon: Megaphone, domain: "promo" },
];

const SETTINGS_ITEM: NavItem = {
  to: "/dashboard/settings",
  label: "Settings",
  icon: Settings,
  domain: "neutral",
};

const NAV = [...NAV_ITEMS, SETTINGS_ITEM];

const DOMAIN_COLOR: Record<DashboardDomain, string> = {
  money: "var(--c-money)",
  volume: "var(--c-volume)",
  people: "var(--c-people)",
  catalog: "var(--c-catalog)",
  promo: "var(--c-promo)",
  neutral: "var(--text-tertiary)",
};

const DOMAIN_NAV_FILL: Record<DashboardDomain, string> = {
  money: "#FA1265",
  volume: "#FA1265",
  people: "#FA1265",
  catalog: "#FA1265",
  promo: "#FA1265",
  neutral: "#FA1265",
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
    window.requestAnimationFrame(() => mainRef.current?.focus({ preventScroll: true }));
  }, [pathname]);

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
      <div className="dash-background-field" aria-hidden="true" />
      <DesktopRail effectivePath={effectivePath} onLogout={logout} reduceMotion={reduceMotion} />

      <div className="dashboard-column">
        <header className="dash-page-header">
          <div className="dash-page-title-wrap">
            <span className="dash-page-accent" aria-hidden="true" />
            <h1 className="dash-page-title">{displayTitle}</h1>
          </div>

          <div className="dash-page-header-actions">
            {page.action}
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

      <MobileBottomNav effectivePath={effectivePath} reduceMotion={reduceMotion} />
    </div>
  );
}

function DesktopRail({
  effectivePath,
  onLogout,
  reduceMotion,
}: {
  effectivePath: string;
  onLogout: () => void;
  reduceMotion: boolean | null;
}) {
  return (
    <aside className="dash-rail" aria-label="Dashboard sidebar">
      <Link to="/dashboard" className="dash-logo-block">
        <img src={logo} alt="Plugin Warehouse" width={420} height={120} />
        <span>Dashboard</span>
      </Link>

      <nav className="dash-rail-nav" aria-label="Dashboard navigation">
        <div className="dash-nav-group-items">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              item={item}
              active={isNavActive(item, effectivePath)}
              reduceMotion={reduceMotion}
            />
          ))}
        </div>
      </nav>

      <div className="dash-rail-footer">
        <NavLink
          item={SETTINGS_ITEM}
          active={isNavActive(SETTINGS_ITEM, effectivePath)}
          reduceMotion={reduceMotion}
        />
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

function NavLink({
  item,
  active,
  reduceMotion,
}: {
  item: NavItem;
  active: boolean;
  reduceMotion: boolean | null;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to as any}
      activeOptions={{ exact: item.exact }}
      className={`dash-nav-link ${active ? "is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      style={
        {
          "--item-color": DOMAIN_COLOR[item.domain],
          "--item-fill": DOMAIN_NAV_FILL[item.domain],
        } as React.CSSProperties
      }
    >
      {active && (
        <motion.span
          layoutId="dashboard-nav-blob"
          className="dash-nav-blob"
          aria-hidden="true"
          initial={false}
          animate={{
            backgroundColor: DOMAIN_NAV_FILL[item.domain],
            scaleX: reduceMotion ? 1 : [1, 1.055, 1],
          }}
          transition={{
            layout: { type: "spring", stiffness: 420, damping: 24, mass: 0.82 },
            backgroundColor: {
              duration: reduceMotion ? 0 : 0.18,
              delay: reduceMotion ? 0 : 0.06,
              ease: "easeOut",
            },
            scaleX: { duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] },
          }}
        />
      )}
      <Icon size={20} strokeWidth={1.5} />
      <span>{item.label}</span>
    </Link>
  );
}

function MobileBottomNav({
  effectivePath,
  reduceMotion,
}: {
  effectivePath: string;
  reduceMotion: boolean | null;
}) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const activeLink = navRef.current?.querySelector<HTMLElement>("[aria-current='page']");
    activeLink?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [effectivePath, reduceMotion]);

  return (
    <div className="dash-bottom-nav-shell">
      <nav ref={navRef} className="dash-bottom-nav" aria-label="Dashboard navigation">
        {NAV.map((item) => {
          const active = isNavActive(item, effectivePath);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to as any}
              activeOptions={{ exact: item.exact }}
              className={`dash-bottom-link ${active ? "is-active" : ""}`}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              style={
                {
                  "--item-color": DOMAIN_COLOR[item.domain],
                  "--item-fill": DOMAIN_NAV_FILL[item.domain],
                } as React.CSSProperties
              }
            >
              {active && (
                <motion.span
                  layoutId="dashboard-mobile-nav-blob"
                  className="dash-bottom-blob"
                  aria-hidden="true"
                  initial={false}
                  animate={{
                    backgroundColor: DOMAIN_NAV_FILL[item.domain],
                    scaleX: reduceMotion ? 1 : [1, 1.055, 1],
                  }}
                  transition={{
                    layout: { type: "spring", stiffness: 420, damping: 24, mass: 0.82 },
                    backgroundColor: {
                      duration: reduceMotion ? 0 : 0.18,
                      delay: reduceMotion ? 0 : 0.06,
                      ease: "easeOut",
                    },
                    scaleX: {
                      duration: reduceMotion ? 0 : 0.32,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  }}
                />
              )}
              <Icon size={21} strokeWidth={1.6} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
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
  material = "grain",
  form = "halo",
  silhouette = "inset",
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  domain: Exclude<DashboardDomain, "neutral">;
  anchor?: "top-right" | "top-left";
  material?: "grain" | "solid";
  form?: "halo" | "arc" | "wash" | "corner";
  silhouette?: "inset" | "full" | "side" | "offset";
  title?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      className={`dash-charged dash-horizon dash-charged-${domain} dash-charged-${anchor} dash-material-${material} dash-grain-${form} dash-hero-${silhouette} ${className}`}
    >
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
