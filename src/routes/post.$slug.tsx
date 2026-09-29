import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/layouts/PublicLayout";
import { Markdown } from "@/components/blog/Markdown";
import { AuthorBio } from "@/components/blog/AuthorBio";
import { useAuthorByPostId } from "@/hooks/queries/useProfile";
import { useProjectConfig } from "@/hooks/queries/useProjectConfig";
import { ArrowLeft, Calendar, Sparkles, ExternalLink, Tag as TagIcon } from "lucide-react";

type PostMeta = {
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
};

const fetchPostMeta = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => {
    if (typeof slug !== "string" || !slug) throw new Error("slug inválido");
    return slug;
  })
  .handler(async ({ data: slug }): Promise<PostMeta | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("posts")
      .select("title, slug, excerpt, cover_image_url, meta_title, meta_description")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    return (data as PostMeta | null) ?? null;
  });

function siteUrl(): string {
  const fromEnv =
    (typeof process !== "undefined" ? process.env?.VITE_SITE_URL : undefined) ??
    import.meta.env?.VITE_SITE_URL;
  const base = (fromEnv as string | undefined) ?? "https://newsfeed-whisperer.lovable.app";
  return base.replace(/\/$/, "");
}

export const Route = createFileRoute("/post/$slug")({
  loader: async ({ params }) => {
    const meta = await fetchPostMeta({ data: params.slug });
    return { meta };
  },
  head: ({ loaderData, params }) => {
    const meta = loaderData?.meta;
    if (!meta) return {};
    const title = meta.meta_title ?? meta.title;
    const description = meta.meta_description ?? meta.excerpt ?? "";
    const url = `${siteUrl()}/post/${params.slug}`;
    const image = meta.cover_image_url ?? undefined;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        ...(image ? [{ property: "og:image", content: image }] : []),
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(image ? [{ name: "twitter:image", content: image }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: PostPage,
  notFoundComponent: () => (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-3xl font-bold text-text-primary">Post não encontrado</h1>
        <Link to="/" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </div>
    </PublicLayout>
  ),
});

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
  ai_generated: boolean;
  sources: any;
};

type TagRef = { name: string; slug: string };

function PostPage() {
  const { slug } = Route.useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [tags, setTags] = useState<TagRef[]>([]);
  const { data: author } = useAuthorByPostId(post?.id);
  const { data: cfg } = useProjectConfig();
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("posts")
        .select("id, title, slug, excerpt, content, cover_image_url, meta_title, meta_description, published_at, ai_generated, sources")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (!data) {
        setMissing(true);
        setLoading(false);
        return;
      }
      setPost(data as any);
      setLoading(false);
      const { data: tagRows } = await supabase
        .from("post_tags")
        .select("tag:tags(name, slug)")
        .eq("post_id", (data as any).id);
      setTags(
        ((tagRows ?? []) as any[])
          .map((r) => r.tag)
          .filter((t): t is TagRef => !!t),
      );
    }
    load();
  }, [slug]);

  if (loading)
    return (
      <PublicLayout>
        <div className="mx-auto max-w-3xl px-6 py-20 text-text-secondary">Carregando…</div>
      </PublicLayout>
    );
  if (missing || !post) throw notFound();

  const sources: Array<{ index: number; url: string }> = Array.isArray(post.sources)
    ? post.sources
    : [];

  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-6 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Todos os posts
        </Link>
        <header className="mt-6 animate-fade-in-up">
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            {post.published_at && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(post.published_at).toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
            {post.ai_generated && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                <Sparkles className="h-3 w-3" /> Gerado com IA
              </span>
            )}
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-text-primary md:text-5xl">
            {post.title}
          </h1>
          {post.excerpt && <p className="mt-4 text-lg text-text-secondary">{post.excerpt}</p>}
          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((t) => (
                <Link
                  key={t.slug}
                  to="/tag/$slug"
                  params={{ slug: t.slug }}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-surface-1 px-2.5 py-0.5 text-xs text-text-secondary transition-colors hover:border-accent hover:text-accent"
                >
                  <TagIcon className="h-3 w-3" /> {t.name}
                </Link>
              ))}
            </div>
          )}
        </header>
        {(() => {
          const cover = post.cover_image_url || cfg?.blog_default_cover_url?.trim() || null;
          return cover ? (
            <img
              src={cover}
              alt={post.title}
              className="mt-8 w-full rounded-2xl border border-border shadow-[var(--shadow-elevation-3)]"
            />
          ) : null;
        })()}
        <div className="mt-8 animate-fade-in-up">
          <Markdown>{post.content}</Markdown>
        </div>
        {sources.length > 0 && (
          <section className="mt-12 border-t border-border pt-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
              Fontes
            </h2>
            <ol className="mt-3 space-y-2 text-sm">
              {sources.map((s) => (
                <li key={s.index} className="flex items-start gap-2">
                  <span className="text-text-tertiary">[{s.index}]</span>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 break-all text-accent hover:underline"
                  >
                    {s.url} <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </li>
              ))}
            </ol>
          </section>
        )}
        {author && <AuthorBio author={author} />}
      </article>
    </PublicLayout>
  );
}
