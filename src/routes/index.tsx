import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { PublicLayout } from "@/layouts/PublicLayout";
import ScrollReveal from "@/components/lp/ScrollReveal";
import { Sparkles, Calendar, ArrowRight, Tag as TagIcon, Loader2 } from "lucide-react";
import { useBlogPosts, type BlogPost } from "@/hooks/queries/useBlogPosts";
import { useProjectConfig } from "@/hooks/queries/useProjectConfig";

export const Route = createFileRoute("/")({
  component: BlogIndex,
});

/**
 * Renderiza um título podendo ter trechos em **destaque**, que viram um span com gradiente.
 */
function renderHeroTitle(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) {
      return (
        <span
          key={i}
          className="bg-gradient-to-r from-accent-light to-warm bg-clip-text text-transparent"
        >
          {m[1]}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}


function BlogIndex() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useBlogPosts();
  const { data: cfg } = useProjectConfig();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const posts = data?.pages.flat() ?? [];

  const heroEyebrow = cfg?.blog_hero_eyebrow?.trim() || "Conteúdo editorial com IA";
  const heroTitle = cfg?.blog_hero_title?.trim() || "Insights **técnicos** em tempo real";
  const heroSubtitle =
    cfg?.blog_hero_subtitle?.trim() ||
    "Análises curadas a partir de fontes RSS confiáveis e enriquecidas com pesquisa em tempo real.";
  const heroImageUrl = cfg?.blog_hero_image_url?.trim();
  const sectionEyebrow = cfg?.blog_section_eyebrow?.trim() || "Últimas publicações";
  const sectionTitle = cfg?.blog_section_title?.trim() || "Do feed para a redação";
  const defaultCoverUrl = cfg?.blog_default_cover_url?.trim() || null;

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="lp-section-dark relative overflow-hidden">
        {heroImageUrl ? (
          <>
            <img
              src={heroImageUrl}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
          </>
        ) : (
          <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(circle_at_30%_20%,hsl(239_84%_67%/_0.4),transparent_50%),radial-gradient(circle_at_70%_60%,hsl(239_84%_67%/_0.25),transparent_55%)]" />
        )}
        <div className="relative mx-auto max-w-content px-6 pt-24 pb-20">
          <ScrollReveal direction="up" duration={0.7}>
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-text-on-dark backdrop-blur">
                <Sparkles className="h-3 w-3" /> {heroEyebrow}
              </div>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-text-on-dark sm:text-5xl lg:text-6xl">
                {renderHeroTitle(heroTitle)}
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base text-text-on-dark-muted md:text-lg">
                {heroSubtitle}
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Posts list */}
      <section className="bg-bg-base py-20">
        <div className="mx-auto max-w-content px-6">
          <ScrollReveal direction="up" delay={0.05}>
            <div className="mb-10 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                  {sectionEyebrow}
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
                  {sectionTitle}
                </h2>
              </div>
            </div>
          </ScrollReveal>

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="lp-card-elevated h-64 animate-pulse" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <ScrollReveal direction="up" delay={0.1}>
              <div className="lp-card-elevated p-12 text-center">
                <h3 className="text-lg font-semibold text-text-primary">
                  Nenhum post publicado ainda
                </h3>
                <p className="mt-2 text-sm text-text-secondary">
                  Vá ao painel admin, configure um tema editorial e gere o primeiro post.
                </p>
                <Link to="/admin" className="lp-btn-primary-indigo mt-6">
                  Acessar admin <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </ScrollReveal>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post, idx) => (
                  <PostCard key={post.id} post={post} idx={idx} fallbackCover={defaultCoverUrl} />
                ))}
                {isFetchingNextPage &&
                  [0, 1, 2].map((i) => (
                    <div key={`skeleton-${i}`} className="lp-card-elevated h-64 animate-pulse" />
                  ))}
              </div>

              <div ref={sentinelRef} aria-hidden="true" className="h-8" />

              {isFetchingNextPage && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-6 flex items-center justify-center gap-2 text-sm text-text-secondary"
                >
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando mais posts…
                </div>
              )}

              {!hasNextPage && posts.length > 12 && (
                <p className="mt-10 text-center text-sm text-text-tertiary">
                  Você chegou ao fim do arquivo — {posts.length} posts.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

function PostCard({
  post,
  idx,
  fallbackCover,
}: {
  post: BlogPost;
  idx: number;
  fallbackCover: string | null;
}) {
  const tags = (post.post_tags ?? [])
    .map((pt) => pt.tag)
    .filter((t): t is { name: string; slug: string } => !!t)
    .slice(0, 3);

  const cover = post.cover_image_url || fallbackCover;

  return (
    <ScrollReveal direction="up" delay={Math.min(idx * 0.04, 0.3)}>
      <article className="lp-card-elevated group flex h-full flex-col overflow-hidden">
        <Link to="/post/$slug" params={{ slug: post.slug }} className="block">
          {cover ? (
            <img
              src={cover}
              alt={post.title}
              className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="aspect-video w-full bg-gradient-to-br from-accent/20 via-bg-subtle-accent to-bg-surface-2" />
          )}
        </Link>
        <div className="flex flex-1 flex-col p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
            {post.topic?.name && (
              <span className="inline-flex items-center rounded-full bg-bg-surface-2 px-2 py-0.5 font-medium text-text-primary">
                {post.topic.name}
              </span>
            )}
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
          <Link to="/post/$slug" params={{ slug: post.slug }} className="mt-3">
            <h3 className="text-xl font-bold tracking-tight text-text-primary transition-colors group-hover:text-accent">
              {post.title}
            </h3>
          </Link>
          {post.excerpt && (
            <p className="mt-2 line-clamp-3 text-sm text-text-secondary">{post.excerpt}</p>
          )}
          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1">
              {tags.map((t) => (
                <Link
                  key={t.slug}
                  to="/tag/$slug"
                  params={{ slug: t.slug }}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-surface-1 px-2 py-0.5 text-xs text-text-secondary hover:border-accent hover:text-accent"
                >
                  <TagIcon className="h-2.5 w-2.5" />
                  {t.name}
                </Link>
              ))}
            </div>
          )}
          <Link
            to="/post/$slug"
            params={{ slug: post.slug }}
            className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-accent"
          >
            Ler artigo
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </article>
    </ScrollReveal>
  );
}
