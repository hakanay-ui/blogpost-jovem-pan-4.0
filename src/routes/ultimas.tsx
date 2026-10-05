import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/layouts/PublicLayout";
import { NewsList } from "@/components/site/NewsList";
import { useNewsFeed } from "@/hooks/queries/useNews";
import { SITE, siteUrl } from "@/lib/site";

export const Route = createFileRoute("/ultimas")({
  head: () => ({
    meta: [
      { title: `Últimas notícias | ${SITE.name}` },
      { name: "description", content: "As últimas notícias de Goiânia, Caldas Novas e Goiás." },
    ],
    links: [{ rel: "canonical", href: `${siteUrl()}/ultimas` }],
  }),
  component: LatestPage,
});

function LatestPage() {
  const feed = useNewsFeed();
  return (
    <PublicLayout showIntro>
      <NewsList
        feed={feed}
        title="Últimas notícias"
        emptyText="Ainda não há notícias publicadas."
      />
    </PublicLayout>
  );
}
