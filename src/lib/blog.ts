import { marked } from "marked";
import { supabase } from "@/integrations/supabase/client";

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  meta_title: string;
  meta_description: string;
  excerpt: string | null;
  cover_url: string | null;
  body_md: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const LIST_COLS = "id,slug,title,meta_title,meta_description,excerpt,cover_url,published,published_at,created_at,updated_at";
const FULL_COLS = LIST_COLS + ",body_md";

export async function fetchPublishedPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(LIST_COLS)
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as BlogPost[];
}

export async function fetchPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(FULL_COLS)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as BlogPost) ?? null;
}

export async function fetchAllPostsAdmin(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(LIST_COLS)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as BlogPost[];
}

export async function fetchPostByIdAdmin(id: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(FULL_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as BlogPost) ?? null;
}

marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdown(md: string): string {
  return marked.parse(md) as string;
}

export function formatBlogDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
