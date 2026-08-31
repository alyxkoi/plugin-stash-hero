import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BASE_URL = "https://www.thepluginwarehouse.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/shop", changefreq: "daily", priority: "0.9" },
          { path: "/deals", changefreq: "daily", priority: "0.8" },
          { path: "/blog", changefreq: "weekly", priority: "0.7" },
          { path: "/search", changefreq: "weekly", priority: "0.5" },
          { path: "/our-story", changefreq: "monthly", priority: "0.6" },
          { path: "/faq", changefreq: "monthly", priority: "0.6" },
          { path: "/contact-us", changefreq: "monthly", priority: "0.6" },
          { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms-of-service", changefreq: "yearly", priority: "0.3" },
          { path: "/login", changefreq: "yearly", priority: "0.3" },
          { path: "/signup", changefreq: "yearly", priority: "0.3" },
        ];

        for (const c of ["instruments", "effects", "libraries", "daws", "software", "freebies"]) {
          entries.push({ path: `/shop/${c}`, changefreq: "weekly", priority: "0.8" });
        }


        try {
          const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
          const supabase = createClient<Database>(process.env.SUPABASE_URL!, key, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: {
              fetch: (input, init) => {
                const h = new Headers(init?.headers);
                if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
                h.set("apikey", key);
                return fetch(input, { ...init, headers: h });
              },
            },
          });

          const { data: products } = await supabase
            .from("products")
            .select("slug, updated_at")
            .eq("status", "published");
          for (const p of products ?? []) {
            if (p.slug) entries.push({ path: `/shop/p/${p.slug}`, lastmod: p.updated_at?.slice(0, 10), changefreq: "weekly", priority: "0.7" });
          }

          const { data: posts } = await supabase
            .from("blog_posts")
            .select("slug, updated_at")
            .eq("published", true);
          for (const b of (posts as { slug: string | null; updated_at: string | null }[] | null) ?? []) {
            if (b.slug) entries.push({ path: `/blog/${b.slug}`, lastmod: b.updated_at?.slice(0, 10), changefreq: "monthly", priority: "0.6" });
          }
        } catch {
          // If DB is unreachable, still serve the static entries.
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
