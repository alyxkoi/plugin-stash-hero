import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchPublishedPosts, formatBlogDate, type BlogPost } from "@/lib/blog";

const URL = "https://www.thepluginwarehouse.com/blog";
const TITLE = "The Warehouse Blog — Producer Guides & Real Talk on Plugin Pricing";
const DESC = "Straight-talk guides on building a pro studio for cheap, plugin pricing that isn't a scam, and the tools that actually matter. From Plugin Warehouse.";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts-public"],
    queryFn: fetchPublishedPosts,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-6 pb-24">
      <header className="pt-10 pb-14 md:pt-16 md:pb-20 border-b border-white/10 mb-10">
        <div className="font-mono text-[10px] tracking-[0.24em] text-red mb-4">// THE WAREHOUSE BLOG</div>
        <h1 className="font-display text-4xl md:text-6xl leading-[0.95] text-white max-w-3xl">
          Real talk on plugins, pricing, and building a pro studio for cheap.
        </h1>
        <p className="mt-5 text-white/60 max-w-xl text-sm md:text-base">
          No fluff, no gear hype, no affiliate nonsense. Just what actually matters for producers who want a pro sound without the pro-tier bill.
        </p>
      </header>

      {isLoading ? (
        <div className="text-white/40 text-sm">Loading…</div>
      ) : posts.length === 0 ? (
        <div className="text-white/40 text-sm">No posts yet — check back soon.</div>
      ) : (
        <ul className="grid gap-6 md:gap-8">
          {posts.map((p, i) => (
            <PostCard key={p.id} post={p} featured={i === 0} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PostCard({ post, featured }: { post: BlogPost; featured?: boolean }) {
  return (
    <li>
      <Link
        to="/blog/$slug"
        params={{ slug: post.slug }}
        className="group block relative overflow-hidden rounded-2xl border border-white/10 hover:border-red/60 transition p-6 md:p-8"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005))" }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition"
          style={{ background: "radial-gradient(600px 200px at 30% 0%, rgba(255,0,60,0.08), transparent 70%)" }}
        />
        <div className="relative">
          <div className="font-mono text-[10px] tracking-[0.2em] text-white/40 mb-3">
            {formatBlogDate(post.published_at ?? post.created_at)}
          </div>
          <h2 className={`font-display text-white leading-tight ${featured ? "text-3xl md:text-5xl" : "text-2xl md:text-3xl"}`}>
            {post.title}
          </h2>
          {post.excerpt && (
            <p className="mt-3 md:mt-4 text-white/60 text-sm md:text-base max-w-2xl">
              {post.excerpt}
            </p>
          )}
          <div className="mt-5 font-mono text-[11px] tracking-[0.18em] text-red">READ →</div>
        </div>
      </Link>
    </li>
  );
}
