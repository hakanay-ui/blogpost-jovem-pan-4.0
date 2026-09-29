import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/layouts/PublicLayout";
import { ArrowLeft, Calendar, Sparkles, Tag } from "lucide-react";

export const Route = createFileRoute("/tag/$slug")({
  component: TagPage,
});

type TagMeta = { id: string; name: string; slug: string; description: string | null };

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  ai_generated: boolean;
};

function TagPage() {
  const { slug } = Route.useParams();
  const [tag, setTag] = useState<TagMeta | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: tagData } = await supabase
        .from("tags")
        .select("id, name, slug, description")
        .eq("slug", slug)
        .maybeSingle();
      if (!tagData) {
        setLoading(false);
        return;
      }
      setTag(tagData as TagMeta);

      const { data: postRows } = await supabase
        .from("post_tags")
        .select("post:posts(id, title, slug, excerpt, cover_image_url, published_at, ai_generated, status)")
        .eq("tag_id", tagData.id);
      const filtered = (postRows ?? [])
        .map((r: any) => r.post)
        .filter((p: any) => p && p.status === "published")
        .sort((a: any, b: any) =>
          (b.published_at ?? "").localeCompare(a.published_at ?? ""),
        );
      setPosts(filtered as Post[]);
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading)
    return (
      <PublicLayout>
        <div className="mx-auto max-w-content px-6 py-20 text-text-secondary">Carregando…</div>
      </PublicLayout>
    );

  if (!tag)
    return (
      <PublicLayout>
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h1 className="text-3xl font-bold text-text-primary">Tag não encontrada</h1>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </div>
      </PublicLayout>
    );

  return (
    <PublicLayout>
      <section className="bg-bg-base py-16">
        <div className="mx-auto max-w-content px-6">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Todos os posts
          </Link>
          <div className="mb-10 flex items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
              <Tag className="h-3.5 w-3.5" /> {tag.name}
            </span>
          </div>
          {tag.description && (
            <p className="mb-8 max-w-2xl text-text-secondary">{tag.description}</p>
          )}

          {posts.length === 0 ? (
            <div className="lp-card-elevated p-12 text-center text-text-secondary">
              Nenhum post com esta tag ainda.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to="/post/$slug"
                  params={{ slug: post.slug }}
                  className="lp-card-elevated group flex h-full flex-col overflow-hidden"
                >
                  {post.cover_image_url ? (
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="aspect-video w-full bg-gradient-to-br from-accent/20 via-bg-subtle-accent to-bg-surface-2" />
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center gap-3 text-xs text-text-secondary">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {post.published_at
                          ? new Date(post.published_at).toLocaleDateString("pt-BR", {
                              day: "numeric",
                              month: "short",
                            })
                          : ""}
                      </span>
                      {post.ai_generated && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 font-medium text-accent">
                          <Sparkles className="h-3 w-3" /> IA
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-xl font-bold tracking-tight text-text-primary transition-colors group-hover:text-accent">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mt-2 line-clamp-3 text-sm text-text-secondary">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
