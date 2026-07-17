import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardShell, DashCard } from "@/components/DashboardShell";
import { fetchPostByIdAdmin, renderMarkdown, type BlogPost } from "@/lib/blog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/blog/$id")({
  head: () => ({ meta: [{ title: "Edit post — Plugin Warehouse" }] }),
  component: BlogEditor,
});

type Form = {
  slug: string;
  title: string;
  meta_title: string;
  meta_description: string;
  excerpt: string;
  cover_url: string;
  body_md: string;
  published: boolean;
};

const EMPTY: Form = {
  slug: "",
  title: "",
  meta_title: "",
  meta_description: "",
  excerpt: "",
  cover_url: "",
  body_md: "",
  published: false,
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function BlogEditor() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [original, setOriginal] = useState<BlogPost | null>(null);

  useEffect(() => {
    if (isNew) return;
    let alive = true;
    setLoading(true);
    fetchPostByIdAdmin(id).then((p) => {
      if (!alive) return;
      if (!p) {
        toast.error("Post not found.");
        navigate({ to: "/dashboard/blog" as any });
        return;
      }
      setOriginal(p);
      setForm({
        slug: p.slug,
        title: p.title,
        meta_title: p.meta_title,
        meta_description: p.meta_description,
        excerpt: p.excerpt ?? "",
        cover_url: p.cover_url ?? "",
        body_md: p.body_md,
        published: p.published,
      });
      setLoading(false);
    }).catch((e) => {
      toast.error(e.message ?? "Failed to load post.");
      setLoading(false);
    });
    return () => { alive = false; };
  }, [id, isNew, navigate]);

  const previewHtml = useMemo(() => renderMarkdown(form.body_md || ""), [form.body_md]);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(nextPublished?: boolean) {
    const shouldPublish = nextPublished ?? form.published;
    if (!form.title.trim()) return toast.error("Title required.");
    if (!form.slug.trim()) return toast.error("Slug required.");
    if (!form.meta_title.trim()) return toast.error("Meta title required.");
    if (!form.meta_description.trim()) return toast.error("Meta description required.");
    if (!form.body_md.trim()) return toast.error("Body required.");

    setSaving(true);
    const now = new Date().toISOString();
    const payload = {
      slug: slugify(form.slug),
      title: form.title.trim(),
      meta_title: form.meta_title.trim(),
      meta_description: form.meta_description.trim(),
      excerpt: form.excerpt.trim() || null,
      cover_url: form.cover_url.trim() || null,
      body_md: form.body_md,
      published: shouldPublish,
      published_at: shouldPublish
        ? (original?.published_at ?? now)
        : null,
    };

    try {
      if (isNew) {
        const { data, error } = await supabase.from("blog_posts").insert(payload).select("id").single();
        if (error) throw error;
        toast.success("Post created.");
        qc.invalidateQueries({ queryKey: ["dashboard-blog-posts"] });
        qc.invalidateQueries({ queryKey: ["blog-posts-public"] });
        navigate({ to: "/dashboard/blog/$id" as any, params: { id: data!.id }, replace: true });
      } else {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", id);
        if (error) throw error;
        setForm((f) => ({ ...f, published: shouldPublish }));
        toast.success("Saved.");
        qc.invalidateQueries({ queryKey: ["dashboard-blog-posts"] });
        qc.invalidateQueries({ queryKey: ["blog-posts-public"] });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell
      title={isNew ? "New post" : "Edit post"}
      action={
        <div className="flex gap-2">
          <button
            className="btn-secondary text-xs"
            onClick={() => setPreview((v) => !v)}
            type="button"
          >
            {preview ? "Edit" : "Preview"}
          </button>
          <button
            className="btn-secondary text-xs"
            onClick={() => save(false)}
            disabled={saving}
            type="button"
          >
            Save draft
          </button>
          <button
            className="btn-primary text-xs"
            onClick={() => save(true)}
            disabled={saving}
            type="button"
          >
            {form.published ? "Update live" : "Publish"}
          </button>
        </div>
      }
    >
      {loading ? (
        <DashCard><div className="text-white/40 text-sm p-4">Loading…</div></DashCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <DashCard>
              <div className="p-2 space-y-3">
                <Field label="Title">
                  <input
                    className="dash-input"
                    value={form.title}
                    onChange={(e) => {
                      const v = e.target.value;
                      set("title", v);
                      if (isNew && !form.slug) set("slug", slugify(v));
                      if (!form.meta_title) set("meta_title", v);
                    }}
                    placeholder="How to build a pro studio for cheap"
                  />
                </Field>
                <Field label="Slug (URL)">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-white/40">/blog/</span>
                    <input
                      className="dash-input flex-1"
                      value={form.slug}
                      onChange={(e) => set("slug", e.target.value)}
                      onBlur={(e) => set("slug", slugify(e.target.value))}
                      placeholder="my-post-slug"
                    />
                  </div>
                </Field>
                <Field label="Excerpt (shown on the blog index)">
                  <textarea
                    className="dash-input"
                    rows={2}
                    value={form.excerpt}
                    onChange={(e) => set("excerpt", e.target.value)}
                  />
                </Field>
                <Field label="Body (Markdown)">
                  {preview ? (
                    <div
                      className="blog-prose bg-black/30 rounded-lg p-4 border border-white/10 min-h-[400px] text-white/85"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  ) : (
                    <textarea
                      className="dash-input font-mono text-[13px] leading-[1.6]"
                      rows={24}
                      value={form.body_md}
                      onChange={(e) => set("body_md", e.target.value)}
                      placeholder="Write in Markdown. Use ### for section headings."
                    />
                  )}
                </Field>
              </div>
            </DashCard>
          </div>

          <div className="flex flex-col gap-4">
            <DashCard>
              <div className="p-2 space-y-3">
                <div className="text-[10px] font-mono tracking-[0.2em] text-white/50">SEO</div>
                <Field label="Meta title">
                  <input
                    className="dash-input"
                    value={form.meta_title}
                    onChange={(e) => set("meta_title", e.target.value)}
                    maxLength={70}
                  />
                  <div className="text-[10px] text-white/40 mt-1">{form.meta_title.length}/70</div>
                </Field>
                <Field label="Meta description">
                  <textarea
                    className="dash-input"
                    rows={3}
                    value={form.meta_description}
                    onChange={(e) => set("meta_description", e.target.value)}
                    maxLength={170}
                  />
                  <div className="text-[10px] text-white/40 mt-1">{form.meta_description.length}/170</div>
                </Field>
                <Field label="Cover image URL (used for og:image)">
                  <input
                    className="dash-input"
                    value={form.cover_url}
                    onChange={(e) => set("cover_url", e.target.value)}
                    placeholder="https://…"
                  />
                </Field>
              </div>
            </DashCard>

            <DashCard>
              <div className="p-2">
                <div className="text-[10px] font-mono tracking-[0.2em] text-white/50 mb-2">STATUS</div>
                <div className={`text-sm ${form.published ? "text-red" : "text-white/60"}`}>
                  {form.published ? "● Live" : "○ Draft"}
                </div>
                {original?.published_at && (
                  <div className="text-[11px] text-white/40 mt-1">
                    First published: {new Date(original.published_at).toLocaleString()}
                  </div>
                )}
              </div>
            </DashCard>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] font-mono tracking-[0.18em] text-white/50 mb-1.5">{label.toUpperCase()}</div>
      {children}
    </label>
  );
}
