import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { PublicLayout } from "@/layouts/PublicLayout";
import { NewsList } from "@/components/site/NewsList";
import { useCategories, useNewsFeed } from "@/hooks/queries/useNews";
import {
  CATEGORY_NAMES,
  LEGACY_ROUTE_REDIRECTS,
  SITE,
  UNCATEGORIZED_SLUG,
  siteUrl,
} from "@/lib/site";

const SLUG_RE = /^[a-z0-9-]{2,60}$/;

export const Route = createFileRoute("/$categoria/")({
  beforeLoad: ({ location, params }) => {
    const legacy = LEGACY_ROUTE_REDIRECTS[location.pathname.replace(/\/$/, "")];
    if (legacy) throw redirect({ to: legacy, replace: true });
    if (!SLUG_RE.test(params.categoria)) throw notFound();
  },
  head: ({ params }) => ({
    meta: [
      { title: `${CATEGORY_NAMES[params.categoria] ?? "Notícias"} | ${SITE.name}` },
      {
        name: "description",
        content: `Notícias de ${CATEGORY_NAMES[params.categoria] ?? "Goiás"} na Jovem Pan Goiás.`,
      },
    ],
    links: [{ rel: "canonical", href: `${siteUrl()}/${params.categoria}` }],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { categoria } = Route.useParams();
  const { data: categories, isLoading } = useCategories();
  const category = categories?.find((c) => c.slug === categoria);
  const feed = useNewsFeed(categoria === UNCATEGORIZED_SLUG ? undefined : categoria);

  if (!isLoading && !category && categoria !== UNCATEGORIZED_SLUG) {
    return (
      <PublicLayout>
        <div className="jp-container py-24 text-center">
          <p className="jp-kicker">Erro 404</p>
          <h1 className="jp-headline mt-3 text-3xl">Página não encontrada</h1>
          <Link to="/" className="jp-btn-outline mt-8">
            Voltar para a página inicial
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout showIntro activeCategory={categoria}>
      {category && (
        <>
          <div className="jp-container pt-10">
            <p className="jp-kicker">Editoria</p>
            <h1 className="jp-headline mt-2 text-3xl sm:text-4xl">{category.name}</h1>
            {category.description && (
              <p className="mt-2 text-text-secondary">{category.description}</p>
            )}
          </div>
        </>
      )}
      <NewsList feed={feed} emptyText="Ainda não há notícias publicadas nesta editoria." />
    </PublicLayout>
  );
}
