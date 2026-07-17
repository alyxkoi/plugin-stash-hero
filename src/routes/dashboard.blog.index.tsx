import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Edit3, Trash2, ExternalLink } from "lucide-react";
import { DashboardShell, DashCard } from "@/components/DashboardShell";
import { fetchAllPostsAdmin, formatBlogDate } from "@/lib/blog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/blog/")({
  head: () => ({ meta: [{ title: "Blog — Plugin Warehouse" }] }),
  component: BlogAdmin,
});

function BlogAdmin() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["dashboard-blog-posts"],
    queryFn: fetchAllPostsAdmin,
    staleTime: 30_000,
  });

  async function remove(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Post deleted.");
    qc.invalidateQueries({ queryKey: ["dashboard-blog-posts"] });
    qc.invalidateQueries({ queryKey: ["blog-posts-public"] });
  }

  async function togglePublish(id: string, next: boolean) {
    const patch: Record<string, unknown> = { published: next };
    if (next) patch.published_at = new Date().toISOString();
    const { error } = await supabase.from("blog_posts").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(next ? "Published." : "Moved to draft.");
    qc.invalidateQueries({ queryKey: ["dashboard-blog-posts"] });
    qc.invalidateQueries({ queryKey: ["blog-posts-public"] });
  }

  return (
    <DashboardShell
      title="Blog"
      action={
        <button className="btn-primary" onClick={() => navigate({ to: "/dashboard/blog/$id" as any, params: { id: "new" } })}>
          <Plus size={14} /> New post
        </button>
      }
    >
      <DashCard>
        {isLoading ? (
          <div className="text-white/40 text-sm p-4">Loading…</div>
        ) : posts.length === 0 ? (
          <div className="text-white/40 text-sm p-4">No posts yet. Create your first one.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {posts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-3 px-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm truncate">{p.title}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${p.published ? "bg-red/20 text-red" : "bg-white/10 text-white/60"}`}>
                      {p.published ? "LIVE" : "DRAFT"}
                    </span>
                  </div>
                  <div className="text-[11px] text-white/40 font-mono mt-0.5 truncate">
                    /{p.slug} · updated {formatBlogDate(p.updated_at)}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {p.published && (
                    <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" title="View" className="p-2 rounded hover:bg-white/5 text-white/60 hover:text-white">
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    onClick={() => togglePublish(p.id, !p.published)}
                    className="text-[10px] font-mono px-2 py-1 rounded border border-white/15 hover:border-white/40 text-white/70 hover:text-white"
                  >
                    {p.published ? "UNPUBLISH" : "PUBLISH"}
                  </button>
                  <Link
                    to="/dashboard/blog/$id"
                    params={{ id: p.id }}
                    className="p-2 rounded hover:bg-white/5 text-white/60 hover:text-white"
                    title="Edit"
                  >
                    <Edit3 size={14} />
                  </Link>
                  <button
                    onClick={() => remove(p.id, p.title)}
                    className="p-2 rounded hover:bg-white/5 text-white/50 hover:text-red"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashCard>
    </DashboardShell>
  );
}
