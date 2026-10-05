import { ArrowRight, Loader2 } from "lucide-react";
import type { useNewsFeed } from "@/hooks/queries/useNews";
import { CardSkeleton, LeadStory, ListItem, SecondaryStory } from "@/components/site/NewsCards";

type Feed = ReturnType<typeof useNewsFeed>;

/** Lista paginada de uma editoria (ou de todas): manchete, duas secundárias e lista em 2 colunas. */
export function NewsList({
  feed,
  title,
  emptyText,
}: {
  feed: Feed;
  title?: string;
  emptyText: string;
}) {
  const posts = feed.data?.pages.flat() ?? [];

  if (feed.isLoading) {
    return (
      <div className="jp-container space-y-10 py-10">
        <div className="grid gap-8 md:grid-cols-2">
          <CardSkeleton className="aspect-[4/3]" />
          <div className="space-y-4">
            <CardSkeleton className="h-4 w-24" />
            <CardSkeleton className="h-10 w-full" />
            <CardSkeleton className="h-10 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="jp-container py-20 text-center">
        <p className="text-text-secondary">{emptyText}</p>
      </div>
    );
  }

  const [lead, ...rest] = posts;
  const secondary = rest.slice(0, 2);
  const list = rest.slice(2);

  return (
    <div className="jp-container py-10">
      {title && <h1 className="jp-headline mb-8 text-3xl">{title}</h1>}
      <LeadStory post={lead} />
      {secondary.length > 0 && (
        <div className="mt-10 grid gap-8 border-t border-border pt-10 md:grid-cols-2">
          {secondary.map((p) => (
            <SecondaryStory key={p.id} post={p} />
          ))}
        </div>
      )}
      {list.length > 0 && (
        <section className="mt-10 border-t border-border pt-8">
          <p className="jp-section-label">Mais notícias</p>
          <div className="mt-2 grid gap-x-10 md:grid-cols-2">
            {list.map((p) => (
              <ListItem key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}
      {feed.hasNextPage && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            className="jp-btn-outline"
            disabled={feed.isFetchingNextPage}
            onClick={() => feed.fetchNextPage()}
          >
            {feed.isFetchingNextPage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Matérias anteriores <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
