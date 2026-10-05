import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PublicLayout } from "@/layouts/PublicLayout";
import {
  CardSkeleton,
  LeadStory,
  ListItem,
  RailCard,
  SecondaryStory,
} from "@/components/site/NewsCards";
import { useNewsFeed, type NewsCard } from "@/hooks/queries/useNews";
import { SITE, postParams, siteUrl } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${SITE.name} — Notícias de Goiânia, Caldas Novas e Goiás` },
      {
        name: "description",
        content:
          "O jornal local da Jovem Pan em Goiás: Goiânia, Caldas Novas e região, política, economia e agro, esporte, serviço e agenda.",
      },
    ],
    links: [{ rel: "canonical", href: `${siteUrl()}/` }],
  }),
  component: Home,
});

function Home() {
  const latest = useNewsFeed();
  const caldas = useNewsFeed("caldas-novas");
  const servico = useNewsFeed("servico");

  const posts = latest.data?.pages[0] ?? [];
  const [lead, ...rest] = posts;
  const secondary = rest.slice(0, 2);

  // Fileira de destaque: Caldas Novas e região (a praça com menos fonte própria
  // ganha vitrine fixa). Sem notícias de Caldas, mostra as próximas mais recentes.
  const shownIds = new Set([lead, ...secondary].filter(Boolean).map((p) => p!.id));
  const caldasPosts = (caldas.data?.pages[0] ?? []).filter((p) => !shownIds.has(p.id)).slice(0, 4);
  const railPosts = caldasPosts.length >= 2 ? caldasPosts : rest.slice(2, 6);
  const railIsCaldas = caldasPosts.length >= 2;
  railPosts.forEach((p) => shownIds.add(p.id));

  const latestList = rest.filter((p) => !shownIds.has(p.id)).slice(0, 10);
  const servicePosts = (servico.data?.pages[0] ?? []).slice(0, 6);

  return (
    <PublicLayout showIntro>
      <div className="jp-container">
        {latest.isLoading ? (
          <HomeSkeleton />
        ) : !lead ? (
          <div className="py-24 text-center">
            <p className="jp-kicker">Em breve</p>
            <h1 className="jp-headline mt-3 text-3xl">As primeiras notícias chegam em instantes</h1>
            <p className="mt-3 text-text-secondary">
              A redação publica 12 notícias por dia, das 6h30 às 19h, todos os dias.
            </p>
          </div>
        ) : (
          <>
            <section className="border-b border-border py-10">
              <LeadStory post={lead} />
            </section>

            {secondary.length > 0 && (
              <section className="grid gap-8 border-b border-border py-10 md:grid-cols-2">
                {secondary.map((p) => (
                  <SecondaryStory key={p.id} post={p} />
                ))}
              </section>
            )}

            {railPosts.length > 0 && (
              <section className="border-b border-border py-10">
                <div className="mb-5 flex items-center justify-between">
                  <p className="jp-section-label">
                    {railIsCaldas ? "Caldas Novas e região" : "Destaques"}
                  </p>
                  {railIsCaldas && (
                    <Link
                      to="/$categoria"
                      params={{ categoria: "caldas-novas" }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-accent"
                    >
                      Ver tudo <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                <div
                  className={`grid gap-6 sm:grid-cols-2 ${railPosts.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
                >
                  {railPosts.map((p) => (
                    <RailCard key={p.id} post={p} />
                  ))}
                </div>
              </section>
            )}

            {latestList.length > 0 && (
              <section className="py-10">
                <p className="jp-section-label">Últimas notícias</p>
                <div className="mt-2 grid gap-x-10 md:grid-cols-2">
                  {latestList.map((p) => (
                    <ListItem key={p.id} post={p} />
                  ))}
                </div>
              </section>
            )}

            {servicePosts.length > 0 && <ServiceBox posts={servicePosts} />}

            <div className="flex justify-center pt-10">
              <Link to="/ultimas" className="jp-btn-outline">
                Matérias anteriores <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </>
        )}
      </div>
    </PublicLayout>
  );
}

/** Caixa "Serviço" (na referência, "Guias essenciais"): 6 links em 3 colunas. */
function ServiceBox({ posts }: { posts: NewsCard[] }) {
  return (
    <section className="rounded-lg border border-border bg-bg-elevated p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Serviço</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Trânsito, clima, concursos, vagas, vacinação e prazos.
          </p>
        </div>
        <Link
          to="/$categoria"
          params={{ categoria: "servico" }}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent"
        >
          Todos <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="mt-4 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <Link
            key={p.id}
            to="/$categoria/$slug"
            params={postParams(p)}
            className="jp-title-link border-b border-border py-3 text-sm font-semibold leading-snug"
          >
            {p.title}
          </Link>
        ))}
      </div>
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-10 py-10">
      <div className="grid gap-8 md:grid-cols-2">
        <CardSkeleton className="aspect-[4/3]" />
        <div className="space-y-4 self-center">
          <CardSkeleton className="h-3 w-28" />
          <CardSkeleton className="h-10 w-full" />
          <CardSkeleton className="h-10 w-4/5" />
          <CardSkeleton className="h-4 w-full" />
        </div>
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        <CardSkeleton className="aspect-video" />
        <CardSkeleton className="aspect-video" />
      </div>
    </div>
  );
}
