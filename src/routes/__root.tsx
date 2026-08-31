import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Shell } from "@/components/Shell";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="error-state-v2 pwh-horizon">
      <div className="max-w-xl text-center">
        <h1>WRONG AISLE.</h1>
        <p>
          That page is no longer on the shelf.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="btn-primary"
          >
            Back to the warehouse
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="error-state-v2 pwh-horizon">
      <div className="max-w-md text-center">
        <h1>
          This page didn't load
        </h1>
        <p>
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn-primary"
          >
            Try again
          </button>
          <a
            href="/"
            className="btn-ghost"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Plugin Warehouse | Pro Music Plugins at up to 90% Off Retail" },
      {
        name: "description",
        content:
          "Pro plugins, sample libraries, and creative tools at a fraction of retail. Build your studio for less. Serum, Omnisphere, FabFilter and more, up to 90% off.",
      },
      { name: "author", content: "Plugin Warehouse" },
      { name: "theme-color", content: "#080612" },
      { property: "og:site_name", content: "Plugin Warehouse" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@pluginwarehouse" },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/E3zniLYNF9bYMEA8iYs6337JUNZ2/social-images/social-1784165136214-PWH_Logo_Main.webp",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/E3zniLYNF9bYMEA8iYs6337JUNZ2/social-images/social-1784165136214-PWH_Logo_Main.webp",
      },
      { name: "google-site-verification", content: "PU1Q5L07BtWGs0aqThZAlNRR0UP7C_3zpkwh1Sg8ttw" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { rel: "shortcut icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Google+Sans+Code:wght@300..800&family=Google+Sans+Flex:GRAD,ROND,opsz,wdth,wght@0..100,0..100,6..144,25..151,1..1000&display=swap",
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app-background-field" aria-hidden="true" />
      <div className="app-content-root">
        <Shell />
        <Toaster theme="dark" position="bottom-right" />
      </div>
    </QueryClientProvider>
  );
}
