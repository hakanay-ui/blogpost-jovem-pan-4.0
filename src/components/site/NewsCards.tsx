import { Link } from "@tanstack/react-router";
import type { NewsCard } from "@/hooks/queries/useNews";
import { formatShortDate, postParams } from "@/lib/site";

function Cover({ post, className = "" }: { post: NewsCard; className?: string }) {
  return (
    <div className={`jp-cover ${className}`}>
      {post.cover_image_url ? (
        <img src={post.cover_image_url} alt={post.cover_alt ?? ""} loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <img
            src="/brand/jp-fm-mark.png"
            alt=""
            className="!h-auto !w-1/3 opacity-20 !object-contain"
          />
        </div>
      )}
    </div>
  );
}

function Kicker({ post, withDate = false }: { post: NewsCard; withDate?: boolean }) {
  return (
    <p className="flex items-center gap-2">
      {post.topic?.name && <span className="jp-kicker">{post.topic.name}</span>}
      {withDate && <span className="jp-meta uppercase">{formatShortDate(post.published_at)}</span>}
    </p>
  );
}

/** Manchete: imagem à esquerda, chapéu + título grande + linha fina à direita. */
export function LeadStory({ post }: { post: NewsCard }) {
  const params = postParams(post);
  return (
    <article className="group grid items-center gap-6 md:grid-cols-2 md:gap-10">
      <Link to="/$categoria/$slug" params={params} className="block">
        <Cover post={post} className="aspect-[4/3] rounded-sm" />
      </Link>
      <div>
        <Kicker post={post} />
        <Link to="/$categoria/$slug" params={params} className="jp-title-link">
          <h1 className="jp-headline mt-3 text-3xl sm:text-4xl lg:text-[2.75rem]">{post.title}</h1>
        </Link>
        {(post.subtitle || post.excerpt) && (
          <p className="mt-4 text-base leading-relaxed text-text-secondary">
            {post.subtitle || post.excerpt}
          </p>
        )}
        <p className="jp-meta mt-4">{formatShortDate(post.published_at)}</p>
      </div>
    </article>
  );
}

/** Secundária: imagem em cima, chapéu, título, data. */
export function SecondaryStory({ post }: { post: NewsCard }) {
  const params = postParams(post);
  return (
    <article className="group">
      <Link to="/$categoria/$slug" params={params} className="block">
        <Cover post={post} className="aspect-video rounded-sm" />
      </Link>
      <div className="mt-4">
        <Kicker post={post} />
        <Link to="/$categoria/$slug" params={params} className="jp-title-link">
          <h2 className="mt-2 text-lg font-bold leading-snug tracking-tight text-text-primary">
            {post.title}
          </h2>
        </Link>
        <p className="jp-meta mt-2">{formatShortDate(post.published_at)}</p>
      </div>
    </article>
  );
}

/** Card da fileira de destaque: fio vermelho no topo. */
export function RailCard({ post }: { post: NewsCard }) {
  const params = postParams(post);
  return (
    <article className="group border-t-2 border-accent pt-3">
      <Link to="/$categoria/$slug" params={params} className="block">
        <Cover post={post} className="aspect-video" />
      </Link>
      <div className="mt-3">
        <Kicker post={post} />
        <Link to="/$categoria/$slug" params={params} className="jp-title-link">
          <h3 className="mt-1.5 text-[0.9375rem] font-bold leading-snug text-text-primary">
            {post.title}
          </h3>
        </Link>
      </div>
    </article>
  );
}

/** Item de lista: chapéu + data, título, separador. */
export function ListItem({ post }: { post: NewsCard }) {
  return (
    <article className="border-b border-border py-4">
      <Kicker post={post} withDate />
      <Link to="/$categoria/$slug" params={postParams(post)} className="jp-title-link">
        <h3 className="mt-1.5 text-[0.9375rem] font-bold leading-snug text-text-primary">
          {post.title}
        </h3>
      </Link>
    </article>
  );
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-sm bg-bg-surface-2 ${className}`} />;
}
