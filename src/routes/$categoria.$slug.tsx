import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, Facebook, Link2, Radio, Twitter } from "lucide-react";
import { PublicLayout } from "@/layouts/PublicLayout";
import { Markdown } from "@/components/blog/Markdown";
import { ListItem } from "@/components/site/NewsCards";
import { useRelatedNews } from "@/hooks/queries/useNews";
import { useProjectConfig } from "@/hooks/queries/useProjectConfig";
import { SITE, UNCATEGORIZED_SLUG, formatLongDateTime, siteUrl } from "@/lib/site";

export type FullPost = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  cover_alt: string | null;
  cover_credit: string | null;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
  updated_at: string;
  ai_generated: boolean;
  sources: Array<{ index: number; url: string }> | null;
  topic_id: string | null;
  topic: { slug: string | null; name: string } | null;
  post_tags: Array<{ tag: { name: string; slug: string } | null }>;
  author: { full_name: string | null } | null;
};

const fetchPost = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => {
    if (typeof slug !== "string" || !slug || slug.length > 200) throw new Error("slug inválido");
    return slug;
  })
  .handler(async ({ data: slug }): Promise<FullPost | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("posts")
      .select(
        "id, title, slug, subtitle, excerpt, content, cover_image_url, cover_alt, cover_credit, meta_title, meta_description, published_at, updated_at, ai_generated, sources, topic_id, author_id, topic:editorial_topics(slug, name), post_tags(tag:tags(name, slug))",
      )
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (!data) return null;
    const row = data as unknown as FullPost & { author_id: string | null };
    let author: FullPost["author"] = null;
    if (!row.ai_generated && row.author_id) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", row.author_id)
        .maybeSingle();
      author = profile ?? null;
    }
    return { ...row, author };
  });

export const Route = createFileRoute("/$categoria/$slug")({
  loader: async ({ params }) => {
    const post = await fetchPost({ data: params.slug });
    if (!post) throw notFound();
    const canonicalCat = post.topic?.slug || UNCATEGORIZED_SLUG;
    if (canonicalCat !== params.categoria) {
      throw redirect({
        to: "/$categoria/$slug",
        params: { categoria: canonicalCat, slug: post.slug },
        statusCode: 301,
      });
    }
    return { post };
  },
  head: ({ loaderData, params }) => {
    const post = loaderData?.post;
    if (!post) return {};
    const title = `${post.meta_title ?? post.title} | ${SITE.name}`;
    const description = post.meta_description ?? post.subtitle ?? post.excerpt ?? "";
    const url = `${siteUrl()}/${params.categoria}/${params.slug}`;
    const image = post.cover_image_url ?? undefined;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: post.title,
      description,
      datePublished: post.published_at,
      dateModified: post.updated_at,
      mainEntityOfPage: url,
      articleSection: post.topic?.name,
      inLanguage: "pt-BR",
      ...(image ? { image: [image] } : {}),
      author: post.ai_generated
        ? { "@type": "Organization", name: "Redação Jovem Pan Goiás" }
        : { "@type": "Person", name: post.author?.full_name ?? "Redação Jovem Pan Goiás" },
      publisher: {
        "@type": "Organization",
        name: SITE.name,
        logo: { "@type": "ImageObject", url: `${siteUrl()}${SITE.markUrl}` },
      },
    };
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:site_name", content: SITE.name },
        { property: "og:title", content: post.title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        ...(image ? [{ property: "og:image", content: image }] : []),
        ...(post.published_at
          ? [{ property: "article:published_time", content: post.published_at }]
          : []),
        { property: "article:modified_time", content: post.updated_at },
        ...(post.topic?.name ? [{ property: "article:section", content: post.topic.name }] : []),
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: post.title },
        { name: "twitter:description", content: description },
        ...(image ? [{ name: "twitter:image", content: image }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
    };
  },
  component: PostPage,
  notFoundComponent: () => (
    <PublicLayout>
      <div className="jp-container py-24 text-center">
        <p className="jp-kicker">Erro 404</p>
        <h1 className="jp-headline mt-3 text-3xl">Notícia não encontrada</h1>
        <p className="mt-3 text-text-secondary">
          Ela pode ter sido removida ou o endereço está incorreto.
        </p>
        <Link to="/" className="jp-btn-outline mt-8">
          Voltar para a página inicial
        </Link>
      </div>
    </PublicLayout>
  ),
});

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function wasUpdated(post: FullPost): boolean {
  if (!post.published_at) return false;
  return new Date(post.updated_at).getTime() - new Date(post.published_at).getTime() > 10 * 60_000;
}

