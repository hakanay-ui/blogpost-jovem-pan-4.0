import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, RefreshCw, Sparkles, Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { useRssItems, useFetchRssNow, type RssItemsFilter } from "@/hooks/queries/useRssItems";
import { useTopics } from "@/hooks/queries/useTopics";
import { useFeeds } from "@/hooks/queries/useFeeds";
import { LoadingCard } from "@/components/ui/state-card";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/news")({
  component: NewsPage,
});

const inputCls =
  "w-full rounded-lg border border-input bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

function NewsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<RssItemsFilter>({
    page: 1,
    pageSize: 20,
    status: "all",
    feedId: null,
    topicId: null,
    search: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useRssItems(filter);
  const { data: topics = [] } = useTopics();
  const { data: feeds = [] } = useFeeds();
  const fetchNow = useFetchRssNow();
  const qc = useQueryClient();

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const page = filter.page ?? 1;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilter({ ...filter, search: searchInput, page: 1 });
  };

  const handleGenerate = async (item: (typeof items)[number]) => {
    const topicId = item.feed?.topic_id;
    // Sem tema vinculado: encaminha para a tela "Gerar post" em modo ad-hoc
    // com o título da notícia já pré-preenchido.
    if (!topicId) {
      navigate({
        to: "/admin/generate",
        search: { adhoc: item.title, link: item.link } as any,
      });
      return;
    }
    setGeneratingFor(item.id);
    const { data: { session } } = await supabase.auth.getSession();
    const { data: res, error } = await supabase.functions.invoke("generate-post", {
      body: { topicId },
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    setGeneratingFor(null);
    if (error) return toast.error(error.message);
    if (res?.error) return toast.error(res.error);
    toast.success("Post gerado com sucesso");
    qc.invalidateQueries({ queryKey: ["rss_items"] });
    qc.invalidateQueries({ queryKey: ["posts"] });
  };

  const handleRefresh = () => {
    fetchNow.mutate(undefined, {
      onSuccess: () => toast.success("Feeds atualizados"),
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <div className="p-8 lg:p-10">
      <div className="mb-6 flex items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Conteúdo</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">
            Central de notícias
          </h1>
          <p className="mt-1 text-text-secondary">
            Notícias capturadas dos feeds RSS. Gere posts manualmente ou deixe o agendador automatizar.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={fetchNow.isPending}
          className="lp-btn-secondary"
        >
          {fetchNow.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}{" "}
          Atualizar feeds
        </button>
      </div>

      {/* Filtros */}
      <div className="lp-card-elevated mb-4 grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
        <form onSubmit={handleSearchSubmit} className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar no título…"
            className={`${inputCls} pl-9`}
          />
        </form>
        <select
          value={filter.status}
          onChange={(e) =>
            setFilter({ ...filter, status: e.target.value as RssItemsFilter["status"], page: 1 })
          }
          className={inputCls}
        >
          <option value="all">Todos</option>
          <option value="new">Não usados</option>
          <option value="used">Já viraram post</option>
        </select>
        <select
          value={filter.topicId ?? ""}
          onChange={(e) =>
            setFilter({ ...filter, topicId: e.target.value || null, feedId: null, page: 1 })
          }
          className={inputCls}
        >
          <option value="">Todos os temas</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={filter.feedId ?? ""}
          onChange={(e) => setFilter({ ...filter, feedId: e.target.value || null, page: 1 })}
          className={`${inputCls} md:col-span-4`}
        >
          <option value="">Todos os feeds</option>
          {feeds.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {isLoading ? (
          <LoadingCard title="Carregando notícias…" />
        ) : items.length === 0 ? (
          <div className="lp-card-elevated p-12 text-center text-text-secondary">
            Nenhuma notícia encontrada. Ajuste os filtros ou clique em "Atualizar feeds".
          </div>
        ) : (
          items.map((item, i) => {
            const used = !!item.used_in_post_id;
            return (
              <div
                key={item.id}
                style={{ ["--stagger" as any]: i }}
                className="lp-card-elevated p-5 animate-fade-in-up"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          used
                            ? "bg-muted text-muted-foreground"
                            : "bg-success/15 text-success"
                        }`}
                      >
                        {used ? "Usada" : "Nova"}
                      </span>
                      {item.feed?.name && (
                        <span className="rounded-full bg-bg-subtle-accent px-2 py-0.5 text-xs text-text-secondary">
                          {item.feed.name}
                        </span>
                      )}
                      {item.published_at && (
                        <span className="text-xs text-text-tertiary">
                          {new Date(item.published_at).toLocaleString("pt-BR")}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-base font-bold tracking-tight text-text-primary">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-text-secondary">
                        {item.description.replace(/<[^>]+>/g, "")}
                      </p>
                    )}
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
                    >
                      <ExternalLink className="h-3 w-3" /> Ver notícia original
                    </a>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {used && item.used_in_post_id ? (
                      <Link
                        to="/admin/posts/$id"
                        params={{ id: item.used_in_post_id }}
                        className="lp-btn-secondary whitespace-nowrap"
                      >
                        Ver post
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleGenerate(item)}
                        disabled={generatingFor === item.id}
                        className="lp-btn-primary-indigo whitespace-nowrap"
                        title={
                          item.feed?.topic_id
                            ? "Gerar post a partir desse tema"
                            : "Abrir tela de geração com este título pré-preenchido"
                        }
                      >
                        {generatingFor === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}{" "}
                        Gerar post
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Paginação */}
      {data && data.total > 0 && (
        <div className="mt-6 flex items-center justify-between text-sm text-text-secondary">
          <span>
            {(page - 1) * (filter.pageSize ?? 20) + 1}–
            {Math.min(page * (filter.pageSize ?? 20), data.total)} de {data.total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter({ ...filter, page: Math.max(1, page - 1) })}
              disabled={page <= 1 || isFetching}
              className="lp-btn-secondary"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <span className="px-2">
              Página {page} / {totalPages}
            </span>
            <button
              onClick={() => setFilter({ ...filter, page: Math.min(totalPages, page + 1) })}
              disabled={page >= totalPages || isFetching}
              className="lp-btn-secondary"
            >
              Próxima <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
