import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { fetchPostBySlug, formatBlogDate, renderMarkdown } from "@/lib/blog";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await fetchPostBySlug(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ params, loaderData }) => {
    const url = `https://www.thepluginwarehouse.com/blog/${params.slug}`;
    if (!loaderData?.post) {
      return {
        meta: [{ title: "Post not found — Plugin Warehouse" }, { name: "robots", content: "noindex" }],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const p = loaderData.post;
    const title = `${p.meta_title} — Plugin Warehouse`;
    const desc = p.meta_description;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: p.meta_title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { property: "article:published_time", content: p.published_at ?? p.created_at },
      { property: "article:modified_time", content: p.updated_at },
    ];
    if (p.cover_url) {
      meta.push({ property: "og:image", content: p.cover_url });
      meta.push({ name: "twitter:image", content: p.cover_url });
    }
    const articleLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: p.title,
      description: desc,
      datePublished: p.published_at ?? p.created_at,
      dateModified: p.updated_at,
      author: { "@type": "Organization", name: "Plugin Warehouse" },
      publisher: {
        "@type": "Organization",
        name: "Plugin Warehouse",
        logo: { "@type": "ImageObject", url: "https://www.thepluginwarehouse.com/favicon.ico" },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      ...(p.cover_url ? { image: p.cover_url } : {}),
    };
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(articleLd) }],
    };
  },
  component: BlogPostPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 md:px-6 py-24 text-center">
      <h1 className="font-display text-4xl text-white mb-3">Post not found</h1>
      <p className="text-white/60 mb-6">This article may have been unpublished or moved.</p>
      <Link to="/blog" className="btn-primary">← Back to blog</Link>
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="mx-auto max-w-2xl px-4 md:px-6 py-24 text-center">
      <h1 className="font-display text-3xl text-white mb-3">Something went wrong</h1>
      <button className="btn-primary" onClick={() => reset()}>Try again</button>
    </div>
  ),
});

function BlogPostPage() {
  const { post } = Route.useLoaderData();
  const html = renderMarkdown(post.body_md);

  return (
    <article className="mx-auto max-w-3xl px-4 md:px-6 pb-24">
      <div className="pt-6 mb-6">
        <Link to="/blog" className="font-mono text-[11px] tracking-[0.18em] text-white/50 hover:text-white transition">
          ← THE WAREHOUSE BLOG
        </Link>
      </div>

      <header className="mb-10 pb-8 border-b border-white/10">
        <div className="font-mono text-[10px] tracking-[0.24em] text-red mb-4">
          {formatBlogDate(post.published_at ?? post.created_at)}
        </div>
        <h1 className="font-display text-4xl md:text-6xl leading-[1.02] text-white">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="mt-5 text-white/70 text-base md:text-lg max-w-2xl leading-relaxed">
            {post.excerpt}
          </p>
        )}
      </header>

      {post.cover_url && (
        <img
          src={post.cover_url}
          alt={post.title}
          className="w-full rounded-2xl mb-10 border border-white/10"
          loading="lazy"
        />
      )}

      <div
        className="blog-prose text-white/85 leading-[1.75] text-[15px] md:text-[17px]"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <div className="mt-16 pt-8 border-t border-white/10 text-center">
        <div className="font-mono text-[10px] tracking-[0.24em] text-white/40 mb-3">// KEEP READING</div>
        <Link to="/blog" className="btn-primary">Back to all posts →</Link>
      </div>
    </article>
  );
}