function ShareBar({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const text = encodeURIComponent(`${title} ${url}`);
  const enc = encodeURIComponent(url);
  const btn =
    "inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-text-secondary transition-colors hover:border-accent hover:text-accent";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`https://wa.me/?text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#1F8F4E] px-3.5 text-xs font-bold text-white hover:bg-[#187540]"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.4 3.9c1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
        </svg>
        WhatsApp
      </a>
      <a
        href={`https://x.com/intent/post?text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
        className={btn}
      >
        <Twitter className="h-3.5 w-3.5" /> X
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${enc}`}
        target="_blank"
        rel="noopener noreferrer"
        className={btn}
      >
        <Facebook className="h-3.5 w-3.5" /> Facebook
      </a>
      <button
        type="button"
        className={btn}
        onClick={() => {
          navigator.clipboard?.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          });
        }}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
        {copied ? "Link copiado" : "Copiar link"}
      </button>
    </div>
  );
}

function PostPage() {
  const { post } = Route.useLoaderData();
  const params = Route.useParams();
  const { data: cfg } = useProjectConfig();
  const { data: related = [] } = useRelatedNews(post.topic_id, post.id);
  const url = `${siteUrl()}/${params.categoria}/${params.slug}`;
  const sources = Array.isArray(post.sources) ? post.sources : [];
  const tags = post.post_tags
    .map((pt) => pt.tag)
    .filter((t): t is { name: string; slug: string } => !!t);
  const byline = post.ai_generated
    ? SITE.byline
    : post.author?.full_name || "Redação Jovem Pan Goiás";
  const correctionsEmail = cfg?.blog_corrections_email?.trim();
  const players = [
    { ...SITE.pracas[0], url: cfg?.blog_player_url_goiania?.trim() },
    { ...SITE.pracas[1], url: cfg?.blog_player_url_caldas?.trim() },
  ];

  return (
    <PublicLayout>
      <article className="jp-container pt-10">
        <div className="mx-auto max-w-[720px]">
          {post.topic?.slug ? (
            <Link
              to="/$categoria"
              params={{ categoria: post.topic.slug }}
              className="jp-kicker hover:underline"
            >
              {post.topic.name}
            </Link>
          ) : (
            <span className="jp-kicker">Notícias</span>
          )}
          <h1 className="jp-headline mt-3 text-3xl sm:text-[2.5rem]">{post.title}</h1>
          {(post.subtitle || post.excerpt) && (
            <p className="mt-4 text-lg leading-relaxed text-text-secondary">
              {post.subtitle || post.excerpt}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-4 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <p className="font-semibold">{byline}</p>
              <p className="jp-meta mt-0.5">
                Publicado em {formatLongDateTime(post.published_at)}
                {wasUpdated(post) && <> · Atualizado em {formatLongDateTime(post.updated_at)}</>}
              </p>
            </div>
            <ShareBar url={url} title={post.title} />
          </div>
        </div>

        {post.cover_image_url && (
          <figure className="mx-auto mt-8 max-w-[960px]">
            <img
              src={post.cover_image_url}
              alt={post.cover_alt ?? ""}
              className="aspect-video w-full rounded-sm object-cover"
              width={1200}
              height={675}
            />
            {post.cover_credit && (
              <figcaption className="jp-meta mt-2 text-right">{post.cover_credit}</figcaption>
            )}
          </figure>
        )}

        <div className="mx-auto mt-8 max-w-[720px]">
          <Markdown className="prose-news">{post.content}</Markdown>

          {sources.length > 0 && (
            <section className="mt-10 border-t-2 border-accent pt-3">
              <h2 className="jp-section-label !text-text-primary">Fontes</h2>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
                {sources.map((s) => (
                  <li key={s.index}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-accent underline underline-offset-2"
                    >
                      {hostLabel(s.url)}
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {tags.map((t) => (
                <Link key={t.slug} to="/tag/$slug" params={{ slug: t.slug }} className="jp-chip">
                  {t.name}
                </Link>
              ))}
            </div>
          )}

          {post.ai_generated && (
            <aside className="mt-10 rounded-sm border border-border bg-bg-surface-2 p-5 text-sm">
              <p className="font-bold">Como fazemos esta matéria</p>
              <p className="mt-2 text-text-secondary">
                Este texto foi produzido pela Redação Jovem Pan Goiás com apoio de inteligência
                artificial, a partir das fontes listadas acima. A IA relata fatos e declarações; não
                emite opinião. Assuntos de política, polícia e saúde pública passam por revisão
                humana antes de ir ao ar.{" "}
                <Link to="/politica-editorial" className="text-accent underline underline-offset-2">
                  Conheça nossa política editorial
                </Link>
                .
                {correctionsEmail && (
                  <>
                    {" "}
                    Encontrou um erro?{" "}
                    <a
                      href={`mailto:${correctionsEmail}?subject=${encodeURIComponent(`Correção: ${post.title}`)}`}
                      className="text-accent underline underline-offset-2"
                    >
                      Escreva para {correctionsEmail}
                    </a>
                    .
                  </>
                )}
              </p>
            </aside>
          )}

          <aside className="mt-6 flex flex-col gap-4 rounded-sm bg-[#111] p-5 text-white sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <img src={SITE.markUrl} alt="" className="h-9 w-auto" />
              <p className="text-sm font-semibold">
                Ouça a Jovem Pan Goiânia 106,7 / Caldas Novas 105,7 ao vivo
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {players.map((p) =>
                p.url ? (
                  <a
                    key={p.slug}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="jp-btn-red"
                  >
                    <Radio className="h-3.5 w-3.5" /> {p.dial}
                  </a>
                ) : (
                  <Link key={p.slug} to="/ao-vivo" className="jp-btn-red">
                    <Radio className="h-3.5 w-3.5" /> {p.dial}
                  </Link>
                ),
              )}
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mx-auto mt-14 max-w-[960px]">
            <p className="jp-section-label">Mais em {post.topic?.name ?? "notícias"}</p>
            <div className="mt-2 grid gap-x-10 md:grid-cols-2">
              {related.map((r) => (
                <ListItem key={r.id} post={r} />
              ))}
            </div>
          </section>
        )}
      </article>
    </PublicLayout>
  );
}
